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

async function workbook(rows, a1 = "TEHUACAN") {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("OCTUBRE");
  ws.getCell("A1").value = a1;
  rows.forEach((row, index) => {
    const r = 6 + index;
    ws.getCell(r, 1).value = row.origin;
    if (row.kg != null) ws.getCell(r, 5).value = row.kg;
    ws.getCell(r, 7).value = ymdDate(row.fecha);
    ws.getCell(r, 10).value = row.importe;
  });
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
        source_company: meta ? meta.source_company : null,
        excel_kg: eff ? eff.excel_kg : null,
        excel_importe: eff ? eff.excel_importe : null,
        provenance: eff ? eff.provenance : null,
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
  }
  async insertPurchase(row) {
    const provider = this.providers.find((p) => p.id === row.proveedor_id);
    const saved = { id: this.seq++, fecha: row.fecha, kg: row.kg, importe: row.importe, proveedor_id: row.proveedor_id, proveedor_nombre: provider ? provider.nombre : "" };
    this.purchases.push(saved);
    return saved;
  }
  async insertImport(row) {
    const saved = { id: this.seq++, request_id: row.request_id };
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
    if (idx >= 0) this.effective[idx] = { ...row };
    else this.effective.push({ ...row });
  }
}

function commitSpec(parsed, requestId) {
  return {
    mode: "commit", parsed, planta_id: 1, desde: "2026-10-01", hasta: "2026-10-31",
    file_name: "t.xlsx", request_id: requestId, plantName: "Tehuacán",
  };
}

function readyRow(extra = {}) {
  return {
    lineas: "arr.compras_import_lineas",
    effective: "arr.compras_effective",
    importe_type: "numeric(18,6)",
    line_importacion_id: "integer",
    line_compra_id: "integer",
    line_excel_kg: "numeric(18,6)",
    line_excel_importe: "numeric(18,6)",
    line_captured_kg: "numeric(18,6)",
    line_captured_importe: "numeric(18,6)",
    line_action: "text",
    line_discrepant: "boolean",
    line_provenance: "text",
    eff_compra_id: "integer",
    eff_import_linea_id: "bigint",
    eff_excel_kg: "numeric(18,6)",
    eff_excel_importe: "numeric(18,6)",
    eff_provenance: "text",
    ...extra,
  };
}

