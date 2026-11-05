"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const ExcelJS=require("exceljs");
const {buildSource,loadSource,calculate,handle}=require("../lib/igf-plan-al-cierre");
const {evaluateRow,readPlanEdits}=require("../frontend-dashboard/lib/igf-plan-al-cierre");
const {workbook}=require("../lib/igf-plan-al-cierre-excel");
const register=require("../lib/igf-simulation-routes");

const anchor={q:1,d:1,a:8,fixed:2000,financials:{margen_kg:6,operativos_mxn:1500,corporativos_mxn:500,impuestos_mxn:0,gasto_mxn:2000}};
const real={account:"Cliente A",month:"2026-11-01",kg:4,cost:4,category:"Casa",subcategory:"A"};
const f={cliente_norm:"Cliente A",kg_mes_real:4,kg_mes_forecast:10,kg_hist:14,desc_kg_hist:1,margen_mes_kg:6};
function source(){
  return buildSource([real,{...real,account:"Cliente B",month:"2026-09-01",kg:50,cost:100},
    {...real,account:"Cliente B",month:"2026-06-01",kg:60,cost:120},
    {...real,account:"Cliente C",month:null,kg:0,cost:0}], [f],"2026-11-01","Planta de prueba");
}
test("the permanent concession applies to all remaining kg, and actual days stay booked",()=>{
  const row={id:"A",real:0,base:10,goal:10,continuity:1,rate:1};
  const x=evaluateRow(row,{goal:11,rate:3,selected:true},6.0222);
  assert.ok(Math.abs(x.gain+16.9778)<1e-8);assert.equal(x.downside,-20);
  const partial=evaluateRow({...row,real:4},{goal:11,rate:3,selected:true},6);
  assert.equal(partial.gain,-9);assert.equal(partial.downside,-12);assert.equal(partial.minimum,14);
  assert.equal(evaluateRow(row,{goal:11,rate:6.0222},6.0222).minimum,null);
});
test("recover inactive and registered buyers, include only selected changes, sort pending last",()=>{
  const s=source(), a=s.rows.find(r=>r.name==="Cliente A"), b=s.rows.find(r=>r.name==="Cliente B");
  assert.equal(b.real,0);assert.equal(b.goal,50);assert.equal(s.rows.length,3);
  const edits={[b.id]:{goal:50,rate:2,selected:true},[a.id]:{goal:3,rate:1,selected:false}};
  const r=calculate(s,edits,anchor);
  assert.deepEqual(r.rows.map(x=>x.name),["Cliente B","Cliente C","Cliente A"]);
  assert.equal(r.count,1);assert.equal(r.scenario.commercial,200);
  assert.equal(r.scenario.kg,1050);assert.equal(r.scenario.cost,1100);
  assert.equal(r.scenario.result,r.scenario.baseResult+300);
  assert.throws(()=>calculate(s,{...edits,[a.id]:{goal:3,rate:1,selected:true}},anchor));
});
test("verified consolidation preserves cash/credit account detail and missing discounts",()=>{
  const h=[real,{...real,account:"Cliente A (CONTADO)",cost:null}],ff=[f,{...f,cliente_norm:"Cliente A (CONTADO)",kg_hist:0}];
  assert.equal(buildSource(h,ff,"2026-11-01","Otro").rows.length,2);
  const merged=buildSource(h,ff,"2026-11-01","Prueba",s=>s.replace(" (CONTADO)","")).rows[0];
  assert.equal(merged.accounts.length,2);assert.equal(merged.future,"Cliente A (CONTADO)");assert.equal(merged.real,8);
  assert.equal(merged.actual,null);assert.equal(merged.continuity,null);
  assert.equal(evaluateRow(merged,null,6).gain,null);
});
function cutClient({history, daily=[], snapshot=[], margin=6, plant="Prueba", config=[],version=true}) {
  const queries=[];
  return {queries,async query(sql,params) {
    queries.push({sql,params});
    assert.match(sql,/^(WITH|SELECT)/); // Reconstructing a cut must not run the cache writer.
    if(sql.includes("FROM igf.versions"))return {rows:version?[{id:4}]:[]};
    if(sql.includes("FROM igf.compromiso_lines"))return {rows:[{empresa:plant,venta_ton:100,margen_kg:margin}]};
    if(sql.includes("FROM arr.dicf_config"))return {rows:config};
    if(sql.includes("FROM arr.dicf_cliente_mes"))return {rows:snapshot};
    if(sql.includes("monthly AS"))return {rows:history};
    if(sql.includes("AS day,cliente_norm"))return {rows:daily};
    throw Error("Consulta inesperada");
  }};
}

