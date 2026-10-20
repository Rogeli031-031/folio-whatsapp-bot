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
    return this.purchases.filter((p) => p.fecha >= desde && p.fecha <= hasta).map((p) => {
      const meta = this.meta.find((m) => m.compra_id === p.id);
      return { ...p, source_company: meta ? meta.source_company : null };
    });
  }
  async listDocuments(ids) { return this.docs.filter((d) => ids.includes(d.compra_id)); }
  async listHg() { return this.hg.map((h) => ({ ...h })); }
  async providerId(_planta, nombre) {
    const hit = this.providers.find((p) => p.nombre === nombre);
    if (hit) return hit.id;
    const row = { id: this.seq++, nombre };
    this.providers.push(row);
    return row.id;
  }
  async findRequest(requestId) { return this.imports.find((row) => row.request_id === requestId) || null; }
  async deletePurchases(ids) {
    this.purchases = this.purchases.filter((p) => !ids.includes(p.id));
    this.meta = this.meta.filter((m) => !ids.includes(m.compra_id));
  }
  async insertPurchase(row) {
    const saved = { id: this.seq++, fecha: row.fecha, kg: row.kg, importe: row.importe, proveedor_id: row.proveedor_id };
    this.purchases.push(saved);
    return saved;
  }
  async insertImport(row) {
    const saved = { id: this.seq++, request_id: row.request_id, row_count: row.row_count };
    this.imports.push(saved);
    return saved;
  }
  async insertMeta(row) { this.meta.push({ ...row }); }
}

function routeClient(ready) {
  const providers = [];
  let seq = 1;
  const state = { queries: [], writes: [] };
  return {
    state,
    async query(sql, params = []) {
      const q = String(sql).replace(/\s+/g, " ").trim().toLowerCase();
      state.queries.push(q);
      if (/^(insert|update|delete|alter)\b/.test(q) || q === "begin" || q === "commit") state.writes.push(q);
      if (q.includes("to_regclass")) {
        return {
          rows: [{
            importaciones: ready ? "arr.compras_importaciones" : null,
            meta: ready ? "arr.compras_import_meta" : null,
            kg_def: ready ? "CHECK ((kg >= 0))" : null,
          }],
        };
      }
      if (q.startsWith("create")) return { rows: [] };
      if (q.startsWith("insert into arr.compras_proveedores")) {
        const row = { id: seq++, planta_id: Number(params[0]), nombre: params[1], activo: true, orden: Number(params[2]) || 0 };
        providers.push(row);
        return { rows: [row] };
      }
      if (q.includes("from arr.compras_proveedores") && q.startsWith("select")) {
        return { rows: providers.filter((p) => p.planta_id === Number(params[0])) };
      }
      if (q.startsWith("update arr.compras_proveedores")) {
        const row = providers.find((p) => p.id === Number(params[0]));
        return { rows: row ? [row] : [] };
      }
      if (q.includes("from public.plantas")) return { rows: [{ nombre: "Puebla" }] };
      return { rows: [] };
    },
    release() {},
  };
}

