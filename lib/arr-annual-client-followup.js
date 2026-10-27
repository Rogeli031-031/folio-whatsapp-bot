"use strict";

const { medianGapFromSeries, daysSinceLastFromSeries, clientState, WINDOW_DAYS } = require("./dicf");
const dayKey = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10);
const keyOf = (plant, client) => `${plant}|${String(client || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim()}`;
const addDays = (ymd,n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86400000).toISOString().slice(0,10);

// Same per-client frequency/state rules as the modal, without running computeDicf
// (which persists a forecast). Monetary rates use signed real discounts / real kg.
function buildFollowup({ sales, discounts, configs, year, month, resolvePlant }) {
  const end = new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
  const first = `${year}-${String(month).padStart(2,"0")}-01`;
  const cutoffByPlant = new Map(), configByPlant = new Map(), clients = new Map(), discountMap = new Map(), discountsByClient = new Map();
  for (const row of configs || []) { const plant=resolvePlant(row.plant_code); if(plant)configByPlant.set(plant,row); }
  for (const row of discounts || []) {
    const plant=resolvePlant(row.plant_code), fecha=dayKey(row.fecha);
    if(!plant || !fecha || fecha>end || row.monto==null || !Number.isFinite(Number(row.monto)))continue;
    const key=`${keyOf(plant,row.cliente_norm)}|${fecha}`;
    discountMap.set(key,(discountMap.get(key)||0)+Number(row.monto));
    const clientKey=keyOf(plant,row.cliente_norm);
    if(!discountsByClient.has(clientKey))discountsByClient.set(clientKey,new Map());
    const days=discountsByClient.get(clientKey);days.set(fecha,(days.get(fecha)||0)+Number(row.monto));
  }
  for (const row of sales || []) {
    const plant=resolvePlant(row.plant_code), fecha=dayKey(row.fecha);
    if(!plant || !fecha || fecha>end || !Number.isFinite(Number(row.kg)))continue;
    if(!cutoffByPlant.has(plant)||fecha>cutoffByPlant.get(plant))cutoffByPlant.set(plant,fecha);
    const key=keyOf(plant,row.cliente_norm);
    if(!clients.has(key))clients.set(key,{plant,days:new Map()});
    const rec=clients.get(key);rec.days.set(fecha,(rec.days.get(fecha)||0)+Number(row.kg));
  }
  const result=new Map();
  for(const [key,rec] of clients){
    const cutoff=cutoffByPlant.get(rec.plant), config=configByPlant.get(rec.plant)||{};
    const window=Number(config.window_days)>0?Math.min(3660,Math.trunc(Number(config.window_days))):WINDOW_DAYS;
    const start=addDays(cutoff,1-window);
    const series=Array.from({length:window},(_,i)=>rec.days.get(addDays(start,i))||0);
    const freq=medianGapFromSeries(series), since=daysSinceLastFromSeries(series);
    const last=[...rec.days].filter(([date,kg])=>date<=cutoff&&kg>0).map(([date])=>date).sort().at(-1)||null;
    let kgMonth=0,descMonth=0,hasMonthDiscount=false;
    for(const [fecha,kg] of rec.days)if(fecha>=first&&fecha<=cutoff)kgMonth+=kg;
    for(const [fecha,monto] of discountsByClient.get(key)||[]) {
      if(fecha>=first&&fecha<=cutoff){descMonth+=monto;hasMonthDiscount=true;}
    }
    const lastDiscount=last?discountMap.get(`${key}|${last}`):null;
    result.set(key,{last_purchase:last,frequency_days:freq<9000?freq:null,
      client_state:clientState(series,freq,since,config.tolerancia_dias==null?2:Number(config.tolerancia_dias)).state,
      month_discount_kg:kgMonth>0&&hasMonthDiscount?descMonth/kgMonth:null,
      last_purchase_discount_kg:last&&lastDiscount!=null?lastDiscount/rec.days.get(last):null,cutoff});
  }
  return result;
}

async function loadFollowup(client,{year,month,resolvePlant,codes}) {
  const end=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
  const config=await client.query("SELECT plant_code, window_days, tolerancia_dias FROM arr.dicf_config WHERE year=$1 AND month=$2",[year,month]);
  // One read per source for all plants/clients. Includes older purchases so a
  // client with no sales this month still has their actual last purchase date.
  const maxWindow=Math.max(365,...(config.rows||[]).map(row=>Math.min(3660,Number(row.window_days)||WINDOW_DAYS)));
  const sales=await client.query(`WITH daily AS (
      SELECT plant_code,cliente_norm,fecha,SUM(kg) AS kg FROM arr.ventas_diarias_cliente
      WHERE fecha <= $1::date AND plant_code=ANY($2::text[]) GROUP BY plant_code,cliente_norm,fecha
    ), latest AS (SELECT plant_code,cliente_norm,MAX(fecha) FILTER (WHERE kg>0) AS last_fecha FROM daily GROUP BY plant_code,cliente_norm),
    cutoffs AS (SELECT plant_code,MAX(fecha) AS cutoff FROM daily GROUP BY plant_code)
    SELECT d.* FROM daily d JOIN latest l USING (plant_code,cliente_norm) JOIN cutoffs c USING (plant_code)
    WHERE d.fecha >= c.cutoff - $3::int OR d.fecha=l.last_fecha`,[end,codes,maxWindow]);
  const lastDates=new Map();
  for(const row of sales.rows||[])if(Number(row.kg)>0){
    const key=`${row.plant_code}|${row.cliente_norm}`, fecha=dayKey(row.fecha);
    if(!lastDates.has(key)||fecha>lastDates.get(key).fecha)lastDates.set(key,{plant_code:row.plant_code,cliente_norm:row.cliente_norm,fecha});
  }
  const discounts=await client.query(`SELECT plant_code,cliente_norm,fecha,SUM(monto) AS monto
    FROM arr.descuentos_diarios_cliente d WHERE fecha <= $1::date AND plant_code=ANY($2::text[])
    AND (fecha >= $3::date OR EXISTS (SELECT 1 FROM jsonb_to_recordset($4::jsonb)
      AS l(plant_code text,cliente_norm text,fecha date) WHERE l.plant_code=d.plant_code AND l.cliente_norm=d.cliente_norm AND l.fecha=d.fecha))
    GROUP BY plant_code,cliente_norm,fecha`,[end,codes,`${year}-${String(month).padStart(2,"0")}-01`,JSON.stringify([...lastDates.values()])]);
  return buildFollowup({sales:sales.rows||[],discounts:discounts.rows||[],configs:config.rows||[],year,month,resolvePlant});
}
module.exports={keyOf,buildFollowup,loadFollowup};
