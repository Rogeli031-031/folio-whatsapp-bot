"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("../frontend-dashboard/node_modules/typescript");
const access = require("../lib/igf-diario-download-access");
const scope = require("../lib/igf-dashboard-scope");
const forecast = require("../lib/dashboard-arr-forecast");
const source = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
const ast = ts.createSourceFile("server.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const fn = (name) => ast.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === name).getText(ast);
const names = ["Puebla", "Tehuacan", "Acapulco", "Queretaro", "San Luis", "Morelos"];
const plants = names.map((canon, i) => ({ canon, nombre: canon, provinciaPlantCode: canon, plantaId: i + 1 }));
const resolvePlant = async (_c, raw) => plants.find((p) => forecast.plantsEquivalent(p.canon, raw)) || null;

function harness(route, auth) {
  const calls = [];
  const client = { release() {}, query: async () => ({ rows: [] }) };
  const arr = {
    ...forecast,
    resolveForecastExportPlant: resolvePlant,
    listIgfDiarioProvinciaPlants: async () => plants,
    buildPronosticoProjectionContext: async () => null,
    loadPrecioDiario: async () => [],
    buildPronosticoVentaDescMaps: async () => ({ corteYmdStr: "2026-11-13" }),
    computePronosticoProyByPlant: async () => new Map(),
    savePronosticoMiniSnapshot: async () => calls.push(["snapshot"]),
    generarDashboardArrForecast: async (_c, y, m, code, opts) => {
      calls.push(["excel", { y, m, code, opts }]);
      return Buffer.from("workbook");
    },
  };
  const deps = {
    dashboardAuthMiddleware() {}, igfDiarioDownloadAccess: access, igfDashboardScope: scope,
    pool: { connect: async () => { calls.push(["connect"]); return client; } },
    dashboardArrForecast: arr, normalizeAccents: (s) => String(s || "").toUpperCase(),
    buildIgfForecastPayload: async () => ({ rows: names.map((empresa) => ({ empresa, venta_ton: 100 })) }),
    computeIgfForecastMiniPayload: async () => ({ rows: [] }),
    igfDiarioGrafica: { loadLiveGrafica: async (_c, opts) => { calls.push(["graph", opts]); return { ok: true }; } },
    commercialTrendEngine: {
      normalizeAccents: (s) => String(s).toUpperCase(),
      loadCommercialTrend: async (_c, opts) => { calls.push(["series", opts]); return { ok: true }; },
      toVentaSerieHttpBody: () => ({ clientes_top: [] }),
    },
    clienteComentariosLib: { ensureClienteComentariosTable: async () => {} },
    dicfAccionesLib: { resolvePlantaId: async () => null },
    comprasDashboard: { ensureComprasTables: async () => {}, loadMonth: async (_c, id) => { calls.push(["compras", id]); return {}; } },
    igfDiarioDailyInsights: { loadPlantDailyInsights: async (_c, opts) => { calls.push(["insights", opts.plantaId]); return {}; } },
    igfDiarioComprasComment: { applyPayload() {} },
    igfDiarioGastosManuales: { listMonth: async () => [], effectivePair: () => ({}) },
    igfDiarioGastosDesglose: { usesDetailedExpenseLayout: () => true, listMonth: async () => [], findRow: () => null, excelPacket: () => ({}) },
    igfDiarioGastosDistribucion: { overridesForPlant: async () => [] },
    igfDiarioMargenManual: { listMonthOverrides: async () => [], overridesForPlant: () => [] },
    require: (name) => {
      if (name === "./lib/igf-diario-descuentos-columna") return { attachToInsights: async () => {} };
      if (name === "./lib/igf-diario-weekly-plant") return { METRICS: [["resultado_mxn"]], loadWeeklyPlant: async (_c, opts) => {
        calls.push(["weekly", opts]); return { query_count: 0 };
      } };
      throw new Error("unexpected require: " + name);
    },
  };
  const helpers = ["dashboardAuthRoleNorm", "dashboardHasGlobalPlantScope", "igfDiarioTodasRequestBlock",
    "isDashboardGV", "dashboardBlockGVForbidden", "assertPlantaPermitidaDashboard"].map(fn).join("\n");
  const start = source.indexOf('app.get("' + route + '"');
  assert.ok(start >= 0);
  const statement = source.slice(start, source.indexOf("\n});", start) + 4);
  let handler;
  new Function("app", ...Object.keys(deps), helpers + "\n" + statement)(
    { get: (_route, _middleware, h) => { handler = h; } }, ...Object.values(deps));
  return { calls, async run(query = {}) {
    const res = { code: 200, body: null, headers: {},
      status(code) { this.code = code; return this; },
      json(body) { this.body = body; return this; },
      send(body) { this.body = body; return this; },
      setHeader(k, v) { this.headers[k] = v; },
    };
    await handler({ dashboardAuth: auth, query: { year: 2026, month: 11, upload_day: "2026-11-13", ...query } }, res);
    return res;
  } };
}

const routes = {
  graph: "/api/dashboard/igf-diario-grafica",
  excel: "/api/arr/dashboard-excel",
  series: "/api/arr/venta-serie",
};
function query(kind, code) {
  return kind === "series" ? { empresa: code } : { plant_code: code, require_plant: "1" };
}

test("GA can open the same graph and Excel in each of the six assigned plants", async () => {
  for (const plant of plants) {
    for (const [kind, route] of Object.entries(routes)) {
      const h = harness(route, { role: "GA", plantas_permitidas: [plant.plantaId] });
      const res = await h.run(query(kind, plant.canon));
      assert.equal(res.code, 200, kind + " " + plant.canon);
      const entry = h.calls.find(([key]) => key === kind);
      assert.ok(entry, kind);
      if (kind === "graph") assert.deepEqual(entry[1].plants.map((p) => p.plantaId), [plant.plantaId]);
      if (kind === "series") assert.equal(entry[1].empresa, plant.canon);
      if (kind === "excel") {
        assert.equal(res.headers["Content-Type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        assert.equal(entry[1].code, plant.canon);
        assert.deepEqual(entry[1].opts.igfForecast.rows.map((r) => r.empresa), [plant.canon]);
        assert.equal(entry[1].opts.proyeccionCatSubForecast.plantCodeFilter, plant.canon);
        assert.equal(entry[1].opts.fechaCorte, "2026-11-13");
        assert.ok(!h.calls.some(([key]) => key === "snapshot"));
        assert.deepEqual(h.calls.filter(([key]) => key === "compras" || key === "insights").map(([, id]) => id), [plant.plantaId, plant.plantaId]);
      }
    }
  }
});

test("GA rejects a different plant before financial reads, including plant aliases", async () => {
  for (const [kind, route] of Object.entries(routes)) {
    for (const label of ["Acapulco", "GTM Querétaro", "GT Puebla"]) {
      const h = harness(route, { role: "GA", plantas_permitidas: [2] });
      assert.equal((await h.run(query(kind, label))).code, 403);
      assert.deepEqual(h.calls, [["connect"]]);
    }
    const own = harness(route, { role: "GA", plantas_permitidas: [2] });
    assert.equal((await own.run(query(kind, "Tehuacán"))).code, 200);
  }
});

test("GA missing scope, missing plant, global flags and unscoped Excel cannot bypass access", async () => {
  for (const [kind, route] of Object.entries(routes)) {
    for (const scopeIds of [undefined, [], [0, null, "bad"]]) {
      const h = harness(route, { role: "GA", plantas_permitidas: scopeIds });
      assert.equal((await h.run(query(kind, "Puebla"))).code, 403);
      assert.deepEqual(h.calls, []);
    }
    for (const override of [{ plant_code: "", empresa: "" }, { igf_diario_todas: "1" }, { todas: "true" }, { provincia: "yes" }]) {
      const h = harness(route, { role: "GA", plantas_permitidas: [1] });
      assert.equal((await h.run({ ...query(kind, "Puebla"), ...override })).code, 403);
      assert.deepEqual(h.calls, []);
    }
  }
  for (const require_plant of [undefined, "", "0", "false"]) {
    const h = harness(routes.excel, { role: "GA", plantas_permitidas: [1] });
    assert.equal((await h.run({ plant_code: "Puebla", require_plant })).code, 403);
    assert.deepEqual(h.calls, []);
  }
});

test("plant chooser uses server scope, supports multiple plants and fails closed", async () => {
  for (const ids of [[], [1], [2, 4], [1, 2, 3, 4, 5, 6]]) {
    const h = harness("/api/dashboard/igf-diario-plantas", { role: "GA", plantas_permitidas: ids });
    const res = await h.run();
    assert.equal(res.code, 200);
    assert.deepEqual(res.body.plants.map((p) => p.id), ids);
    assert.equal(res.body.global_scope, false);
  }
  for (const role of ["ZP", "AD", "CF_CDMX"]) {
    const res = await harness("/api/dashboard/igf-diario-plantas", { role }).run();
    assert.equal(res.body.plants.length, 6);
    assert.equal(res.body.global_scope, true);
  }
});

test("existing roles keep individual export and GV remains denied", async () => {
  for (const role of ["GG", "ZP", "AD", "CF_CDMX", "GV"]) {
    for (const [kind, route] of Object.entries(routes)) {
      const h = harness(route, { role, plantas_permitidas: [1] });
      const res = await h.run(query(kind, "Puebla"));
      assert.equal(res.code, role === "GV" ? 403 : 200, kind + " " + role);
      if (role === "GV") assert.deepEqual(h.calls, []);
    }
  }
});

test("export preserves chosen month, historical week and cutoff", async () => {
  const h = harness(routes.excel, { role: "GA", plantas_permitidas: [1] });
  const res = await h.run({ ...query("excel", "Puebla"), month: 10, week_anchor: "2026-10-04", version_as_of_corte: "1" });
  assert.equal(res.code, 200);
  const opts = h.calls.find(([key]) => key === "weekly")[1];
  assert.equal(opts.month, 10);
  assert.equal(opts.weekAnchor, "2026-10-04");
  assert.equal(opts.corteYmd, "2026-11-13");
  assert.equal(opts.versionAsOfCorte, true);
});
