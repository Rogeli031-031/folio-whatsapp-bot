"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {modelFromRow,profit,weeklyPoints,closestEquilibrium}=require("../frontend-dashboard/lib/igf-simulation");
const proposals=require("../lib/igf-simulation-proposals"),register=require("../lib/igf-simulation-routes");
const {historyPeriods,mergeWeekColumns,visibleWeekPoints}=require("../frontend-dashboard/lib/igf-simulation");
const {axisTicks}=require("../frontend-dashboard/lib/igf-simulation");

test("axis ticks label intermediate values, negative results and zero without leaving the interval",()=>{
 for(const [min,max] of [[0,1594],[0,6.49],[-5200000,4400000],[-.0004,.0009]]){
  const ticks=axisTicks(min,max);assert.ok(ticks.length>=3&&ticks.length<=7);assert.ok(ticks.every(Number.isFinite));
  assert.ok(ticks.every(v=>v>=min&&v<=max));assert.ok(ticks.includes(0));
  assert.equal(new Set(ticks).size,ticks.length);assert.deepEqual([...ticks].sort((a,b)=>a-b),ticks);
 }
 assert.deepEqual(axisTicks(NaN,10),[]);assert.deepEqual(axisTicks(1,1),[]);
});

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
function harness(auth={role:"GG",plantas_permitidas:[2]},computeCategories=async()=>({rows:[]}),updateExists=true){
 const routes={},queries=[];let released=0;
 const client={release(){released++;},async query(sql,args){queries.push({sql,args});return {rows:sql.startsWith("UPDATE")&&!updateExists?[]:[{id:"7",name:"Saved"}],rowCount:1};}};
 const app={};for(const method of ["get","post","put","delete"])app[method]=(path,middleware,fn)=>{routes[`${method}:${path}`]=fn;};
 register(app,{pool:{connect:async()=>client},auth(){},blockGA:(_req,res)=>{if(auth.role==="GA"){res.status(403).json({error:"Forbidden"});return true;}return false;},blockGV:()=>false,resolvePlant:async(_client,code)=>({plantaId:code==="Puebla"?2:3,provinciaPlantCode:code}),computeCategories});
 async function call(method,path,input){const res={code:200,status(n){this.code=n;return this;},json(body){this.body=body;return this;}};await routes[`${method}:${path}`]({dashboardAuth:auth,body:input,query:input},res);return res;}
 return {call,queries,get released(){return released;}};
}
const route="/api/dashboard/igf-simulation-proposals";
test("plant scope is enforced on read/write/delete before any proposal query",async()=>{
 const h=harness();for(const method of ["get","post","put","delete"]){const res=await h.call(method,route,{...valid,plant_code:"Other",id:7});assert.equal(res.code,403);}
 assert.equal(h.queries.length,0);assert.equal(h.released,4);
 const ga=harness({role:"GA",plantas_permitidas:[2]});assert.equal((await ga.call("post",route,{...valid,plant_code:"Puebla"})).code,403);assert.equal(ga.queries.length,0);
});

