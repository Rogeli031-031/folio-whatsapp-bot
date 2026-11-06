"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const ExcelJS=require("exceljs");
const {buildSource,loadSource,calculate,handle}=require("../lib/igf-plan-al-cierre");
const {evaluateRow,readPlanEdits,readPlanHg,readDiscountSource,HG_PERCENT_LABEL}=require("../frontend-dashboard/lib/igf-plan-al-cierre");
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

test("HG changes the IGF on all planned kg and leaves the base and buyer gains intact",()=>{
  const s=source(), basis={...anchor,hg_pct:.02,hg_price_kg:10,hg_kg:-.2};
  const buyer=s.rows.find(r=>r.name==="Cliente B");
  const edits={[buyer.id]:{goal:50,rate:2,selected:true}};
  const original=calculate(s,edits,basis);
  for(const pct of [0,-3,2,7.5]){
    const plan=calculate(s,edits,basis,pct);
    const effect=1050*(pct-2)/100*10;
    assert.deepEqual(plan.rows,original.rows);
    assert.equal(plan.scenario.baseResult,original.scenario.baseResult);
    assert.equal(plan.scenario.commercial,original.scenario.commercial);
    assert.ok(Math.abs(plan.scenario.result-original.scenario.result-effect)<1e-7);
    assert.equal(plan.scenario.hgKg,1050*pct/100);
    assert.ok(Math.abs(plan.scenario.hgAmount-plan.scenario.hgKg*10)<1e-7);
  }
  for(const invalid of [-101,101,NaN,"5"])assert.throws(()=>calculate(s,edits,basis,invalid),/HG/);
  assert.throws(()=>calculate(s,edits,anchor,0),/valoración/);
  assert.equal(calculate(s,edits,anchor).scenario.hgKg,null);
});

test("a legacy plan point can change HG repeatedly, export and reopen on the original cut",async()=>{
  const s={...source(),revision:"original"}, basis={...anchor,hg_pct:.02,hg_price_kg:10,hg_kg:-.2};
  const b=s.rows.find(r=>r.name==="Cliente B"),edits={[b.id]:{goal:50,rate:2,selected:true}};
  const request={cutoff:"2026-11-06",mode:"igf_diario",id:"17",revision:s.revision,edits,request_id:"00000000-0000-4000-8000-000000000017"};
  let point={id:"17",name:"Plan al cierre",basis:{closing_plan:{...request,version:1,source:s,anchor:basis}}};
  const client={async query(sql,args){
    if(sql.startsWith("SELECT id,basis"))return {rows:[point]};
    if(sql.startsWith("UPDATE arr.igf_simulation_proposals")){
      assert.equal(args[0],17);
      point={...point,basis:JSON.parse(args[6])};return {rows:[point]};
    }
    if(sql.includes("cliente_contactos"))return {rows:[{available:false}]};
    if(/^(BEGIN|ROLLBACK|COMMIT|CREATE)/.test(sql))return {rows:[]};
    throw Error(sql);
  }};
  const run=(action,more={})=>handle(client,{plantaId:1,canon:"Puebla"},{year:2026,month:11},{...request,action,...more},async()=>({rows:[]}));
  assert.equal((await run("open")).hg_percent,null);
  for(const [index,pct] of [8,0,-1.5].entries()){
    const {version}=await run("open");
    const {row}=await run("save",{version,hg_percent:pct});
    assert.equal(row.id,"17");assert.equal(row.basis.hg_pct,pct/100);
    const reopened=await run("open");
    assert.equal(reopened.hg_percent,pct);assert.equal(reopened.anchor.a,basis.a);
    assert.equal(reopened.anchor.hg_pct,.02);assert.equal(reopened.version,index+2);
    const {scenario}=calculate(s,edits,basis,pct);
    const graph=require("../frontend-dashboard/lib/igf-simulation").profit(row.basis,scenario.kg/1000,scenario.rate);
    assert.ok(Math.abs(graph-scenario.result)<1e-7);
    const {bytes}=await run("excel",{version:reopened.version});
    const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);
    const matrix=name=>book.getWorksheet(name).getSheetValues().filter(Boolean).map(r=>r.slice(1));
    const sheets={IGF:matrix("IGF"),"Plan al cierre":matrix("Plan al cierre")};
    assert.equal(readPlanHg(sheets),pct);
    const restored=readPlanEdits(sheets,s,{plant:"Puebla",cutoff:request.cutoff,mode:request.mode});
    assert.deepEqual(calculate(s,restored,basis,readPlanHg(sheets)).scenario,scenario);
    const indicator=name=>sheets.IGF.find(r=>r[0]===name);
    assert.equal(indicator("Resultado final ($)")[1],scenario.baseResult);
    assert.equal(indicator("Resultado final ($)")[2],scenario.result);
    assert.equal(indicator("Aportación HG ($)")[2],scenario.hgAmount);
    assert.equal(indicator("HG generado / perdido (kg)")[2],scenario.hgKg);
    await assert.rejects(run("save",{version,hg_percent:9}),e=>e.status===409);
  }
  assert.equal(readPlanHg({}),null);
  assert.throws(()=>readPlanHg({IGF:[[HG_PERCENT_LABEL,.02,2]]}),/porcentaje/);
});

