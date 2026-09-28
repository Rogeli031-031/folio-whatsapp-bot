"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const AUTH = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "auth.ts"), "utf8");
const UI = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const API = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "api.ts"), "utf8");

function extractFunction(src, name) {
  const start = src.search(new RegExp(`(?:export )?function ${name}\\(`));
  if (start < 0) throw new Error(`falta ${name}`);
  let depth = 0;
  let seen = false;
  for (let i = src.indexOf("{", start); i < src.length; i += 1) {
    if (src[i] === "{") {
      depth += 1;
      seen = true;
    } else if (src[i] === "}") {
      depth -= 1;
      if (seen && depth === 0) return src.slice(start, i + 1).replace(/^export /, "");
    }
  }
  throw new Error(`función sin cierre ${name}`);
}

const serverFns = new Function(
  `${extractFunction(SERVER, "dashboardAuthRoleNorm")}
   ${extractFunction(SERVER, "dashboardHasGlobalPlantScope")}
   ${extractFunction(SERVER, "igfDiarioTodasRequestBlock")}
   return { dashboardHasGlobalPlantScope, igfDiarioTodasRequestBlock };`
)();

function toJs(fn) {
  return fn
    .replace(/^export /, "")
    .replace(/: string \| null \| undefined/g, "")
    .replace(/: Record<string, unknown> \| null/g, "")
    .replace(/ as Record<string, unknown>/g, "")
    .replace(/: string/g, "")
    .replace(/: boolean/g, "");
}

const uiFns = new Function(
  `${toJs(extractFunction(AUTH, "normalizeDashboardToken"))}
   ${toJs(extractFunction(AUTH, "base64UrlDecodeToString"))}
   ${toJs(extractFunction(AUTH, "decodeDashboardTokenPayload"))}
   ${toJs(extractFunction(AUTH, "tokenHasGlobalPlantScope"))}
   return { tokenHasGlobalPlantScope };`
)();

function token(role, extra) {
  const body = Buffer.from(JSON.stringify({ role, ...(extra || {}) }))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `aaa.${body}.sig`;
}

function gate(role, query, extra) {
  return serverFns.igfDiarioTodasRequestBlock({
    query,
    dashboardAuth: { role, ...(extra || {}) },
  });
}

const handlerStart = SERVER.indexOf('app.get("/api/arr/dashboard-excel"');
const handler = SERVER.slice(handlerStart, SERVER.indexOf('app.get("/api/dashboard/igf-versiones"'));

test("A–C) ZP, AD y CF_CDMX pueden exportar Todas", () => {
  for (const role of ["ZP", "AD", "CF_CDMX"]) {
    assert.equal(gate(role, { igf_diario_todas: "1" }), null, role);
    assert.equal(serverFns.dashboardHasGlobalPlantScope({ role }), true, role);
    assert.equal(uiFns.tokenHasGlobalPlantScope(token(role)), true, role);
  }
});

test("D) GG con una planta recibe 403 antes de leer otras plantas", () => {
  const denied = gate("GG", { igf_diario_todas: "1" }, { plantas_permitidas: [1] });
  assert.equal(denied.status, 403);
  assert.equal(denied.error, "No tienes alcance global para exportar IGF Diario Todas.");
  assert.equal(serverFns.dashboardHasGlobalPlantScope({ role: "GG", plantas_permitidas: [1] }), false);
  const block = extractFunction(SERVER, "igfDiarioTodasRequestBlock");
  assert.doesNotMatch(block, /listIgfDiarioProvinciaPlants|loadMonth|loadPrecioDiario/);
  const gateAt = handler.indexOf("igfDiarioTodasRequestBlock(req)");
  const connectAt = handler.indexOf("pool.connect()");
  const listAt = handler.indexOf("listIgfDiarioProvinciaPlants");
  const otherLoadAt = handler.indexOf("comprasDashboard.loadMonth(client, plant.plantaId");
  assert.ok(gateAt > 0 && connectAt > gateAt && listAt > connectAt && otherLoadAt > listAt);
});

test("E) GO local recibe 403", () => {
  const denied = gate("GO", { igf_diario_todas: "1" }, { plantas_permitidas: [2] });
  assert.equal(denied.status, 403);
  assert.equal(uiFns.tokenHasGlobalPlantScope(token("GO", { plantas_permitidas: [] })), false);
});

test("F–G) GA y GV conservan su bloqueo anterior", () => {
  const ga = handler.indexOf("dashboardBlockGAFinancialKpis");
  const gv = handler.indexOf("dashboardBlockGVForbidden");
  const todas = handler.indexOf("igfDiarioTodasRequestBlock(req)");
  assert.ok(ga >= 0 && ga < gv && gv < todas);
  assert.match(SERVER, /GA no tiene acceso a KPIs financieros\./);
  assert.match(SERVER, /Tu rol \(GV\) solo tiene acceso a Delta ingreso Forecast y acciones DICF en tu planta\./);
  assert.equal(serverFns.dashboardHasGlobalPlantScope({ role: "GA" }), false);
  assert.equal(serverFns.dashboardHasGlobalPlantScope({ role: "GV" }), false);
});

test("H) Todas junto con planta individual es 400", () => {
  const denied = gate("ZP", {
    igf_diario_todas: "1",
    plant_code: "Puebla",
    require_plant: "1",
  });
  assert.equal(denied.status, 400);
  assert.equal(denied.error, "IGF Diario Todas no puede combinarse con una planta individual.");
});

test("I–J) el export individual conserva permiso y rechazo previos", () => {
  assert.equal(gate("GG", { require_plant: "1", plant_code: "Puebla" }, { plantas_permitidas: [1] }), null);
  assert.match(handler, /assertPlantaPermitidaDashboard\(req, resolvedPlant\.plantaId\)/);
  assert.match(handler, /if \(deniedPlant\) return res\.status\(403\)/);
  assert.match(SERVER, /Sin permiso para esta planta/);
  assert.match(handler, /resolveForecastExportPlant\(client, plantCodeRaw\)/);
});

test("K) el caller histórico sin flag no recibe el 403 nuevo", () => {
  assert.equal(gate("GG", { year: "2026", month: "9" }, { plantas_permitidas: [1] }), null);
  assert.equal(gate("GG", {}, { plantas_permitidas: [] }), null);
  assert.match(handler, /if \(requirePlant && !plantCodeRaw\)/);
  assert.doesNotMatch(handler, /if \(!plantCodeRaw\) \{\s*return res\.status\(400\)/);
});

test("frontend: Todas global abre la URL y un rol local muestra el mensaje", () => {
  const click = UI.slice(UI.indexOf("const todas = !plantaFilter"), UI.indexOf("window.open"));
  assert.match(click, /if \(todas && !tokenHasGlobalPlantScope\(token\)\)/);
  assert.match(click, /No tienes alcance global para exportar IGF Diario Todas\./);
  assert.match(click, /return;/);
  assert.match(UI, /todas \? null : plantaFilter/);
  assert.match(API, /igfDiarioTodas \? "&igf_diario_todas=1" : ""/);
  assert.equal(uiFns.tokenHasGlobalPlantScope(token("GG", { plantas_permitidas: [] })), false);
  assert.equal(uiFns.tokenHasGlobalPlantScope(token("AD")), true);
  assert.match(SERVER, /if \(dashboardHasGlobalPlantScope\(req\.dashboardAuth\)\) return true;/);
});
