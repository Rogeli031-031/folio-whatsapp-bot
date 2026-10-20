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
    (sheet.rows || []).forEach((row, index) => {
      const r = 6 + index;
      ws.getCell(r, 1).value = row.origin;
      if (row.kg != null) ws.getCell(r, 5).value = row.kg;
      if (/^\d{4}-\d{2}-\d{2}$/.test(row.fecha || "")) ws.getCell(r, 7).value = ymdDate(row.fecha);
      else if (row.fecha != null) ws.getCell(r, 7).value = row.fecha;
      if (row.importe != null) ws.getCell(r, 10).value = row.importe;
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
  }
  dump() {
    return JSON.parse(JSON.stringify({
      purchases: this.purchases, docs: this.docs, hg: this.hg, providers: this.providers, imports: this.imports, meta: this.meta, seq: this.seq,
    }));
  }
  async begin() { this.snap = this.dump(); }
  async commit() { this.snap = null; }
  async rollback() {
    if (this.snap) Object.assign(this, this.snap);
    this.snap = null;
  }
  async listPurchases(_planta, desde, hasta) {
    return this.purchases.filter((p) => p.fecha >= desde && p.fecha <= hasta);
  }
  async listDocuments() { return []; }
  async listHg() { return this.hg.map((h) => ({ ...h })); }
  async providerId(_planta, nombre) {
    const row = { id: this.seq++, nombre };
    this.providers.push(row);
    return row.id;
  }
  async findRequest() { return null; }
  async deletePurchases(ids) { this.purchases = this.purchases.filter((p) => !ids.includes(p.id)); }
  async insertPurchase(row) {
    const saved = { id: this.seq++, fecha: row.fecha, kg: row.kg, importe: row.importe };
    this.purchases.push(saved);
    return saved;
  }
  async insertImport(row) {
    const saved = { id: this.seq++, request_id: row.request_id };
    this.imports.push(saved);
    return saved;
  }
  async insertMeta() {}
}

function planOf(parsed, desde, hasta) {
  return compras.planComprasExcelImport(parsed, { desde, hasta, plantName: "Puebla", existing: [], documents: [], hg: [] });
}