for(const [catalog,alias] of [["Puebla","GT Puebla"],["Tehuacán","Tehuacan"],["Acapulco","Acapulco"],
  ["Querétaro","GTM Queretaro"],["San Luis","GTM San Luis"],["Morelos","Morelos"]]) {
  test("same-plant cached and reconstructed references agree across consecutive cuts: "+catalog,async()=>{
    const plant={canon:catalog,nombre:alias,provinciaPlantCode:"Otra planta"};
    for(const cutoff of ["2026-11-05","2026-11-06"]){
      const through=cutoff.endsWith("05")?"2026-11-04":"2026-11-05";
      const kg=cutoff.endsWith("05")?10:11;
      const monthly=[{...real,account:"Cuenta A",kg,cost:kg,last_sale:through,last_discount:through},
        {...real,account:"Cuenta B (CONTADO)",month:"2026-09-01",kg:50,cost:100,last_sale:"2026-09-03"}];
      const daily=[{day:"2026-11-04",cliente_norm:"Cuenta A",kg:10,amount:-10}];
      if(kg===11)daily.push({day:through,cliente_norm:"Cuenta A",kg:1,amount:-1});
      const inputs={history:monthly,daily,plant:alias};
      const read=cutClient(inputs), a=await loadSource(read,plant,2026,11,cutoff);
      assert.equal(a.origin,"DICF calculado al corte");assert.equal(a.through,through);
      const buyer=a.rows.find(r=>r.name==="Cuenta A");
      assert.equal(buyer.real,kg);assert.ok(buyer.base>kg);assert.equal(buyer.continuity,1);
      for(const {sql,params} of read.queries){
        if(sql.includes("FROM arr.")){
          assert.ok(params[0].includes(alias.toUpperCase()));
          assert.ok(!params[0].includes("OTRA PLANTA"));
        }
        if(sql.includes("FROM daily"))assert.equal(params[2],cutoff);
        if(sql.includes("FROM igf.versions"))assert.equal(params[2],through);
      }
      const cached=cutClient({...inputs,snapshot:[{...f,cliente_norm:"Cuenta A",kg_mes_real:kg,kg_mes_forecast:buyer.base}]});
      const b=await loadSource(cached,plant,2026,11,cutoff);
      assert.equal(b.origin,"DICF guardado");assert.deepEqual(b.rows,a.rows);
      assert.equal(b.revision,a.revision);assert.ok(!cached.queries.some(q=>q.sql.includes("AS day,cliente_norm")));
    }
  });
}

