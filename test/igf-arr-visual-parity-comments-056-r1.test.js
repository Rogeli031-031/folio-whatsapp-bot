"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const engine = require("../lib/commercial-trend-engine");
const comments = require("../lib/arr-venta-serie-comments");

const ROOT = path.join(__dirname, "..");
const ARR = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "ArrVentaGraficaModal.tsx"), "utf8");
const PANEL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "ArrVentaCanalPanel.tsx"), "utf8");
const IGF = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioGraficaModal.tsx"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");

const VIEW = ARR.slice(ARR.indexOf("export function ArrVentaSerieView"));

function rankComments(rows, plantaIds) {
  const allow = new Set(plantaIds.map(Number));
  const grouped = new Map();
  const sorted = rows
    .filter((row) => allow.has(Number(row.planta_id)))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id);
  for (const row of sorted) {
    const key = String(row.cliente).trim().toLowerCase();
    const list = grouped.get(key) || [];
    if (list.length >= 2) continue;
    list.push(row.body);
    grouped.set(key, list);
  }
  return grouped;
}

test("modal y panel usan la misma ArrVentaSerieView", () => {
  assert.match(ARR, /<ArrVentaSerieView/);
  assert.match(PANEL, /<ArrVentaSerieView/);
  assert.match(ARR, /export function ArrVentaSerieView/);
  assert.equal(ARR.split("function linearTrend").length - 1, 1);
  assert.doesNotMatch(PANEL, /function linearTrend/);
  assert.doesNotMatch(PANEL, /const W = 320/);
  assert.doesNotMatch(PANEL, /<polyline/);
  assert.doesNotMatch(VIEW, /fetchArrVentaSerie/);
  assert.match(PANEL, /fetchArrVentaSerie/);
  assert.match(ARR.slice(0, ARR.indexOf("export function ArrVentaSerieView")), /fetchArrVentaSerie/);
  assert.match(VIEW, /chart\.yTicks/);
  assert.match(VIEW, /chart\.xLabels/);
  assert.match(VIEW, /areaPath/);
  assert.match(VIEW, /trendLine/);
  assert.match(VIEW, /setHoverIdx/);
  assert.match(VIEW, /fmtFechaLarga\(active\.fecha\)/);
  assert.match(VIEW, /Top 6 clientes/);
  assert.match(VIEW, /Últimos comentarios/);
  assert.match(VIEW, /const W = 980/);
  assert.match(VIEW, /const H = 460/);
  assert.match(VIEW, /canal === "casa" \? "#ca8a04" : "#38bdf8"/);
  assert.match(VIEW, /stroke="#16a34a"/);
  assert.match(IGF, /canal="casa"/);
  assert.match(IGF, /canal="comisionista"/);
  assert.match(IGF, /stroke="#facc15"/);
  assert.doesNotMatch(PANEL, /Venta CASA/);
  assert.doesNotMatch(PANEL, /setRange\(/);
});

test("Provincia adjunta comentarios de sus plantas y excluye la ajena", async () => {
  let queries = 0;
  const client = {
    async query(sql, params) {
      queries += 1;
      assert.match(String(sql), /FROM public\.plantas/);
      const wanted = params[0];
      assert.equal(wanted.includes("PROVINCIA"), false);
      const catalog = [
        { id: 1, nombre: "PUEBLA" },
        { id: 2, nombre: "ACAPULCO" },
        { id: 99, nombre: "OTRA" },
      ];
      return { rows: catalog.filter((row) => wanted.includes(row.nombre)).map((row) => ({ id: row.id })) };
    },
  };
  const plantaIds = await comments.resolveComentarioPlantaIds(client, ["Puebla", "Acapulco"]);
  assert.equal(queries, 1);
  assert.ok(plantaIds.includes(1));
  assert.ok(plantaIds.includes(2));
  assert.equal(plantaIds.includes(99), false);
  const rows = [
    { id: 1, planta_id: 1, cliente: "CLIENTE UNO", body: "A", created_at: "2026-09-03" },
    { id: 2, planta_id: 2, cliente: "CLIENTE UNO", body: "B", created_at: "2026-09-02" },
    { id: 3, planta_id: 99, cliente: "CLIENTE UNO", body: "C", created_at: "2026-09-04" },
    { id: 4, planta_id: 1, cliente: "CLIENTE UNO", body: "D", created_at: "2026-09-01" },
  ];
  const picked = rankComments(rows, plantaIds).get("cliente uno");
  assert.deepEqual(picked, ["A", "B"]);
  const duplicated = await comments.resolveComentarioPlantaIds(client, ["Puebla", "GT Puebla"]);
  assert.deepEqual([...new Set(duplicated)], duplicated);
  assert.equal(duplicated.includes(99), false);
  assert.equal(duplicated.filter((id) => id === 1).length, 1);
});

test("cliente Provincia suma la venta y usa el mismo scope de comentarios", async () => {
  const result = await engine.loadCommercialTrend({ query() { return { rows: [] }; } }, {
    empresa: "Provincia",
    range: "1m",
    canal: "ambos",
    cliente_norm: "CLIENTE UNO",
    resolvePlantCodes: async () => ({
      not_found: false,
      uniqueCodes: ["Puebla", "Acapulco"],
      plantCode: "Provincia",
    }),
    queryBounds: async () => ({ rows: [{ min_f: "2026-09-01", max_f: "2026-09-02" }] }),
    querySalesSeries: async () => ({
      rows: [
        { fecha: "2026-09-01", venta_ton: 9 },
        { fecha: "2026-09-01", venta_ton: 5 },
      ],
    }),
    queryDiscountSeries: async () => ({ rows: [] }),
    queryClientTons: async (_c, _codes, _a, _b, _canal, clienteNorm) => ({
      rows: [{ cliente: clienteNorm, venta_ton: 14 }],
    }),
  });
  assert.equal(result.points[0].venta_ton, 14);
  assert.equal(result.cliente_norm, "CLIENTE UNO");
  assert.deepEqual(result.plant_codes, ["Puebla", "Acapulco"]);
  const plantaIds = await comments.resolveComentarioPlantaIds({
    async query(sql, params) {
      assert.match(String(sql), /FROM public\.plantas/);
      const catalog = { PUEBLA: 1, ACAPULCO: 2, OTRA: 99 };
      return {
        rows: params[0].filter((name) => catalog[name]).map((name) => ({ id: catalog[name] })),
      };
    },
  }, result.plant_codes);
  const picked = rankComments([
    { id: 1, planta_id: 1, cliente: "CLIENTE UNO", body: "A", created_at: "2026-09-03" },
    { id: 2, planta_id: 2, cliente: "CLIENTE UNO", body: "B", created_at: "2026-09-02" },
    { id: 9, planta_id: 99, cliente: "CLIENTE UNO", body: "C", created_at: "2026-09-04" },
  ], plantaIds).get("cliente uno");
  assert.deepEqual(picked, ["A", "B"]);
});

test("el gate de Provincia sigue antes de pool.connect y los comentarios usan plant_codes", () => {
  const start = SERVER.indexOf('app.get("/api/arr/venta-serie"');
  const head = SERVER.slice(start, start + 1800);
  const gate = head.indexOf("igfDiarioTodasRequestBlock");
  const connect = head.indexOf("pool.connect()");
  assert.ok(gate > 0 && connect > gate);
  const handler = SERVER.slice(start, start + 5000);
  const commentsAt = handler.indexOf("resolveComentarioPlantaIds");
  assert.ok(commentsAt > handler.indexOf("pool.connect()"));
  assert.match(handler, /engineResult && engineResult\.plant_codes/);
  assert.match(handler, /rn <= 2/);
  assert.match(handler, /planta_id = ANY\(\$1::int\[\]\)/);
  assert.match(IGF, /mode="cliente"/);
  assert.match(IGF, /clienteNorm=\{arrCliente\}/);
});