function appFor(client) {
  const routes = [];
  const add = (method) => (path, ...handlers) => routes.push({ method, path, handlers });
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

describe("088-R1 mes vacío y rollout", () => {
  it("A–C octubre vacío es autoritativo y no inserta ceros", async () => {
    const buf = await workbook([
      { name: "SEPTIEMBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 4, fecha: "2026-09-15", importe: 40 }] },
      { name: "OCTUBRE", a1: "PUEBLA", rows: [] },
    ]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const preview = compras.planComprasExcelImport(parsed, {
      desde: "2026-10-01", hasta: "2026-10-31", plantName: "Puebla", existing: [{ id: 8, fecha: "2026-10-04", kg: 9, importe: 90, source_company: null }], documents: [], hg: [],
    });
    assert.equal(preview.ok, true);
    assert.equal(preview.inserts, 0);
    assert.equal(preview.deletes, 1);
    assert.equal(preview.errors.some((e) => e.code === "MISSING_MONTH"), false);
    const mem = new Mem();
    mem.purchases.push({ id: 8, fecha: "2026-10-04", kg: 9, importe: 90, proveedor_id: 1 }, { id: 2, fecha: "2026-09-15", kg: 4, importe: 40, proveedor_id: 1 });
    mem.seq = 10;
    const out = await compras.runComprasExcelImport(mem, {
      mode: "commit", parsed, planta_id: 1, desde: "2026-10-01", hasta: "2026-10-31", file_name: "vacio.xlsx", request_id: "empty", plantName: "Puebla",
    });
    assert.equal(out.body.ok, true);
    assert.equal(mem.purchases.some((p) => p.fecha.startsWith("2026-10")), false);
    assert.equal(mem.purchases.some((p) => p.fecha === "2026-09-15"), true);
    assert.equal(mem.purchases.some((p) => p.kg === 0), false);
  });

  it("D–E año distinto o ausente bloquea sin inventarlo", async () => {
    const dated = await workbook([{ name: "OCTUBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 1, fecha: "2026-10-02", importe: 10 }] }]);
    const parsed = await compras.parseComprasExcelBuffer(dated);
    const mismatch = compras.planComprasExcelImport(parsed, { desde: "2027-10-01", hasta: "2027-10-31", plantName: "Puebla", existing: [], documents: [], hg: [] });
    assert.ok(mismatch.errors.some((e) => e.code === "YEAR_MISMATCH"));
    const empty = await workbook([{ name: "OCTUBRE", a1: "PUEBLA", rows: [] }]);
    const undetermined = compras.planComprasExcelImport(await compras.parseComprasExcelBuffer(empty), {
      desde: "2026-10-01", hasta: "2026-10-31", plantName: "Puebla", existing: [], documents: [], hg: [],
    });
    assert.ok(undetermined.errors.some((e) => e.code === "YEAR_UNDETERMINED"));
    const multi = await workbook([
      { name: "SEPTIEMBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 1, fecha: "2025-09-02", importe: 10 }] },
      { name: "OCTUBRE", a1: "PUEBLA", rows: [{ origin: "PEMEX TUXPAN", kg: 1, fecha: "2026-10-02", importe: 10 }] },
    ]);
    const ambiguous = compras.planComprasExcelImport(await compras.parseComprasExcelBuffer(multi), {
      desde: "2026-10-01", hasta: "2026-10-31", plantName: "Puebla", existing: [], documents: [], hg: [],
    });
    assert.ok(ambiguous.errors.some((e) => e.code === "MULTI_YEAR_WORKBOOK"));
  });

  it("F–H la migración solo sustituye CHECK kg > 0", () => {
    const sql = fs.readFileSync(path.join(__dirname, "../sql/024_compras_excel_import_088.sql"), "utf8");
    assert.equal(/ilike\s+'%kg%'/i.test(sql), false);
    assert.match(sql, /No modifica compras_importe_check/);
    assert.equal(/drop\s+constraint[^;]{0,120}compras_importe_check/i.test(sql), false);
    assert.match(sql, /DROP CONSTRAINT %I/);
    assert.match(sql, /compras_kg_nonnegative CHECK \(kg >= 0\)/);
    assert.match(sql, /check\(\(kg>0\)\)/);
    assert.match(sql, /REFERENCES public\.usuarios\(id\)/);
  });

  it("I–L el mes responde y la importación espera el schema", async () => {
    const cold = routeClient(false);
    const coldApp = appFor(cold);
    const month = await coldApp.invoke("GET", "/api/compras", { query: { planta_id: "1", year: "2026", month: "10" } });
    assert.equal(month.status, 200);
    assert.equal(month.payload.import_ready, false);
    assert.ok(month.payload.grid);
    const preview = await coldApp.invoke("POST", "/api/compras/import/preview", { body: { planta_id: 1 } });
    assert.equal(preview.status, 503);
    assert.equal(preview.payload.error, compras.COMPRAS_IMPORT_SCHEMA_NOT_READY);
    const beforeWrites = cold.state.writes.length;
    const commit = await coldApp.invoke("POST", "/api/compras/import/commit", { body: { planta_id: 1, request_id: "x" } });
    assert.equal(commit.status, 503);
    assert.equal(commit.payload.error, compras.COMPRAS_IMPORT_SCHEMA_NOT_READY);
    assert.equal(cold.state.writes.length, beforeWrites);
    assert.equal(cold.state.queries.some((q) => q.includes("from arr.compras_import")), false);
    const warm = await appFor(routeClient(true)).invoke("GET", "/api/compras", { query: { planta_id: "1", year: "2026", month: "10" } });
    assert.equal(warm.status, 200);
    assert.equal(warm.payload.import_ready, true);
  });

  it("M–N el alta manual rechaza kg 0 y la nota importada no", async () => {
    const client = routeClient(true);
    const manual = await appFor(client).invoke("POST", "/api/compras", { body: { planta_id: 1, proveedor_id: 1, fecha: "2026-10-02", kg: 0, importe: 10 } });
    assert.equal(manual.status, 400);
    assert.equal(client.state.writes.some((q) => q.startsWith("insert into arr.compras ")), false);
    const buf = await workbook([{ name: "OCTUBRE", a1: "PUEBLA", rows: [{ origin: "NOTA DE CARGO", kg: null, fecha: "2026-10-03", importe: 12 }] }]);
    const parsed = await compras.parseComprasExcelBuffer(buf);
    const mem = new Mem();
    const out = await compras.runComprasExcelImport(mem, {
      mode: "commit", parsed, planta_id: 1, desde: "2026-10-01", hasta: "2026-10-31", file_name: "nota.xlsx", request_id: "nota", plantName: "Puebla",
    });
    assert.equal(out.body.ok, true);
    assert.equal(mem.purchases[0].kg, 0);
    assert.equal(mem.purchases[0].importe, 12);
  });

  it("O–Q Acapulco, HG y documentos se conservan", async () => {
    async function parsed(a1, origin, kg) {
      const buf = await workbook([{ name: "OCTUBRE", a1, rows: [{ origin, kg, fecha: "2026-10-09", importe: kg }] }]);
      return compras.parseComprasExcelBuffer(buf);
    }
    const hidro = await parsed("HIDROGAS", "PEMEX TUXPAN", 4);
    const uribe = await parsed("URIBE", "TUXPAN IMPORTADORA", 6);
    const mem = new Mem();
    mem.hg.push({ id: 3, fecha: "2026-10-09", hg_kilos: 20 });
    await compras.runComprasExcelImport(mem, { mode: "commit", parsed: hidro, planta_id: 1, desde: "2026-10-01", hasta: "2026-10-31", file_name: "h.xlsx", request_id: "h", plantName: "Acapulco" });
    await compras.runComprasExcelImport(mem, { mode: "commit", parsed: uribe, planta_id: 1, desde: "2026-10-01", hasta: "2026-10-31", file_name: "u.xlsx", request_id: "u", plantName: "Acapulco" });
    assert.equal(mem.purchases.length, 2);
    assert.equal(mem.hg[0].hg_kilos, 20);
    mem.docs.push({ compra_id: mem.purchases[0].id });
    const blocked = await compras.runComprasExcelImport(mem, { mode: "commit", parsed: hidro, planta_id: 1, desde: "2026-10-01", hasta: "2026-10-31", file_name: "h.xlsx", request_id: "h2", plantName: "Acapulco" });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.document_blockers, 1);
    assert.equal(mem.purchases.length, 2);
    assert.equal(mem.hg[0].hg_kilos, 20);
  });

  it("los cinco Excel reales siguen en 2026", async () => {
    const dir = "C:\\Users\\SUBDIRECCION\\Desktop\\TOMZA_088_EXCEL";
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".xlsx"));
    assert.equal(files.length >= 5, true);
    for (const name of files) {
      const parsed = await compras.parseComprasExcelBuffer(fs.readFileSync(path.join(dir, name)));
      const october = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-10-31", plantName: parsed.a1 === "HIDROGAS" || parsed.a1 === "URIBE" ? "Acapulco" : parsed.a1 === "TEHUACAN" ? "Tehuacán" : parsed.a1 === "MORELOS" ? "Morelos" : "Puebla", existing: [], documents: [], hg: [] });
      assert.deepEqual(october.workbook_years, [2026]);
      if (parsed.a1 === "TEHUACAN") assert.equal(october.errors.some((e) => e.code === "UNKNOWN_ORIGIN"), false);
      if (parsed.a1 === "HIDROGAS") {
        assert.ok(october.errors.some((e) => e.code === "DATE_SHEET_MISMATCH"));
        const september = compras.planComprasExcelImport(parsed, { desde: "2026-09-01", hasta: "2026-09-30", plantName: "Acapulco", existing: [], documents: [], hg: [] });
        assert.equal(september.errors.some((e) => e.code === "DATE_SHEET_MISMATCH"), false);
      }
    }
  });
});
