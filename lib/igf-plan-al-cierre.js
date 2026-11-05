"use strict";
const {createHash}=require("node:crypto");
const {evaluatePlan}=require("../frontend-dashboard/lib/igf-plan-al-cierre");
const proposals=require("./igf-simulation-proposals");

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

async function loadSource(client,plant,year,month,cutoff) {
  const start=String(year)+"-"+String(month).padStart(2,"0")+"-01", code=plant.provinciaPlantCode||plant.canon;
  if(!cutoff.startsWith(start.slice(0,7))) throw fail("Selecciona un corte dentro del mes que quieres planear.",422);
  const f=await client.query(`SELECT cliente_norm,kg_mes_real,kg_mes_forecast,kg_hist,desc_kg_hist,margen_mes_kg,canal,subcanal
    FROM arr.dicf_cliente_mes WHERE UPPER(TRIM(plant_code))=UPPER(TRIM($1)) AND year=$2 AND month=$3 AND last_date=$4::date-1
    ORDER BY cliente_norm`,[code,year,month,cutoff]);
  if(!f.rows.length) throw fail("No hay una versión DICF para el día anterior a este corte. Revisa la fecha del forecast por cliente.",422);
  const h=await client.query(`WITH v AS (
    SELECT fecha,cliente_norm,SUM(kg) AS kg FROM arr.ventas_diarias_cliente
    WHERE UPPER(TRIM(plant_code))=UPPER(TRIM($1)) AND fecha >= $2::date-interval '12 months' AND fecha<$3::date GROUP BY 1,2
    ), d AS (SELECT fecha,cliente_norm,SUM(monto) AS amount FROM arr.descuentos_diarios_cliente
    WHERE UPPER(TRIM(plant_code))=UPPER(TRIM($1)) AND fecha >= $2::date-interval '12 months' AND fecha<$3::date GROUP BY 1,2),
    cat AS (SELECT DISTINCT ON (cliente_norm) cliente_norm, canal, subcanal FROM arr.cliente_categoria_mes
    WHERE UPPER(TRIM(plant_code))=UPPER(TRIM($1)) AND make_date(year,month,1)<=$2::date
    ORDER BY cliente_norm,year DESC,month DESC)
    SELECT cliente_norm AS account,to_char(fecha,'YYYY-MM')||'-01' AS month,COALESCE(SUM(kg),0) AS kg,
    CASE WHEN bool_or((kg>0 AND amount IS NULL) OR (COALESCE(kg,0)<=0 AND COALESCE(amount,0)<>0)) THEN NULL
      ELSE -COALESCE(SUM(amount),0) END AS cost, MAX(cat.canal) AS category,MAX(cat.subcanal) AS subcategory
    FROM v FULL JOIN d USING(fecha,cliente_norm) FULL JOIN cat USING(cliente_norm) GROUP BY 1,2 ORDER BY 1,2`,[code,start,cutoff]);
  const source=buildSource(h.rows,f.rows,start,code);
  return {...source,plants:[plant.nombre,plant.canon,code].filter(Boolean),revision:digest(JSON.stringify(source))};
}

function calculate(source,edits,anchor) {
  if(!edits||typeof edits!=="object"||Array.isArray(edits))throw fail("Ediciones de plan inválidas.");
  const ids=new Set(source.rows.map(row=>row.id));
  for(const [key,edit] of Object.entries(edits)){
    if(!ids.has(key)||!edit||Object.keys(edit).some(k=>!["goal","rate","selected"].includes(k))||
      typeof edit.selected!=="boolean"||!Number.isFinite(edit.goal)||edit.goal<0||edit.goal>1e9||
      (edit.rate!==null && (!Number.isFinite(edit.rate)||edit.rate<0||edit.rate>100)))throw fail("Revisa los valores editados.");
  }
  if(![anchor?.q,anchor?.d,anchor?.a,anchor?.fixed].every(Number.isFinite)||anchor.q<=0||anchor.q>1e6)
    throw fail("Falta la base financiera del IGF seleccionado.");
  const result=evaluatePlan(source,edits,anchor);
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
      Object.entries(input.edits??{}).sort(([a],[b])=>a.localeCompare(b)),saved?null:input.anchor])) : null;
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
    const source=saved?.source??await loadSource(client,plant,period.year,period.month,cutoff);
    if(action==="open"){await client.query("COMMIT");return {source,edits:saved?.edits??{},anchor:saved?.anchor,version:saved?.version,comments:saved?.comments};}
    if(input.revision!==source.revision || (saved&&input.version!==saved.version))throw fail("El plan cambió. Vuelve a abrirlo antes de continuar.",409);
    const anchor=saved?.anchor??input.anchor;
    const result=calculate(source,input.edits,anchor);
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
    if(!result.count)throw fail("Selecciona al menos un comprador para guardar el punto.");
    checked.basis.closing_plan={cutoff,mode,source,anchor:base,edits:input.edits,comments:checked.basis.comments,
      request_id:saved?.request_id??input.request_id,first_signature:saved?.first_signature??signature,version:(saved?.version??0)+1};
    const row=saved?await proposals.update(client,plant.plantaId,checked,Number(id)):await proposals.save(client,plant.plantaId,checked,input.actor);
    await client.query("COMMIT");return {row:brief(row)};
  } catch(e){await client.query("ROLLBACK");throw e;}
}
module.exports={buildSource,loadSource,calculate,handle,brief};
