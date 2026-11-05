"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const weekly=require("../lib/igf-diario-weekly-plant"),grafica=require("../lib/igf-diario-grafica");
const desglose=require("../lib/igf-diario-gastos-desglose"),manual=require("../lib/igf-diario-margen-manual"),gastos=require("../lib/igf-diario-gastos-distribucion");
test("columnas: semanas domingo-sábado sin duplicar días, meses exactos y límites",()=>{
 const weeks=weekly.periodWindows(2026,10,"weeks");
 assert.deepEqual(weeks.map(p=>p.label),["Semana 40","Semana 41","Semana 42","Semana 43","Semana 44"]);
 assert.equal(weeks[0].fecha_desde,"2026-09-27");assert.equal(weeks.at(-1).fecha_hasta,"2026-10-31");
 assert.deepEqual(weekly.periodWindows(2026,10,"months").map(p=>p.label),["Julio 2026","Agosto 2026","Septiembre 2026","Octubre 2026"]);
 assert.equal(weekly.periodWindows(2028,2,"months",2)[0].fecha_hasta,"2028-02-29");
 assert.equal(weekly.periodWindows(2027,1,"weeks")[0].fecha_desde,"2026-12-27");
 for(const args of [[2026,13,"weeks"],[2026,10,"bad"],[2026,10,"months",11],[2026,10,"months",0]])assert.throws(()=>weekly.periodWindows(...args),e=>e.status===400);
});

test("weekly columns slide backward across months/years, preserve window size and reject invalid/future starts",()=>{
 const original=weekly.periodWindows(2026,11,"weeks");
 const prior=weekly.periodWindows(2026,11,"weeks",undefined,"2026-10-25");assert.equal(prior.length,original.length);assert.deepEqual(prior.map(c=>c.label),["Semana 44","Semana 45","Semana 46","Semana 47","Semana 48"]);assert.equal(prior.at(-1).fecha_hasta,"2026-11-28");
 const older=weekly.periodWindows(2026,11,"weeks",undefined,"2026-10-18");assert.equal(older[0].label,"Semana 43");assert.equal(older.at(-1).fecha_hasta,"2026-11-21");
 const crossYear=weekly.periodWindows(2027,1,"weeks",undefined,"2026-12-20");assert.equal(crossYear[0].fecha_desde,"2026-12-20");assert.equal(crossYear.length,weekly.periodWindows(2027,1,"weeks").length);
 for(const start of ["2026-10-26","2026-11-08","2026-02-30","bad",""])assert.throws(()=>weekly.periodWindows(2026,11,"weeks",undefined,start),e=>e.status===400);
 assert.throws(()=>weekly.periodWindows(2026,11,"months",8,"2026-10-25"),e=>e.status===400);
});
test("periodos reutilizan cálculos de semana, ponderan por venta y respetan meses/cobertura",async t=>{
 const calls=[];
 t.mock.method(grafica,"loadCdMonthIndex",async()=>({rows:[]}));
 t.mock.method(grafica,"loadPlantFacts",async()=>({salesRows:[]}));
 t.mock.method(grafica,"loadComprasDayMap",async()=>new Map());
 t.mock.method(grafica,"canalTonMaps",()=>({casa:new Map(),com:new Map()}));
 t.mock.method(manual,"listMonthOverrides",async()=>[]);
 t.mock.method(desglose,"listMonth",async()=>[]);
 t.mock.method(gastos,"overridesForPlant",async()=>({}));
 t.mock.method(grafica,"materializePlantMonth",opts=>{
  calls.push(opts);
  const days=[];
  for(let n=1;n<=new Date(Date.UTC(opts.year,opts.month,0)).getUTCDate();n++)days.push({fecha:`${opts.year}-${String(opts.month).padStart(2,"0")}-${String(n).padStart(2,"0")}`,ventaKg:n===1?100:300,precio:n===1?10:20,costoKg:4,fleteKg:1,hgImporte:0,cdKg:n===2?null:-1});
  return{financial_days:days};
 });
 const opts={plant:{nombre:"Puebla",canon:"Puebla",plantaId:1},year:2026,month:10,corteYmd:"2026-10-26",periodMode:"months",firstMonth:9,
  projection:{byPlant:new Map([["Puebla",{promVentaTotal:[0.3,0.3,0.3,0.3,0.3,0.3,0.3]}]])}};
 const client={query(){throw new Error("unexpected SQL");}};
 const result=await weekly.loadPeriodColumns(client,opts);
 assert.equal(calls.length,2);assert.equal(calls[0].project,false);assert.equal(calls[1].project,true);
 const october=result.columns[1];
 assert.equal(october.metrics.venta_kg,9100);assert.equal(october.metrics.ingreso_mxn,181000);
 assert.equal(october.metrics.precio_kg,181000/9100);assert.equal(october.metrics.margen_kg,181000/9100-5);
 assert.equal(october.estado,"parcial");assert.equal(october.complete,false);
 assert.equal(october.coverage.com_desc_kg.kg_covered,8800);
 const weeks=await weekly.loadPeriodColumns(client,{...opts,periodMode:"weeks"});
 const original=await weekly.loadWeeklyPlant(client,{...opts,weekAnchor:"2026-10-04"});
 assert.deepEqual(weeks.columns[1].metrics,original.metrics);
 const shifted=await weekly.loadPeriodColumns(client,{...opts,source:"igf_diario",periodMode:"weeks",periodWeekStart:"2026-09-20"});
 const history=await weekly.loadWeeklyPlant(client,{...opts,weekAnchor:"2026-09-27"});assert.deepEqual(shifted.columns[1].metrics,history.metrics);assert.equal(shifted.columns.length,weeks.columns.length);assert.equal(shifted.columns[0].fecha_desde,"2026-09-20");
 const all=await weekly.loadPeriodColumns(client,{...opts,plants:[opts.plant,{...opts.plant,plantaId:2}]});
 assert.equal(all.columns[1].metrics.venta_kg,18200);assert.equal(all.columns[1].metrics.precio_kg,october.metrics.precio_kg);
 assert.equal(all.columns[1].coverage.com_desc_kg.kg_covered,17600);
});
