"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {modelFromRow,profit,weeklyPoints,closestEquilibrium}=require("../frontend-dashboard/lib/igf-simulation");
const proposals=require("../lib/igf-simulation-proposals"),register=require("../lib/igf-simulation-routes");
const {historyPeriods,mergeWeekColumns,visibleWeekPoints}=require("../frontend-dashboard/lib/igf-simulation");

test("history includes October weeks in November, crosses year boundaries and deduplicates shared weeks",()=>{
 assert.deepEqual(historyPeriods(2026,11),[{year:2026,month:10},{year:2026,month:11}]);
 assert.deepEqual(historyPeriods(2027,1),[{year:2026,month:12},{year:2027,month:1}]);
 assert.equal(historyPeriods(2026,11,5).length,6);
 const week40={key:"2026-09-27",fecha_desde:"2026-09-27",label:"Semana 40"};
 const old={key:"2026-11-01",fecha_desde:"2026-11-01",label:"Semana 45",marker:"old"},current={...old,marker:"current"};
 const merged=mergeWeekColumns([[week40,old],[current]]);assert.equal(merged.length,2);assert.equal(merged[0].label,"Semana 40");assert.equal(merged[1].marker,"current");
});
test("week filtering excludes only selected/unknown financial points and preserves their original values",()=>{
 const weeks=[{key:"a",label:"Semana 40",available:true,q:100,d:2,z:-1000},{key:"b",available:true,q:200,d:3,z:2000},{key:"missing",available:false,q:300,d:null,z:null}];
 const visible=visibleWeekPoints(weeks,["b"]);assert.equal(visible.length,1);assert.equal(visible[0].q,100);assert.equal(visible[0].z,-1000);
 assert.equal(visibleWeekPoints(weeks,[]).length,2);assert.equal(weeks.length,3);
});

