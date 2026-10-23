"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const compras = require("../lib/compras-dashboard");

const REAL_DIR = "C:\\Users\\SUBDIRECCION\\Desktop\\TOMZA_088_EXCEL";

function ymdDate(iso) {
  return new Date(`${iso}T00:00:00.000Z`);
}

async function workbook(sheets) {
  const wb = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name);
    ws.getCell("A1").value = sheet.a1;
    (sheet.rows || []).forEach((row, index) => {
      const r = row.at || (6 + index);
      if (row.blank) return;
      ws.getCell(r, 1).value = row.origin;
      if (row.kg != null) ws.getCell(r, 5).value = row.kg;
      if (row.fecha) ws.getCell(r, 7).value = ymdDate(row.fecha);
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
    this.lines = [];
    this.effective = [];
    this.seq = 1;
    this.snap = null;
    this.failAfterProvider = false;
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
    this.docs = this.docs.filter((d) => !ids.includes(d.compra_id));
  }
  async updatePurchaseProvider(compraId, proveedorId) {
    const purchase = this.purchases.find((p) => p.id === compraId);
    const provider = this.providers.find((p) => p.id === proveedorId);
    purchase.proveedor_id = proveedorId;
    purchase.proveedor_nombre = provider ? provider.nombre : purchase.proveedor_nombre;
    if (this.failAfterProvider) throw new Error("repair-fail");
  }
  async insertPurchase(row) {
    const provider = this.providers.find((p) => p.id === row.proveedor_id);
    const saved = {
      id: this.seq++, fecha: row.fecha, kg: row.kg, importe: row.importe,
      proveedor_id: row.proveedor_id, proveedor_nombre: provider ? provider.nombre : "",
    };
    this.purchases.push(saved);
    return saved;
  }
  async insertImport(row) {
    const saved = { id: this.seq++, request_id: row.request_id, row_count: row.row_count, total_kg: row.total_kg, total_importe: row.total_importe, source_company: row.source_company };
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

function spec(parsed, extra = {}) {
  return {
    mode: "commit",
    parsed,
    planta_id: 1,
    desde: "2026-10-01",
    hasta: "2026-10-31",
    file_name: "fixture.xlsx",
    request_id: extra.request_id || "r5",
    plantName: "Morelos",
    ...extra,
  };
}

async function planOf(sheets, extra = {}) {
  const parsed = await compras.parseComprasExcelBuffer(await workbook(sheets));
  return compras.planComprasExcelImport(parsed, {
    desde: "2026-10-01",
    hasta: "2026-10-31",
    plantName: "Querétaro",
    existing: [],
    documents: [],
    hg: [],
    ...extra,
    parsed: undefined,
  });
}

function realNames(token) {
  if (!fs.existsSync(REAL_DIR)) return [];
  const locks = fs.readdirSync(REAL_DIR).filter((name) => name.startsWith("~$"));
  assert.deepEqual(locks, []);
  return fs.readdirSync(REAL_DIR).filter((name) => name.toUpperCase().includes(token) && name.toLowerCase().endsWith(".xlsx") && !name.startsWith("~$"));
}

function preferredReal(token) {
  const names = realNames(token);
  return names.find((name) => name.includes("(1)")) || names[0] || "";
}

describe("FIX-COMPRAS-CROSSPLANT-RECONCILE-NORMALIZATION-088-R5", () => {
  it("A–B alias exacto TEPEJI TOMZA y un typo sigue desconocido", async () => {
    const plan = await planOf([{ name: "OCTUBRE", a1: "QUERETARO", rows: [{ origin: "TEPEJI TOMZA", kg: 10, fecha: "2026-10-02", importe: 100 }] }]);
    assert.equal(plan.ok, true);
    assert.equal(plan.rows[0].proveedor, "TOMZA TEPEJI");
    const unknown = await planOf([{ name: "OCTUBRE", a1: "QUERETARO", rows: [{ origin: "TEPEJI TOMSA", kg: 10, fecha: "2026-10-02", importe: 100 }] }]);
    assert.equal(unknown.ok, false);
    assert.ok(unknown.errors.some((e) => e.code === "UNKNOWN_ORIGIN"));
  });

  it("C A1 SAN LUIS POTOSI resuelve San Luis", async () => {
    const plan = await planOf([{ name: "OCTUBRE", a1: "SAN LUIS POTOSÍ", rows: [{ origin: "PEMEX TUXPAN", kg: 5, fecha: "2026-10-03", importe: 50 }] }], { plantName: "San Luis" });
    assert.equal(plan.ok, true);
    assert.equal(plan.plant, "san luis");
    assert.equal(plan.source_company, null);
  });

  it("D–G la nota sin fecha solo hereda la fila física inmediata", async () => {
    const inherited = await compras.parseComprasExcelBuffer(await workbook([{
      name: "OCTUBRE", a1: "QUERETARO", rows: [
        { origin: "PEMEX TUXPAN", kg: 10, fecha: "2026-10-04", importe: 100 },
        { origin: "NOTA DE CARGO", kg: 0, importe: 15 },
      ],
    }]));
    const note = inherited.rows.find((row) => row.proveedor === "NOTA DE CARGO");
    assert.equal(note.fecha, "2026-10-04");
    assert.equal(note.kg, 0);
    const inheritedPlan = compras.planComprasExcelImport(inherited, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Querétaro", existing: [], documents: [], hg: [] });
    assert.equal(inheritedPlan.ok, true);
    assert.equal(inheritedPlan.notas, 1);

    const gap = await compras.parseComprasExcelBuffer(await workbook([{
      name: "OCTUBRE", a1: "QUERETARO", rows: [
        { at: 6, origin: "PEMEX TUXPAN", kg: 10, fecha: "2026-10-04", importe: 100 },
        { at: 7, blank: true },
        { at: 8, origin: "NOTA DE CARGO", kg: 0, importe: 15 },
      ],
    }]));
    const gapPlan = compras.planComprasExcelImport(gap, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Querétaro", existing: [], documents: [], hg: [] });
    assert.equal(gapPlan.ok, false);
    assert.ok(gapPlan.errors.some((e) => e.code === "NOTE_DATE_AMBIGUOUS" && e.row === 8));

    const chained = await compras.parseComprasExcelBuffer(await workbook([{
      name: "OCTUBRE", a1: "SAN LUIS", rows: [
        { origin: "PEMEX TUXPAN", kg: 10, fecha: "2026-10-04", importe: 100 },
        { origin: "NOTA DE CARGO", kg: 0, importe: 15 },
        { origin: "NOTA DE CARGO", kg: 0, importe: 4 },
      ],
    }]));
    assert.equal(chained.rows.filter((row) => row.proveedor === "NOTA DE CARGO")[0].fecha, "2026-10-04");
    assert.equal(chained.rows.filter((row) => row.proveedor === "NOTA DE CARGO")[1].fecha, "");
    const chainedPlan = compras.planComprasExcelImport(chained, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "San Luis", existing: [], documents: [], hg: [] });
    assert.equal(chainedPlan.ok, false);
    assert.ok(chainedPlan.errors.some((e) => e.code === "NOTE_DATE_AMBIGUOUS" && e.row === 8));

    const crossed = await compras.parseComprasExcelBuffer(await workbook([
      { name: "SEPTIEMBRE", a1: "QUERETARO", rows: [{ origin: "PEMEX TUXPAN", kg: 10, fecha: "2026-09-30", importe: 100 }] },
      { name: "OCTUBRE", a1: "QUERETARO", rows: [{ origin: "NOTA DE CARGO", kg: 0, importe: 15 }] },
    ]));
    const octoberNote = crossed.rows.find((row) => row.sheet_name === "OCTUBRE");
    assert.equal(octoberNote.fecha, "");
    const crossedPlan = compras.planComprasExcelImport(crossed, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Querétaro", existing: [], documents: [], hg: [] });
    assert.equal(crossedPlan.ok, false);
    assert.ok(crossedPlan.errors.some((e) => e.code === "NOTE_DATE_AMBIGUOUS" && e.sheet === "OCTUBRE"));
  });

  it("H–I el repair exacto conserva id, factura y captura", async () => {
    const parsed = await compras.parseComprasExcelBuffer(await workbook([{
      name: "OCTUBRE", a1: "MORELOS", rows: [{ origin: "TEPEJI IMPORTADORA", kg: 25380, fecha: "2026-10-06", importe: 327846.15 }],
    }]));
    const mem = new Mem();
    mem.providers.push({ id: 1, nombre: "PEMEX TUXPAN" }, { id: 2, nombre: "TOMZA TEPEJI" });
    mem.purchases.push({ id: 50, fecha: "2026-10-06", kg: 25380, importe: 322472.15, proveedor_id: 1, proveedor_nombre: "PEMEX TUXPAN" });
    mem.docs.push({ compra_id: 50 });
    mem.seq = 60;
    const preview = await compras.runComprasExcelImport(mem, spec(parsed, { mode: "preview", request_id: "preview-repair" }));
    assert.equal(preview.body.provider_repairs, 1);
    assert.equal(preview.body.provider_repair_rows[0].compra_id, 50);
    assert.equal(preview.body.provider_repair_rows[0].from_provider, "PEMEX TUXPAN");
    assert.equal(preview.body.provider_repair_rows[0].to_provider, "TOMZA TEPEJI");
    assert.equal(preview.body.provider_repair_rows[0].has_document, true);
    assert.equal(preview.body.document_blockers, 0);
    assert.equal(preview.body.deletes, 0);
    assert.equal(preview.body.nuevas, 0);
    const commit = await compras.runComprasExcelImport(mem, spec(parsed, { request_id: "repair" }));
    assert.equal(commit.status, 200);
    const saved = mem.purchases.find((p) => p.id === 50);
    assert.equal(saved.proveedor_id, 2);
    assert.equal(saved.kg, 25380);
    assert.equal(saved.importe, 322472.15);
    assert.equal(mem.docs.length, 1);
    assert.equal(mem.purchases.length, 1);
    assert.equal(mem.lines[0].captured_importe, 322472.15);
    assert.equal(mem.lines[0].action, "MATCHED_PRESERVED");
    assert.equal(mem.effective[0].excel_importe, 327846.15);
  });

  it("J un repair ambiguo bloquea", async () => {
    const parsed = await compras.parseComprasExcelBuffer(await workbook([{
      name: "OCTUBRE", a1: "MORELOS", rows: [
        { origin: "TEPEJI IMPORTADORA", kg: 10, fecha: "2026-10-06", importe: 100 },
        { origin: "TUXPAN IMPORTADORA", kg: 10, fecha: "2026-10-06", importe: 110 },
      ],
    }]));
    const mem = new Mem();
    mem.providers.push({ id: 1, nombre: "PEMEX TUXPAN" });
    mem.purchases.push({ id: 7, fecha: "2026-10-06", kg: 10, importe: 90, proveedor_id: 1, proveedor_nombre: "PEMEX TUXPAN" });
    const preview = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Morelos", existing: mem.purchases, documents: [], hg: [] });
    assert.equal(preview.ok, false);
    assert.ok(preview.errors.some((e) => e.code === "AMBIGUOUS_PROVIDER_REPAIR"));
    const commit = await compras.runComprasExcelImport(mem, spec(parsed, { request_id: "amb" }));
    assert.equal(commit.status, 409);
    assert.equal(mem.purchases[0].proveedor_id, 1);
    assert.equal(mem.imports.length, 0);
  });

  it("K el rollback revierte el repair de proveedor", async () => {
    const parsed = await compras.parseComprasExcelBuffer(await workbook([{
      name: "OCTUBRE", a1: "MORELOS", rows: [{ origin: "TEPEJI IMPORTADORA", kg: 10, fecha: "2026-10-06", importe: 100 }],
    }]));
    const mem = new Mem();
    mem.providers.push({ id: 1, nombre: "PEMEX TUXPAN" }, { id: 2, nombre: "TOMZA TEPEJI" });
    mem.purchases.push({ id: 8, fecha: "2026-10-06", kg: 10, importe: 90, proveedor_id: 1, proveedor_nombre: "PEMEX TUXPAN" });
    mem.failAfterProvider = true;
    const commit = await compras.runComprasExcelImport(mem, spec(parsed, { request_id: "roll" }));
    assert.equal(commit.body.rolled_back, true);
    assert.equal(mem.purchases[0].proveedor_id, 1);
    assert.equal(mem.purchases[0].importe, 90);
    assert.equal(mem.imports.length, 0);
    assert.equal(mem.lines.length, 0);
  });

  it("L–O Acapulco clasifica legado con match y aísla la otra empresa", async () => {
    const hidro = await compras.parseComprasExcelBuffer(await workbook([{ name: "OCTUBRE", a1: "HIDROGAS", rows: [{ origin: "PEMEX TUXPAN", kg: 4, fecha: "2026-10-09", importe: 40 }] }]));
    const matched = new Mem();
    matched.providers.push({ id: 1, nombre: "PEMEX TUXPAN" });
    matched.purchases.push({ id: 11, fecha: "2026-10-09", kg: 4, importe: 40, proveedor_id: 1, proveedor_nombre: "PEMEX TUXPAN", source_company: null });
    matched.docs.push({ compra_id: 11 });
    const matchedPlan = compras.planComprasExcelImport(hidro, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Acapulco", existing: matched.purchases, documents: matched.docs, hg: [] });
    assert.equal(matchedPlan.legacy_matched_to_source, 1);
    assert.equal(matchedPlan.legacy_remaining_unclassified, 0);
    assert.equal(matchedPlan.nuevas, 0);
    const matchedCommit = await compras.runComprasExcelImport(matched, spec(hidro, { plantName: "Acapulco", request_id: "legacy-match" }));
    assert.equal(matchedCommit.status, 200);
    assert.equal(matched.purchases.length, 1);
    assert.equal(matched.purchases[0].id, 11);
    assert.equal(matched.meta[0].source_company, "HIDROGAS");
    assert.equal(matched.docs.length, 1);

    const repaired = new Mem();
    repaired.providers.push({ id: 1, nombre: "PEMEX TUXPAN" }, { id: 2, nombre: "TOMZA TEPEJI" });
    repaired.purchases.push({ id: 12, fecha: "2026-10-09", kg: 4, importe: 39, proveedor_id: 1, proveedor_nombre: "PEMEX TUXPAN", source_company: null });
    const tepeji = await compras.parseComprasExcelBuffer(await workbook([{ name: "OCTUBRE", a1: "HIDROGAS", rows: [{ origin: "TEPEJI IMPORTADORA", kg: 4, fecha: "2026-10-09", importe: 40 }] }]));
    const repairCommit = await compras.runComprasExcelImport(repaired, spec(tepeji, { plantName: "Acapulco", request_id: "legacy-repair" }));
    assert.equal(repairCommit.status, 200);
    assert.equal(repaired.purchases.length, 1);
    assert.equal(repaired.purchases[0].id, 12);
    assert.equal(repaired.purchases[0].proveedor_id, 2);
    assert.equal(repaired.purchases[0].importe, 39);
    assert.equal(repaired.meta[0].source_company, "HIDROGAS");

    const unmatched = new Mem();
    unmatched.providers.push({ id: 1, nombre: "PEMEX TUXPAN" });
    unmatched.purchases.push({ id: 13, fecha: "2026-10-09", kg: 9, importe: 90, proveedor_id: 1, proveedor_nombre: "PEMEX TUXPAN", source_company: null });
    const unmatchedPlan = compras.planComprasExcelImport(hidro, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Acapulco", existing: unmatched.purchases, documents: [], hg: [] });
    assert.equal(unmatchedPlan.legacy_remaining_unclassified, 1);
    assert.equal(unmatchedPlan.ok, true);
    await compras.runComprasExcelImport(unmatched, spec(hidro, { plantName: "Acapulco", request_id: "legacy-keep" }));
    assert.equal(unmatched.purchases.some((p) => p.id === 13 && p.kg === 9), true);
    assert.equal(unmatched.meta.some((m) => m.compra_id === 13), false);

    const isolated = new Mem();
    isolated.providers.push({ id: 1, nombre: "PEMEX TUXPAN" }, { id: 2, nombre: "TOMZA TUXPAN" });
    isolated.purchases.push({ id: 21, fecha: "2026-10-09", kg: 6, importe: 60, proveedor_id: 2, proveedor_nombre: "TOMZA TUXPAN" });
    isolated.meta.push({ compra_id: 21, source_company: "URIBE", origin_text: "TUXPAN IMPORTADORA" });
    await compras.runComprasExcelImport(isolated, spec(hidro, { plantName: "Acapulco", request_id: "hidro-only" }));
    assert.equal(isolated.purchases.find((p) => p.id === 21).kg, 6);
    assert.equal(isolated.meta.find((m) => m.compra_id === 21).source_company, "URIBE");
    const uribe = await compras.parseComprasExcelBuffer(await workbook([{ name: "OCTUBRE", a1: "URIBE", rows: [{ origin: "TUXPAN IMPORTADORA", kg: 6, fecha: "2026-10-09", importe: 60 }] }]));
    isolated.purchases.push({ id: 22, fecha: "2026-10-11", kg: 4, importe: 40, proveedor_id: 1, proveedor_nombre: "PEMEX TUXPAN" });
    isolated.meta.push({ compra_id: 22, source_company: "HIDROGAS", origin_text: "PEMEX TUXPAN" });
    await compras.runComprasExcelImport(isolated, spec(uribe, { plantName: "Acapulco", request_id: "uribe-only" }));
    assert.equal(isolated.purchases.find((p) => p.id === 22).kg, 4);
    assert.equal(isolated.meta.find((m) => m.compra_id === 22).source_company, "HIDROGAS");
    assert.equal(isolated.purchases.find((p) => p.id === 21).kg, 6);
  });

  it("P DATE_SHEET_MISMATCH se identifica por hoja y renglón", async () => {
    const parsed = await compras.parseComprasExcelBuffer(await workbook([
      { name: "SEPTIEMBRE", a1: "HIDROGAS", rows: [{ at: 10, origin: "PEMEX TUXPAN", kg: 2, fecha: "2026-10-07", importe: 20 }] },
      { name: "OCTUBRE", a1: "HIDROGAS", rows: [{ at: 10, origin: "PEMEX TUXPAN", kg: 3, fecha: "2026-10-08", importe: 30 }] },
    ]));
    const october = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Acapulco", existing: [], documents: [], hg: [] });
    const mismatch = october.errors.filter((e) => e.code === "DATE_SHEET_MISMATCH");
    assert.equal(mismatch.length, 1);
    assert.equal(mismatch[0].sheet, "SEPTIEMBRE");
    assert.equal(mismatch[0].row, 10);
    assert.equal(mismatch[0].fecha, "2026-10-07");
    assert.equal(october.ok, false);
    const day = compras.planComprasExcelImport(parsed, { desde: "2026-10-08", hasta: "2026-10-08", plantName: "Acapulco", existing: [], documents: [], hg: [] });
    assert.equal(day.errors.some((e) => e.code === "DATE_SHEET_MISMATCH"), false);
    assert.equal(day.ok, true);
  });

  it("R no deduplica filas iguales", async () => {
    const plan = await planOf([{
      name: "OCTUBRE", a1: "MORELOS", rows: [
        { origin: "PEMEX TUXPAN", kg: 1, fecha: "2026-10-02", importe: 11 },
        { origin: "PEMEX TUXPAN", kg: 1, fecha: "2026-10-02", importe: 11 },
      ],
    }], { plantName: "Morelos" });
    assert.equal(plan.excel_rows, 2);
    assert.equal(plan.nuevas, 2);
  });

  it("S–T el aviso de facturas no se duplica y el banner de éxito se limpia", () => {
    const ui = fs.readFileSync(path.join(__dirname, "../frontend-dashboard/components/ComprasClient.tsx"), "utf8");
    const sentence = "Hay compras con factura sin contraparte en el Excel. No se aplicará la conciliación.";
    assert.equal(ui.split(sentence).length - 1, 1);
    assert.ok(ui.includes("COMPRAS_DOC_BLOCK"));
    assert.ok(ui.includes('aria-label="Cerrar aviso"'));
    assert.ok(ui.includes("setData(payload);"));
    assert.ok(ui.includes("setError(null);"));
    const success = ui.slice(ui.indexOf("setData(payload);"), ui.indexOf("setData(payload);") + 80);
    assert.ok(success.includes("setError(null)"));
    assert.equal(ui.includes("function friendlyError"), true);
  });

  it("U–V HG no cambia y el request_id no repite el repair", async () => {
    const parsed = await compras.parseComprasExcelBuffer(await workbook([{
      name: "OCTUBRE", a1: "MORELOS", rows: [{ origin: "TEPEJI IMPORTADORA", kg: 10, fecha: "2026-10-06", importe: 100 }],
    }]));
    const mem = new Mem();
    mem.providers.push({ id: 1, nombre: "PEMEX TUXPAN" }, { id: 2, nombre: "TOMZA TEPEJI" });
    mem.purchases.push({ id: 30, fecha: "2026-10-06", kg: 10, importe: 90, proveedor_id: 1, proveedor_nombre: "PEMEX TUXPAN" });
    mem.hg.push({ id: 4, fecha: "2026-10-06", hg_kilos: 12 });
    const before = JSON.stringify(mem.hg);
    const first = await compras.runComprasExcelImport(mem, spec(parsed, { request_id: "once" }));
    assert.equal(first.status, 200);
    assert.equal(JSON.stringify(mem.hg), before);
    const lines = mem.lines.length;
    const again = await compras.runComprasExcelImport(mem, spec(parsed, { request_id: "once" }));
    assert.equal(again.body.idempotent, true);
    assert.equal(mem.lines.length, lines);
    assert.equal(mem.purchases.length, 1);
  });

  it("W Puebla conserva el match normal", async () => {
    const parsed = await compras.parseComprasExcelBuffer(await workbook([{
      name: "OCTUBRE", a1: "PUEBLA", rows: [
        { origin: "TEPEJI IMPORTADORA", kg: 10, fecha: "2026-10-02", importe: 100 },
        { origin: "PEMEX TUXPAN", kg: 4, fecha: "2026-10-03", importe: 40 },
      ],
    }]));
    const existing = [{ id: 1, fecha: "2026-10-02", kg: 10, importe: 100, proveedor_nombre: "TOMZA TEPEJI" }, { id: 2, fecha: "2026-10-03", kg: 4, importe: 40, proveedor_nombre: "PEMEX TUXPAN" }];
    const plan = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-10-31", plantName: "Puebla", existing, documents: [], hg: [] });
    assert.equal(plan.ok, true);
    assert.equal(plan.provider_repairs, 0);
    assert.equal(plan.reconciled, 2);
    assert.equal(plan.nuevas, 0);
    assert.equal(plan.deletes, 0);
    assert.deepEqual(plan.rows.map((row) => row.proveedor), ["TOMZA TEPEJI", "PEMEX TUXPAN"]);
  });

  it("X Tehuacán conserva alias y el Excel real 01-18 si está disponible", async () => {
    const parsed = await compras.parseComprasExcelBuffer(await workbook([{
      name: "OCTUBRE", a1: "TEHUACAN", rows: [
        { origin: "TEPEJI IMPOTADORA", kg: 3, fecha: "2026-10-02", importe: 30 },
        { origin: "TUXPAN IMPOTADORA", kg: 4, fecha: "2026-10-03", importe: 40 },
      ],
    }]));
    const plan = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-10-18", plantName: "Tehuacán", existing: [], documents: [], hg: [] });
    assert.equal(plan.ok, true);
    assert.equal(plan.provider_repairs, 0);
    assert.deepEqual(plan.rows.map((row) => row.proveedor), ["TOMZA TEPEJI", "TOMZA TUXPAN"]);
    const name = preferredReal("TEHUACAN");
    if (!name) return;
    const real = await compras.parseComprasExcelBuffer(fs.readFileSync(path.join(REAL_DIR, name)));
    const realPlan = compras.planComprasExcelImport(real, { desde: "2026-10-01", hasta: "2026-10-18", plantName: "Tehuacán", existing: [], documents: [], hg: [] });
    assert.equal(realPlan.ok, true);
    assert.equal(realPlan.excel_rows, 21);
    assert.equal(realPlan.kg_excel, 395220);
    assert.ok(Math.abs(realPlan.importe_excel - 4948668.148) < 0.001);
    assert.equal(realPlan.rows.filter((row) => row.proveedor === "NOTA DE CARGO").length, 1);
  });

  it("los Excel reales de Querétaro, San Luis, Morelos e HIDROGAS cuadran si están disponibles", async () => {
    if (!fs.existsSync(REAL_DIR)) return;
    const queretaro = preferredReal("QUERETARO");
    if (queretaro) {
      const parsed = await compras.parseComprasExcelBuffer(fs.readFileSync(path.join(REAL_DIR, queretaro)));
      const plan = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-10-21", plantName: "Querétaro", existing: [], documents: [], hg: [] });
      assert.equal(plan.errors.some((e) => e.code === "UNKNOWN_ORIGIN"), false);
      assert.equal(plan.kg_excel, 470950);
      assert.equal(plan.rows.filter((row) => row.proveedor === "NOTA DE CARGO").length, 2);
    }
    const sanLuis = preferredReal("SAN LUIS");
    if (sanLuis) {
      const parsed = await compras.parseComprasExcelBuffer(fs.readFileSync(path.join(REAL_DIR, sanLuis)));
      const plan = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-10-21", plantName: "San Luis", existing: [], documents: [], hg: [] });
      assert.equal(plan.plant, "san luis");
      assert.equal(plan.errors.some((e) => e.code === "UNKNOWN_ORIGIN"), false);
      assert.equal(plan.kg_excel, 270700);
      const notes = plan.rows.filter((row) => row.proveedor === "NOTA DE CARGO");
      assert.equal(notes.length, 1);
      assert.equal(notes[0].importe, 34316.92);
    }
    const morelos = preferredReal("MORELOS");
    if (morelos) {
      const parsed = await compras.parseComprasExcelBuffer(fs.readFileSync(path.join(REAL_DIR, morelos)));
      const purchase = { id: 1001, fecha: "2026-10-06", kg: 25380, importe: 322472.15, proveedor_nombre: "PEMEX TUXPAN" };
      const plan = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-10-21", plantName: "Morelos", existing: [purchase], documents: [{ compra_id: 1001 }], hg: [] });
      assert.equal(plan.excel_rows, 29);
      assert.equal(plan.kg_excel, 705620);
      assert.equal(plan.provider_repairs, 1);
      assert.equal(plan.provider_repair_rows[0].has_document, true);
      assert.equal(plan.document_blockers, 0);
    }
    const hidro = preferredReal("HIDROGAS");
    if (hidro) {
      const parsed = await compras.parseComprasExcelBuffer(fs.readFileSync(path.join(REAL_DIR, hidro)));
      const plan = compras.planComprasExcelImport(parsed, { desde: "2026-10-01", hasta: "2026-10-17", plantName: "Acapulco", existing: [], documents: [], hg: [] });
      assert.equal(plan.ok, false);
      const mismatch = plan.errors.find((e) => e.code === "DATE_SHEET_MISMATCH");
      assert.ok(mismatch);
      assert.ok(mismatch.sheet);
      assert.ok(mismatch.row);
      assert.equal(mismatch.fecha, "2026-10-07");
      assert.equal(plan.rows.filter((row) => row.fecha === "2026-10-07").length >= 1, true);
    }
  });
});
