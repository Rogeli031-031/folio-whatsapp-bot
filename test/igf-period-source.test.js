"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const weekly=require("../lib/igf-diario-weekly-plant"),grafica=require("../lib/igf-diario-grafica"),historical=require("../lib/igf-period-forecast-fallback");
const plant={nombre:"Puebla",canon:"Puebla",plantaId:1};
const source={id:10,version_number:3,rows:[{empresa:"GT Puebla",venta_ton:900,margen_kg:6,com_desc_kg:3,resultado_final_importe:1234}]};
function realMonth(year,month,project=false){
 const prefix=`${year}-${String(month).padStart(2,"0")}`,casaTon=new Map(),comTon=new Map(),comprasByFecha=new Map();
 for(let d=1;d<=new Date(Date.UTC(year,month,0)).getUTCDate();d++){
  const date=`${prefix}-${String(d).padStart(2,"0")}`;casaTon.set(date,d===1?0:1);comTon.set(date,2);comprasByFecha.set(date,{costoKg:10,fleteKg:1,hgImporte:0});
 }
 return grafica.materializePlantMonth({year,month,plant:"Puebla",corteYmd:"2026-11-02",project,casaTon,comTon,comprasByFecha,precioRows:[{fecha:`${prefix}-01`,precio:20}],cdByFecha:new Map([[`${prefix}-01`,-2]])});
}
test("closed months preserve captured daily sales, prices, costs and freight rather than projecting from day zero",()=>{
 const result=realMonth(2026,10);
 assert.equal(result.financial_days[0].ventaKg,2000);
 assert.equal(result.financial_days[1].ventaKg,3000);
 assert.equal(result.financial_days[1].precio,20);assert.equal(result.financial_days[1].costoKg,10);assert.equal(result.financial_days[1].fleteKg,1);
 assert.equal(result.financial_days.reduce((s,d)=>s+d.ventaKg,0),92000);
});
test("daily period source keeps real October and never substitutes Forecast; legacy auto also retains existing daily data",async t=>{
 const manual=require("../lib/igf-diario-margen-manual"),desglose=require("../lib/igf-diario-gastos-desglose"),gastos=require("../lib/igf-diario-gastos-distribucion");
 t.mock.method(grafica,"loadCdMonthIndex",async()=>({rows:[]}));t.mock.method(grafica,"loadPlantFacts",async()=>({salesRows:[]}));t.mock.method(grafica,"loadComprasDayMap",async()=>new Map());
 t.mock.method(manual,"listMonthOverrides",async()=>[]);t.mock.method(desglose,"listMonth",async()=>[]);t.mock.method(gastos,"overridesForPlant",async()=>({}));
 t.mock.method(grafica,"canalTonMaps",()=>({casa:new Map([["2026-10-02",1]]),com:new Map([["2026-10-02",2]])}));
 let reads=0;t.mock.method(historical,"loadHistoricalForecast",async()=>{reads++;return source;});
 const opts={plant,year:2026,month:11,corteYmd:"2026-11-02",periodMode:"months",firstMonth:10,loadPrecio:async()=>[{fecha:"2026-10-01",precio:20}]};
 const client={query(){throw Error("unexpected SQL");}};
 const daily=await weekly.loadPeriodColumns(client,{...opts,source:"igf_diario"});
 assert.equal(daily.columns[0].metrics.venta_kg,3000);assert.equal(daily.columns[0].metrics.precio_kg,20);assert.equal(daily.columns[0].metrics.ingreso_mxn,60000);assert.deepEqual(daily.columns[0].forecast_sources,[]);assert.equal(reads,0);
 const auto=await weekly.loadPeriodColumns(client,opts);assert.equal(auto.columns[0].metrics.venta_kg,3000);assert.equal(reads,0);
});
test("explicit Forecast uses only each monthly snapshot, including the selected month, and shares version reads across plants",async t=>{
 let reads=[];t.mock.method(historical,"loadHistoricalForecast",async(c,y,m,opts)=>{reads.push({y,m,opts});return source;});
 t.mock.method(grafica,"loadPlantFacts",async()=>{throw Error("Forecast must not load daily facts");});
 const opts={plants:[plant,plant],year:2026,month:11,firstMonth:10,periodMode:"months",source:"forecast",versionAsOfCorte:true,corteYmd:"2026-11-02"};
 const result=await weekly.loadPeriodColumns({},opts);
 assert.deepEqual(reads.map(r=>r.m),[10,11]);assert.ok(reads.every(r=>r.opts.versionAsOfCorte&&r.opts.corteYmd==="2026-11-02"));
 for(const c of result.columns){assert.equal(c.source,"forecast");assert.equal(c.metrics.venta_kg,1800000);assert.equal(c.metrics.resultado_mxn,2468);assert.equal(c.metrics.precio_kg,null);assert.equal(c.forecast_sources.length,2);}
});
test("missing Forecast stays unknown and unsupported source/weekly Forecast is rejected before reads",async t=>{
 t.mock.method(historical,"loadHistoricalForecast",async()=>null);
 const result=await weekly.loadPeriodColumns({},{plant,year:2026,month:11,firstMonth:11,periodMode:"months",source:"forecast"});
 assert.equal(result.columns[0].metrics.resultado_mxn,null);assert.deepEqual(result.columns[0].forecast_sources,[]);
 for(const opts of [{source:"bad",periodMode:"months"},{source:"forecast",periodMode:"weeks"}])await assert.rejects(weekly.loadPeriodColumns({},{...opts,plant,year:2026,month:11}),e=>e.status===400);
});
