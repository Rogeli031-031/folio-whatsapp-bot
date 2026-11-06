"use strict";
const {createHash}=require("node:crypto");
const {evaluatePlan}=require("../frontend-dashboard/lib/igf-plan-al-cierre");
const proposals=require("./igf-simulation-proposals");
const {canonicalForecastPlantKey,forecastPlantAliases,plantsEquivalent}=require("./dashboard-arr-forecast");
const {loadHistoricalForecast}=require("./igf-period-forecast-fallback");
const dicf=require("./dicf");

const digest=text=>createHash("sha256").update(text).digest("hex");
const number=v=>v==null ? null : Number(v);
const fail=(message,status=400)=>Object.assign(new Error(message),{status});

// Exact identities approved for credit/cash consolidation. Never merge by similar names or phones.
const approvedBuyer="46d83a7e9d81fded8532054d8837e0f7ab21c65c8222458d83be2eb3950cdaa2";
function buyerFor(account,plant) {
  const root=account.replace(/\s*\(CONTADO\)$/i,"").trim();
  return digest(plant.trim().toUpperCase()+"|"+root.toUpperCase())===approvedBuyer ? root : account;
}

function buildSource(history, forecast, period, plantCode, keyFor=buyerFor) {
  const margins=new Set(forecast.map(f=>number(f.margen_mes_kg)));
  if(!forecast.length || margins.size!==1 || !Number.isFinite([...margins][0]))
    throw fail("Falta una referencia DICF con margen consistente para esta planta al día anterior al corte.",422);
  const margin=[...margins][0], accounts=new Map();
  function account(name) {
    if(!accounts.has(name)) accounts.set(name,{name, months:new Map(), real:0, realCost:0, base:0, continuity:null});
    return accounts.get(name);
  }
  for(const r of history) {
    const a=account(r.account), kg=number(r.kg), cost=number(r.cost);
    a.category=r.category; a.subcategory=r.subcategory;
    if(!r.month)continue; // Registered buyer with no captured sale in the reference window.
    a.months.set(r.month,{kg,cost});
    if(r.month===period) {a.real=kg; a.realCost=cost;}
  }
  for(const f of forecast) {
    const a=account(f.cliente_norm);
    if(Math.abs(a.real-number(f.kg_mes_real))>0.01 || f.kg_mes_forecast==null || number(f.kg_mes_forecast)+0.0001<a.real)
      throw fail("Las ventas reales y la versión DICF difieren. Revisa la carga al corte.",422);
    a.base=Math.max(a.real,number(f.kg_mes_forecast));
    a.continuity=a.real>0 && a.realCost!=null ? a.realCost/a.real :
      number(f.kg_hist)>0 ? number(f.desc_kg_hist) : null;
    a.category=a.category || f.canal; a.subcategory=a.subcategory || f.subcanal;
  }
  const groups=new Map();
  for(const a of accounts.values()) {
    if(a.real>a.base+0.0001) throw fail("Falta el cierre DICF de una cuenta con venta registrada.",422);
    const name=keyFor(a.name,plantCode);
    if(!groups.has(name)) groups.set(name,[]);
    groups.get(name).push(a);
  }
  const rows=[];
  for(const [name,group] of groups) {
    group.sort((a,b)=>a.name.localeCompare(b.name,"es"));
    const future=group.find(a=>a.name.endsWith("(CONTADO)")) || group[0];
    const base=group.reduce((s,a)=>s+a.base,0),real=group.reduce((s,a)=>s+a.real,0);
    const baseCost=group.every(a=>a.base===a.real||a.continuity!==null) ?
      group.reduce((s,a)=>s+(a.base-a.real)*(a.continuity??0),0):null;
    const continuity=base>real && baseCost!==null ? baseCost/(base-real) : null;
    const actual=real>0 && group.every(a=>a.realCost!=null) ? group.reduce((s,a)=>s+a.realCost,0)/real:null;
    const past=new Map();
    for(const a of group) for(const [month,h] of a.months) {
      if(month>=period) continue;
      const m=past.get(month) || {month,kg:0,cost:0};
      m.kg+=h.kg; m.cost=m.cost===null||h.cost===null?null:m.cost+h.cost;
      past.set(month,m);
    }
    // An observed month is a negotiation reference, never a probability of recovery.
    const candidates=[...past.values()].filter(h=>h.kg>base && h.cost!==null && h.cost>=0)
      .map(h=>({...h,rate:Math.max(continuity??0,h.cost/h.kg)}))
      .filter(h=>h.rate<margin && (h.kg-real)*(margin-h.rate)>(base-real)*(margin-(continuity??0)))
      .sort((a,b)=>a.kg-b.kg || a.month.localeCompare(b.month));
    const generic=/PUBLICO (?:EN )?GENERAL|VENTA (?:AL )?PUBLICO|^RUTA\s+\d/i.test(name.normalize("NFD").replace(/\p{M}/gu,""));
    const ref=!generic && candidates.length>=2 ? candidates[Math.floor((candidates.length-1)/2)] : null;
    rows.push({id:digest(name),name,real,actual,base,continuity,rate:ref?.rate??continuity,goal:ref?.kg??base,
      reference:ref?.month??null, future:future.name,accounts:group.map(a=>({name:a.name,category:a.category||"Sin categoría",
        subcategory:a.subcategory||"Sin subcategoría",real:a.real,realCost:a.realCost,base:a.base,continuity:a.continuity}))});
  }
  rows.sort((a,b)=>a.id.localeCompare(b.id));
  return {margin,rows};
}