describe("088-R4-R1 provenance y readiness", () => {
  it("1–3 una fila solo de Excel no se vuelve captura ni amarilla al reimportar", async () => {
    const first = await compras.parseComprasExcelBuffer(await workbook([
      { origin: "PEMEX TUXPAN", kg: 18750, fecha: "2026-10-07", importe: 188240.625 },
    ]));
    const mem = new Mem();
    const created = await compras.runComprasExcelImport(mem, commitSpec(first, "one"));
    assert.equal(created.body.ok, true);
    assert.equal(mem.purchases[0].importe, 188240.63);
    assert.equal(mem.effective[0].excel_importe, 188240.625);
    assert.equal(mem.effective[0].provenance, "EXCEL_ONLY");
    assert.equal(mem.lines[0].discrepant, false);
    assert.equal(mem.lines[0].captured_importe, null);
    const same = await compras.runComprasExcelImport(mem, commitSpec(first, "two"));
    assert.equal(same.body.ok, true);
    assert.equal(mem.effective[0].excel_importe, 188240.625);
    assert.equal(mem.effective[0].provenance, "EXCEL_ONLY");
    assert.equal(mem.lines.every((line) => line.provenance === "EXCEL_ONLY" && line.discrepant === false && line.action === "INSERTED"), true);
    const changed = await compras.parseComprasExcelBuffer(await workbook([
      { origin: "PEMEX TUXPAN", kg: 18750, fecha: "2026-10-07", importe: 188000.125 },
    ]));
    const third = await compras.runComprasExcelImport(mem, commitSpec(changed, "three"));
    assert.equal(third.body.ok, true);
    assert.equal(mem.purchases[0].importe, 188240.63);
    assert.equal(mem.effective[0].excel_importe, 188000.125);
    assert.equal(mem.effective[0].provenance, "EXCEL_ONLY");
    assert.equal(mem.lines.length, 3);
    assert.equal(mem.lines.filter((line) => line.action === "MATCHED_PRESERVED").length, 0);
    const view = compras.mapPurchase({
      ...mem.purchases[0],
      planta_id: 1,
      excel_kg: mem.effective[0].excel_kg,
      excel_importe: mem.effective[0].excel_importe,
      provenance: mem.effective[0].provenance,
      reconcile_action: "INSERTED",
      discrepant: false,
    });
    assert.equal(view.excel_only, true);
    assert.equal(view.reconciled, false);
    assert.equal(view.discrepant, false);
    const grid = compras.aggregatePurchases([view], [{ id: view.proveedor_id, nombre: "PEMEX TUXPAN" }], 2026, 10);
    assert.equal(grid.days.find((day) => day.ymd === "2026-10-07").fecha_discrepante, false);
    assert.equal(grid.days.find((day) => day.ymd === "2026-10-07").cells[view.proveedor_id].importe, 188000.125);
  });

  it("4 la captura manual sigue amarilla y muestra ambos valores", async () => {
    const parsed = await compras.parseComprasExcelBuffer(await workbook([
      { origin: "PEMEX TUXPAN", kg: 18750, fecha: "2026-10-07", importe: 188240.625 },
    ]));
    const mem = new Mem();
    mem.providers.push({ id: 1, nombre: "PEMEX TUXPAN" });
    mem.purchases.push({ id: 11, fecha: "2026-10-07", kg: 18750, importe: 189281.25, proveedor_id: 1, proveedor_nombre: "PEMEX TUXPAN" });
    mem.docs.push({ compra_id: 11 });
    mem.seq = 20;
    const out = await compras.runComprasExcelImport(mem, commitSpec(parsed, "manual"));
    assert.equal(out.body.ok, true);
    const line = mem.lines.find((item) => item.compra_id === 11);
    assert.equal(line.action, "MATCHED_PRESERVED");
    assert.equal(line.provenance, "CAPTURED");
    assert.equal(line.discrepant, true);
    assert.equal(line.captured_importe, 189281.25);
    assert.equal(mem.effective[0].provenance, "CAPTURED");
    assert.equal(mem.purchases.find((p) => p.id === 11).importe, 189281.25);
    const plan = compras.planComprasExcelImport(parsed, {
      desde: "2026-10-01", hasta: "2026-10-31", plantName: "Tehuacán",
      existing: [{ id: 11, fecha: "2026-10-07", kg: 18750, importe: 189281.25, proveedor_nombre: "PEMEX TUXPAN" }],
      documents: [{ compra_id: 11 }],
      hg: [],
    });
    assert.equal(plan.document_blockers, 0);
    assert.equal(plan.message, "");
    const view = compras.mapPurchase({
      id: 11, planta_id: 1, proveedor_id: 1, fecha: "2026-10-07", kg: 18750, importe: 189281.25,
      excel_kg: 18750, excel_importe: 188240.625, provenance: "CAPTURED", reconcile_action: "MATCHED_PRESERVED", discrepant: true,
    });
    assert.equal(view.reconciled, true);
    assert.equal(view.excel_only, false);
    assert.equal(view.discrepant, true);
    assert.equal(view.captured_importe, 189281.25);
    assert.equal(view.effective_importe, 188240.625);
  });

  it("5 la nota solo de Excel sigue sin amarillo al reimportar", async () => {
    const parsed = await compras.parseComprasExcelBuffer(await workbook([
      { origin: "NOTA DE CARGO", kg: null, fecha: "2026-10-07", importe: 38458.383 },
    ]));
    const mem = new Mem();
    await compras.runComprasExcelImport(mem, commitSpec(parsed, "nota-1"));
    await compras.runComprasExcelImport(mem, commitSpec(parsed, "nota-2"));
    assert.equal(mem.purchases.length, 1);
    assert.equal(mem.purchases[0].kg, 0);
    assert.equal(mem.purchases[0].importe, 38458.38);
    assert.equal(mem.effective[0].excel_importe, 38458.383);
    assert.equal(mem.effective[0].provenance, "EXCEL_ONLY");
    assert.equal(mem.lines.length, 2);
    assert.equal(mem.lines.every((line) => line.discrepant === false && line.provenance === "EXCEL_ONLY"), true);
    const view = compras.mapPurchase({
      ...mem.purchases[0], planta_id: 1, excel_kg: 0, excel_importe: 38458.383,
      provenance: "EXCEL_ONLY", reconcile_action: "INSERTED", discrepant: false,
    });
    const grid = compras.aggregatePurchases([view], [{ id: view.proveedor_id, nombre: "NOTA DE CARGO" }], 2026, 10);
    assert.equal(grid.days.find((day) => day.ymd === "2026-10-07").fecha_discrepante, false);
  });

  it("el esquema incompleto deja la conciliación apagada", () => {
    assert.equal(compras.reconcileSchemaRowReady(readyRow()), true);
    assert.equal(compras.reconcileSchemaRowReady(readyRow({ line_discrepant: null })), false);
    assert.equal(compras.reconcileSchemaRowReady(readyRow({ line_excel_importe: "numeric(14,2)" })), false);
    assert.equal(compras.reconcileSchemaRowReady(readyRow({ eff_import_linea_id: "integer" })), false);
    assert.equal(compras.reconcileSchemaRowReady(readyRow({ eff_provenance: null })), false);
    assert.equal(compras.reconcileSchemaRowReady(readyRow({ importe_type: "numeric(14,2)" })), false);
    const ui = fs.readFileSync(path.join(__dirname, "../frontend-dashboard/components/ComprasClient.tsx"), "utf8");
    const backend = fs.readFileSync(path.join(__dirname, "../lib/compras-dashboard.js"), "utf8");
    const sentence = "Hay compras con factura sin contraparte en el Excel. No se aplicará la conciliación.";
    assert.equal(ui.includes(sentence), true);
    assert.equal(backend.includes(`const EXCEL_BLOCK_DOCS = "${sentence}"`), true);
    assert.equal(ui.includes("Hay facturas en el rango. No se sustituye."), false);
  });

  it("preview y commit responden 503 si falta una columna y no leen las tablas R4", async () => {
    const state = { queries: [], writes: [] };
    const client = {
      state,
      async query(sql) {
        const q = String(sql).replace(/\s+/g, " ").trim().toLowerCase();
        state.queries.push(q);
        if (/^(insert|update|delete|alter)\b/.test(q) || q === "begin" || q === "commit") state.writes.push(q);
        if (q.includes("compras_kg_nonnegative")) {
          return { rows: [{ importaciones: "arr.compras_importaciones", meta: "arr.compras_import_meta", kg_def: "CHECK ((kg >= 0))" }] };
        }
        if (q.includes("compras_import_lineas")) return { rows: [readyRow({ line_captured_kg: "numeric(14,3)" })] };
        if (q.includes("to_regclass('arr.compras_effective')")) return { rows: [{ effective: null }] };
        if (q.startsWith("create")) return { rows: [] };
        if (q.includes("from public.plantas")) return { rows: [{ nombre: "Tehuacán" }] };
        if (q.startsWith("insert into arr.compras_proveedores")) return { rows: [{ id: 1, planta_id: 1, nombre: "PEMEX TUXPAN", activo: true, orden: 0 }] };
        if (q.includes("from arr.compras_proveedores")) return { rows: [] };
        return { rows: [] };
      },
      release() {},
    };
    const routes = [];
    const add = (method) => (routePath, ...handlers) => routes.push({ method, path: routePath, handlers });
    compras.registerComprasRoutes({ get: add("GET"), post: add("POST"), patch: add("PATCH"), delete: add("DELETE") }, {
      pool: { connect: async () => client },
      dashboardAuthMiddleware: (_req, _res, next) => next(),
      assertPlantaAccess: () => true,
      uploadPdfToS3: async () => {},
      getBufferFromS3: async () => null,
      s3Enabled: () => false,
    });
    async function invoke(method, url, body) {
      const hit = routes.find((route) => route.method === method && route.path === url);
      const req = { query: body.query || {}, body: body.body || {}, params: {}, dashboardAuth: { actor_id: 1, permisos: { acceso_compras: true } } };
      let status = 200;
      let payload;
      const res = { status(code) { status = code; return this; }, json(data) { payload = data; return this; }, send() { return this; }, setHeader() {} };
      for (const handler of hit.handlers) {
        let nexted = false;
        await handler(req, res, () => { nexted = true; });
        if (!nexted) break;
      }
      return { status, payload };
    }
    const month = await invoke("GET", "/api/compras", { query: { planta_id: "1", year: "2026", month: "10" } });
    assert.equal(month.status, 200);
    assert.equal(month.payload.reconcile_ready, false);
    const writes = state.writes.length;
    const preview = await invoke("POST", "/api/compras/import/preview", { body: { planta_id: 1 } });
    assert.equal(preview.status, 503);
    assert.equal(preview.payload.error, compras.COMPRAS_RECONCILE_SCHEMA_NOT_READY);
    const commit = await invoke("POST", "/api/compras/import/commit", { body: { planta_id: 1, request_id: "x" } });
    assert.equal(commit.status, 503);
    assert.equal(state.writes.length, writes);
    assert.equal(state.queries.some((q) => q.includes("from arr.compras_import_lineas") || q.includes("from arr.compras_effective")), false);
  });
});