test("dashboard anchor reproduces signed discount, HG/tax conventions and missing values",()=>{
 const row={ventaTon:919.31,comDesc:-3.85,resultadoFinalImporte:-794397,operativos:2304423,corporativos:924897,impuestos:.24};
 const model=modelFromRow(row);assert.ok(Math.abs(profit(model,model.q,model.d)-row.resultadoFinalImporte)<1e-8);
 assert.ok(profit(model,model.q+100,model.d)>row.resultadoFinalImporte);
 assert.equal(profit(model,model.q,model.d-.1)-row.resultadoFinalImporte,91931);
 for(const key of Object.keys(row))assert.equal(modelFromRow({...row,[key]:null}),null);
 assert.equal(modelFromRow({...row,ventaTon:0}),null);
});
test("closest equilibrium is globally minimal and satisfies zero profit",()=>{
 for(const [q,d] of [[1400,3.6],[835,1.85],[400,5],[2000,0],[3000,2]]){
  const m={q,d,a:6.525225303866561,fixed:3850193.5114285713},n=closestEquilibrium(m);
  assert.ok(Math.abs(profit(m,n.q,n.d))<1e-6);
  const dist=(v,w)=>((v-q)/1600)**2+((w-d)/4.5)**2;
  for(let i=0;i<10000;i++){const v=m.fixed/1000/m.a+i;assert.ok(dist(n.q,n.d)<=dist(v,m.a-m.fixed/1000/v)+1e-9);}
 }
 assert.equal(closestEquilibrium({q:100,d:2,a:-1,fixed:1000}),null);
});
test("weeks require full financial coverage, normalize periods, retain partial state and known sales",()=>{
 const full={coverage_kg_pct:100};
 const c={key:"a",label:"Semana 45",fecha_desde:"2026-11-01",fecha_hasta:"2026-11-07",estado:"parcial",metrics:{venta_kg:70000,com_desc_kg:-3,resultado_mxn:7000},coverage:{resultado:full,com_desc_kg:full}};
 const [week]=weeklyPoints([c],2026,11);assert.equal(week.q,300);assert.equal(week.d,3);assert.equal(week.z,30000);assert.equal(week.state,"parcial");
 const [gap]=weeklyPoints([{...c,coverage:{...c.coverage,resultado:{coverage_kg_pct:50}}}],2026,11);
 assert.equal(gap.available,false);assert.equal(gap.z,null);assert.equal(gap.actualResult,null);assert.equal(gap.q,300);
});
const valid={year:2026,month:11,name:"Propuesta Puebla",volume_ton:1400,discount_kg:3.6,basis:{a:6.5,fixed:3800000,mode:"igf_diario",cutoff:"2026-11-02",version_as_of:true,token:"never persist"}};
test("proposal validation retains only assumptions and rejects malformed or nonnumeric input",()=>{
 assert.equal(proposals.parseProposal(valid).basis.token,undefined);
 for(const value of [null,"",true,NaN,Infinity,-1,1000001])assert.ok(proposals.parseProposal({...valid,volume_ton:value}).error);
 assert.ok(proposals.parseProposal({...valid,basis:{...valid.basis,fixed:null}}).error);
 assert.ok(proposals.parseProposal({...valid,name:" "}).error);
 assert.ok(proposals.parsePeriod({year:2026,month:13}).error);
});
function harness(auth={role:"GG",plantas_permitidas:[2]},computeCategories=async()=>({rows:[]})){
 const routes={},queries=[];let released=0;
 const client={release(){released++;},async query(sql,args){queries.push({sql,args});return {rows:[{id:"7",name:"Saved"}],rowCount:1};}};
 const app={};for(const method of ["get","post","delete"])app[method]=(path,middleware,fn)=>{routes[`${method}:${path}`]=fn;};
 register(app,{pool:{connect:async()=>client},auth(){},blockGA:(_req,res)=>{if(auth.role==="GA"){res.status(403).json({error:"Forbidden"});return true;}return false;},blockGV:()=>false,resolvePlant:async(_client,code)=>({plantaId:code==="Puebla"?2:3,provinciaPlantCode:code}),computeCategories});
 async function call(method,path,input){const res={code:200,status(n){this.code=n;return this;},json(body){this.body=body;return this;}};await routes[`${method}:${path}`]({dashboardAuth:auth,body:input,query:input},res);return res;}
 return {call,queries,get released(){return released;}};
}
const route="/api/dashboard/igf-simulation-proposals";
test("plant scope is enforced on read/write/delete before any proposal query",async()=>{
 const h=harness();for(const method of ["get","post","delete"]){const res=await h.call(method,route,{...valid,plant_code:"Other",id:7});assert.equal(res.code,403);}
 assert.equal(h.queries.length,0);assert.equal(h.released,3);
 const ga=harness({role:"GA",plantas_permitidas:[2]});assert.equal((await ga.call("post",route,{...valid,plant_code:"Puebla"})).code,403);assert.equal(ga.queries.length,0);
});
test("saved proposals use plant/month scope and numeric assumptions without production financial writes",async()=>{
 const h=harness();await h.call("post",route,{...valid,plant_code:"Puebla"});
 const insert=h.queries.find(q=>q.sql.includes("INSERT INTO"));assert.deepEqual(insert.args.slice(0,6),[2,2026,11,valid.name,1400,3.6]);assert.equal(JSON.parse(insert.args[6]).token,undefined);
 await h.call("get",route,{year:2026,month:11,plant_code:"Puebla"});const select=h.queries.find(q=>q.sql.includes("SELECT id"));assert.deepEqual(select.args,[2,2026,11]);
 await h.call("delete",route,{year:2026,month:11,plant_code:"Puebla",id:7});const del=h.queries.find(q=>q.sql.includes("DELETE FROM"));assert.deepEqual(del.args,[7,2,2026,11]);
 assert.ok(h.queries.every(q=>q.sql.includes("igf_simulation_proposals")));
});
test("category table honors cut/plant scope, weights discounts, and keeps unclassified and missing values",async()=>{
 let options;
 const h=harness(undefined,async(_c,_y,_m,_p,opts)=>{options=opts;return {rows:[
  {categoria:"Casa",subcategoria:"Autotanque",kgProy:1000,descKg:2},
  {categoria:"Casa",subcategoria:"Autotanque",kgProy:3000,descKg:4},
  {categoria:"Comisionista",subcategoria:"Portátil",kgProy:500,descKg:null},
  {categoria:"Casa",subcategoria:"",kg:100,kgProy:100,descKg:null,hasDiscountRow:false},
 ]};});
 const response=await h.call("get","/api/dashboard/igf-simulation-categories",{year:2026,month:11,plant_code:"Puebla",cutoff:"2026-11-02",target_kg:4600});
 assert.equal(response.code,200);assert.equal(options.salesThrough,"2026-11-01");assert.equal(options.targetKgOverride,4600);
 const [casa,com,unknown]=response.body.rows;assert.equal(casa.discount_kg,3.5);assert.equal(casa.discount_amount,14000);assert.equal(com.discount_amount,null);assert.equal(unknown.subcategory,"Sin subcategoría");assert.equal(unknown.discount_kg,0);
 assert.equal((await h.call("get","/api/dashboard/igf-simulation-categories",{year:2026,month:11,plant_code:"Other",cutoff:"2026-11-02",target_kg:1})).code,403);
});

test("ARR simulator cutoff caps sales and discounts without changing the default monthly query",async()=>{
 const forecast=require("../lib/dashboard-arr-forecast"),queries=[];
 const client={async query(sql,args){queries.push({sql:String(sql),args});return {rows:[]};}};
 await forecast.computeClientesDescuentoMes(client,2026,11,"Puebla",{historico:true,salesThrough:"2026-11-01"});
 let query=queries.find(q=>q.sql.includes("FULL OUTER JOIN descs"));assert.deepEqual(query.args,["2026-11-01","2026-11-01","Puebla"]);
 queries.length=0;await forecast.computeClientesDescuentoMes(client,2026,11,"Puebla",{historico:true});
 query=queries.find(q=>q.sql.includes("FULL OUTER JOIN descs"));assert.deepEqual(query.args,["2026-11-01","2026-11-30","Puebla"]);
});