const DAY=86400000;
function dayOffset(date,days) {
  return new Date(Date.parse(date+"T00:00:00Z")+days*DAY).toISOString().slice(0,10);
}

// Match the exact catalog aliases after accent, space and dash normalization.
// In particular, a longer unrelated plant name must never match by substring.
const plantKeySql="trim(regexp_replace(translate(normalize(upper(trim(plant_code)),NFC),'ÁÉÍÓÚÜÑ-–—','AEIOUUN   '),'[[:space:]]+',' ','g'))";
const aliasKey=v=>v.trim().toUpperCase().normalize("NFD").replace(/\p{M}/gu,"").replace(/[-–—]/g," ").replace(/\s+/g," ").trim();

// Combine aliases at the original key of each source. An identical import under
// two spellings is one observation. Disagreeing amounts need an explicit review.
const dailyCtes=`WITH sale_lines AS (
  SELECT fecha, cliente_norm, canal, subcanal, MIN(kg) kg, MIN(kg)<>MAX(kg) conflict
  FROM arr.ventas_diarias_cliente WHERE ${plantKeySql}=ANY($1::text[]) AND fecha >= $2::date AND fecha < $3::date
  GROUP BY fecha,cliente_norm,canal,subcanal
), sales AS (
  SELECT fecha,cliente_norm,SUM(kg) kg,bool_or(conflict) conflict FROM sale_lines GROUP BY fecha,cliente_norm
), discounts AS (
  SELECT fecha,cliente_norm,MIN(monto) amount,MIN(monto)<>MAX(monto) conflict
  FROM arr.descuentos_diarios_cliente WHERE ${plantKeySql}=ANY($1::text[]) AND fecha >= $2::date AND fecha < $3::date
  GROUP BY fecha,cliente_norm
), daily AS (
  SELECT fecha,cliente_norm,kg,amount,(coalesce(sales.conflict,false) OR coalesce(discounts.conflict,false)) conflict
  FROM sales FULL JOIN discounts USING(fecha,cliente_norm)
)`;

