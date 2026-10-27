"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),XLSX=require("xlsx");
const importer=require("../lib/compras-flete-excel-import"),compras=require("../lib/compras-dashboard");
const serial=date=>(Date.parse(date)-Date.UTC(1899,11,30))/86400000;
function buffer(rows,options={}){
 const title=[];title[24]="FLETE (TARIFA)";
 const head=[];head[1]="Fecha";head[24]="TUXPAN PEMEX";head[25]="TUXPAN IMPOR.";head[26]="TEPEJI PEMEX";
 const wb=XLSX.utils.book_new(),data=rows.map(([fecha,...rates])=>{const row=[];row[1]=serial(fecha);for(let i=0;i<3;i++)row[24+i]=rates[i];return row;});
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([title,head,...data]),options.sheet||"DatosPlanta");
 if(options.formula)wb.Sheets.DatosPlanta.Y3={t:"n",f:"1+1"};
 return XLSX.write(wb,{type:"buffer",bookType:"xlsx"});
}
const file=()=>buffer([["2026-10-01",1.232,2.1,3.1],["2026-10-02",0,2.2,3.2]]);
function spec(){return{planta_id:7,proveedor_id:1,from:"2026-10-01",to:"2026-10-02",rows:importer.parseWorkbook(file(),"PEMEX TUXPAN","2026-10-01","2026-10-02")};}
function db(){
 const state={base:1.23,rows:[{proveedor_id:1,fecha:"2026-10-03",tarifa:8},{proveedor_id:2,fecha:"2026-10-01",tarifa:9}]},calls=[];let old;
 return{state,calls,fail:false,async query(sql,params){
  calls.push({sql,params});
  if(sql==="BEGIN"){old=structuredClone(state);return{rows:[]};}
  if(sql==="ROLLBACK"){Object.assign(state,old);return{rows:[]};}
  if(sql.includes("to_regclass"))return{rows:[{flete_diario:"arr.compras_flete_diario"}]};
  if(sql.includes("SELECT proveedor_id,fecha,tarifa"))return{rows:state.rows.filter(r=>r.fecha>=params[1]&&r.fecha<=params[2])};
  if(sql.includes("SELECT year,month,tarifa"))return{rows:[{year:2026,month:10,tarifa:state.base}]};
  if(sql.startsWith("INSERT INTO arr.compras_flete_diario")){
   if(this.fail&&params[2]==="2026-10-02")throw new Error("write failed");
   state.rows=state.rows.filter(r=>r.proveedor_id!==params[1]||r.fecha!==params[2]);state.rows.push({proveedor_id:params[1],fecha:params[2],tarifa:params[3]});
  }
  return{rows:[]};
 }};
}
test("DatosPlanta selecciona cada proveedor por su encabezado y conserva cero y seis decimales",()=>{
 const expected={"PEMEX TUXPAN":1.232,"TOMZA TUXPAN":2.1,"TOMZA TEPEJI":3.1};
 for(const [provider,value] of Object.entries(expected))assert.equal(importer.parseWorkbook(file(),provider,"2026-10-01","2026-10-02")[0].tarifa,value);
 assert.equal(spec().rows[1].tarifa,0);
 assert.throws(()=>importer.parseWorkbook(file(),"OTRO","2026-10-01","2026-10-02"),/reconocida/);
});
test("rechaza hoja, fecha faltante/duplicada, vacíos, negativos y fórmula sin resultado",()=>{
 assert.throws(()=>importer.parseWorkbook(buffer([],{sheet:"Otra"}),"PEMEX TUXPAN","2026-10-01","2026-10-01"),/DatosPlanta/);
 assert.throws(()=>importer.parseWorkbook(file(),"PEMEX TUXPAN","2026-10-01","2026-10-03"),/Falta la fecha/);
 for(const value of [null,-1])assert.throws(()=>importer.parseWorkbook(buffer([["2026-10-01",value,2,3]]),"PEMEX TUXPAN","2026-10-01","2026-10-01"),/inválido/);
 assert.throws(()=>importer.parseWorkbook(buffer([["2026-10-01",1,2,3]],{formula:true}),"PEMEX TUXPAN","2026-10-01","2026-10-01"),/inválido/);
 assert.throws(()=>importer.parseWorkbook(buffer([["2026-10-01",1,2,3],["2026-10-01",1,2,3]]),"PEMEX TUXPAN","2026-10-01","2026-10-01"),/duplicada/);
});
test("preview es solo lectura; guardado atómico no toca otras fechas, proveedor ni la base",async()=>{
 const client=db(),request=spec(),p=await importer.preview(client,request);
 assert.equal(p.rows[0].actual,1.23);assert.equal(p.rows[0].nuevo,1.232);
 assert.ok(client.calls.every(c=>c.sql.startsWith("SELECT")));
 await importer.save(client,request,p.preview_token,42);
 assert.equal(client.state.base,1.23);assert.equal(client.state.rows.find(r=>r.fecha==="2026-10-03").tarifa,8);
 assert.equal(client.state.rows.find(r=>r.proveedor_id===2).tarifa,9);
 assert.equal(client.state.rows.find(r=>r.proveedor_id===1&&r.fecha==="2026-10-02").tarifa,0);
 assert.equal(client.calls.at(-1).sql,"COMMIT");
 const next=await importer.preview(client,request);await importer.save(client,request,next.preview_token,42);
 assert.equal(client.state.rows.length,4);
});
test("cambio posterior al preview y error de guardado revierten toda la carga",async()=>{
 const client=db(),request=spec(),p=await importer.preview(client,request);
 client.state.base=2;
 await assert.rejects(()=>importer.save(client,request,p.preview_token,42),e=>e.status===409);
 const fresh=await importer.preview(client,request),previous=structuredClone(client.state);client.fail=true;
 await assert.rejects(()=>importer.save(client,request,fresh.preview_token,42),/write failed/);
 assert.deepEqual(client.state,previous);assert.equal(client.calls.at(-1).sql,"ROLLBACK");
});
const providers=[{id:1,nombre:"PEMEX TUXPAN"},{id:2,nombre:"TOMZA TUXPAN"},{id:3,nombre:"TOMZA TEPEJI"}];
function batch(){return{planta_id:7,from:"2026-10-01",to:"2026-10-02",providers:importer.allProviders(file(),providers,"2026-10-01","2026-10-02")};}
test("carga todos los proveedores juntos y conserva fechas externas y predeterminados",async()=>{
 const client=db(),request=batch(),p=await importer.previewAll(client,request);
 assert.equal(p.rows.length,6);assert.deepEqual([...new Set(p.rows.map(r=>r.proveedor_id))],[1,2,3]);
 assert.ok(client.calls.every(c=>c.sql.startsWith("SELECT")));
 const result=await importer.saveAll(client,request,p.preview_token,42);
 assert.equal(result.updated,6);assert.equal(client.state.rows.length,7);assert.equal(client.state.base,1.23);
 for(const provider of request.providers)for(const row of provider.rows)
  assert.equal(client.state.rows.find(r=>r.proveedor_id===provider.proveedor_id&&r.fecha===row.fecha).tarifa,row.tarifa);
 assert.equal(client.state.rows.find(r=>r.fecha==="2026-10-03").tarifa,8);
 assert.deepEqual(client.calls.filter(c=>c.sql.includes("pg_advisory_xact_lock")).map(c=>c.params[0]),["compras-flete:7:1","compras-flete:7:2","compras-flete:7:3"]);
});
test("si cambia cualquier proveedor o falla la última escritura no cambia ninguno",async()=>{
 const client=db(),request=batch(),p=await importer.previewAll(client,request);
 client.state.rows[1].tarifa=10;
 await assert.rejects(()=>importer.saveAll(client,request,p.preview_token,42),e=>e.status===409);
 const fresh=await importer.previewAll(client,request),before=structuredClone(client.state),query=client.query.bind(client);
 client.query=async(sql,params)=>{if(sql.startsWith("INSERT INTO")&&params[1]===3&&params[2]==="2026-10-02")throw new Error("last provider failed");return query(sql,params);};
 await assert.rejects(()=>importer.saveAll(client,request,fresh.preview_token,42),/last provider failed/);
 assert.deepEqual(client.state,before);assert.equal(client.calls.at(-1).sql,"ROLLBACK");
});
test("rechaza proveedores ausentes o duplicados y columna inválida antes de guardar",()=>{
 assert.throws(()=>importer.allProviders(file(),providers.slice(0,2),"2026-10-01","2026-10-02"),/TOMZA TEPEJI/);
 assert.throws(()=>importer.allProviders(file(),[...providers,providers[0]],"2026-10-01","2026-10-02"),/PEMEX TUXPAN/);
 assert.throws(()=>importer.allProviders(buffer([["2026-10-01",1,2,null]]),providers,"2026-10-01","2026-10-01"),/inválido/);
});
test("API aplica sesión, permiso y planta antes de leer archivo; rechaza proveedor ajeno",async()=>{
 const routes=new Map(),calls=[];
 const app=Object.fromEntries(["get","post","patch","delete"].map(method=>[method,(path,...handlers)=>routes.set(`${method}:${path}`,handlers)]));
 compras.registerComprasRoutes(app,{pool:{connect:async()=>({release(){},query:async(sql,params)=>{calls.push({sql,params});return{rows:[{id:1,planta_id:1,nombre:"PEMEX TUXPAN"}]};}})},
  dashboardAuthMiddleware:(req,res,next)=>req.dashboardAuth?next():res.status(401).json({}),assertPlantaAccess:(req,id)=>(req.dashboardAuth.plantas_permitidas||[]).includes(id),s3Enabled:()=>false});
 async function invoke(auth,plant=1){
  const req={query:{},body:{action:"preview",planta_id:plant,proveedor_id:1,desde:"2026-10-01",hasta:"2026-10-02",file_base64:file().toString("base64")},dashboardAuth:auth};
  const res={code:200,status(n){this.code=n;return this;},json(data){this.data=data;return this;}};
  for(const h of routes.get("post:/api/compras/flete-excel-import")){let next=false;await h(req,res,()=>next=true);if(!next)break;}return res;
 }
 assert.equal((await invoke(null)).code,401);assert.equal((await invoke({permisos:{},plantas_permitidas:[1]})).code,403);
 assert.equal((await invoke({permisos:{acceso_compras:true},plantas_permitidas:[1]},2)).code,403);assert.equal(calls.length,0);
 assert.equal((await invoke({permisos:{acceso_compras:true},plantas_permitidas:[1,2]},2)).code,403);
 assert.ok(calls.every(c=>c.sql.startsWith("SELECT")));
});
test("API importa los tres proveedores de la planta aunque se abra desde uno solo",async()=>{
 const routes=new Map(),client=db(),query=client.query.bind(client);
 client.release=()=>{};
 client.query=async(sql,params)=>{
  if(sql.includes("SELECT id, planta_id, nombre")){
   if(sql.includes("WHERE planta_id")){assert.deepEqual(params,[7]);return{rows:providers.map(p=>({...p,planta_id:7}))};}
   return{rows:[{...providers[1],planta_id:7}]};
  }
  return query(sql,params);
 };
 const app=Object.fromEntries(["get","post","patch","delete"].map(method=>[method,(path,...handlers)=>routes.set(`${method}:${path}`,handlers)]));
 compras.registerComprasRoutes(app,{pool:{connect:async()=>client},dashboardAuthMiddleware:(req,res,next)=>next(),assertPlantaAccess:()=>true,s3Enabled:()=>false});
 async function invoke(action,token){
  const req={query:{},body:{action,preview_token:token,planta_id:7,proveedor_id:2,desde:"2026-10-01",hasta:"2026-10-02",file_base64:file().toString("base64")},dashboardAuth:{permisos:{acceso_compras:true},plantas_permitidas:[7]}};
  const res={code:200,status(n){this.code=n;return this;},json(data){this.data=data;return this;}};
  for(const h of routes.get("post:/api/compras/flete-excel-import")){let next=false;await h(req,res,()=>next=true);if(!next)break;}return res;
 }
 const p=await invoke("preview");assert.equal(p.code,200);assert.equal(p.data.rows.length,6);
 const saved=await invoke("save",p.data.preview_token);assert.equal(saved.code,200);assert.equal(saved.data.updated,6);
 assert.deepEqual([...new Set(saved.data.rows.map(r=>r.proveedor_id))],[1,2,3]);
});
