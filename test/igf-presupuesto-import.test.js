"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const XLSX = require("xlsx");
const importer = require("../lib/igf-presupuesto-import");
const distribution = require("../lib/igf-diario-gastos-distribucion");
const { monthBusinessDays } = require("../lib/igf-diario-puebla");
const KEYS = importer.FIELDS.map(([key]) => key);

function workbook(rows, labels) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    [], ["Mes:", 10], [], ["Semana", "Dia inicia", ...(labels || importer.FIELDS.map(([, , label]) => label))],
    ...rows.map(([date, ...values]) => ["Semana", date, ...values]),
  ]), "DatosCorpo");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
function dateNumber(fecha) { return (Date.parse(`${fecha}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86400000; }
function rowsOf(from, to, amount = 10) {
  return monthBusinessDays(2026, 10).days.filter(d => d.fecha >= from && d.fecha <= to)
    .map(d => [dateNumber(d.fecha), ...KEYS.map(() => d.inhabil ? 0 : amount)]);
}
function spec(from = "2026-10-01", to = "2026-10-31", amount = 10) {
  return { plantCode: "Puebla", from, to, rows: importer.parseWorkbook(workbook(rowsOf(from, to, amount)), from, to) };
}
function db() {
  const state = { row: Object.fromEntries(KEYS.map(k => [k, 270])), fixed: [], manual: null };
  const calls = []; let snapshot;
  return { state, calls, failWrite: false, async query(sql, params) {
    calls.push({ sql, params });
    if (sql === "BEGIN") { snapshot = structuredClone(state); return { rows: [] }; }
    if (sql === "ROLLBACK") { Object.assign(state, snapshot); return { rows: [] }; }
    if (/SELECT \* FROM arr.igf_diario_gastos_desglose/.test(sql)) return { rows: state.row ? [structuredClone(state.row)] : [] };
    if (/SELECT concepto, fecha, importe/.test(sql)) return { rows: structuredClone(state.fixed).sort((a,b) => a.concepto.localeCompare(b.concepto) || a.fecha.localeCompare(b.fecha)) };
    if (/^INSERT/.test(sql)) {
      if (this.failWrite && /distribucion_manual/.test(sql)) throw new Error("simulated write failure");
      if (/INSERT INTO arr.igf_diario_gastos_desglose/.test(sql)) {
        const keys = sql.includes("VALUES ($1, $2, $3, $4, $5, $6, now()") ? KEYS.slice(0,3) : KEYS.slice(3);
        state.row ||= {}; keys.forEach((k,i) => { state.row[k] = params[i+3]; });
      } else if (/INSERT INTO arr.igf_diario_gastos_manual /.test(sql)) state.manual = { operativos: params[3], corporativos: params[4] };
      else if (/INSERT INTO arr.igf_diario_gastos_distribucion_manual/.test(sql)) {
        state.fixed = state.fixed.filter(r => r.concepto !== params[3] || r.fecha !== params[4]);
        state.fixed.push({ concepto: params[3], fecha: params[4], importe: params[5] });
      }
    }
    return { rows: [] };
  }};
}

test("DatosCorpo: siete columnas, fechas y ceros; vacíos y duplicados no se convierten a cero", () => {
  const good = workbook([[dateNumber("2026-10-01"), 1.234, 0, 3, 4, 5, 6, 7]]);
  assert.equal(importer.parseWorkbook(good, "2026-10-01", "2026-10-01").get("2026-10-01").gasto_corporativo, 123);
  assert.throws(() => importer.parseWorkbook(good, "2026-10-01", "2026-10-02"), /Falta la fecha/);
  const blank = workbook([[dateNumber("2026-10-01"), null, 0, 3, 4, 5, 6, 7]]);
  assert.throws(() => importer.parseWorkbook(blank, "2026-10-01", "2026-10-01"), /C5/);
  const duplicate = workbook([...rowsOf("2026-10-01", "2026-10-01"), ...rowsOf("2026-10-01", "2026-10-01")]);
  assert.throws(() => importer.parseWorkbook(duplicate, "2026-10-01", "2026-10-01"), /duplicada/);
});

test("rechaza hoja incorrecta, encabezados duplicados, importes negativos y fórmulas sin resultado", () => {
  const missing = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(missing, XLSX.utils.aoa_to_sheet([[1]]), "Otra");
  assert.throws(() => importer.parseWorkbook(XLSX.write(missing,{type:"buffer",bookType:"xlsx"}), "2026-10-01", "2026-10-01"), /DatosCorpo/);
  const labels = importer.FIELDS.map(([, , label]) => label); labels[1] = labels[0];
  assert.throws(() => importer.parseWorkbook(workbook(rowsOf("2026-10-01","2026-10-01"),labels),"2026-10-01","2026-10-01"), /columnas duplicadas/);
  const negative = rowsOf("2026-10-01","2026-10-01"); negative[0][1] = -1;
  assert.throws(() => importer.parseWorkbook(workbook(negative),"2026-10-01","2026-10-01"), /inválido/);
  const wb = XLSX.read(workbook(rowsOf("2026-10-01","2026-10-01"))); wb.Sheets.DatosCorpo.C5 = {t:"n", f:"1+1"};
  assert.throws(() => importer.parseWorkbook(XLSX.write(wb,{type:"buffer",bookType:"xlsx"}),"2026-10-01","2026-10-01"), /vacío|inválido/);
});

test("reemplazo parcial conserva cada importe fuera del rango y recalcula el mes sin redistribuir", async () => {
  const client = db(); const request = spec("2026-10-05", "2026-10-10", 25);
  const plan = await importer.buildPlan(client, request);
  assert.ok(client.calls.every(c => c.sql.trim().startsWith("SELECT")));
  const before = distribution.buildExpenseDailySchedule({monthlyAmount:270,days:monthBusinessDays(2026,10).days});
  const part = plan.plans[0];
  for (const day of part.daily.filter(d => d.concepto === KEYS[0])) {
    assert.equal(day.importe, day.fecha >= request.from && day.fecha <= request.to ? 25 : before.byFecha[day.fecha]);
  }
  assert.equal(part.concepts[0].mensual_nuevo, 360);
  const saved = await importer.savePlan(client,request,plan.fingerprint,"Dashboard:test");
  assert.equal(saved.months[0].concepts[0].mensual_nuevo,360);
  assert.deepEqual(client.state.manual,{operativos:1440,corporativos:1080});
  const reconstructed = distribution.buildExpenseDailySchedule({monthlyAmount:360,days:monthBusinessDays(2026,10).days,
    overrides:Object.fromEntries(client.state.fixed.filter(r=>r.concepto===KEYS[0]).map(r=>[r.fecha,r.importe]))});
  assert.equal(reconstructed.ok,true);
  assert.equal(reconstructed.byFecha["2026-10-12"],before.byFecha["2026-10-12"]);
  assert.equal(client.calls.at(-1).sql,"COMMIT");
});

test("mes completo inicializa los siete conceptos y reimportar no acumula", async () => {
  const client=db(); client.state.row=null; const request=spec();
  let plan=await importer.buildPlan(client,request);
  await importer.savePlan(client,request,plan.fingerprint,"test");
  const first=structuredClone(client.state);
  plan=await importer.buildPlan(client,request);
  await importer.savePlan(client,request,plan.fingerprint,"test");
  assert.deepEqual(client.state,first);
  assert.equal(client.state.fixed.length,27*7);
});

test("vista previa caducada y fallos de escritura hacen rollback sin cambios parciales", async () => {
  const client=db(); const request=spec(); const plan=await importer.buildPlan(client,request);
  client.state.row.gasto_corporativo=271;
  await assert.rejects(()=>importer.savePlan(client,request,plan.fingerprint,"test"),e=>e.status===409);
  assert.equal(client.calls.at(-1).sql,"ROLLBACK");
  const fresh=await importer.buildPlan(client,request), original=structuredClone(client.state);
  client.failWrite=true;
  await assert.rejects(()=>importer.savePlan(client,request,fresh.fingerprint,"test"), /simulated/);
  assert.deepEqual(client.state,original);
});

test("no inventa presupuesto parcial sin base ni acepta importes en días inhábiles", async () => {
  const client=db(); client.state.row=null;
  await assert.rejects(()=>importer.buildPlan(client,spec("2026-10-01","2026-10-03")), /distribución mensual válida/);
  const request=spec(); request.rows.get("2026-10-04").gasto_corporativo=100;
  await assert.rejects(()=>importer.buildPlan(client,request), /inhábil/);
});

test("valida rango y archivo antes de acceder a datos", () => {
  assert.throws(()=>importer.parseRequest({plant_code:"Puebla",desde:"2026-02-30",hasta:"2026-10-31",file_base64:"AA=="}),/fechas/);
  assert.throws(()=>importer.parseRequest({plant_code:"Puebla",desde:"2026-09-01",hasta:"2026-10-31",file_base64:"AA=="}),/octubre/);
  assert.throws(()=>importer.parseRequest({plant_code:"",desde:"2026-10-01",hasta:"2026-10-31",file_base64:"AA=="}),/planta/);
});

test("API bloquea GA/GV y plantas no autorizadas antes de leer o guardar presupuesto", async () => {
  const fs = require("node:fs"), vm = require("node:vm");
  const source = fs.readFileSync(require.resolve("../server"), "utf8");
  const start = source.indexOf('app.post("/api/dashboard/igf-presupuesto-import"');
  const end = source.indexOf('\n});', start);
  const code = source.slice(source.indexOf("async (req, res)", start), end + 2);
  let queries = 0, released = 0;
  const context = {
    dashboardBlockGAFinancialKpis: (req,res) => req.role === "GA" && !!res.status(403).json({error:"GA"}),
    dashboardBlockGVForbidden: (req,res) => req.role === "GV" && !!res.status(403).json({error:"GV"}),
    igfPresupuestoImport: importer,
    pool: { connect: async () => ({ query: async () => { queries++; return {rows:[]}; }, release: () => released++ }) },
    dashboardArrForecast: { resolveForecastExportPlant: async () => ({plantaId:7,canon:"Puebla"}) },
    igfDashboardScope: { canAccessPlant: () => false }, console,
  };
  const handler = vm.runInNewContext(`(${code})`,context);
  const response = () => ({ statusCode:200, status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;} });
  const body = {action:"save",plant_code:"Puebla",desde:"2026-10-01",hasta:"2026-10-31",file_base64:workbook(rowsOf("2026-10-01","2026-10-31")).toString("base64")};
  for (const role of ["GA","GV","GG"]) {
    const res=response(); await handler({role,body,dashboardAuth:{role}},res);
    assert.equal(res.statusCode,403);
  }
  assert.equal(queries,0);
  assert.equal(released,1);
  const permitted = db(); permitted.release = () => {};
  context.pool.connect = async () => permitted;
  context.igfDashboardScope.canAccessPlant = () => true;
  context.dashboardArrForecast.plantsEquivalent = (a,b) => a === b;
  const preview = response();
  await handler({role:"AD",body:{...body,action:"preview"},dashboardAuth:{role:"AD",actor_id:42}},preview);
  assert.equal(preview.statusCode,200);
  assert.equal(preview.body.dias,31);
  assert.ok(permitted.calls.every(c=>c.sql.trim().startsWith("SELECT")));
  const saved = response();
  await handler({role:"AD",body:{...body,preview_token:preview.body.preview_token},dashboardAuth:{role:"AD",actor_id:42}},saved);
  assert.equal(saved.statusCode,200);
  assert.equal(permitted.calls.at(-1).sql,"COMMIT");
  assert.ok(permitted.calls.filter(c=>/^INSERT/.test(c.sql)).every(c=>c.params.includes("Dashboard:42")));
});

test("ventana entre meses usa planes mensuales independientes", async () => {
  const from="2026-10-30", to="2026-11-03";
  const data=[...monthBusinessDays(2026,10).days,...monthBusinessDays(2026,11).days]
    .filter(d=>d.fecha>=from&&d.fecha<=to).map(d=>[dateNumber(d.fecha),...KEYS.map(()=>d.inhabil?0:12)]);
  const request={plantCode:"Puebla",from,to,rows:importer.parseWorkbook(workbook(data),from,to)};
  const plan=await importer.buildPlan(db(),request);
  assert.deepEqual(plan.plans.map(p=>[p.year,p.month]),[[2026,10],[2026,11]]);
  assert.equal(plan.plans[0].concepts[0].nuevo_ventana,24);
  assert.equal(plan.plans[1].concepts[0].nuevo_ventana,24);
});
