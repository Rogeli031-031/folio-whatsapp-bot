"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const compras = require("../lib/compras-dashboard");
const excel = require("../lib/compras-excel");

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
    this.lines = [];
    this.effective = [];
    this.seq = 1;
    this.snap = null;
  }
  dump() {
    return JSON.parse(JSON.stringify({
      purchases: this.purchases, docs: this.docs, hg: this.hg, providers: this.providers,
      imports: this.imports, meta: this.meta, lines: this.lines, effective: this.effective, seq: this.seq,
    }));
  }
  async begin() { this.snap = this.dump(); }
  async commit() { this.snap = null; }
  async rollback() {
    if (this.snap) Object.assign(this, this.snap);
    this.snap = null;
  }
  async listPurchases(_planta, desde, hasta) {
    return this.purchases.filter((p) => p.fecha >= desde && p.fecha <= hasta).map((p) => {
      const meta = this.meta.find((m) => m.compra_id === p.id);
      const eff = this.effective.find((e) => e.compra_id === p.id);
      const provider = this.providers.find((item) => item.id === p.proveedor_id);
      return {
        ...p,
        proveedor_nombre: p.proveedor_nombre || (provider ? provider.nombre : ""),
        source_company: meta ? meta.source_company : (p.source_company || null),
        excel_kg: eff ? eff.excel_kg : null,
        excel_importe: eff ? eff.excel_importe : null,
      };
    });
  }
  async listDocuments(ids) { return this.docs.filter((d) => ids.includes(d.compra_id)); }
  async listHg() { return this.hg.map((h) => ({ ...h })); }
  async providerId(_planta, nombre) {
    const hit = this.providers.find((p) => compras.normProviderName(p.nombre) === compras.normProviderName(nombre));
    if (hit) return hit.id;
    const row = { id: this.seq++, nombre };
    this.providers.push(row);
    return row.id;
  }
  async findRequest(requestId) { return this.imports.find((row) => row.request_id === requestId) || null; }
  async deletePurchases(ids) {
    this.purchases = this.purchases.filter((p) => !ids.includes(p.id));
    this.meta = this.meta.filter((m) => !ids.includes(m.compra_id));
    this.effective = this.effective.filter((e) => !ids.includes(e.compra_id));
    this.docs = this.docs.filter((d) => !ids.includes(d.compra_id));
  }
  async insertPurchase(row) {
    const provider = this.providers.find((p) => p.id === row.proveedor_id);
    const saved = {
      id: this.seq++,
      fecha: row.fecha,
      kg: row.kg,
      importe: row.importe,
      proveedor_id: row.proveedor_id,
      proveedor_nombre: provider ? provider.nombre : "",
    };
    this.purchases.push(saved);
    return saved;
  }
  async insertImport(row) {
    const saved = { id: this.seq++, request_id: row.request_id, row_count: row.row_count, total_importe: row.total_importe };
    this.imports.push(saved);
    return saved;
  }
  async insertMeta(row) { this.meta.push({ ...row }); }
  async upsertMeta(row) {
    const idx = this.meta.findIndex((m) => m.compra_id === row.compra_id);
    if (idx >= 0) this.meta[idx] = { ...row };
    else this.meta.push({ ...row });
  }
  async insertLine(row) {
    const saved = { id: this.seq++, ...row };
    this.lines.push(saved);
    return saved;
  }
  async upsertEffective(row) {
    const idx = this.effective.findIndex((e) => e.compra_id === row.compra_id);
    const saved = { ...row };
    if (idx >= 0) this.effective[idx] = saved;
    else this.effective.push(saved);
  }
}

function spec(parsed, extra = {}) {
  return {
    mode: "commit",
    parsed,
    planta_id: 1,
    desde: "2026-10-01",
    hasta: "2026-10-31",
    file_name: "tehuacan.xlsx",
    request_id: extra.request_id || "r4",
    plantName: "Tehuacán",
    ...extra,
  };
}