test("updating an existing point preserves identity and name, scopes by plant/month and never inserts on missing IDs",async()=>{
 const h=harness();const result=await h.call("put",route,{...valid,id:7,plant_code:"Puebla"});assert.equal(result.code,200);assert.equal(result.body.row.id,"7");assert.equal(result.body.row.name,"Saved");
 const update=h.queries.find(q=>q.sql.startsWith("UPDATE"));assert.deepEqual(update.args.slice(0,6),[7,2,2026,11,1400,3.6]);assert.doesNotMatch(update.sql,/SET name|created_at=|created_by=/);assert.equal(JSON.parse(update.args[6]).a,6.5);assert.ok(!h.queries.some(q=>q.sql.includes("INSERT INTO")));
 const missing=harness(undefined,undefined,false);assert.equal((await missing.call("put",route,{...valid,id:7,plant_code:"Puebla"})).code,404);assert.ok(!missing.queries.some(q=>q.sql.includes("INSERT INTO")));
 for(const id of [undefined,0,-1,"abc",1.5])assert.equal((await h.call("put",route,{...valid,id,plant_code:"Puebla"})).code,400);
 assert.equal((await h.call("put",route,{...valid,id:7,volume_ton:0,plant_code:"Puebla"})).code,400);
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

test("weekly expense summary sums the contract groups, preserves gaps and uses the explicit historical operating total",()=>{
 const {weeklyFinancials}=require("../frontend-dashboard/lib/igf-simulation");
 const m={venta_kg:1000,margen_kg:6,gasto_corporativo_kg:.4,inversiones_kg:.1,impuestos_federales_kg:.2,presupuesto_nomina_gastos_kg:1,presupuesto_imss_sua_kg:.2,extraordinarios_kg:0,provisiones_planta_kg:.1};
 const result=weeklyFinancials(m);assert.equal(result.margen,6);assert.equal(result.operativos,1300);assert.equal(result.corporativos,700);assert.equal(result.gasto,2000);
 assert.equal(weeklyFinancials({...m,presupuesto_imss_sua_kg:null}).operativos,null);
 assert.equal(weeklyFinancials({...m,venta_kg:0}).corporativos,null);
 assert.equal(weeklyFinancials({...m,presupuesto_imss_sua_kg:null,gasto_operativo_forecast_kg:1.8}).operativos,1800);
 assert.equal(weeklyFinancials({}).gasto,null);
});

test("editable signed HG changes profit by simulated kilos, preserves the baseline and moves breakeven",()=>{
 const {modelWithHg}=require("../frontend-dashboard/lib/igf-simulation");
 const row={ventaTon:800,comDesc:-3,resultadoFinalImporte:-200000,operativos:2200000,corporativos:800000,impuestos:.5,hgKg:.4};
 const base=modelFromRow(row),same=modelWithHg(base,.4,.4),higher=modelWithHg(base,.4,.6),negative=modelWithHg(base,.4,-.2);
 assert.ok(Math.abs(profit(same,800,3)+200000)<1e-6);
 for(const q of [800,1000]){
  assert.ok(Math.abs((profit(higher,q,3)-profit(base,q,3))+q*1000*.2)<1e-6);
  assert.ok(Math.abs((profit(negative,q,3)-profit(base,q,3))-q*1000*.6)<1e-6);
 }
 assert.equal(modelWithHg(base,null,0),base);assert.equal(modelWithHg(base,.4,NaN),base);assert.notEqual(closestEquilibrium({...higher,q:800,d:3}).q,closestEquilibrium({...base,q:800,d:3}).q);
 assert.equal(base.a,same.a);assert.equal(higher.fixed,base.fixed);
});
test("proposals persist numeric HG including zero/negative and retain compatibility with older proposals",async()=>{
 for(const hg of [0,.4,-.2]){
  const parsed=proposals.parseProposal({...valid,basis:{...valid.basis,hg_kg:hg}});assert.equal(parsed.basis.hg_kg,hg);
  const h=harness();await h.call("post",route,{...valid,plant_code:"Puebla",basis:{...valid.basis,hg_kg:hg}});assert.equal(JSON.parse(h.queries.find(q=>q.sql.includes("INSERT INTO")).args[6]).hg_kg,hg);
 }
 assert.equal(proposals.parseProposal(valid).basis.hg_kg,undefined);
 for(const hg of [null,".4",true,NaN,Infinity,101,-101])assert.ok(proposals.parseProposal({...valid,basis:{...valid.basis,hg_kg:hg}}).error);
});

test("HG percent means generated kilos over sold kilos, valued at gas plus freight, with baseline parity",()=>{
 const {hgPercentContext,hgCostFromPercent,modelWithHg}=require("../frontend-dashboard/lib/igf-simulation");
 const row={ventaTon:1000,comDesc:-3,resultadoFinalImporte:200000,operativos:2200000,corporativos:800000,impuestos:.5,hgKg:-.98,hgDollar:14,hgPct:.07};
 const c=hgPercentContext(row);assert.ok(Math.abs(c.percent-7)<1e-10);assert.equal(c.price,14);
 const base=modelFromRow(row);assert.ok(Math.abs(profit(modelWithHg(base,c.cost,hgCostFromPercent(c.percent,c.price)),1000,3)-200000)<1e-6);
 const without=modelWithHg(base,c.cost,hgCostFromPercent(0,c.price)),seven=modelWithHg(base,c.cost,hgCostFromPercent(7,c.price));
 assert.ok(Math.abs(profit(seven,1000,3)-profit(without,1000,3)-70000*14)<1e-6);
 assert.ok(Math.abs(profit(seven,500,3)-profit(without,500,3)-35000*14)<1e-6);
 assert.equal(hgCostFromPercent(-7,14),.9800000000000001);assert.equal(hgPercentContext({hgKg:0,hgDollar:14}).percent,0);
 assert.ok(Math.abs(hgPercentContext({hgKg:-.98,hgPct:.07}).price-14)<1e-10);
 assert.equal(hgPercentContext({hgKg:0,hgPct:0}).percent,null);assert.equal(hgPercentContext({hgKg:null,hgDollar:14}).percent,null);
 assert.equal(hgCostFromPercent(null,14),null);assert.equal(hgCostFromPercent(7,0),null);
});
test("proposals retain percent fraction and HG valuation, reject inconsistent conversion and accept old unit-based records",()=>{
 const b={...valid.basis,hg_pct:.07,hg_price_kg:14,hg_kg:-.98};
 const p=proposals.parseProposal({...valid,basis:b});assert.equal(p.basis.hg_pct,.07);assert.equal(p.basis.hg_price_kg,14);
 for(const changes of [{hg_pct:7},{hg_pct:null},{hg_price_kg:0},{hg_price_kg:null},{hg_kg:.98},{hg_kg:undefined}])assert.ok(proposals.parseProposal({...valid,basis:{...b,...changes}}).error);
 assert.ok(!proposals.parseProposal({...valid,basis:{...valid.basis,hg_kg:-.98}}).error);
});

test("proposal comments and category snapshots survive validation; totals and weights cannot be forged",()=>{
 const lines=[{category:"CASA",subcategory:"Autotanque",kg:300000,discount_kg:2,discount_amount:1,token:"discard"},{category:"COMISIONISTA",subcategory:"Portátil",kg:700000,discount_kg:4}];
 const input={...valid,volume_ton:1000,discount_kg:3.4,basis:{...valid.basis,comments:"  Aumentar venta casa  ",category_lines:lines}};
 const parsed=proposals.parseProposal(input);assert.ok(!parsed.error);assert.equal(parsed.basis.comments,"Aumentar venta casa");assert.equal(parsed.basis.category_lines[0].discount_amount,600000);assert.equal(parsed.basis.category_lines[0].token,undefined);
 for(const changes of [{comments:42},{comments:"x".repeat(2001)},{category_lines:[]},{category_lines:[...lines,lines[0]]},{category_lines:[{...lines[0],discount_kg:null},lines[1]]},{category_lines:[{...lines[0],kg:-1},lines[1]]},{category_lines:[{...lines[0],category:"OTRA"},lines[1]]}])assert.ok(proposals.parseProposal({...input,basis:{...input.basis,...changes}}).error);
 assert.ok(proposals.parseProposal({...input,volume_ton:1001}).error);assert.ok(proposals.parseProposal({...input,discount_kg:3.5}).error);
 assert.ok(!proposals.parseProposal(valid).error);
});