async function readHistory(client,codes,start,cutoff) {
  const from = new Date(Date.UTC(Number(start.slice(0,4))-1,Number(start.slice(5,7))-1,1)).toISOString().slice(0,10);
  const result=await client.query(dailyCtes+`, monthly AS (
    SELECT cliente_norm, date_trunc('month',fecha)::date::text AS month,coalesce(sum(kg),0) kg,
      CASE WHEN bool_or((kg>0 AND amount IS NULL) OR (coalesce(kg,0)<=0 AND coalesce(amount,0)<>0))
        THEN NULL ELSE -coalesce(sum(amount),0) END AS cost,
      max(fecha) FILTER (WHERE kg IS NOT NULL)::text AS last_sale,
      max(fecha) FILTER (WHERE amount IS NOT NULL)::text AS last_discount, bool_or(conflict) conflict
    FROM daily GROUP BY 1,2
  ), classified AS (
    SELECT cliente_norm,canal,subcanal,dense_rank() OVER (PARTITION BY cliente_norm ORDER BY year DESC,month DESC) pos
    FROM arr.cliente_categoria_mes WHERE ${plantKeySql}=ANY($1::text[]) AND make_date(year,month,1)<=$4::date
  ), cat AS (
    SELECT cliente_norm,MIN(canal) category,MIN(subcanal) subcategory,
      count(DISTINCT (canal,coalesce(subcanal,'')))>1 conflict FROM classified WHERE pos=1 GROUP BY cliente_norm
  ), last_sale_categories AS (
    SELECT cliente_norm,CASE WHEN count(DISTINCT canal)=1 THEN MIN(canal) ELSE 'Sin categoría' END category,
      CASE WHEN count(DISTINCT (canal,subcanal))=1 THEN MIN(subcanal) ELSE 'Sin subcategoría' END subcategory
    FROM sale_lines JOIN (SELECT cliente_norm,max(fecha) fecha FROM sales GROUP BY 1) last_day USING(cliente_norm,fecha)
    GROUP BY cliente_norm
  )
  SELECT cliente_norm account,month,coalesce(kg,0) kg,cost,last_sale,last_discount,
    coalesce(cat.category,last_sale_categories.category) category,coalesce(cat.subcategory,last_sale_categories.subcategory) subcategory,
    coalesce(monthly.conflict,false) OR coalesce(cat.conflict,false) conflict
    FROM monthly FULL JOIN cat USING(cliente_norm) LEFT JOIN last_sale_categories USING(cliente_norm)
    ORDER BY cliente_norm, month`,[codes,from,cutoff,start]);
  if(result.rows.some(r=>r.conflict))throw fail("Hay capturas incompatibles con dos nombres de la misma planta. Revisa el origen antes de usar el plan.",422);
  return result.rows;
}

async function readMargin(client,canon,year,month,through) {
  const version=await loadHistoricalForecast(client,year,month,{versionAsOfCorte:true,corteYmd:through});
  const lines=version?.rows.filter(row=>plantsEquivalent(row.empresa,canon) && number(row.venta_ton)>0)??[];
  if(!lines.length || lines.some(r=>!Number.isFinite(number(r.margen_kg))))
    throw fail("Falta el margen IGF de "+canon+" en la versión disponible al "+through+".",422);
  return lines.reduce((s,r)=>s+Number(r.venta_ton)*Number(r.margen_kg),0) /
    lines.reduce((s,r)=>s+Number(r.venta_ton),0);
}

async function readConfig(client,codes,year,month,through) {
  const {rows}=await client.query(`SELECT DISTINCT window_days,tolerancia_dias FROM arr.dicf_config
    WHERE ${plantKeySql}=ANY($1::text[]) AND year=$2 AND month=$3
      AND (created_at AT TIME ZONE 'America/Mexico_City')::date <= $4::date`,[codes,year,month,through]);
  if(rows.length>1)throw fail("Hay configuraciones DICF incompatibles para los nombres de esta planta.",422);
  const days=number(rows[0]?.window_days), tolerance=number(rows[0]?.tolerancia_dias);
  return {days:Number.isInteger(days)&&days>0?days:dicf.WINDOW_DAYS,tolerance:tolerance!=null&&tolerance>=0?tolerance:2};
}

