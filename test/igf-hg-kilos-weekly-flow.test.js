"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const compras = require("../lib/compras-excel");
const grafica = require("../lib/igf-diario-grafica");
const weekly = require("../lib/igf-diario-weekly-plant");
const { buildExecutiveView, renderExecutiveSvg } = require("../frontend-dashboard/lib/igf-diario-weekly-executive-chart");

function fecha(day) {
  return `2026-10-${String(day).padStart(2, "0")}`;
}

// Raw Control de compras rows, before the resolver that feeds the weekly API.
function payload(marks) {
  return {
    year: 2026, month: 10,
    providers: [{ id: 1, nombre: "Proveedor de prueba", orden: 0 }],
    tarifas_flete: [{ proveedor_id: 1, tarifa: 1 }],
    grid: { days: Array.from({ length: 31 }, (_, i) => ({
      ymd: fecha(i + 1),
      cells: { 1: { kg: 1000, importe: 12000 } },
      hg_costo_efectivo: 13,
      ...marks[i + 1],
    })) },
  };
}

test("Control de compras HG survives the real loader, weekly records and screen/PDF renderer", async () => {
  const raw = payload({ 4: { hg_kilos: 17 }, 5: { hg_kilos: -3 }, 6: { hg_kilos: 0 },
    11: { hg_kilos: 8 }, 18: { hg_kilos: 20 } });
  const original = structuredClone(raw);
  const cache = new Map([["7|2026|10", raw]]);
  const client = { query() { assert.fail("Cached purchases must not query a database"); } };
  const comprasByFecha = await grafica.loadComprasDayMap(client, 7, [{ year: 2026, month: 10 }], "2026-11-01", cache);
  const built = grafica.materializePlantMonth({ year: 2026, month: 10, plant: "Fixture",
    corteYmd: "2026-11-01", project: true,
    casaTon: new Map(Array.from({ length: 31 }, (_, i) => [fecha(i + 1), 2])), comTon: new Map(),
    precioRows: [], comprasByFecha, cdByFecha: new Map(), priorCdByFecha: new Map() });
  const days = weekly.daysFromBuilt(built, null);
  const weeks = [4, 11, 18].map((start, i) => {
    const selected = Array.from({ length: 7 }, (_, offset) => days.get(fecha(start + offset)));
    return { id: `w${i}`, fecha_desde: fecha(start), fecha_hasta: fecha(start + 6), week_number: 41 + i,
      days: weekly.weekDayRecords(selected, "2026-11-01"), metrics: weekly.aggregateWeek(selected, "2026-11-01").metrics };
  });
  // Round trip through JSON, as on the API: undefined fields used to disappear here.
  const view = buildExecutiveView({ scope: "plant", plant: "Fixture",
    weeks: JSON.parse(JSON.stringify(weeks)), selectedIds: weeks.map((w) => w.id) });
  const hg = view.indicators.find((indicator) => indicator.id === "kilos");
  assert.deepEqual(hg.columns.map((c) => c.value), [14, 8, 20]);
  assert.deepEqual(hg.columns[0].points.map((p) => p.value), [17, -3, 0, null, null, null, null]);
  assert.deepEqual(hg.columns.map((c) => c.tone), ["neutral", "bad", "good"]);
  assert.deepEqual(hg.columns.slice(1).map((c) => c.delta.absolute), [-6, 12]);
  assert.equal(days.get(fecha(4)).ventaKg, 2000);
  assert.equal(days.get(fecha(4)).hgImporte, -221);
  assert.equal(view.indicators.find((i) => i.id === "hg").columns[0].value, -182);
  const svg = renderExecutiveSvg(view);
  const hgSvg = svg.split('data-indicator="kilos"')[1].split('data-indicator="venta_casa"')[0];
  assert.match(hgSvg, /HG EN KILOS/);
  assert.match(hgSvg, /data-value="17"/);
  assert.match(hgSvg, /data-value="-3"/);
  assert.match(hgSvg, /data-value="0"/);
  assert.deepEqual(raw, original);
});

test("HG resolver preserves captured zero and missing values and uses the existing forecast", () => {
  const rows = compras.resolveControlComprasDays(payload({
    4: { hg_kilos: 18 }, 5: { hg_kilos: -6 }, 6: { hg_kilos: 0 }, 16: { hg_kilos: 0 },
  }), "2026-10-15");
  const at = (day) => rows.find((row) => row.fecha === fecha(day));
  assert.equal(at(4).hgKilos, 18);
  assert.equal(at(5).hgKilos, -6);
  assert.equal(at(6).hgKilos, 0);
  assert.equal(at(7).hgKilos, null);
  assert.equal(at(15).hgKilos, 4); // (18 - 6 + 0) / 3 captured days.
  assert.equal(at(16).hgKilos, 0); // A real zero takes precedence over the estimate.
  assert.equal(at(17).hgKilos, 3); // (18 - 6 + 0 + 0) / 4; estimates are not history.
  const empty = compras.resolveControlComprasDays(payload({}), "2026-10-15");
  assert.ok(empty.every((row) => row.hgKilos === null));
});

test("Physical HG remains available without a purchase cost or financial HG amount", () => {
  const raw = { year: 2026, month: 10, providers: [], grid: { days: [
    { ymd: fecha(4), hg_kilos: -7 }, { ymd: fecha(5), hg_kilos: 0 }, { ymd: fecha(6) },
  ] } };
  const rows = compras.resolveControlComprasDays(raw, "2026-10-15");
  assert.deepEqual(rows.map((row) => row.hgKilos), [-7, 0, null]);
  assert.ok(rows.every((row) => row.hgImporte === null));
});
