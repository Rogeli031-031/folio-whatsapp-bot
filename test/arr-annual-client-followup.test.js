"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const ExcelJS=require("exceljs");
const annual=require("../lib/arr-annual-category-analysis");
const {buildFollowup,keyOf,loadFollowup}=require("../lib/arr-annual-client-followup");
const dicf=require("../lib/dicf");
const sale=(plant,client,fecha,kg)=>({plant_code:plant,cliente_norm:client,fecha,kg});
const disc=(plant,client,fecha,monto)=>({plant_code:plant,cliente_norm:client,fecha,monto});
function build(extra={}){return buildFollowup({year:2026,month:10,resolvePlant:annual.resolvePlantLabel,
  sales:[sale("Puebla","CLIENTE A","2026-10-01",100),sale("Puebla","CLIENTE A","2026-10-03",300),sale("Puebla","OTRO","2026-10-06",1)],
  discounts:[disc("Puebla","CLIENTE A","2026-10-01",-200),disc("Puebla","CLIENTE A","2026-10-03",-1500)],configs:[],...extra});}

test("descuentos reales ponderados por kg y descuento exclusivo de última compra, con signo",()=>{
 const row=build().get(keyOf("Puebla","CLIENTE A"));
 assert.equal(row.last_purchase,"2026-10-03");assert.equal(row.frequency_days,2);
 assert.equal(row.month_discount_kg,-4.25);assert.equal(row.last_purchase_discount_kg,-5);
 const series=[100,0,300,0,0,0];
 assert.equal(row.client_state,dicf.clientState(series,2,3,2).state);
});
test("separa plantas, admite cero explícito y no transforma ausencia en cero",()=>{
 const data=build({sales:[sale("Puebla","CLIENTE A","2026-10-03",100),sale("Acapulco","CLIENTE A","2026-10-03",200),sale("Puebla","SIN DESC","2026-10-03",1)],
 discounts:[disc("Puebla","CLIENTE A","2026-10-03",0),disc("Acapulco","CLIENTE A","2026-10-03",-200)]});
 assert.equal(data.get(keyOf("Puebla","CLIENTE A")).month_discount_kg,0);
 assert.equal(data.get(keyOf("Acapulco","CLIENTE A")).month_discount_kg,-1);
 assert.equal(data.get(keyOf("Puebla","SIN DESC")).last_purchase_discount_kg,null);
});
test("cliente sin compra en el mes conserva última fecha anterior sin descuento mensual inventado",()=>{
 const row=build({sales:[sale("Puebla","CLIENTE A","2025-02-01",100),sale("Puebla","OTRO","2026-10-26",1)],
 discounts:[disc("Puebla","CLIENTE A","2025-02-01",-600)]}).get(keyOf("Puebla","CLIENTE A"));
 assert.equal(row.last_purchase,"2025-02-01");assert.equal(row.frequency_days,null);
 assert.equal(row.client_state,"Inactivo");assert.equal(row.month_discount_kg,null);assert.equal(row.last_purchase_discount_kg,-6);
});
test("periodo histórico excluye fechas futuras y el estado usa ventana y tolerancia DICF configuradas",()=>{
 const row=build({sales:[sale("Puebla","CLIENTE A","2026-10-20",100),sale("Puebla","OTRO","2026-10-26",1),sale("Puebla","CLIENTE A","2026-11-01",1000)],
 discounts:[disc("Puebla","CLIENTE A","2026-10-20",-300),disc("Puebla","CLIENTE A","2026-11-01",-9000)],
 configs:[{plant_code:"Puebla",window_days:4,tolerancia_dias:2}]}).get(keyOf("Puebla","CLIENTE A"));
 assert.equal(row.last_purchase,"2026-10-20");assert.equal(row.frequency_days,null);assert.equal(row.month_discount_kg,-3);
 assert.equal(row.last_purchase_discount_kg,-3);
});
test("loader usa consultas de lectura por lote, sin computeDicf ni escrituras",async()=>{
 const calls=[];
 const data=await loadFollowup({query:async(sql,params)=>{calls.push({sql,params});return{rows:sql.includes("dicf_config")?[]:sql.includes("WITH daily")?[sale("Puebla","CLIENTE A","2026-10-03",100)]:[disc("Puebla","CLIENTE A","2026-10-03",-200)]};}},
 {year:2026,month:10,resolvePlant:annual.resolvePlantLabel,codes:["Puebla"]});
 assert.equal(calls.length,3);assert.ok(calls.every(({sql})=>!/(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(sql)));
 assert.ok(calls.every(({params})=>params.includes("2026-10-31")||params[0]===2026));
 assert.equal(data.get(keyOf("Puebla","CLIENTE A")).last_purchase_discount_kg,-2);
});
test("payload enriquece las mismas filas YTD sin cambiar cifras existentes",async()=>{
 const payload=await annual.loadAnnualCategoryAnalysis({}, {year:2026,month:10,
 queryYtdSales:async(_client,from)=>[{plant_code:"Puebla",cliente_norm:"CLIENTE A",canal:"Casa",subcanal:"Autotanque",kg:from.startsWith("2025")?1000:500}],
 queryLatestComments:async()=>[],loadFollowup:async()=>build()});
 const row=payload.casa.negative[0];assert.equal(row.delta_ton,-0.5);assert.equal(row.month_discount_kg,-4.25);assert.equal(row.last_purchase,"2026-10-03");
 const wb=new ExcelJS.Workbook();annual.appendAnnualCategorySheets(wb,payload);
 const ws=wb.getWorksheet("PUEBLA");
 assert.equal(ws.getCell("I9").value,"ÚLTIMA COMPRA");
 assert.equal(ws.getCell("M9").value,"DESCUENTO DÍA ÚLTIMA COMPRA ($/KG)");
 assert.equal(ws.getCell("I10").value.toISOString().slice(0,10),"2026-10-03");assert.equal(ws.getCell("J10").value,2);
 assert.equal(ws.getCell("L10").value,-4.25);assert.equal(ws.getCell("M10").value,-5);
 assert.equal(ws.getCell("E10").value,-0.5);
 const restored=new ExcelJS.Workbook();await restored.xlsx.load(await wb.xlsx.writeBuffer());
 assert.equal(restored.getWorksheet("PUEBLA").getCell("I10").value.toISOString().slice(0,10),"2026-10-03");
 assert.equal(restored.getWorksheet("PUEBLA").autoFilter,"A9:M10");
});