function validSnapshot(rows,history,start,windowStart,margin) {
  const real=new Map(history.filter(r=>r.month===start).map(r=>[r.account,Number(r.kg)]));
  const keys=new Set(rows.map(r=>r.cliente_norm));
  if(!rows.length || keys.size!==rows.length) return false;
  const prevMonth=dayOffset(start,-1).slice(0,7)+"-01";
  if(history.some(r=>r.last_sale && (r.month===prevMonth || r.month===start || r.last_sale>=windowStart) && !keys.has(r.account)))return false;
  return rows.every(r=>r.kg_mes_real!=null && r.kg_mes_forecast!=null && r.margen_mes_kg!=null &&
    Math.abs(Number(r.margen_mes_kg)-margin)<=0.000001 && Math.abs(Number(r.kg_mes_real)-(real.get(r.cliente_norm)??0))<=0.01 &&
    Number(r.kg_mes_forecast)+0.0001>=Number(r.kg_mes_real));
}

function reconstructForecast(history,daily,start,through,end,windowStart,config,margin) {
  const accounts=new Map();
  function get(name) {
    if(!accounts.has(name))accounts.set(name,{series:new Array(config.days).fill(0),discount:0,hasRate:false,real:0});
    return accounts.get(name);
  }
  for(const r of history)if(r.month===start)get(r.account).real=Number(r.kg);
  for(const r of daily) {
    const a=get(r.cliente_norm),index=Math.round((Date.parse(r.day)-Date.parse(windowStart))/DAY);
    if(r.kg!=null)a.series[index]=Number(r.kg);
    if(r.amount!=null){a.discount+=Math.abs(Number(r.amount));a.hasRate=true;}
  }
  return [...accounts].map(([name,a])=>{
    const freq=dicf.medianGapFromSeries(a.series),since=dicf.daysSinceLastFromSeries(a.series);
    const {state}=dicf.clientState(a.series,freq,since,config.tolerance);
    const total=a.series.reduce((sum,kg)=>sum+kg,0);
    const projected=dicf.projectCustomerClose(a.series,a.real,state,windowStart,through,end);
    // Use the precision of arr.dicf_cliente_mes, also when that cache hasn't been populated yet.
    return {cliente_norm:name,kg_mes_real:a.real,kg_mes_forecast:Number(projected.toFixed(4)),
      kg_hist:total,desc_kg_hist:total>0 && a.hasRate ? Number((a.discount/total).toFixed(6)) : null,
      margen_mes_kg:Number(margin.toFixed(6))};
  });
}

async function loadSource(client,plant,year,month,cutoff) {
  const start=String(year)+"-"+String(month).padStart(2,"0")+"-01";
  if(!cutoff.startsWith(start.slice(0,7)))throw fail("Selecciona un corte dentro del mes que quieres planear.",422);
  // resolvePlant already authorized the plant ID. Only expand its own exact aliases,
  // never an approximate match picked from a different province's display name.
  const canon=canonicalForecastPlantKey(plant.canon)||plant.canon;
  const aliases=forecastPlantAliases(canon),codes=[...new Set(aliases.map(aliasKey))];
  const through=dayOffset(cutoff,-1),end=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
  const history=await readHistory(client,codes,start,cutoff);
  const margin=await readMargin(client,canon,year,month,through);
  const config=await readConfig(client,codes,year,month,through),windowStart=dayOffset(through,1-config.days);
  const snapshot=await client.query(`SELECT DISTINCT cliente_norm,kg_mes_real,kg_mes_forecast,kg_hist,desc_kg_hist,margen_mes_kg,canal,subcanal
    FROM arr.dicf_cliente_mes WHERE ${plantKeySql}=ANY($1::text[]) AND year=$2 AND month=$3 AND last_date=$4::date
    ORDER BY cliente_norm`,[codes,year,month,through]);
  let forecast=snapshot.rows,origin="DICF guardado";
  if(!validSnapshot(forecast,history,start,windowStart,margin)){
    const latest=history.reduce((last,r)=>r.last_sale && r.last_sale>last?r.last_sale:last,"");
    if(latest!==through)throw fail("Falta la captura de ventas de "+canon+" al "+through+
      (latest?". Última captura disponible: "+latest+".":"."),422);
    const daily=await client.query(dailyCtes+" SELECT fecha::text AS day,cliente_norm,kg,amount,conflict FROM daily ORDER BY fecha,cliente_norm",
      [codes,windowStart,cutoff]);
    if(daily.rows.some(r=>r.conflict))throw fail("Hay capturas DICF incompatibles para la planta.",422);
    forecast=reconstructForecast(history,daily.rows,start,through,end,windowStart,config,margin);
    origin="DICF calculado al corte";
  }else{
    // Legacy DICF stores zero for both a recorded zero and a window without any discount records.
    const documented=new Set(history.filter(h=>h.last_discount>=windowStart).map(h=>h.account));
    forecast=forecast.map(r=>number(r.desc_kg_hist)===0 && !documented.has(r.cliente_norm)?{...r,desc_kg_hist:null}:r);
  }
  const source=buildSource(history,forecast,start,canon);
  return {...source,plants:[...new Set([plant.nombre,...aliases].filter(Boolean))],origin,through,revision:digest(JSON.stringify(source))};
}