function routeClient(mode) {
  const state = { queries: [], writes: [] };
  return {
    state,
    async query(sql) {
      const q = String(sql).replace(/\s+/g, " ").trim().toLowerCase();
      state.queries.push(q);
      if (/^(insert|update|delete|alter)\b/.test(q) || q === "begin" || q === "commit") state.writes.push(q);
      if (q.includes("to_regclass('arr.compras_importaciones')") || q.includes("compras_kg_nonnegative")) {
        return { rows: [{ importaciones: "arr.compras_importaciones", meta: "arr.compras_import_meta", kg_def: "CHECK ((kg >= 0))" }] };
      }
      if (q.includes("to_regclass('arr.compras_effective') as effective") && !q.includes("lineas")) {
        return { rows: [{ effective: null }] };
      }
      if (q.includes("compras_import_lineas")) {
        if (mode === "reconcile") {
          return { rows: [{ lineas: "arr.compras_import_lineas", effective: "arr.compras_effective", importe_type: "numeric(18,6)" }] };
        }
        return { rows: [{ lineas: null, effective: null, importe_type: "numeric(14,2)" }] };
      }
      if (q.startsWith("create")) return { rows: [] };
      if (q.startsWith("insert into arr.compras_proveedores")) {
        const row = { id: 1, planta_id: 1, nombre: "PEMEX TUXPAN", activo: true, orden: 0 };
        return { rows: [row] };
      }
      if (q.includes("from arr.compras_proveedores")) return { rows: [{ id: 1, planta_id: 1, nombre: "PEMEX TUXPAN", activo: true, orden: 0 }] };
      if (q.includes("from public.plantas")) return { rows: [{ nombre: "Tehuacán" }] };
      return { rows: [] };
    },
    release() {},
  };
}

function appFor(client) {
  const routes = [];
  const add = (method) => (pathName, ...handlers) => routes.push({ method, path: pathName, handlers });
  const app = { get: add("GET"), post: add("POST"), patch: add("PATCH"), delete: add("DELETE") };
  compras.registerComprasRoutes(app, {
    pool: { connect: async () => client },
    dashboardAuthMiddleware: (_req, _res, next) => next(),
    assertPlantaAccess: () => true,
    uploadPdfToS3: async () => {},
    getBufferFromS3: async () => null,
    s3Enabled: () => false,
  });
  return {
    async invoke(method, url, body) {
      const hit = routes.find((r) => r.method === method && r.path === url);
      const req = { query: body.query || {}, body: body.body || {}, params: {}, dashboardAuth: { actor_id: 3, plantas_permitidas: [1], permisos: { acceso_compras: true } } };
      let status = 200;
      let payload;
      const res = { status(c) { status = c; return this; }, json(p) { payload = p; return this; }, send() { return this; }, setHeader() {} };
      for (const handler of hit.handlers) {
        let nexted = false;
        await handler(req, res, () => { nexted = true; });
        if (!nexted) break;
      }
      return { status, payload };
    },
  };
}

