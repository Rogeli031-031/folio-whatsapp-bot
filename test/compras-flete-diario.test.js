"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const compras=require("../lib/compras-dashboard");
const daily=require("../lib/compras-flete-diario");
const excel=require("../lib/compras-excel");
const providers=[{id:1,nombre:"PEMEX TUXPAN"},{id:2,nombre:"TOMZA TEPEJI"}];
const rates=[{proveedor_id:1,tarifa:1.23},{proveedor_id:2,tarifa:1.33}];
const purchases=[{id:1,proveedor_id:1,fecha:"2026-10-01",kg:100,importe:1000},{id:2,proveedor_id:1,fecha:"2026-10-02",kg:300,importe:3000},{id:3,proveedor_id:2,fecha:"2026-10-01",kg:100,importe:1000}];
function payload(overrides=[]) {
 const grid=compras.aggregatePurchases(purchases,providers,2026,10);
 compras.attachFleteToGrid(grid,rates,providers,overrides);
 return{year:2026,month:10,providers,tarifas_flete:rates,fletes_diarios:overrides,grid,purchases,hg:[]};
}
test("excepción por proveedor y día; cero explícito no usa el predeterminado",()=>{
 const data=payload([{proveedor_id:1,fecha:"2026-10-01",tarifa:2},{proveedor_id:1,fecha:"2026-10-02",tarifa:0}]);
 const [one,two]=data.grid.days;
 assert.equal(one.flete.providers[1].tarifa,2);assert.equal(one.flete.providers[2].tarifa,1.33);
 assert.equal(two.flete.providers[1].tarifa,0);assert.equal(two.flete.providers[1].importe,0);
 assert.equal(data.grid.days[2].flete.providers[1].tarifa,1.23);
 assert.equal(data.grid.month.flete.providers[1].kg,400);assert.equal(data.grid.month.flete.providers[1].importe,200);
 assert.equal(data.grid.month.flete.providers[1].tarifa,0.5);
 assert.equal(data.grid.month.flete.consolidado.importe,333);
 assert.equal(data.grid.month.flete.consolidado.tarifa,333/500);
});
test("restaurar el día retoma la tarifa base y no altera otras fechas",()=>{
 const first=payload([{proveedor_id:1,fecha:"2026-10-01",tarifa:2}]);
 const restored=payload();
 assert.equal(restored.grid.days[0].flete.providers[1].tarifa,1.23);
 assert.equal(first.grid.days[1].flete.providers[1].tarifa,restored.grid.days[1].flete.providers[1].tarifa);
});
test("histórico y HG usan el flete del día anterior, incluido cero",()=>{
 const history=[{fecha:"2026-09-30",proveedor_id:1,kg:100,importe:1000}];
 const monthly=[{proveedor_id:1,year:2026,month:9,tarifa:1.23}];
 assert.equal(compras.latestHgCostFromHistory(history,monthly,[{proveedor_id:1,fecha:"2026-09-30",tarifa:2}]),12);
 assert.equal(compras.latestConsolidatedTarifaFromHistory(history,monthly,[{proveedor_id:1,fecha:"2026-09-30",tarifa:0}]),0);
});
test("valida fecha completa, proveedor, límites y restauración explícita",()=>{
 for(const tarifa of [-1,"1.23",true,{},undefined,Infinity])assert.equal(daily.parse({proveedor_id:1,fecha:"2026-10-01",tarifa}).ok,false);
 assert.equal(daily.parse({proveedor_id:1,fecha:"2026-02-30",tarifa:1}).ok,false);
 assert.equal(daily.parse({proveedor_id:0,fecha:"2026-10-01",tarifa:1}).ok,false);
 assert.equal(daily.parse({proveedor_id:1,fecha:"2026-10-01",tarifa:null}).ok,true);
 assert.equal(daily.parse({proveedor_id:1,fecha:"2026-10-01",tarifa:0}).tarifa,0);
});
test("carga sin tabla es solo lectura y guardado/restauración están acotados a planta, proveedor y fecha",async()=>{
 const calls=[];const client={query:async(sql,params)=>{calls.push({sql,params});return{rows:[]};}};
 assert.deepEqual(await daily.load(client,7,"2026-10-01","2026-10-31"),[]);
 assert.equal(calls.length,1);assert.match(calls[0].sql,/^SELECT/);
 await daily.save(client,7,{proveedor_id:1,fecha:"2026-10-01",tarifa:0},42);
 assert.deepEqual(calls.at(-1).params,[7,1,"2026-10-01",0,42]);
 await daily.save(client,7,{proveedor_id:1,fecha:"2026-10-01",tarifa:null},42);
 assert.deepEqual(calls.at(-1).params,[7,1,"2026-10-01"]);assert.match(calls.at(-1).sql,/^DELETE/);
});
test("Excel diario y total mantienen las tarifas diferentes y el loader financiero conserva cero",async()=>{
 const data=payload([{proveedor_id:1,fecha:"2026-10-01",tarifa:2},{proveedor_id:1,fecha:"2026-10-02",tarifa:0}]);
 const wb=await excel.buildComprasWorkbook(data,{plantName:"Prueba",corteYmd:"2026-10-31"});
 const ws=wb.getWorksheet("CONTROL DE COMPRAS");
 const layout=excel.controlComprasLayout(2);
 assert.equal(ws.getCell(6,layout.fleteStarts[0]+1).value,2);
 assert.equal(ws.getCell(7,layout.fleteStarts[0]+1).value,0);
 const resolved=excel.resolveControlComprasDays(data,{corteYmd:"2026-10-31"});
 assert.equal(resolved.find(d=>d.fecha==="2026-10-02").fleteKg,0);
});
test("API de flete diario mantiene permiso Compras, alcance de planta y pertenencia del proveedor",async()=>{
 const routes=new Map(),calls=[];
 const app=Object.fromEntries(["get","post","patch","delete"].map(method=>[method,(path,...handlers)=>routes.set(`${method}:${path}`,handlers)]));
 compras.registerComprasRoutes(app,{
   pool:{connect:async()=>({release(){},query:async(sql,params)=>{calls.push({sql,params});return{rows:sql.includes("SELECT id, planta_id, activo")?[{id:1,planta_id:1,activo:true}]:[]};}})},
   dashboardAuthMiddleware:(req,res,next)=>req.dashboardAuth?next():res.status(401).json({error:"Sesión requerida"}),
   assertPlantaAccess:(req,id)=>(req.dashboardAuth.plantas_permitidas||[]).includes(id),s3Enabled:()=>false,
 });
 async function invoke(auth,plant=1,provider=1){
   const req={body:{planta_id:plant,proveedor_id:provider,fecha:"2026-10-01",tarifa:0},query:{},dashboardAuth:auth};
   const res={code:200,status(n){this.code=n;return this;},json(data){this.data=data;return this;}};
   for(const handler of routes.get("post:/api/compras/flete-diario")){let next=false;await handler(req,res,()=>next=true);if(!next)break;}
   return res;
 }
 assert.equal((await invoke(null)).code,401);
 assert.equal((await invoke({plantas_permitidas:[1],permisos:{}})).code,403);
 assert.equal((await invoke({plantas_permitidas:[1],permisos:{acceso_compras:true}},2)).code,403);
 assert.equal(calls.length,0);
 // A provider in plant 1 cannot be edited through plant 2 even with both plants visible.
 assert.equal((await invoke({plantas_permitidas:[1,2],permisos:{acceso_compras:true}},2)).code,403);
 assert.ok(calls.every(c=>!/^INSERT|^CREATE/.test(c.sql.trim())));
 const saved=await invoke({actor_id:42,plantas_permitidas:[1],permisos:{acceso_compras:true}});
 assert.equal(saved.code,200);assert.equal(saved.data.tarifa,0);
 assert.deepEqual(calls.find(c=>c.sql.startsWith("INSERT INTO arr.compras_flete_diario")).params,[1,1,"2026-10-01",0,42]);
});
