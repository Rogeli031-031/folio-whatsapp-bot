const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createServer } = require("node:http");
const { test } = require("node:test");
const vm = require("node:vm");
const ExcelJS = require("exceljs");
const { createUpload } = require("../lib/igf-acapulco-taller-upload");

const route = "/api/arr/dashboard-excel";
const source = readFileSync(require.resolve("../server"), "utf8");
const start = source.indexOf('app.get("' + route + '"');
const handlerSource = source.slice(start, source.indexOf("\n/**", start));
const fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function harness({ acquireError, generateError, snapshotError, snapshotGate, actorId = 3, plantDenied, ga = false } = {}) {
  const states = { connects: 0, poolQueries: 0, releases: 0, acl: [], logs: [], writes: [], sends: 0 };
  let handler;
  let finish;
  const finished = new Promise(resolve => { finish = resolve; });
  const client = {
    async query(sql, args) {
      if (sql.includes("igf_taller_operadores")) {
        states.acl.push(args);
        return { rows: args[1] === 3 ? [{ allowed: 1 }] : [] };
      }
      assert.match(sql, /arr\.provincia_plants/);
      return { rows: [] };
    },
    release() { states.releases++; },
  };
  const pool = {
    async connect() {
      states.connects++;
      if (acquireError) throw new Error("synthetic pool acquisition failure");
      return client;
    },
    async query() {
      states.poolQueries++;
      throw new Error("synthetic pool is saturated: only one leased connection");
    },
  };
  vm.runInNewContext(handlerSource, {
    app: { get(path, _auth, callback) { assert.equal(path, route); handler = callback; } },
    dashboardAuthMiddleware() {},
    pool,
    console: { error(...args) { states.logs.push(args); } },
    igfDiarioDownloadAccess: { requestBlock() {}, plantBlock: () => plantDenied, isGA: () => ga },
    dashboardBlockGVForbidden() {},
    igfDiarioTodasRequestBlock() {},
    assertPlantaPermitidaDashboard() {},
    igfDiarioDailyInsights: { async loadPlantDailyInsights() { return {}; } },
    comprasDashboard: { async ensureComprasTables() {}, async loadMonth() { return null; } },
    async buildIgfForecastPayload() { return { rows: [] }; },
    async computeIgfForecastMiniPayload() { return { rows: [] }; },
    igfDiarioGastosManuales: { async listMonth() { return []; }, effectivePair() {} },
    igfDiarioGastosDesglose: { usesDetailedExpenseLayout: () => false, findRow() {}, excelPacket: () => ({}) },
    igfAcapulcoWorkshopUpload: createUpload({ pool }),
    require(path) {
      if (path === "./lib/igf-diario-weekly-plant") return { METRICS: [], async loadWeeklyPlant() { return { query_count: 1 }; } };
      if (path === "./lib/igf-diario-descuentos-columna") return { async attachToInsights() {} };
      throw new Error("Unexpected dependency " + path);
    },
    dashboardArrForecast: {
      async resolveForecastExportPlant(_client, name) {
        return { plantaId: 1, nombre: name, canon: name };
      },
      async loadPrecioDiario() { return []; },
      async buildPronosticoProjectionContext() { return null; },
      async generarDashboardArrForecast(db, _year, _month, plant, opts) {
        assert.equal(db, client);
        if (generateError) throw new Error("synthetic XLSX failure");
        states.folios = opts.igfAcapulcoShowFolioCandidates;
        const book = new ExcelJS.Workbook();
        book.addWorksheet("IGF Diario").addRow([plant, opts.fechaCorte, 42]);
        return Buffer.from(await book.xlsx.writeBuffer());
      },
      async buildPronosticoVentaDescMaps(db, _year, _month, cut) {
        assert.equal(db, client);
        states.sentBeforeSnapshot = states.sends;
        if (snapshotGate) await snapshotGate;
        if (snapshotError) throw new Error("synthetic snapshot failure");
        return { corteYmdStr: cut };
      },
      async computePronosticoProyByPlant() { return { synthetic: true }; },
      async savePronosticoMiniSnapshot(db, year, month, cut, data) {
        assert.equal(db, client);
        states.writes.push({ year, month, cut, data });
      },
    },
  }, { filename: "server.js:dashboard-excel" });
  const server = createServer((request, res) => {
    const query = Object.fromEntries(new URL(request.url, "http://localhost").searchParams);
    res.status = code => { res.statusCode = code; return res; };
    res.json = body => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); };
    res.send = bytes => { states.sends++; res.end(bytes); };
    handler({ query, dashboardAuth: { actor_id: actorId } }, res).then(finish, error => {
      res.destroy(error);
      finish(error);
    });
  });
  return { states, server, finished };
}

