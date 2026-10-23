"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const compras = require("../lib/compras-dashboard");

function ymdDate(iso) {
  return new Date(`${iso}T00:00:00.000Z`);
}

async function workbook(sheets) {
  const wb = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name);
    ws.getCell("A1").value = sheet.a1;
    sheet.rows.forEach((row, index) => {
      const r = 6 + index;
      ws.getCell(r, 1).value = row.origin;
      if (row.kg != null) ws.getCell(r, 5).value = row.kg;
      ws.getCell(r, 7).value = ymdDate(row.fecha);
      ws.getCell(r, 10).value = row.importe;
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

class Mem {
  constructor() {
    this.purchases = [];
    this.docs = [];
    this.hg = [];
    this.providers = [];
    this.imports = [];
    this.meta = [];
    this.seq = 1;
    this.snap = null;
    this.failAt = 0;
    this.inserts = 0;
    this.began = 0;
    this.touchHg = false;
  }
  dump() {
    return JSON.parse(JSON.stringify({
      purchases: this.purchases,
      docs: this.docs,
      hg: this.hg,
      providers: this.providers,
      imports: this.imports,
      meta: this.meta,
      seq: this.seq,
    }));
  }
  restore(snap) {
    this.purchases = snap.purchases;
    this.docs = snap.docs;
    this.hg = snap.hg;
    this.providers = snap.providers;
    this.imports = snap.imports;
    this.meta = snap.meta;
    this.seq = snap.seq;
  }
  async begin() {
    this.began += 1;
    this.snap = this.dump();
  }
  async commit() { this.snap = null; }
  async rollback() {
    if (this.snap) this.restore(this.snap);
    this.snap = null;
  }
  async plantName() { return "Puebla"; }
  async listPurchases(_planta, desde, hasta) {
    return this.purchases
      .filter((p) => p.fecha >= desde && p.fecha <= hasta)
      .map((p) => {
        const meta = this.meta.find((m) => m.compra_id === p.id);
        return { ...p, source_company: meta ? meta.source_company : null };
      });
  }
  async listDocuments(ids) {
    return this.docs.filter((d) => ids.includes(d.compra_id));
  }
  async listHg() { return this.hg.map((h) => ({ ...h })); }
  async providerId(_planta, nombre) {
    const hit = this.providers.find((p) => p.nombre === nombre);
    if (hit) return hit.id;
    const row = { id: this.seq++, nombre };
    this.providers.push(row);
    return row.id;
  }
  async findRequest(requestId) {
    return this.imports.find((row) => row.request_id === requestId) || null;
  }
  async deletePurchases(ids) {
    this.purchases = this.purchases.filter((p) => !ids.includes(p.id));
    this.meta = this.meta.filter((m) => !ids.includes(m.compra_id));
  }
  async insertPurchase(row) {
    this.inserts += 1;
    if (this.failAt && this.inserts === this.failAt) throw new Error("boom");
    if (this.touchHg) this.hg.push({ id: 99, fecha: row.fecha, hg_kilos: 1 });
    const saved = { id: this.seq++, planta_id: row.planta_id, proveedor_id: row.proveedor_id, fecha: row.fecha, kg: row.kg, importe: row.importe };
    this.purchases.push(saved);
    return saved;
  }
  async insertImport(row) {
    const saved = { id: this.seq++, request_id: row.request_id, row_count: row.row_count, total_kg: row.total_kg, total_importe: row.total_importe, source_company: row.source_company, file_sha256: row.file_sha256, file_name: row.file_name };
    this.imports.push(saved);
    return saved;
  }
  async insertMeta(row) { this.meta.push({ ...row }); }
}

function spec(parsed, extra) {
  return {
    mode: "commit",
    parsed,
    planta_id: 1,
    desde: "2026-10-01",
    hasta: "2026-10-31",
    file_name: "fixture.xlsx",
    request_id: "req-1",
    plantName: "Puebla",
    actor_id: 7,
    ...extra,
  };
}

describe("088 importación autoritativa", () => {
  it("A–B filas iguales siguen siendo compras distintas y la grilla suma", async () => {
    const buf = await workbook([{
      name: "OCTUBRE",
      a1: "PUEBLA",
      rows: [
        { origin: "PEMEX TUXPAN", kg: 10, fecha: "2026-10-02", importe: 100 },
        { origin: "PEMEX TUXPAN", kg: 10, fecha: "2026-10-02", importe: 100 },
        { origin: "PEMEX TUXPAN", kg: 5, fecha: "2026-10-02", importe: 40 },
      ],
    }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const mem = new Mem();
    const out = await compras.runComprasExcelImport(mem, spec(parsed));
    assert.equal(out.body.inserted, 3);
    assert.equal(mem.purchases.length, 3);
    const providers = [{ id: mem.providers[0].id, nombre: "PEMEX TUXPAN" }];
    const grid = compras.aggregatePurchases(mem.purchases, providers, 2026, 10);
    const day = grid.days.find((d) => d.ymd === "2026-10-02");
    assert.equal(day.cells[providers[0].id].count, 3);
    assert.equal(day.cells[providers[0].id].kg, 25);
  });

  it("C–D ausencia dentro del rango elimina y fuera del rango permanece", async () => {
    const buf = await workbook([{ name: "OCTUBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 8, fecha: "2026-10-03", importe: 80 }] }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const mem = new Mem();
    mem.purchases.push(
      { id: 1, fecha: "2026-10-02", kg: 4, importe: 40, proveedor_id: 1 },
      { id: 2, fecha: "2026-09-30", kg: 9, importe: 90, proveedor_id: 1 }
    );
    mem.seq = 3;
    await compras.runComprasExcelImport(mem, spec(parsed, { desde: "2026-10-01", hasta: "2026-10-15" }));
    assert.equal(mem.purchases.some((p) => p.fecha === "2026-10-02"), false);
    assert.equal(mem.purchases.some((p) => p.fecha === "2026-09-30" && p.kg === 9), true);
    assert.equal(mem.purchases.filter((p) => p.fecha === "2026-10-03").length, 1);
  });

  it("E–G rango cruzado, mes ausente y origen desconocido", async () => {
    const buf = await workbook([
      { name: "SEPTIEMBRE", a1: "PUEBLA", rows: [{ origin: "TEPEJI-IMPORTADORA", kg: 3, fecha: "2026-09-28", importe: 30 }] },
      { name: "OCTUBRE", a1: "PUEBLA", rows: [{ origin: "TUXPAN IMPORTADORA", kg: 4, fecha: "2026-10-02", importe: 40 }] },
    ]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const cross = compras.planComprasExcelImport(parsed, { desde: "2026-09-25", hasta: "2026-10-05", plantName: "Puebla", existing: [], documents: [], hg: [] });
    assert.equal(cross.ok, true);
    assert.equal(cross.rows.length, 2);
    assert.equal(cross.rows[0].proveedor, "TOMZA TEPEJI");
    assert.equal(cross.rows[1].proveedor, "TOMZA TUXPAN");
    const missing = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-11-02", plantName: "Puebla", existing: [], documents: [], hg: [] });
    assert.equal(missing.ok, false);
    assert.ok(missing.errors.some((e) => e.code === "MISSING_MONTH"));
    const bad = await workbook([{ name: "OCTUBRE", a1: "PUEBLA", rows: [{ origin: "TEPEJI DESCONOCIDA", kg: 1, fecha: "2026-10-02", importe: 10 }] }]);
    const badParsed = await compras.parseComprasExcelBuffer(bad);
    const unknown = compras.planComprasExcelImport(badParsed, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Puebla", existing: [], documents: [], hg: [] });
    assert.equal(unknown.ok, false);
    assert.ok(unknown.errors.some((e) => e.code === "UNKNOWN_ORIGIN"));
  });

  it("H archivo de otra planta se bloquea", async () => {
    const buf = await workbook([{ name: "OCTUBRE", a1: "HIDROGAS", rows: [{ origin: "PEMEX TUXPAN", kg: 1, fecha: "2026-10-02", importe: 10 }] }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const plan = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Puebla", existing: [], documents: [], hg: [] });
    assert.equal(plan.ok, false);
    assert.equal(plan.source_company, "HIDROGAS");
    assert.ok(plan.errors.some((e) => e.code === "PLANT_MISMATCH"));
  });

  it("I–J nota de cargo suma importe sin kilos y el alta manual sigue rechazando kg 0", async () => {
    const buf = await workbook([{
      name: "OCTUBRE",
      a1: "PUEBLA",
      rows: [
        { origin: "PEMEX TUXPAN", kg: 10, fecha: "2026-10-04", importe: 100 },
        { origin: "NOTA DE CARGO", kg: null, fecha: "2026-10-04", importe: 15 },
      ],
    }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const mem = new Mem();
    mem.hg.push({ id: 3, fecha: "2026-10-04", hg_kilos: 50 });
    const before = JSON.stringify(mem.hg);
    await compras.runComprasExcelImport(mem, spec(parsed));
    const nota = mem.purchases.find((p) => p.kg === 0);
    assert.ok(nota);
    assert.equal(nota.importe, 15);
    const providers = mem.providers.map((p) => ({ id: p.id, nombre: p.nombre }));
    const grid = compras.aggregatePurchases(mem.purchases, providers, 2026, 10);
    const day = grid.days.find((d) => d.ymd === "2026-10-04");
    assert.equal(day.consolidado.kg, 10);
    assert.equal(day.consolidado.importe, 115);
    assert.equal(day.consolidado.costo_kg, 11.5);
    const flete = compras.attachFleteToGrid(grid, [{ proveedor_id: providers[0].id, tarifa: 2 }], providers);
    assert.equal(flete.days.find((d) => d.ymd === "2026-10-04").flete.consolidado.kg, 10);
    assert.equal(before, JSON.stringify(mem.hg));
    assert.equal(compras.validatePurchaseInput({ fecha: "2026-10-04", kg: 0, importe: 10 }).ok, false);
  });

  it("K–L HG no cambia y un documento bloquea sin borrar", async () => {
    const buf = await workbook([{ name: "OCTUBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 2, fecha: "2026-10-05", importe: 20 }] }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const mem = new Mem();
    mem.purchases.push({ id: 5, fecha: "2026-10-05", kg: 1, importe: 10, proveedor_id: 1 });
    mem.docs.push({ compra_id: 5 });
    mem.hg.push({ id: 8, fecha: "2026-10-05", hg_kilos: 12 });
    const out = await compras.runComprasExcelImport(mem, spec(parsed, { request_id: "docs" }));
    assert.equal(out.status, 409);
    assert.equal(out.body.document_blockers, 1);
    assert.equal(mem.purchases.length, 1);
    assert.equal(mem.docs.length, 1);
    assert.equal(mem.hg[0].hg_kilos, 12);
    const src = fs.readFileSync(path.join(__dirname, "../lib/compras-dashboard.js"), "utf8");
    const slice = src.slice(src.indexOf("function pgComprasExcelIo"), src.indexOf("function registerComprasRoutes"));
    assert.equal(/deleteFromS3|INSERT INTO arr\.compras_hg|UPDATE arr\.compras_hg|DELETE FROM arr\.compras_hg/i.test(slice), false);
  });

  it("M un error a media inserción revierte todo", async () => {
    const buf = await workbook([{
      name: "OCTUBRE",
      a1: "PUEBLA",
      rows: [
        { origin: "PEMEX TUXPAN", kg: 2, fecha: "2026-10-06", importe: 20 },
        { origin: "PEMEX TUXPAN", kg: 3, fecha: "2026-10-07", importe: 30 },
      ],
    }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const mem = new Mem();
    mem.purchases.push({ id: 1, fecha: "2026-10-01", kg: 9, importe: 9, proveedor_id: 1 });
    mem.failAt = 1;
    const before = mem.dump();
    const out = await compras.runComprasExcelImport(mem, spec(parsed, { request_id: "roll" }));
    assert.equal(out.body.rolled_back, true);
    assert.deepEqual(mem.purchases, before.purchases);
    assert.equal(mem.imports.length, 0);
  });

  it("N el mismo request_id no duplica", async () => {
    const buf = await workbook([{ name: "OCTUBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 2, fecha: "2026-10-08", importe: 20 }] }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const mem = new Mem();
    await compras.runComprasExcelImport(mem, spec(parsed, { request_id: "same" }));
    const first = mem.purchases.length;
    const began = mem.began;
    const again = await compras.runComprasExcelImport(mem, spec(parsed, { request_id: "same" }));
    assert.equal(again.body.idempotent, true);
    assert.equal(mem.purchases.length, first);
    assert.equal(mem.began, began);
  });

  it("O–Q Acapulco conserva el otro origen, el orden no importa y reimportar uno no toca al otro", async () => {
    async function load(a1, origen, fecha, kg) {
      const buf = await workbook([{ name: "OCTUBRE", a1, rows: [{ origin: origen, kg, fecha, importe: kg }] }]);
      return compras.parseComprasExcelBuffer(buf);
    }
    async function apply(mem, parsed, request) {
      return compras.runComprasExcelImport(mem, spec(parsed, { plantName: "Acapulco", request_id: request }));
    }
    const hidro = await load("HIDROGAS", "PEMEX TUXPAN", "2026-10-09", 4);
    const uribe = await load("URIBE", "TUXPAN IMPORTADORA", "2026-10-09", 6);
    const left = new Mem();
    await apply(left, hidro, "h1");
    await apply(left, uribe, "u1");
    const right = new Mem();
    await apply(right, uribe, "u2");
    await apply(right, hidro, "h2");
    const sig = (mem) => mem.meta.map((m) => `${m.source_company}|${m.origin_text}|${mem.purchases.find((p) => p.id === m.compra_id).kg}`).sort();
    assert.deepEqual(sig(left), sig(right));
    assert.equal(left.purchases.length, 2);
    const again = await load("HIDROGAS", "PEMEX TUXPAN", "2026-10-11", 7);
    await apply(left, again, "h3");
    assert.equal(left.purchases.length, 2);
    assert.equal(left.purchases.some((p) => p.kg === 7), true);
    assert.equal(left.purchases.some((p) => p.kg === 6), true);
    assert.equal(left.purchases.some((p) => p.kg === 4), false);
  });

  it("R legado de Acapulco sin contraparte se conserva", async () => {
    const buf = await workbook([{ name: "OCTUBRE", a1: "URIBE", rows: [{ origin: "PEMEX TUXPAN", kg: 2, fecha: "2026-10-12", importe: 20 }] }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const mem = new Mem();
    mem.purchases.push({ id: 4, fecha: "2026-10-12", kg: 3, importe: 30, proveedor_id: 1 });
    const preview = await compras.runComprasExcelImport(mem, spec(parsed, { mode: "preview", plantName: "Acapulco" }));
    assert.equal(preview.body.legacy_remaining_unclassified, 1);
    assert.equal(preview.body.legacy_matched_to_source, 0);
    assert.equal(preview.body.ok, true);
    assert.equal(mem.began, 0);
    const commit = await compras.runComprasExcelImport(mem, spec(parsed, { plantName: "Acapulco", request_id: "legacy" }));
    assert.equal(commit.status, 200);
    assert.equal(mem.purchases.some((p) => p.id === 4 && p.kg === 3), true);
    assert.equal(mem.purchases.some((p) => Number(p.kg) === 2), true);
  });

  it("S–T dos filas idénticas y trazabilidad de archivo, hoja y renglón", async () => {
    const buf = await workbook([{
      name: "OCTUBRE",
      a1: "MORELOS",
      rows: [
        { origin: "PEMEX TUXPAN", kg: 1, fecha: "2026-10-02", importe: 11 },
        { origin: "PEMEX TUXPAN", kg: 1, fecha: "2026-10-02", importe: 11 },
      ],
    }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const mem = new Mem();
    await compras.runComprasExcelImport(mem, spec(parsed, { plantName: "Morelos", request_id: "trace" }));
    assert.equal(mem.purchases.length, 2);
    assert.deepEqual(mem.meta.map((m) => m.source_row), [6, 7]);
    assert.equal(mem.meta[0].sheet_name, "OCTUBRE");
    assert.equal(mem.meta[0].origin_text, "PEMEX TUXPAN");
    assert.equal(mem.imports[0].file_name, "fixture.xlsx");
    assert.equal(mem.imports[0].file_sha256, parsed.sha256);
  });

  it("el preview no abre transacción", async () => {
    const buf = await workbook([{ name: "OCTUBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 1, fecha: "2026-10-02", importe: 10 }] }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const mem = new Mem();
    const out = await compras.runComprasExcelImport(mem, spec(parsed, { mode: "preview" }));
    assert.equal(out.body.ok, true);
    assert.equal(out.body.hg_notice, compras.EXCEL_HG_NOTICE);
    assert.equal(mem.began, 0);
    assert.equal(mem.purchases.length, 0);
  });

  it("lee los cinco Excel reales sin versionarlos", async () => {
    const dir = "C:\\Users\\SUBDIRECCION\\Desktop\\TOMZA_088_EXCEL";
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".xlsx"));
    assert.equal(files.length >= 5, true);
    const seen = [];
    for (const name of files) {
      const parsed = await compras.parseComprasExcelBuffer(fs.readFileSync(path.join(dir, name)));
      seen.push(parsed.a1);
      assert.ok(parsed.sheets.some((s) => s.name === "SEPTIEMBRE"));
      assert.ok(parsed.sheets.some((s) => s.name === "OCTUBRE"));
    }
    for (const a1 of ["PUEBLA", "TEHUACAN", "MORELOS", "HIDROGAS", "URIBE"]) {
      assert.ok(seen.includes(a1), a1);
    }
  });
});