test("the discount source changes only the base cost, regardless of buyer deltas and edited HG",()=>{
  const s=source(),b=s.rows.find(r=>r.name==="Cliente B");
  const basis={...anchor,hg_pct:.02,hg_price_kg:10,hg_kg:-.2},edits={[b.id]:{goal:50,rate:2,selected:true}};
  const rates={igf_diario:1,arr:1.25};
  const plan=calculate(s,edits,basis,8,"arr",rates);
  const daily=plan.comparisons.igf_diario,arr=plan.scenario;
  assert.equal(arr.baseKg,daily.baseKg);assert.equal(arr.kg,daily.kg);assert.equal(arr.kg,1050);
  assert.equal(arr.commercial,daily.commercial);assert.equal(arr.hgKg,daily.hgKg);
  assert.equal(daily.result-arr.result,250);assert.equal(arr.cost-daily.cost,250);
  assert.equal(arr.baseCost,1250);assert.equal(arr.cost,1350);
  assert.equal(calculate(s,edits,basis,null,"arr",{arr:0}).scenario.baseCost,0);
  assert.throws(()=>calculate(s,edits,basis,null,"arr",{arr:null}));
  assert.equal(readDiscountSource({},"igf_diario"),"igf_diario");
  assert.throws(()=>readDiscountSource({IGF:[["Fuente de descuento base","otra"]]},"igf_diario"));
});

test("a historical Forecast point uses the daily weighted discount when IGF Diario is selected",async(t)=>{
  const mode="forecast",cutoff="2026-11-06",plant={plantaId:2,canon:"Puebla"};
  const existing={cutoff,mode,source:source(),anchor:{...anchor,d:7}};
  const client={query:async sql=>({rows:sql.startsWith("SELECT id,basis")?[{basis:{closing_plan:existing}}]:[]})};
  const forecast=require("../lib/dashboard-arr-forecast");
  const byDay=values=>new Map([["Puebla",new Map([["2026-11-01",values[0]],["2026-11-02",values[1]]])]]);
  t.mock.method(forecast,"buildPronosticoProjectionContext",async(_client,year,month,date)=>{
    assert.deepEqual([year,month,date],[2026,11,cutoff]);
    return {ctx:{ventaMapByPlant:byDay([1,3]),descMapByPlant:byDay([-1,-3]),corteYmdStr:cutoff,isCorteEnMes:true}};
  });
  const opened=await handle(client,plant,{year:2026,month:11},{action:"open",mode,cutoff,id:"2",compare_discounts:true},
    async()=>({rows:[{categoria:"Casa",kgProy:1000,descKg:1.25}]}));
  assert.equal(opened.discount_source,"forecast");
  assert.deepEqual(opened.discount_rates,{igf_diario:2.5,arr:1.25,forecast:7});
});