function calculate(source,edits,anchor,hgPercent=null) {
  if(!edits||typeof edits!=="object"||Array.isArray(edits))throw fail("Ediciones de plan inválidas.");
  const ids=new Set(source.rows.map(row=>row.id));
  for(const [key,edit] of Object.entries(edits)){
    if(!ids.has(key)||!edit||Object.keys(edit).some(k=>!["goal","rate","selected"].includes(k))||
      typeof edit.selected!=="boolean"||!Number.isFinite(edit.goal)||edit.goal<0||edit.goal>1e9||
      (edit.rate!==null && (!Number.isFinite(edit.rate)||edit.rate<0||edit.rate>100)))throw fail("Revisa los valores editados.");
  }
  if(![anchor?.q,anchor?.d,anchor?.a,anchor?.fixed].every(Number.isFinite)||anchor.q<=0||anchor.q>1e6)
    throw fail("Falta la base financiera del IGF seleccionado.");
  const result=evaluatePlan(source,edits,anchor,hgPercent);
  if(result.hgError)throw fail(result.hgError);
  if(!result.scenario)throw fail("Revisa las filas seleccionadas y la venta final del IGF.");
  return result;
}

async function readSaved(client,plantId,period,id,lock=false) {
  const r=await client.query(`SELECT id,basis FROM arr.igf_simulation_proposals
    WHERE plant_id=$1 AND year=$2 AND month=$3 AND id=$4`+(lock?" FOR UPDATE":""),[plantId,period.year,period.month,id]);
  const plan=r.rows[0]?.basis?.closing_plan;
  if(!plan)throw fail("Este punto de plan no existe en la planta y mes seleccionados.",404);
  return plan;
}
function brief(p) { return {...p,basis:{...p.basis,closing_plan:true}}; }