async function run(t, options = {}, plant = "Acapulco", onResponse = async () => {}) {
  const h = harness(options);
  await new Promise(resolve => h.server.listen(0, "127.0.0.1", resolve));
  t.after(() => h.server.closeAllConnections());
  t.after(() => h.server.close());
  const q = new URLSearchParams({ year: 2026, month: 11, require_plant: 1, plant_code: plant, upload_day: "2026-11-24" });
  const res = await fetch("http://127.0.0.1:" + h.server.address().port + route + "?" + q, { signal: AbortSignal.timeout(3000) });
  await onResponse(res, h.states);
  const error = await h.finished;
  assert.ifError(error);
  return { ...h, res };
}

test("Acapulco delivers an openable workbook before a blocked snapshot with one pooled connection", async t => {
  let release;
  const snapshotGate = new Promise(resolve => { release = resolve; });
  t.after(release);
  const { states } = await run(t, { snapshotGate }, "Acapulco", async (res, state) => {
    try {
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), fileType);
      assert.match(res.headers.get("content-disposition"), /Dashboard_ARR_Forecast_Acapulco_2026_11\.xlsx/);
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(await res.arrayBuffer());
      assert.deepEqual(book.getWorksheet("IGF Diario").getRow(1).values.slice(1), ["Acapulco", "2026-11-24", 42]);
      assert.equal(state.sentBeforeSnapshot, 1);
      assert.equal(state.writes.length, 0);
      assert.equal(state.releases, 0);
    } finally { release(); }
  });
  assert.deepEqual(states.acl, [["Acapulco", 3]]);
  assert.equal(states.folios, true);
  assert.equal(states.connects, 1);
  assert.equal(states.poolQueries, 0);
  assert.equal(states.releases, 1);
  assert.equal(states.writes.length, 1);
  assert.equal(states.writes[0].cut, "2026-11-24");
});

test("a non-operator gets the workbook without folio candidates; snapshot failure does not replace it", async t => {
  const { res, states } = await run(t, { actorId: 12, snapshotError: true });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), fileType);
  assert.equal(states.folios, false);
  assert.equal(states.writes.length, 0);
  assert.equal(states.sends, 1);
  assert.equal(states.releases, 1);
  assert.equal(states.logs[0][0], "[ARR dashboard-excel] pronostico_mini_snapshot");
});

test("pool acquisition and workbook failures return safe JSON without attachment headers", async t => {
  for (const options of [{ acquireError: true }, { generateError: true }]) {
    const { res, states } = await run(t, options);
    assert.equal(res.status, 500);
    assert.equal(res.headers.get("content-disposition"), null);
    assert.match((await res.json()).error, /No se pudo generar el Excel/);
    assert.equal(states.sends, 0);
    assert.equal(states.releases, options.acquireError ? 0 : 1);
  }
});

test("other plant retains snapshot first and no Acapulco ACL probe", async t => {
  const { res, states } = await run(t, {}, "Puebla");
  assert.equal(res.status, 200);
  assert.equal(states.sentBeforeSnapshot, 0);
  assert.equal(states.writes.length, 1);
  assert.deepEqual(states.acl, []);
});

test("plant denial remains enforced and GA never saves the snapshot", async t => {
  const blocked = await run(t, { plantDenied: "Sin acceso a planta." });
  assert.equal(blocked.res.status, 403);
  assert.equal(blocked.states.sends, 0);
  assert.deepEqual(blocked.states.acl, []);
  const ga = await run(t, { ga: true });
  assert.equal(ga.res.status, 200);
  assert.equal(ga.states.writes.length, 0);
});