test("ARR cutoff reference is verified and frozen; the saved point and both Excel comparisons agree",async()=>{
  const s={...source(),revision:"cut"},b=s.rows.find(r=>r.name==="Cliente B");
  const edits={[b.id]:{goal:50,rate:2,selected:true}};
  const req={id:"8",mode:"igf_diario",cutoff:"2026-11-06",compare_discounts:true,revision:s.revision,
    edits,request_id:"00000000-0000-4000-8000-000000000008"};
  let saved={id:"8",name:"Plan",basis:{closing_plan:{...req,source:s,anchor,version:1}}};
  const client={async query(sql,args){
    if(sql.startsWith("SELECT id,basis"))return {rows:[saved]};
    if(sql.startsWith("UPDATE arr.igf_simulation_proposals")){
      saved={...saved,basis:JSON.parse(args[6]),volume_ton:args[4],discount_kg:args[5]};return {rows:[saved]};
    }
    if(sql.includes("cliente_contactos"))return {rows:[{available:false}]};
    if(/^(BEGIN|ROLLBACK|COMMIT|CREATE)/.test(sql))return {rows:[]};
    throw Error(sql);
  }};
  let rate=1.25;
  const call=(action,extra={})=>handle(client,{plantaId:2,canon:"Puebla"},{year:2026,month:11},{...req,action,...extra},
    async()=>({rows:[{categoria:"Casa",kgProy:1000,descKg:rate}]}));
  const first=await call("open");assert.equal(first.discount_source,"igf_diario");
  const update={version:1,discount_source:"arr",discount_revision:first.discount_revision};
  rate=2;await assert.rejects(call("save",update),e=>e.status===409);
  rate=null;const incomplete=await call("open");assert.equal(incomplete.discount_rates.arr,null);
  await assert.rejects(call("save",{...update,discount_revision:incomplete.discount_revision}),e=>e.status===422);
  rate=1.25;await call("save",update);
  rate=9;const again=await call("open");assert.equal(again.discount_rates.arr,1.25);assert.equal(again.discount_source,"arr");
  assert.equal(again.anchor.d,anchor.d);
  const result=calculate(s,edits,anchor,null,"arr",again.discount_rates);
  const graph=require("../frontend-dashboard/lib/igf-simulation").profit(saved.basis,saved.volume_ton,saved.discount_kg);
  assert.ok(Math.abs(graph-result.scenario.result)<1e-7);
  const {bytes}=await call("excel",{...update,version:2});
  const w=new ExcelJS.Workbook();await w.xlsx.load(bytes);
  const igf=w.getWorksheet("IGF").getSheetValues().filter(Boolean).map(r=>r.slice(1));
  assert.equal(readDiscountSource({IGF:igf},"igf_diario"),"arr");
  assert.equal(igf.find(r=>r[0]==="Resultado final ($)")[2],result.scenario.result);
  const cmp=w.getWorksheet("Comparación de descuentos").getSheetValues().filter(Boolean).slice(1);
  assert.deepEqual(cmp.map(r=>[r[2],r[4]]),[[1000,1050],[1000,1050]]);
  assert.ok(Math.abs(cmp.find(r=>r[1]==="ARR")[7]-graph)<1e-7);
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
    categoryBase:{rows:[{category:"CASA",subcategory:"A",kg:1000,discount_amount:1250}]},
    contacts:[{cliente_nombre_norm:"cliente b",telefono:"0000000000"}]});
  const w=new ExcelJS.Workbook();await w.xlsx.load(buf);
  const p=w.getWorksheet("Plan al cierre");
  assert.equal(p.getCell("A2").value,"Cliente B");assert.equal(p.getCell("G2").value,0.05);
  assert.equal(p.getCell("I2").value,200);assert.equal(p.getCell("L2").value,"0000000000");
  const catRows=w.getWorksheet("Categorías").getSheetValues().filter(Boolean);
  assert.deepEqual(catRows.find(r=>r[1]==="CASA").slice(2,6),["A",1,1250,1.25]);
  const selection=catRows.slice(catRows.findIndex(r=>String(r[1]).startsWith("Plan al cierre ·")));
  assert.deepEqual(selection.filter(r=>r[1]==="Cliente B").map(r=>r[4]),[.05]);
  assert.ok(!selection.some(r=>r[1]==="Cliente A"||r[1]==="Cliente C"));
  assert.equal(selection.at(-1)[8],result.scenario.commercial);
  const totals=catRows.filter(r=>r[1]==="TOTAL");
  assert.deepEqual(totals.map(r=>[r[3],r[4]]),[[1,1250],[1.05,1350]]);
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

