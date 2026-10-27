"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const fallback=require("../lib/igf-period-forecast-fallback"),weekly=require("../lib/igf-diario-weekly-plant");
const plant={nombre:"Puebla",canon:"Puebla"};
const source={id:75,version_number:8,rows:[{empresa:"GT Puebla",venta_ton:1629.4538,margen_kg:6.4928,com_desc_kg:4.7137,gasto_kg:1.5796,
 impuesto_kg:0.1993,hg_kg:-0.8236,bancos_planta_kg:0.0837,provision_planta_kg:0.1054,
 gtos_apoyos_corp_kg:1.1126,bancos_corp_kg:0,otros_programas_kg:0,inversiones_kg:0.0504,
 util_oper_kg:0.388,resultado_final_kg:-0.775,resultado_final_importe:-1256310.4942}]};
function empty(){return{...weekly.aggregateWeek([],"2026-10-27"),metrics:{...Object.fromEntries(weekly.METRICS.map(([key])=>[key,null])),venta_kg:0}};}
test("solo meses históricos sin venta ni detalle; no cambia semana ni mes abierto",()=>{
 const summary=empty(),period={fecha_hasta:"2026-09-30"},opts={year:2026,month:10,periodMode:"months"};
 assert.equal(fallback.emptyHistoricalMonth(summary,period,opts),true);
 assert.equal(fallback.emptyHistoricalMonth(summary,period,{...opts,periodMode:"weeks"}),false);
 assert.equal(fallback.emptyHistoricalMonth(summary,{fecha_hasta:"2026-10-31"},opts),false);
 for(const metrics of [{venta_kg:100},{precio_kg:0},{resultado_mxn:0},{ingreso_mxn:0}])assert.equal(fallback.emptyHistoricalMonth({...summary,metrics:{...summary.metrics,...metrics}},period,opts),false);
});
test("recupera histórico exacto, toneladas a kilos, signo C&D y campos con fuente sin inventar desglose",()=>{
 const summary=empty(),result=fallback.fillFromForecast(summary,source,plant);
 assert.equal(result.metrics.venta_kg,1629453.8);assert.equal(result.metrics.com_desc_kg,-4.7137);
 assert.equal(result.metrics.margen_kg,6.4928);assert.equal(result.metrics.resultado_mxn,-1256310.4942);
 assert.equal(result.metrics.hg_mxn,-0.8236*1629453.8);assert.equal(result.metrics.gasto_operativo_forecast_kg,1.5796);
 for(const key of ["precio_kg","costo_kg","flete_kg","ingreso_mxn","presupuesto_nomina_gastos_kg","presupuesto_imss_sua_kg","extraordinarios_kg"])assert.equal(result.metrics[key],null);
 assert.equal(result.forecast_source.version_id,75);assert.equal(result.coverage.resultado.days_covered,null);
 assert.equal(summary.metrics.venta_kg,0);
});
test("conserva valores existentes incluidos ceros y HG del detalle",()=>{
 const summary=empty();summary.metrics.hg_mxn=-1290052.14;summary.metrics.margen_kg=0;summary.metrics.resultado_kg=0;
 const result=fallback.fillFromForecast(summary,source,plant);
 for(const key of ["hg_mxn","margen_kg","resultado_kg"]){assert.equal(result.metrics[key],summary.metrics[key]);assert.ok(!result.forecast_source.fields.includes(key));}
});
test("sin versión, planta, venta válida o emparejamiento único conserva la columna",()=>{
 const summary=empty();
 for(const snapshot of [null,{...source,rows:[]},{...source,rows:[source.rows[0],source.rows[0]]},{...source,rows:[{...source.rows[0],venta_ton:null}]}])assert.equal(fallback.fillFromForecast(summary,snapshot,plant),summary);
 assert.equal(fallback.fillFromForecast(summary,source,{nombre:"Morelos"}),summary);
});
test("lector usa SELECT, versión global del mes y corte opcional; sin presupuesto/folios actuales",async()=>{
 const calls=[],client={query:async(sql,params)=>{calls.push({sql,params});return{rows:sql.includes("igf.versions")?[{id:75,version_number:8}]:source.rows};}};
 const snapshot=await fallback.loadHistoricalForecast(client,2026,7,{versionAsOfCorte:true,corteYmd:"2026-10-27"});
 assert.equal(snapshot.id,75);assert.deepEqual(calls[0].params,[2026,7,"2026-10-27"]);
 assert.ok(calls.every(c=>/^SELECT/.test(c.sql)));assert.match(calls[0].sql,/created_at/);assert.deepEqual(calls[1].params,[75]);
 calls.length=0;await fallback.loadHistoricalForecast(client,2026,7,{});assert.deepEqual(calls[0].params,[2026,7]);
});
test("integración: solo carga Forecast para meses vacíos, comparte lectura entre plantas y mantiene octubre",async t=>{
 const grafica=require("../lib/igf-diario-grafica"),manual=require("../lib/igf-diario-margen-manual"),desglose=require("../lib/igf-diario-gastos-desglose"),gastos=require("../lib/igf-diario-gastos-distribucion");
 t.mock.method(grafica,"loadCdMonthIndex",async()=>({rows:[]}));t.mock.method(grafica,"loadPlantFacts",async()=>({salesRows:[]}));
 t.mock.method(grafica,"loadComprasDayMap",async()=>new Map());t.mock.method(grafica,"canalTonMaps",()=>({casa:new Map(),com:new Map()}));
 t.mock.method(manual,"listMonthOverrides",async()=>[]);t.mock.method(desglose,"listMonth",async()=>[]);t.mock.method(gastos,"overridesForPlant",async()=>({}));
 t.mock.method(grafica,"materializePlantMonth",opts=>({financial_days:[{fecha:`2026-${String(opts.month).padStart(2,"0")}-01`,ventaKg:opts.month===10?100:0,precio:opts.month===10?20:null,costoKg:opts.month===10?4:null,fleteKg:opts.month===10?1:null,hgImporte:opts.month===9?-1290052.14:null}]}));
 const reads=[];t.mock.method(fallback,"loadHistoricalForecast",async(client,y,m)=>{reads.push(m);return source;});
 const opts={plant,year:2026,month:10,corteYmd:"2026-10-27",periodMode:"months",firstMonth:9};
 const client={query(){throw new Error("unexpected SQL");}};
 const individual=await weekly.loadPeriodColumns(client,opts);
 assert.deepEqual(reads,[9]);assert.equal(individual.columns[0].metrics.hg_mxn,-1290052.14);
 assert.equal(individual.columns[0].metrics.venta_kg,1629453.8);assert.equal(individual.columns[1].metrics.venta_kg,100);
 assert.deepEqual(individual.columns[1].forecast_sources,[]);
 reads.length=0;const all=await weekly.loadPeriodColumns(client,{...opts,plants:[plant,plant]});
 assert.deepEqual(reads,[9]);assert.equal(all.columns[0].metrics.venta_kg,3258907.6);
 assert.equal(all.columns[0].metrics.resultado_mxn,-2512620.9884);
 assert.equal(all.columns[0].metrics.gasto_operativo_forecast_kg,1.5796);
});