test("incomplete inputs, conflicting aliases and later versions are not a zero-valued plan",async()=>{
  const inputs={history:[{...real,last_sale:"2026-11-03"}]};
  for(const [fixture,reason] of [
    [{...inputs,version:false},/margen IGF/],
    [inputs,/captura de ventas/],
    [{history:[{...real,conflict:true}]},/incompatibles/],
    [{...inputs,config:[{window_days:10},{window_days:30}]},/configuraciones/],
  ])await assert.rejects(loadSource(cutClient(fixture),{canon:"Prueba"},2026,11,"2026-11-05"),e=>e.status===422 && reason.test(e.message));
});
test("a first-of-month plan starts with zero booked and can project from the prior month",async()=>{
  const input={history:[{account:"Cuenta",month:"2026-10-01",kg:7,cost:0,last_sale:"2026-10-31"}],
    daily:[{day:"2026-10-31",cliente_norm:"Cuenta",kg:7,amount:null}],plant:"Prueba"};
  const p=await loadSource(cutClient(input),{canon:"Prueba"},2026,11,"2026-11-01");
  assert.equal(p.rows[0].real,0);assert.ok(p.rows[0].base>0);assert.equal(p.rows[0].continuity,null);
  input.daily[0].amount=0;
  assert.equal((await loadSource(cutClient(input),{canon:"Prueba"},2026,11,"2026-11-01")).rows[0].continuity,0);
});
test("a stale or duplicated snapshot is reconstructed without summing duplicated buyers",async()=>{
  const input={plant:"Prueba",history:[{...real,last_sale:"2026-11-04"}],daily:[{day:"2026-11-04",cliente_norm:"Cliente A",kg:4,amount:-4}]};
  for(const snapshot of [[{...f,margen_mes_kg:99}],[f,f],[{...f,kg_mes_real:12}]]){
    const s=await loadSource(cutClient({...input,snapshot}),{canon:"Prueba"},2026,11,"2026-11-05");
    assert.equal(s.origin,"DICF calculado al corte");assert.equal(s.rows.length,1);assert.equal(s.rows[0].real,4);
  }
});
test("xlsx follows the on-screen order, unit conversion, account and category totals and IGF",async()=>{
  const s=source(),b=s.rows.find(r=>r.name==="Cliente B");
  const result=calculate(s,{[b.id]:{goal:50,rate:2,selected:true}},anchor);
  const buf=await workbook({plant:"Prueba",period:{year:2026,month:11},cutoff:"2026-11-05",mode:"igf_diario",anchor,source:s,result,
    contacts:[{cliente_nombre_norm:"cliente b",telefono:"0000000000"}]});
  const w=new ExcelJS.Workbook();await w.xlsx.load(buf);
  const p=w.getWorksheet("Plan al cierre");
  assert.equal(p.getCell("A2").value,"Cliente B");assert.equal(p.getCell("G2").value,0.05);
  assert.equal(p.getCell("I2").value,200);assert.equal(p.getCell("L2").value,"0000000000");
  assert.equal(w.getWorksheet("Categorías").getRow(2).getCell(4).value,110);
  const igf=w.getWorksheet("IGF");let resultRow;
  igf.eachRow(row=>{if(row.getCell(1).value==="Resultado final ($)")resultRow=row;});
  assert.equal(resultRow.getCell(3).value,result.scenario.result);
  const matrix=sheet=>sheet.getSheetValues().filter(Boolean).map(row=>row.slice(1));
  const sheets={IGF:matrix(igf),"Plan al cierre":matrix(p)},context={plant:"Prueba",mode:"igf_diario",cutoff:"2026-11-05"};
  const restored=readPlanEdits(sheets,s,context);
  assert.deepEqual(calculate(s,restored,anchor).scenario,result.scenario);
  for(const patch of [{plant:"Otra"},{cutoff:"2026-11-06"},{mode:"forecast"}])
    assert.throws(()=>readPlanEdits(sheets,s,{...context,...patch}));
});
test("all plan operations enforce the same plant and financial-role authorization before fetching rows",async()=>{
  let route,queries=0;
  const app={get(){},put(){},delete(){},post(path,auth,fn){if(path.endsWith("-plan"))route=fn;}};
  register(app,{auth(){},blockGA:()=>false,blockGV:()=>false,pool:{connect:async()=>({release(){},query(){queries++;}})},
    resolvePlant:async()=>({plantaId:99})});
  for(const action of ["open","save","excel"]){
    const res={status(n){this.code=n;return this;},json(body){this.body=body;}};
    await route({dashboardAuth:{role:"GG",plantas_permitidas:[1]},body:{year:2026,month:11,action,id:3}},res);
    assert.equal(res.code,403);
  }
  assert.equal(queries,0);
});
test("reopening a point resolves its source only under its stored plant/period/id",async()=>{
  const q=[];const client={query:async(sql,args)=>{q.push([sql,args]);return {rows:[]};}};
  await assert.rejects(handle(client,{plantaId:3},{year:2026,month:11},{action:"open",mode:"forecast",cutoff:"2026-11-05",id:"2"}),e=>e.status===404);
  const read=q.find(([sql])=>sql.includes("SELECT id,basis"));
  assert.deepEqual(read[1],[3,2026,11,"2"]);assert.equal(q.at(-1)[0],"ROLLBACK");
});