test("ARR reference and closing categories preserve known zero, missing coverage and account transfers",async()=>{
  const {loadCategoryBase}=require("../lib/igf-simulation-category-base");
  const {writeCategories}=require("../lib/igf-plan-al-cierre-categorias");
  const base=await loadCategoryBase({}, {canon:"Alias",provinciaPlantCode:"Catálogo"}, {year:2026,month:11},
    "2026-11-06",200,async(_client,y,m,plant,opt)=>{
      assert.deepEqual([y,m,plant,opt.targetKgOverride,opt.salesThrough,opt.fechaHasta],[2026,11,"Catálogo",200,"2026-11-05","2026-11-05"]);
      return {rows:[
        {categoria:"Casa",subcategoria:"Auto",kg:2,kgProy:100,descKg:2},
        {categoria:"Casa",subcategoria:"Auto",kg:1,kgProy:50,descKg:null,hasDiscountRow:false},
        {categoria:"Comisionista",subcategoria:"Otra",kg:0,kgProy:50,descKg:null},
      ]};
    });
  const r={name:"Un comprador",future:"Contado",real:10,base:50,goal:70,rate:4,selected:true,
    kgDelta:20,costDelta:160,gain:-40,accounts:[
      {name:"Crédito",category:"Casa",subcategory:"Auto",real:10,base:50,continuity:2},
      {name:"Contado",category:"Casa",subcategory:"Portátil",real:0,base:0,continuity:null},
    ]};
  const values=(ref,rows)=>writeCategories(new ExcelJS.Workbook(),ref,rows).getSheetValues().filter(Boolean);
  const rows=values(base,[r]), idx=rows.findIndex(line=>line[1]?.startsWith("Cierre por categoría"));
  const after=rows.slice(idx), detail=after.find(line=>line[1]===r.name);
  assert.deepEqual(rows.find(line=>line[1]==="CASA").slice(2,6),["Auto",.15,200,200/150]);
  assert.deepEqual(after.find(line=>line[2]==="Auto").slice(3,5),[.11,120]);
  assert.deepEqual(after.find(line=>line[2]==="Portátil").slice(3,5),[.06,240]);
  assert.equal(after.find(line=>line[1]==="COMISIONISTA")[6],"Descuento pendiente");
  assert.deepEqual([detail[4],detail[6],detail[7],detail[8]],[.02,240,160,-40]);
  assert.equal(values(base,[]).at(-1)[8],0);
  assert.ok(values({rows:[]},[r]).some(line=>line[1]?.startsWith("Sin base ARR")));
});
test("reopening a point resolves its source only under its stored plant/period/id",async()=>{
  const q=[];const client={query:async(sql,args)=>{q.push([sql,args]);return {rows:[]};}};
  await assert.rejects(handle(client,{plantaId:3},{year:2026,month:11},{action:"open",mode:"forecast",cutoff:"2026-11-05",id:"2"}),e=>e.status===404);
  const read=q.find(([sql])=>sql.includes("SELECT id,basis"));
  assert.deepEqual(read[1],[3,2026,11,"2"]);assert.equal(q.at(-1)[0],"ROLLBACK");
});