async function handle(client,plant,period,input) {
  const {action,cutoff,id,mode}=input;
  const date=new Date(cutoff+"T00:00:00Z");
  if(!["open","save","excel"].includes(action)||!["igf_diario","forecast"].includes(mode)||
    !/^\d{4}-\d{2}-\d{2}$/.test(cutoff)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==cutoff||
    (id!=null&&(!Number.isSafeInteger(Number(id))||Number(id)<1)))throw fail("Contexto de plan inválido.");
  const write=action==="save";
  await client.query(write?"BEGIN":"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    const saved=id!=null?await readSaved(client,plant.plantaId,period,id,write):null;
    if(saved && (saved.cutoff!==cutoff||saved.mode!==mode))throw fail("El punto pertenece a otra fuente o corte.",409);
    if(write && !/^[a-f0-9-]{36}$/i.test(input.request_id||""))throw fail("Falta el identificador del guardado.");
    const signature=write ? digest(JSON.stringify([cutoff,mode,input.revision,input.version??null,input.comments??"",
      Object.entries(input.edits??{}).sort(([a],[b])=>a.localeCompare(b)),saved?null:input.anchor,
      ...(input.hg_percent==null?[]:[input.hg_percent])])) : null;
    if(write && !saved){
      await client.query(proposals.ENSURE_SQL);
      const key=[plant.plantaId,period.year,period.month,input.request_id].join("|");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[key]);
      const existing=await client.query(`SELECT * FROM arr.igf_simulation_proposals WHERE plant_id=$1 AND year=$2 AND month=$3
        AND basis->'closing_plan'->>'request_id'=$4 LIMIT 1`,[plant.plantaId,period.year,period.month,input.request_id]);
      if(existing.rows.length){
        if(existing.rows[0].basis.closing_plan.first_signature!==signature)
          throw fail("Ya existe un punto para este intento. Ábrelo desde Puntos guardados para editarlo.",409);
        await client.query("COMMIT");return {row:brief(existing.rows[0])};
      }
    }
    const source=saved ? {...saved.source,plants:[...new Set([...(saved.source.plants??[]),...forecastPlantAliases(plant.canon)])]}
      : await loadSource(client,plant,period.year,period.month,cutoff);
    if(action==="open"){await client.query("COMMIT");return {source,edits:saved?.edits??{},anchor:saved?.anchor,
      hg_percent:saved?.hg_percent??null,version:saved?.version,comments:saved?.comments};}
    if(input.revision!==source.revision || (saved&&input.version!==saved.version))throw fail("El plan cambió. Vuelve a abrirlo antes de continuar.",409);
    const anchor=saved?.anchor??input.anchor;
    const hgPercent=input.hg_percent===undefined ? saved?.hg_percent??null : input.hg_percent;
    const result=calculate(source,input.edits,anchor,hgPercent);
    const basisInput={...anchor,cutoff,mode,comments:input.comments??""};
    const checked=proposals.parseProposal({...period,name:"Plan al cierre",volume_ton:result.scenario.kg/1000,
      discount_kg:result.scenario.rate,basis:basisInput});
    if(checked.error)throw fail(checked.error);
    const base={...checked.basis,q:anchor.q,d:anchor.d};
    if(action==="excel"){
      const hasContacts=await client.query("SELECT to_regclass('arr.cliente_contactos') IS NOT NULL AS available");
      const contacts=hasContacts.rows[0].available ? await client.query("SELECT cliente_nombre_norm,telefono FROM arr.cliente_contactos WHERE planta_id=$1",[plant.plantaId]) : {rows:[]};
      const bytes=await require("./igf-plan-al-cierre-excel").workbook({plant:plant.nombre||plant.canon,period,cutoff,mode,source,
        result,anchor:base,contacts:contacts.rows});
      await client.query("COMMIT");return {bytes};
    }
    if(!result.count&&!result.scenario.hgChanged)throw fail("Selecciona un comprador o cambia el HG para guardar el punto.");
    // The point projects its own surface. Keep the original cut separately for every subsequent edit.
    if(result.scenario.hgChanged)Object.assign(checked.basis,{
      a:result.scenario.a,hg_kg:result.scenario.hgCost,hg_pct:hgPercent/100,
    });
    checked.basis.closing_plan={cutoff,mode,source,anchor:base,hg_percent:hgPercent,edits:input.edits,comments:checked.basis.comments,
      request_id:saved?.request_id??input.request_id,first_signature:saved?.first_signature??signature,version:(saved?.version??0)+1};
    const row=saved?await proposals.update(client,plant.plantaId,checked,Number(id)):await proposals.save(client,plant.plantaId,checked,input.actor);
    await client.query("COMMIT");return {row:brief(row)};
  } catch(e){await client.query("ROLLBACK");throw e;}
}
module.exports={buildSource,loadSource,calculate,handle,brief};