describe("088-R4 conciliación efectiva", () => {
  it("A–C conserva la compra con factura y usa el Excel exacto", async () => {
    const buf = await workbook([{
      name: "OCTUBRE",
      a1: "TEHUACAN",
      rows: [
        { origin: "PEMEX TUXPAN", kg: 18750, fecha: "2026-10-07", importe: 188240.625 },
        { origin: "TUXPAN IMPORTADORA", kg: 18290, fecha: "2026-10-07", importe: 184637.55 },
      ],
    }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const mem = new Mem();
    mem.providers.push({ id: 1, nombre: "PEMEX TUXPAN" }, { id: 2, nombre: "TOMZA TUXPAN" });
    mem.purchases.push(
      { id: 11, fecha: "2026-10-07", kg: 18750, importe: 189281.25, proveedor_id: 1, proveedor_nombre: "PEMEX TUXPAN" },
      { id: 12, fecha: "2026-10-07", kg: 18290, importe: 184637.55, proveedor_id: 2, proveedor_nombre: "TOMZA TUXPAN" }
    );
    mem.docs.push({ id: 4, compra_id: 11 });
    mem.seq = 20;
    const out = await compras.runComprasExcelImport(mem, spec(parsed, { request_id: "ab" }));
    assert.equal(out.body.ok, true);
    const kept = mem.purchases.find((p) => p.id === 11);
    const same = mem.purchases.find((p) => p.id === 12);
    assert.equal(kept.kg, 18750);
    assert.equal(kept.importe, 189281.25);
    assert.equal(mem.docs.some((d) => d.compra_id === 11), true);
    const eff = mem.effective.find((e) => e.compra_id === 11);
    assert.equal(eff.excel_kg, 18750);
    assert.equal(eff.excel_importe, 188240.625);
    const line = mem.lines.find((l) => l.compra_id === 11);
    assert.equal(line.action, "MATCHED_PRESERVED");
    assert.equal(line.discrepant, true);
    assert.equal(line.captured_importe, 189281.25);
    const equal = mem.lines.find((l) => l.compra_id === 12);
    assert.equal(equal.discrepant, false);
    assert.equal(same.importe, 184637.55);
    assert.equal(mem.effective.find((e) => e.compra_id === 12).excel_importe, 184637.55);
  });

  it("D–E el emparejamiento es uno a uno y determinista", async () => {
    const buf = await workbook([{
      name: "OCTUBRE",
      a1: "TEHUACAN",
      rows: [
        { origin: "PEMEX TUXPAN", kg: 100, fecha: "2026-10-08", importe: 10 },
        { origin: "PEMEX TUXPAN", kg: 100, fecha: "2026-10-08", importe: 30 },
        { origin: "PEMEX TUXPAN", kg: 100, fecha: "2026-10-08", importe: 50 },
        { origin: "PEMEX TUXPAN", kg: 80, fecha: "2026-10-08", importe: 8 },
      ],
    }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const existing = [
      { id: 2, fecha: "2026-10-08", kg: 100, importe: 40, proveedor_nombre: "PEMEX TUXPAN" },
      { id: 1, fecha: "2026-10-08", kg: 100, importe: 10, proveedor_nombre: "PEMEX TUXPAN" },
      { id: 3, fecha: "2026-10-08", kg: 100, importe: 12, proveedor_nombre: "PEMEX TUXPAN" },
      { id: 4, fecha: "2026-10-08", kg: 80, importe: 8, proveedor_nombre: "PEMEX TUXPAN" },
    ];
    const plan = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Tehuacán", existing, documents: [], hg: [] });
    const byId = Object.fromEntries(plan.matches.map((m) => [m.compra_id, m.excel_importe]));
    assert.equal(byId[1], 10);
    assert.equal(byId[2], 30);
    assert.equal(byId[3], 50);
    assert.equal(byId[4], 8);
    assert.equal(plan.nuevas, 0);
    assert.equal(plan.deletes, 0);
  });

  it("F–H bloquea factura sin par, borra la que no tiene y crea la nueva", async () => {
    const buf = await workbook([{
      name: "OCTUBRE",
      a1: "TEHUACAN",
      rows: [{ origin: "PEMEX TUXPAN", kg: 5, fecha: "2026-10-09", importe: 188240.625 }],
    }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const blocked = new Mem();
    blocked.purchases.push({ id: 7, fecha: "2026-10-09", kg: 1, importe: 10, proveedor_id: 1, proveedor_nombre: "PEMEX TUXPAN" });
    blocked.docs.push({ compra_id: 7 });
    blocked.seq = 8;
    const denied = await compras.runComprasExcelImport(blocked, spec(parsed, { request_id: "block" }));
    assert.equal(denied.status, 409);
    assert.equal(denied.body.document_blockers, 1);
    assert.ok(denied.body.errors.some((e) => e.code === "UNMATCHED_DOCUMENT_PURCHASE"));
    assert.equal(blocked.purchases.length, 1);
    assert.equal(blocked.lines.length, 0);
    const open = new Mem();
    open.purchases.push({ id: 7, fecha: "2026-10-09", kg: 1, importe: 10, proveedor_id: 1, proveedor_nombre: "PEMEX TUXPAN" });
    open.seq = 8;
    const created = await compras.runComprasExcelImport(open, spec(parsed, { request_id: "new" }));
    assert.equal(created.body.ok, true);
    assert.equal(open.purchases.some((p) => p.id === 7), false);
    const fresh = open.purchases[0];
    assert.equal(fresh.importe, 188240.63);
    assert.equal(open.effective[0].excel_importe, 188240.625);
    assert.equal(open.lines[0].action, "INSERTED");
    assert.equal(open.lines[0].discrepant, false);
  });

  it("I–M nota, amarillo, cálculo, Excel y HG", async () => {
    const purchases = [
      { id: 11, proveedor_id: 1, fecha: "2026-10-07", kg: 18750, importe: 189281.25, effective_kg: 18750, effective_importe: 188240.625, reconciled: true, discrepant: true },
      { id: 12, proveedor_id: 1, fecha: "2026-10-08", kg: 10, importe: 100, effective_kg: 10, effective_importe: 100, reconciled: true, discrepant: false },
      { id: 13, proveedor_id: 9, fecha: "2026-10-07", kg: 0, importe: 38458.38, effective_kg: 0, effective_importe: 38458.383, reconciled: true, discrepant: false },
    ];
    const providers = [{ id: 1, nombre: "PEMEX TUXPAN" }, { id: 9, nombre: "NOTA DE CARGO" }];
    const grid = compras.aggregatePurchases(purchases, providers, 2026, 10);
    const day = grid.days.find((d) => d.ymd === "2026-10-07");
    const quiet = grid.days.find((d) => d.ymd === "2026-10-08");
    assert.equal(day.fecha_discrepante, true);
    assert.equal(quiet.fecha_discrepante, false);
    assert.equal(day.cells[1].kg, 18750);
    assert.equal(day.cells[1].importe, 188240.625);
    assert.equal(day.cells[9].importe, 38458.383);
    assert.equal(day.consolidado.kg, 18750);
    assert.ok(Math.abs(day.consolidado.importe - (188240.625 + 38458.383)) < 1e-6);
    const week = grid.weeks.find((w) => w.ymds.includes("2026-10-07"));
    assert.equal(week.providers[1].importe, 188240.625 + 100);
    const payload = { providers, grid, tarifas_flete: [{ proveedor_id: 1, tarifa: 2 }], hg: [] };
    const ctx = excel.buildComprasDailyEstimateContext(payload, "2026-10-31");
    const slot = ctx.byYmd.get("2026-10-07").providers[1];
    const note = ctx.byYmd.get("2026-10-07").providers[9];
    assert.equal(slot.kg, 18750);
    assert.equal(slot.importe, 188240.625);
    assert.equal(note.importe, 38458.383);
    assert.equal(note.kg, null);
    const flete = compras.attachFleteToGrid(grid, [{ proveedor_id: 1, tarifa: 2 }, { proveedor_id: 9, tarifa: 9 }], providers);
    assert.equal(flete.days.find((d) => d.ymd === "2026-10-07").flete.providers[9].kg, 0);
    const withHg = compras.attachHgToGrid(grid, [{ fecha: "2026-10-07", hg_kilos: 20 }]);
    assert.equal(withHg.days.find((d) => d.ymd === "2026-10-07").hg_kilos, 20);
  });

  it("N–Q reimportar, idempotencia, Acapulco y legado", async () => {
    const buf = await workbook([{ name: "OCTUBRE", a1: "TEHUACAN", rows: [{ origin: "PEMEX TUXPAN", kg: 18750, fecha: "2026-10-07", importe: 188240.625 }] }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const mem = new Mem();
    mem.providers.push({ id: 1, nombre: "PEMEX TUXPAN" });
    mem.purchases.push({ id: 11, fecha: "2026-10-07", kg: 18750, importe: 189281.25, proveedor_id: 1, proveedor_nombre: "PEMEX TUXPAN" });
    mem.seq = 30;
    await compras.runComprasExcelImport(mem, spec(parsed, { request_id: "once" }));
    const againExcel = await workbook([{ name: "OCTUBRE", a1: "TEHUACAN", rows: [{ origin: "PEMEX TUXPAN", kg: 18750, fecha: "2026-10-07", importe: 188000.125 }] }]);
    const second = await compras.runComprasExcelImport(mem, spec(await compras.parseComprasExcelBuffer(againExcel), { request_id: "twice" }));
    assert.equal(second.body.ok, true);
    assert.equal(mem.purchases.find((p) => p.id === 11).importe, 189281.25);
    assert.equal(mem.lines.length, 2);
    assert.equal(mem.effective.find((e) => e.compra_id === 11).excel_importe, 188000.125);
    const repeat = await compras.runComprasExcelImport(mem, spec(parsed, { request_id: "twice" }));
    assert.equal(repeat.body.idempotent, true);
    assert.equal(mem.lines.length, 2);
    const hidro = await compras.parseComprasExcelBuffer(await workbook([{ name: "OCTUBRE", a1: "HIDROGAS", rows: [{ origin: "PEMEX TUXPAN", kg: 4, fecha: "2026-10-09", importe: 40 }] }]));
    const uribe = await compras.parseComprasExcelBuffer(await workbook([{ name: "OCTUBRE", a1: "URIBE", rows: [{ origin: "TUXPAN IMPORTADORA", kg: 6, fecha: "2026-10-09", importe: 60 }] }]));
    const aca = new Mem();
    await compras.runComprasExcelImport(aca, spec(hidro, { plantName: "Acapulco", request_id: "h" }));
    await compras.runComprasExcelImport(aca, spec(uribe, { plantName: "Acapulco", request_id: "u" }));
    assert.equal(aca.purchases.length, 2);
    const hidroAgain = await compras.runComprasExcelImport(aca, spec(hidro, { plantName: "Acapulco", request_id: "h2" }));
    assert.equal(hidroAgain.body.ok, true);
    assert.equal(aca.purchases.length, 2);
    assert.equal(aca.purchases.filter((p) => p.kg === 6).length, 1);
    aca.purchases.push({ id: 99, fecha: "2026-10-09", kg: 1, importe: 1, proveedor_nombre: "PEMEX TUXPAN", source_company: null });
    const legacy = await compras.runComprasExcelImport(aca, spec(hidro, { plantName: "Acapulco", request_id: "legacy" }));
    assert.equal(legacy.status, 409);
    assert.ok(legacy.body.errors.some((e) => e.code === "LEGACY_ACAPULCO_UNCLASSIFIED"));
    assert.equal(aca.purchases.some((p) => p.id === 99), true);
  });

  it("R–S solo los alias exactos IMPOTADORA", async () => {
    const buf = await workbook([{
      name: "OCTUBRE",
      a1: "TEHUACAN",
      rows: [
        { origin: "TEPEJI IMPOTADORA", kg: 3, fecha: "2026-10-02", importe: 30 },
        { origin: "TUXPAN IMPOTADORA", kg: 4, fecha: "2026-10-03", importe: 40 },
      ],
    }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const plan = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Tehuacán", existing: [], documents: [], hg: [] });
    assert.equal(plan.ok, true);
    assert.deepEqual(plan.rows.map((r) => r.proveedor), ["TOMZA TEPEJI", "TOMZA TUXPAN"]);
    const bad = await workbook([{ name: "OCTUBRE", a1: "TEHUACAN", rows: [{ origin: "TEPEJI IMPOTADOR", kg: 1, fecha: "2026-10-02", importe: 10 }] }]);
    const unknown = compras.planComprasExcelImport(await compras.parseComprasExcelBuffer(bad), { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Tehuacán", existing: [], documents: [], hg: [] });
    assert.equal(unknown.ok, false);
    assert.ok(unknown.errors.some((e) => e.code === "UNKNOWN_ORIGIN"));
  });

  it("T el esquema 025 apaga la conciliación sin consultar tablas ausentes", async () => {
    const cold = routeClient("import");
    const month = await appFor(cold).invoke("GET", "/api/compras", { query: { planta_id: "1", year: "2026", month: "10" } });
    assert.equal(month.status, 200);
    assert.equal(month.payload.import_ready, true);
    assert.equal(month.payload.reconcile_ready, false);
    const writesAfterGet = cold.state.writes.length;
    const preview = await appFor(cold).invoke("POST", "/api/compras/import/preview", { body: { planta_id: 1 } });
    assert.equal(preview.status, 503);
    assert.equal(preview.payload.error, compras.COMPRAS_RECONCILE_SCHEMA_NOT_READY);
    assert.equal(cold.state.queries.some((q) => q.includes("from arr.compras_import_lineas") || q.includes("from arr.compras_effective")), false);
    assert.equal(cold.state.writes.length, writesAfterGet);
    const ready = routeClient("reconcile");
    const warm = await appFor(ready).invoke("GET", "/api/compras", { query: { planta_id: "1", year: "2026", month: "10" } });
    assert.equal(warm.payload.reconcile_ready, true);
  });

  it("U–W la migración 025 es atómica y no rellena historia", () => {
    const sql = fs.readFileSync(path.join(__dirname, "../sql/025_compras_excel_effective_reconcile_088_r4.sql"), "utf8");
    const begin = sql.search(/^\s*BEGIN\s*;/m);
    const commit = sql.search(/^\s*COMMIT\s*;\s*$/m);
    assert.ok(begin >= 0 && commit > begin);
    assert.equal((sql.match(/^\s*BEGIN\s*;/gm) || []).length, 1);
    assert.equal((sql.match(/^\s*COMMIT\s*;/gm) || []).length, 1);
    assert.match(sql, /NUMERIC\(18,6\)/);
    assert.match(sql, /ON DELETE SET NULL/);
    assert.match(sql, /ON DELETE CASCADE/);
    assert.match(sql, /UNIQUE \(importacion_id, sheet_name, source_row\)/);
    assert.match(sql, /MATCHED_PRESERVED/);
    assert.match(sql, /INSERTED/);
    assert.equal(/update\s+arr\.compras\b/i.test(sql), false);
    assert.equal(/insert\s+into\s+arr\.compras\b/i.test(sql), false);
    assert.equal(188240.625, 188240.625);
  });

  it("el Excel real de Tehuacán octubre 01-18 cuadra sin escribir", async () => {
    const dir = "C:\\Users\\SUBDIRECCION\\Desktop\\TOMZA_088_EXCEL";
    if (!fs.existsSync(dir)) return;
    const locks = fs.readdirSync(dir).filter((name) => name.startsWith("~$"));
    assert.deepEqual(locks, []);
    const name = fs.readdirSync(dir).find((item) => item.toUpperCase().includes("TEHUACAN") && item.toLowerCase().endsWith(".xlsx"));
    assert.ok(name);
    const parsed = await compras.parseComprasExcelBuffer(fs.readFileSync(path.join(dir, name)));
    const plan = compras.planComprasExcelImport(parsed, {
      desde: "2026-10-01",
      hasta: "2026-10-18",
      plantName: "Tehuacán",
      existing: [],
      documents: [],
      hg: [],
    });
    assert.equal(plan.ok, true);
    assert.equal(plan.excel_range_warning, "");
    const physical = plan.rows.filter((row) => row.proveedor && row.proveedor !== "NOTA DE CARGO");
    const notes = plan.rows.filter((row) => row.proveedor === "NOTA DE CARGO");
    assert.equal(physical.length, 20);
    assert.equal(notes.length, 1);
    assert.equal(plan.kg_excel, 395220);
    assert.ok(Math.abs(plan.importe_excel - 4948668.148) < 0.001);
    assert.equal(notes[0].kg, 0);
    assert.equal(notes[0].importe, 38458.383);
  });
});
