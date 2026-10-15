"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const scope = require("../lib/igf-dashboard-scope");
const forecast = require("../lib/dashboard-arr-forecast");
const ts = require("../frontend-dashboard/node_modules/typescript");
const source = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
const ast = ts.createSourceFile("server.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const fn = (name) => ast.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === name).getText(ast);
const plants = ["Puebla", "Tehuacan", "Acapulco", "Queretaro", "San Luis", "Morelos"];
const labels = ["GT - Puebla", "Tehuacán", "Acapulco", "GTM - Querétaro", "GTM - San Luis P.", "Morelos"];
const miniLabels = ["GT Puebla", "Tehuacan", "Acapulco", "GTM Queretaro", "GTM San Luis", "Morelos"];
const resolvePlant = async (_client, raw) => {
  const index = plants.findIndex((plant) => forecast.plantsEquivalent(raw, plant));
  return index < 0 ? null : { plantaId: index + 1, canon: plants[index], nombre: labels[index] };
};
const mini = () => ({ ok: true, year: 2026, month: 10, zona: { ventaTon: 600 }, rows: plants.map((plant_code, i) => ({ empresa: miniLabels[i], plant_code, ventaTon: 100 + i })) });
const payload = () => ({ year: 2026, month: 10, version_id: 1, totales: { venta_ton: 999 }, rows: labels.map((empresa) => ({ empresa, venta_ton: 100 })) });

function harness(method, route, auth, extra = {}) {
  const calls = [];
  const client = { release() {}, async query(sql, args) {
    calls.push([String(sql), args]);
    return { rows: String(sql).includes("FROM arr.provincia_plants") ? plants.map((plant_code) => ({ plant_code })) : [] };
  } };
  const arr = {
    ...forecast,
    resolveForecastExportPlant: resolvePlant,
    getPronosticoPlantDetail: async (_client, _year, _month, plant) => { calls.push(["detail", plant]); return { plant_code: plant }; },
    buildPronosticoVentaDescMaps: async () => ({ corteYmdStr: "2026-10-15", plants }),
    computePronosticoProyByPlant: async () => new Map(plants.map((p) => [p, { proy_venta_ton: 100 }])),
    savePronosticoMiniSnapshot: async (_c, _y, _m, _d, values) => { calls.push(["snapshot", [...values.keys()]]); },
    listIgfDiarioProvinciaPlants: async () => plants.map((canon, i) => ({ canon, plantaId: i + 1 })),
    buildPronosticoProjectionContext: async () => null,
  };
  const parsePatch = (body) => ({ ok: true, ...body, plantCode: body.plant_code });
  const write = async (_c, patch) => { calls.push(["write", patch.plantCode]); return { row: {}, deleted: false }; };
  const rows = plants.map((plant_code) => ({ plant_code }));
  const deps = {
    pool: { connect: async () => client }, dashboardAuthMiddleware() {},
    igfDashboardScope: scope, dashboardArrForecast: arr,
    dashboardBlockGAFinancialKpis: new Function(fn("dashboardBlockGAFinancialKpis") + ";return dashboardBlockGAFinancialKpis;")(),
    dashboardBlockGVForbidden: new Function(["dashboardAuthRoleNorm", "isDashboardGV", "dashboardBlockGVForbidden"].map(fn).join("\n") + ";return dashboardBlockGVForbidden;")(),
    isIgfUploadDayAllowedForMonth: () => true,
    buildIgfForecastPayload: async () => payload(),
    computeIgfForecastMiniPayload: async () => mini(),
    igfDiarioGastosManuales: { parsePatch, parsePeriod: () => ({ ok: true, year: 2026, month: 10 }), listMonth: async () => rows, patchManual: write },
    igfDiarioGastosDesglose: { parsePatch, listMonth: async () => rows, patchDesglose: write, publicRow: (row) => row },
    igfDiarioGastosDistribucion: { parsePatch, parseQuery: parsePatch, patchDistribucion: write, getSchedule: write },
    igfDiarioMargenManual: { parsePatch, patchMarginOverrides: write },
    forecastMensual: { calcularForecastMensual: async (_c, plant) => { calls.push(["recalculate", plant]); } },
    igfDiarioGrafica: {
      loadMarginDetail: async (_c, opts) => { calls.push(["margin", opts.plantCode]); return {}; },
      loadIgfDiarioAcumulado: async (_c, opts) => { calls.push(["acumulado", opts.plants]); return { rows: opts.plants }; },
    },
    require: (name) => name === "./lib/igf-diario-monthly-financials" ? { usesOctoberContract: () => false } : require(name),
    ...extra,
  };
  const start = source.indexOf(`app.${method}("${route.startsWith("/") ? route : "/api/dashboard/" + route}"`);
  assert.ok(start >= 0, route);
  const statement = source.slice(start, source.indexOf("\n});", start) + 4);
  let handler;
  const app = { [method]: (_url, _middleware, fn) => { handler = fn; } };
  const helpers = ["filterIgfDiarioGastosManuales", "filterIgfDiarioGastosDesglose"].map(fn).join("\n");
  new Function("app", ...Object.keys(deps), helpers + "\n" + statement)(app, ...Object.values(deps));
  return {
    calls,
    async run(data = {}) {
      const res = { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
      const input = { year: 2026, month: 10, upload_day: "2026-10-15", ...data };
      await handler({ dashboardAuth: auth, query: input, body: input }, res);
      return res;
    },
  };
}

test("Forecast and fallback mini contain only the GG plant; no global totals or foreign warnings", async () => {
  for (let i = 0; i < plants.length; i++) {
    const auth = { role: "GG", plantas_permitidas: [i + 1] };
    const result = await harness("get", "igf-forecast", auth).run({ include_mini: "1" });
    assert.equal(result.code, 200);
    assert.deepEqual(result.body.rows.map((r) => r.empresa), [labels[i]]);
    assert.deepEqual(result.body.mini.rows.map((r) => r.empresa), [labels[i]]);
    assert.equal(result.body.mini.rows[0].plant_code, plants[i]);
    assert.equal(result.body.totales, null);
    assert.equal(result.body.mini.zona, null);
    const fallback = await harness("get", "igf-forecast-mini", auth).run();
    assert.deepEqual(fallback.body, result.body.mini);
    const accumulated = harness("get", "igf-diario-acumulado", auth);
    assert.equal((await accumulated.run()).code, 200);
    assert.deepEqual(accumulated.calls[0][1].map((p) => p.canon), [plants[i]]);
  }
});

test("scoped roles fail closed with missing/empty plant scope; global roles retain the complete payload", async () => {
  for (const role of ["GG", "GO"]) {
    for (const allowed of [undefined, [], [null, "bad", 0]]) {
      const response = await harness("get", "igf-forecast", { role, plantas_permitidas: allowed }).run({ include_mini: "1" });
      assert.deepEqual(response.body.rows, []);
      assert.deepEqual(response.body.mini.rows, []);
      assert.equal(scope.canAccessPlant({ role, plantas_permitidas: allowed }, 2), false);
    }
  }
  for (const role of ["ZP", "AD", "CF_CDMX"]) {
    const response = await harness("get", "igf-forecast", { role, plantas_permitidas: [2] }).run({ include_mini: "1" });
    assert.deepEqual(response.body, { ...payload(), mini: mini() });
  }
});

test("GG can use projection for own plant; other plant, unknown plant and empty scope stop before reads/writes", async () => {
  for (const method of ["get", "post"]) {
    const route = method === "get" ? "pronostico-detalle" : "pronostico-dias";
    for (const allowed of [[2], []]) {
      for (const plant_code of ["Tehuacán", "Puebla", "unknown"]) {
        const h = harness(method, route, { role: "GG", plantas_permitidas: allowed });
        const res = await h.run({ plant_code, days: [{ fecha: "2026-10-14", selected: false }] });
        const ok = allowed.length && plant_code === "Tehuacán";
        assert.equal(res.code, ok ? 200 : 403, `${route} ${plant_code} ${allowed}`);
        if (!ok) assert.deepEqual(h.calls, []);
        else if (method === "post") {
          assert.deepEqual(h.calls.find(([kind]) => kind === "snapshot")[1], ["Tehuacan"]);
          assert.equal(h.calls.filter(([sql]) => sql.startsWith("INSERT")).length, 1);
        }
      }
    }
  }
});

test("margin, HG and expense endpoints reject a foreign or unassigned plant before any write", async () => {
  const routes = ["igf-diario-margen-diario", "igf-diario-gastos-manuales", "igf-diario-gastos-desglose", "igf-diario-gastos-distribucion"];
  for (const route of routes) {
    for (const allowed of [[2], []]) {
      for (const plant_code of ["Tehuacan", "Puebla"]) {
        const h = harness("patch", route, { role: "GG", plantas_permitidas: allowed });
        const res = await h.run({ plant_code });
        const ok = allowed.length && plant_code === "Tehuacan";
        assert.equal(res.code, ok ? 200 : 403, route);
        assert.deepEqual(h.calls, ok ? [["write", plant_code]] : []);
      }
    }
  }
  const hg = harness("patch", "igf-forecast", { role: "GG", plantas_permitidas: [2] }, {
    buildIgfForecastPayload() { throw new Error("must deny before loading foreign financials"); },
  });
  assert.equal((await hg.run({ empresa: "GT Puebla", hg_pct: 5 })).code, 403);
  assert.deepEqual(hg.calls, []);
});

test("expense lists and margin/distribution reads use the same authenticated plant scope", async () => {
  for (const route of ["igf-diario-gastos-manuales", "igf-diario-gastos-desglose"]) {
    const res = await harness("get", route, { role: "GG", plantas_permitidas: [2] }).run();
    assert.deepEqual(res.body.rows.map((row) => row.plant_code), ["Tehuacan"]);
  }
  for (const route of ["igf-diario-margen-diario", "igf-diario-gastos-distribucion"]) {
    for (const plant_code of ["Tehuacan", "Puebla"]) {
      const h = harness("get", route, { role: "GG", plantas_permitidas: [2] });
      const res = await h.run({ plant_code });
      assert.equal(res.code, plant_code === "Tehuacan" ? 200 : 403);
      if (res.code === 403) assert.deepEqual(h.calls, []);
    }
  }
});

test("GA/GV keep their financial restrictions", async () => {
  for (const role of ["GA", "GV"]) {
    for (const [method, route] of [["get", "igf-forecast"], ["get", "igf-forecast-mini"], ["get", "pronostico-detalle"], ["post", "pronostico-dias"], ["patch", "igf-diario-margen-diario"]]) {
      const h = harness(method, route, { role, plantas_permitidas: [2] });
      assert.equal((await h.run({ plant_code: "Tehuacan" })).code, 403);
      assert.deepEqual(h.calls, []);
    }
  }
});

test("ARR recalculate button processes only authorized plants for GG, all for a global role", async () => {
  for (const [auth, expected] of [
    [{ role: "GG", plantas_permitidas: [2] }, ["Tehuacan"]],
    [{ role: "GG", plantas_permitidas: [] }, []],
    [{ role: "ZP", plantas_permitidas: [] }, plants],
  ]) {
    const h = harness("post", "/api/arr/forecast-provincia", auth);
    assert.equal((await h.run()).code, expected.length ? 200 : 403);
    assert.deepEqual(h.calls.filter(([kind]) => kind === "recalculate").map(([, plant]) => plant), expected);
  }
});
