"use strict";

// All quantities in calculations are kg. The editor converts only the displayed tonnage.
function evaluateRow(row, change, margin) {
  const rate = change ? change.rate : row.rate;
  const goal = change ? change.goal : row.goal;
  const remaining = row.base - row.real;
  const planned = goal - row.real;
  const valid = Number.isFinite(goal) && goal >= row.real && goal <= 1e9 &&
    (rate === null ? planned === 0 : Number.isFinite(rate) && rate >= 0 && rate <= 100) &&
    remaining >= 0 && (remaining === 0 || row.continuity !== null);
  const baseCost = remaining * (row.continuity ?? 0);
  const costDelta = valid ? planned * (rate ?? 0) - baseCost : null;
  const kgDelta = valid ? goal - row.base : null;
  return {...row, goal, rate, valid, selected:change?.selected ?? row.selected ?? false, costDelta, kgDelta,
    gain: valid ? kgDelta * margin - costDelta : null,
    downside: valid && (rate !== null || remaining === 0) ? remaining * ((row.continuity ?? 0) - (rate ?? 0)) : null,
    minimum: valid && rate !== null && margin > rate ? row.real + Math.max(0,(remaining*margin-baseCost)/(margin-rate)) : null};
}

function evaluatePlan(source, changes, anchor) {
  const rows = source.rows.map(row=>evaluateRow(row, changes[row.id], source.margin));
  rows.sort((a,b)=>Number(b.valid)-Number(a.valid) || (b.gain ?? 0)-(a.gain ?? 0) || a.name.localeCompare(b.name,"es") || a.id.localeCompare(b.id));
  const selected=rows.filter(row=>row.selected);
  const valid=selected.every(row=>row.valid);
  const sum=(items,key)=>items.reduce((n,row)=>n+row[key],0);
  const kg=anchor.q*1000+sum(selected,"kgDelta");
  const cost=anchor.q*1000*anchor.d+sum(selected,"costDelta");
  const scenario=valid && kg>0 && Number.isFinite(cost) ? {
    kg, rate:cost/kg, result:kg*anchor.a-cost-anchor.fixed,
    cost, kgDelta:kg-anchor.q*1000, commercial:sum(selected,"gain"),
    baseResult:anchor.q*1000*(anchor.a-anchor.d)-anchor.fixed
  } : null;
  return {rows, scenario, count:selected.length, portfolio:sum(rows.filter(row=>row.valid),"gain"),
    pending:rows.filter(row=>!row.valid).length};
}

// Accept the reviewed workbook or an export of this screen. Only F, G and
// the inclusion flag are imported. The source of all actuals stays the dashboard.
function readPlanEdits(sheets,source,context) {
  const normalize=v=>String(v??"").normalize("NFD").replace(/\p{M}/gu,"").replace(/[-–—]/g," ").replace(/\s+/g," ").trim().toLowerCase();
  const rows=sheets["Plan al cierre"]??[], header=rows.findIndex(r=>r[0]==="Comprador");
  if(header<0||!String(rows[header][5]).startsWith("Nuevo descuento")||!String(rows[header][6]).startsWith("Meta de cierre"))
    throw Error("Elige un Excel con la hoja Plan al cierre y las columnas F y G.");
  const modern=sheets.IGF?.find(r=>r[0]==="Corte");
  let plant,cutoff,mode;
  if(modern){
    plant=sheets.IGF.find(r=>r[0]==="Planta")?.[1];cutoff=modern[1];mode=sheets.IGF.find(r=>r[0]==="Fuente")?.[1];
  }else{
    plant=rows.slice(0,header).find(r=>String(r[0]).includes(" · "))?.[0]?.split(" · ")[0];
    const info=sheets["IGF "+plant]?.find(r=>String(r[0]).includes("IGF Diario acumulado al corte"));
    const date=String(info?.[0]??"").match(/al corte del (\d\d)\/(\d\d)\/(\d{4})/);
    cutoff=date ? [date[3],date[2],date[1]].join("-") : null;mode="igf_diario";
  }
  if(!(source.plants??[context.plant]).some(p=>normalize(p)===normalize(plant))||cutoff!==context.cutoff||mode!==context.mode)
    throw Error("La planta, la fuente o el corte del Excel no coincide con el simulador.");
  const byName=new Map(source.rows.map(r=>[r.name,r]));
  /** @type {Record<string,{rate:number|null,goal:number,selected:boolean}>} */
  const changes={};
  for(const line of rows.slice(header+1)){
    if(!line[0])continue;
    const row=byName.get(line[0]),mark=normalize(line[10]);
    if(!row||changes[row.id]||!["si","no"].includes(mark))throw Error("El archivo contiene compradores o marcas de inclusión distintos al plan.");
    const [real,base,rate,goal]=[line[1],line[3],line[5]??null,line[6]];
    if(![real,base,goal].every(Number.isFinite)||Math.abs(real*1000-row.real)>0.51||Math.abs(base*1000-row.base)>0.51||
      (rate!==null&&(!Number.isFinite(rate)||rate<0||rate>100))||goal<0||goal>1e6)
      throw Error("Revisa las ventas y tasas del comprador "+row.name+" en el Excel.");
    changes[row.id]={rate,goal:Math.abs(goal*1000-row.real)<1e-6?row.real:goal*1000,selected:mark==="si"};
  }
  if(Object.keys(changes).length!==source.rows.length)throw Error("El Excel debe incluir toda la cartera de este corte.");
  return changes;
}
module.exports={evaluateRow,evaluatePlan,readPlanEdits};