describe("088-R2 fecha ilegible y migración atómica", () => {
  it("A–B BAD_DATE bloquea el mes de su hoja y no el mes vecino", async () => {
    const october = await compras.parseComprasExcelBuffer(await workbook([
      { name: "SEPTIEMBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 1, fecha: "2026-09-02", importe: 10 }] },
      { name: "OCTUBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 10000, fecha: "ilegible", importe: 120000 }] },
    ]));
    const blocked = planOf(october, "2026-10-01", "2026-10-31");
    assert.equal(blocked.ok, false);
    assert.ok(blocked.errors.some((e) => e.code === "BAD_DATE"));
    assert.equal(blocked.rows.length, 0);
    const septemberOnly = await compras.parseComprasExcelBuffer(await workbook([
      { name: "SEPTIEMBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 2, fecha: "ilegible", importe: 20 }] },
      { name: "OCTUBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 3, fecha: "2026-10-04", importe: 30 }] },
    ]));
    const octoberOk = planOf(septemberOnly, "2026-10-01", "2026-10-31");
    assert.equal(octoberOk.ok, true);
    assert.equal(octoberOk.errors.some((e) => e.code === "BAD_DATE"), false);
    assert.equal(octoberOk.rows.length, 1);
  });

  it("C–D un BAD_DATE del mes objetivo no borra ni inserta", async () => {
    const parsed = await compras.parseComprasExcelBuffer(await workbook([
      { name: "SEPTIEMBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 1, fecha: "2026-09-02", importe: 10 }] },
      { name: "OCTUBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 10000, fecha: "ilegible", importe: 120000 }] },
    ]));
    const mem = new Mem();
    mem.purchases.push({ id: 4, fecha: "2026-10-08", kg: 7, importe: 70 });
    const before = mem.dump();
    const out = await compras.runComprasExcelImport(mem, {
      mode: "commit", parsed, planta_id: 1, desde: "2026-10-01", hasta: "2026-10-31", file_name: "bad.xlsx", request_id: "bad", plantName: "Puebla",
    });
    assert.equal(out.status, 409);
    assert.ok(out.body.errors.some((e) => e.code === "BAD_DATE"));
    assert.deepEqual(mem.purchases, before.purchases);
    assert.equal(mem.imports.length, 0);
  });

  it("E el desfase de HIDROGAS sigue limitado a la fecha legible", async () => {
    const parsed = await compras.parseComprasExcelBuffer(await workbook([
      { name: "SEPTIEMBRE", a1: "HIDROGAS", rows: [
        { origin: "PEMEX TUXPAN", kg: 1, fecha: "2026-09-04", importe: 10 },
        { origin: "PEMEX TUXPAN", kg: 2, fecha: "2026-10-07", importe: 20 },
      ] },
      { name: "OCTUBRE", a1: "HIDROGAS", rows: [{ origin: "PEMEX TUXPAN", kg: 3, fecha: "2026-10-08", importe: 30 }] },
    ]));
    const september = compras.planComprasExcelImport(parsed, { desde: "2026-09-01", hasta: "2026-09-30", plantName: "Acapulco", existing: [], documents: [], hg: [] });
    assert.equal(september.errors.some((e) => e.code === "DATE_SHEET_MISMATCH"), false);
    assert.equal(september.ok, true);
    const october = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Acapulco", existing: [], documents: [], hg: [] });
    assert.ok(october.errors.some((e) => e.code === "DATE_SHEET_MISMATCH" && e.fecha === "2026-10-07"));
    const dir = "C:\\Users\\SUBDIRECCION\\Desktop\\TOMZA_088_EXCEL";
    if (!fs.existsSync(dir)) return;
    const realName = fs.readdirSync(dir).find((name) => name.toUpperCase().includes("HIDROGAS") && name.toLowerCase().endsWith(".xlsx"));
    const tehuacan = fs.readdirSync(dir).find((name) => name.toUpperCase().includes("TEHUACAN") && name.toLowerCase().endsWith(".xlsx"));
    const real = await compras.parseComprasExcelBuffer(fs.readFileSync(path.join(dir, realName)));
    const realSept = compras.planComprasExcelImport(real, { desde: "2026-09-01", hasta: "2026-09-30", plantName: "Acapulco", existing: [], documents: [], hg: [] });
    const realOct = compras.planComprasExcelImport(real, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Acapulco", existing: [], documents: [], hg: [] });
    assert.equal(realSept.errors.some((e) => e.code === "DATE_SHEET_MISMATCH"), false);
    assert.ok(realOct.errors.some((e) => e.code === "DATE_SHEET_MISMATCH"));
    const tehu = await compras.parseComprasExcelBuffer(fs.readFileSync(path.join(dir, tehuacan)));
    const tehuOct = compras.planComprasExcelImport(tehu, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Tehuacán", existing: [], documents: [], hg: [] });
    const tehuSept = compras.planComprasExcelImport(tehu, { desde: "2026-09-01", hasta: "2026-09-30", plantName: "Tehuacán", existing: [], documents: [], hg: [] });
    assert.equal(tehuOct.errors.some((e) => e.code === "UNKNOWN_ORIGIN"), false);
    assert.equal(tehuSept.errors.some((e) => e.code === "UNKNOWN_ORIGIN"), false);
  });

  it("F–L la migración 024 es una sola transacción", () => {
    const sql = fs.readFileSync(path.join(__dirname, "../sql/024_compras_excel_import_088.sql"), "utf8");
    const begin = sql.search(/^\s*BEGIN\s*;/m);
    const commit = sql.search(/^\s*COMMIT\s*;\s*$/m);
    assert.ok(begin >= 0);
    assert.ok(commit > begin);
    const body = sql.slice(begin, commit);
    assert.ok(body.indexOf("CREATE SCHEMA") > 0);
    assert.ok(body.includes("DROP CONSTRAINT"));
    assert.ok(body.includes("CREATE TABLE"));
    assert.ok(body.includes("REFERENCES public.usuarios"));
    assert.ok(body.includes("CREATE INDEX"));
    assert.equal(/ilike\s+'%kg%'/i.test(sql), false);
    assert.equal(/drop\s+constraint[^;]{0,120}compras_importe_check/i.test(sql), false);
    assert.match(body, /IF FOUND THEN/);
    assert.match(body, /compras_kg_nonnegative CHECK \(kg >= 0\)/);
    assert.equal(sql.includes("SAVEPOINT"), false);
  });
});
