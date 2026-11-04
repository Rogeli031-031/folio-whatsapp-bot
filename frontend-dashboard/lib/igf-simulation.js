"use strict";
const finite = v => typeof v === "number" && Number.isFinite(v);
function modelFromRow(row) {
 if (![row.ventaTon,row.comDesc,row.resultadoFinalImporte,row.operativos,row.corporativos,row.impuestos].every(finite) || row.ventaTon <= 0) return null;
 const q=row.ventaTon, d=-row.comDesc;
 const fixed=row.operativos+row.corporativos+row.impuestos*q*1000;
 if (fixed < 0) return null;
 // Calibrate to the selected dashboard result, preserving its tax/HG convention.
 return { q, d, fixed, a:(row.resultadoFinalImporte+fixed)/(q*1000)+d };
}
const profit = (model,q,d) => q*1000*(model.a-d)-model.fixed;
function modelWithHg(model, baseHg, hg) {
 // HG is a signed cost per kg: a higher HG reduces contribution and profit.
 if(!model||!finite(baseHg)||!finite(hg))return model;
 return {...model,a:model.a+baseHg-hg};
}
function hgPercentContext(row) {
 const cost=finite(row.hgKg)?row.hgKg:null;
 let price=finite(row.hgDollar)&&row.hgDollar>0?row.hgDollar:null;
 if(price==null&&cost!=null&&finite(row.hgPct)&&row.hgPct!==0)price=Math.abs(cost/row.hgPct)||null;
 return {cost,price,percent:cost!=null&&price!=null?(Number((-cost/price*100).toPrecision(12))||0):null};
}
function hgCostFromPercent(percent,price) {
 return finite(percent)&&finite(price)&&price>0?-percent/100*price:null;
}
function weeklyFinancials(metrics) {
 const m=metrics||{},kg=m.venta_kg;
 const amount=keys=>finite(kg)&&kg>0&&keys.every(k=>finite(m[k]))?keys.reduce((s,k)=>s+m[k],0)*kg:null;
 const operativos=finite(m.gasto_operativo_forecast_kg)?amount(["gasto_operativo_forecast_kg"]):amount(["presupuesto_nomina_gastos_kg","presupuesto_imss_sua_kg","extraordinarios_kg","provisiones_planta_kg"]);
 const corporativos=amount(["gasto_corporativo_kg","inversiones_kg","impuestos_federales_kg"]);
 return {margen:finite(m.margen_kg)?m.margen_kg:null,operativos,corporativos,gasto:operativos!=null&&corporativos!=null?operativos+corporativos:null};
}
function historyPeriods(year, month, monthsBack = 1) {
 const back = Math.max(0, Math.min(5, Math.trunc(monthsBack)));
 return Array.from({length:back+1},(_,i)=>{
  const date=new Date(Date.UTC(year,month-1-back+i,1));
  return {year:date.getUTCFullYear(),month:date.getUTCMonth()+1};
 });
}
function mergeWeekColumns(batches) {
 // Adjacent monthly responses can contain the same Sunday–Saturday week.
 // Prefer the later month, whose projection context matches that boundary.
 const weeks=new Map();
 for(const columns of batches)for(const column of columns||[])weeks.set(column.key,column);
 return [...weeks.values()].sort((a,b)=>a.fecha_desde.localeCompare(b.fecha_desde));
}
function visibleWeekPoints(weeks, hiddenKeys) {
 const hidden=new Set(hiddenKeys);
 return weeks.filter(week=>week.available&&!hidden.has(week.key)).map(week=>({...week,color:"#c084fc"}));
}
function axisTicks(min, max, target = 5) {
 if(!Number.isFinite(min)||!Number.isFinite(max)||max<=min)return [];
 const raw=(max-min)/Math.max(2,target),power=10**Math.floor(Math.log10(raw));
 const unit=raw/power,step=(unit<=1?1:unit<=2?2:unit<=5?5:10)*power;
 const ticks=[];
 for(let i=Math.ceil(min/step);i<=Math.floor(max/step);i++)ticks.push(Number((i*step).toPrecision(12)));
 // An asymmetric interval can otherwise show only zero and positive labels.
 if(min<0&&!ticks.some(v=>v<0))ticks.unshift(min);
 if(max>0&&!ticks.some(v=>v>0))ticks.push(max);
 return ticks;
}
function weeklyPoints(columns, year, month) {
 const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
 return (columns||[]).map(c=>{
  const m=c.metrics||{}, coverage=c.coverage||{};
  const covered=key=>coverage[key] && coverage[key].coverage_kg_pct != null && coverage[key].coverage_kg_pct>=99.999;
  const length=(Date.parse(c.fecha_hasta)-Date.parse(c.fecha_desde))/86400000+1;
  const available=finite(m.venta_kg)&&m.venta_kg>0&&finite(m.com_desc_kg)&&finite(m.resultado_mxn)&&covered("resultado")&&covered("com_desc_kg")&&length>0;
  return { key:c.key,label:c.label,from:c.fecha_desde,to:c.fecha_hasta,state:c.estado,metrics:m,financials:weeklyFinancials(m),forecastSources:c.forecast_sources||[],
   q:finite(m.venta_kg)&&m.venta_kg>0&&length>0?m.venta_kg/1000/length*daysInMonth:null,
   d:finite(m.com_desc_kg)&&covered("com_desc_kg")?-m.com_desc_kg:null,
   z:available?m.resultado_mxn/length*daysInMonth:null,
   actualTon:m.venta_kg==null?null:m.venta_kg/1000,actualResult:available?m.resultado_mxn:null,available };
 });
}
function closestEquilibrium(s) {
 if(!finite(s.a)||!finite(s.fixed)||s.a<=0||s.fixed<0)return null;
 if(s.fixed===0)return {q:s.q,d:s.a};
 const K=s.fixed/1000,volumeScale=1600,discountScale=4.5,minimum=K/s.a;
 const eq=v=>s.a-K/v,objective=v=>((v-s.q)/volumeScale)**2+((eq(v)-s.d)/discountScale)**2;
 const trial=Math.max(minimum,s.q),radius=Math.sqrt(objective(trial));
 if(radius<1e-12)return {q:trial,d:Math.max(0,eq(trial))};
 const lo=Math.max(minimum,s.q-volumeScale*radius),hi=Math.max(lo,s.q+volumeScale*radius);
 const ratio=volumeScale**2/discountScale**2,B=ratio*K*(s.a-s.d),C=ratio*K*K;
 const polynomial=v=>v**4-s.q*v**3+B*v-C,derivative=v=>4*v**3-3*s.q*v*v+B;
 function rootsBetween(fn,breaks){const roots=[];for(let i=0;i<breaks.length-1;i++){
  let l=breaks[i],r=breaks[i+1],fl=fn(l),fr=fn(r);if(fl===0)roots.push(l);if(fr===0)roots.push(r);
  if(Math.sign(fl)===Math.sign(fr))continue;
  for(let n=0;n<90;n++){const m=(l+r)/2;if(m===l||m===r)break;const fm=fn(m);if(fm===0){l=r=m;break;}if(Math.sign(fm)===Math.sign(fl)){l=m;fl=fm;}else r=m;}
  roots.push((l+r)/2);
 }return roots;}
 const splits=[lo,...(s.q/2>lo&&s.q/2<hi?[s.q/2]:[]),hi];
 const critical=rootsBetween(derivative,splits).filter(v=>v>lo&&v<hi).sort((a,b)=>a-b);
 const candidates=[lo,hi,trial,...critical,...rootsBetween(polynomial,[lo,...critical,hi])];
 const q=candidates.reduce((best,v)=>objective(v)<objective(best)?v:best,trial);
 return {q,d:Math.max(0,eq(q))};
}
module.exports={modelFromRow,modelWithHg,hgPercentContext,hgCostFromPercent,profit,weeklyPoints,closestEquilibrium,historyPeriods,mergeWeekColumns,visibleWeekPoints,axisTicks,weeklyFinancials};
