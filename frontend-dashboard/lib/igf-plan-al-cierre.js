"use strict";
const {hgCostFromPercent, modelWithHg} = require("./igf-simulation");

const HG_PERCENT_LABEL = "HG (% de la venta)";
const DISCOUNT_LABELS = {igf_diario:"IGF Diario",arr_tablero:"ARR del tablero",forecast:"IGF Forecast"};
const DISCOUNT_SOURCE_ROW = "Fuente de descuento base";

function baseHgPercent(anchor) {
  if (!Number.isFinite(anchor?.hg_pct) || !Number.isFinite(anchor.hg_kg) ||
      !Number.isFinite(anchor.hg_price_kg) || anchor.hg_price_kg <= 0) return null;
  return Number((anchor.hg_pct * 100).toPrecision(15));
}

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

/** @param {number|null} [hgPercent] */
function evaluatePlan(source, changes, anchor, hgPercent = null, discountSource = anchor.mode || "igf_diario", rates = {}) {
  const rows = source.rows.map(row=>evaluateRow(row, changes[row.id], source.margin));
  rows.sort((a,b)=>Number(b.valid)-Number(a.valid) || (b.gain ?? 0)-(a.gain ?? 0) || a.name.localeCompare(b.name,"es") || a.id.localeCompare(b.id));
  const selected=rows.filter(row=>row.selected);
  const valid=selected.every(row=>row.valid);
  const sum=(items,key)=>items.reduce((n,row)=>n+row[key],0);
  const baseKg=anchor.q*1000;
  const kg=baseKg+sum(selected,"kgDelta");
  const costDelta=sum(selected,"costDelta");
  const commercial=sum(selected,"gain");
  const basePercent = baseHgPercent(anchor);
  const percent = hgPercent ?? basePercent;
  const hgChanged = hgPercent != null && hgPercent !== basePercent;
  const hgCost = hgChanged ? hgCostFromPercent(hgPercent, anchor.hg_price_kg) : anchor.hg_kg;
  const model = hgChanged ? modelWithHg(anchor, anchor.hg_kg, hgCost) : anchor;
  let hgError = null;
  if (hgPercent != null && basePercent === null) hgError = "Falta la valoración del HG para este corte.";
  else if (hgPercent != null && (!Number.isFinite(hgPercent) || Math.abs(hgPercent)>100 ||
      !Number.isFinite(hgCost) || Math.abs(hgCost)>100 || Math.abs(model.a)>1000))
    hgError = "Revisa el HG. Debe estar entre −100 % y 100 % y dentro de la valoración permitida.";
  function scenarioAt(baseRate) {
    if (!Number.isFinite(baseRate) || !valid || hgError || !(kg>0)) return null;
    const baseCost=baseKg*baseRate;
    const cost=baseCost+costDelta;
    if (!Number.isFinite(cost)) return null;
    return {
      kg, baseKg, baseRate, baseCost, rate:cost/kg, result:kg*model.a-cost-anchor.fixed, a:model.a,
      hgChanged, hgPercent:percent, hgCost, hgKg:percent==null?null:kg*percent/100,
      hgAmount:hgCost==null?null:-kg*hgCost, hgEffect:kg*(model.a-anchor.a),
      cost, kgDelta:kg-baseKg, commercial, baseResult:baseKg*(anchor.a-baseRate)-anchor.fixed
    };
  }
  const referenceRates = {[anchor.mode || "igf_diario"]:anchor.d,...rates};
  const comparisons = Object.fromEntries(Object.entries(referenceRates).map(([key,rate])=>[key,scenarioAt(rate)]));
  const scenario = comparisons[discountSource] ?? null;
  return {rows, scenario, comparisons, discountSource, hgError, count:selected.length, portfolio:sum(rows.filter(row=>row.valid),"gain"),
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
// Excel stores formatted percentages as fractions. An older workbook has no HG row.
function readPlanHg(sheets) {
  const row = sheets.IGF?.find(r => r[0] === HG_PERCENT_LABEL);
  if (!row || row[2] == null) return null;
  if (!Number.isFinite(row[2]) || Math.abs(row[2]) > 1) throw Error("Revisa el porcentaje de HG en la hoja IGF.");
  return Number((row[2] * 100).toPrecision(15));
}
function readDiscountSource(sheets,originalMode) {
  const row=sheets.IGF?.find(r=>r[0]===DISCOUNT_SOURCE_ROW);
  if(!row)return originalMode; // Old exports used the financial source of the point.
  if(row[1]==="ARR")return "arr_tablero"; // Import buyer inputs and recalculate the older workbook with the board rate.
  const key=Object.keys(DISCOUNT_LABELS).find(k=>DISCOUNT_LABELS[k]===row[1]);
  if(!key)throw Error("La fuente de descuento base del Excel no es válida.");
  return key;
}
module.exports={evaluateRow,evaluatePlan,readPlanEdits,readPlanHg,readDiscountSource,baseHgPercent,HG_PERCENT_LABEL,DISCOUNT_LABELS,DISCOUNT_SOURCE_ROW};
