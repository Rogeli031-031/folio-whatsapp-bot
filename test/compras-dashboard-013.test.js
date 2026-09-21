"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const compras = require("../lib/compras-dashboard");

function pdfBuf(extra = "ok") {
  return Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from(extra)]);
}

class MemClient {
  constructor() {
    this.providers = [];
    this.purchases = [];
    this.docs = [];
    this.seq = 1;
  }
  nextId() {
    return this.seq++;
  }
  async query(sql, params = []) {
    const q = String(sql).replace(/\s+/g, " ").trim().toLowerCase();
    if (q.startsWith("create ") || q.startsWith("create schema")) return { rows: [] };

    if (q.includes("from arr.compras_proveedores") && q.startsWith("select")) {
      if (q.includes("where id =")) {
        return { rows: this.providers.filter((p) => p.id === Number(params[0])) };
      }
      let rows = this.providers.filter((p) => p.planta_id === Number(params[0]));
      if (q.includes("activo = true")) rows = rows.filter((p) => p.activo);
      rows.sort((a, b) => a.orden - b.orden || a.id - b.id);
      return { rows };
    }
    if (q.startsWith("insert into arr.compras_proveedores")) {
      const row = {
        id: this.nextId(),
        planta_id: Number(params[0]),
        nombre: params[1],
        activo: true,
        orden: Number(params[2]) || 0,
      };
      this.providers.push(row);
      return { rows: [row] };
    }
    if (q.startsWith("update arr.compras_proveedores")) {
      const row = this.providers.find((p) => p.id === Number(params[0]));
      if (!row) return { rows: [] };
      row.nombre = params[1];
      row.activo = params[2];
      row.orden = Number(params[3]) || 0;
      return { rows: [row] };
    }

    if (q.includes("from arr.compras") && q.startsWith("select") && !q.includes("compras_documentos")) {
      if (q.includes("where id =")) {
        return { rows: this.purchases.filter((p) => p.id === Number(params[0])) };
      }
      const planta = Number(params[0]);
      const start = String(params[1]).slice(0, 10);
      const end = String(params[2]).slice(0, 10);
      return {
        rows: this.purchases
          .filter((p) => p.planta_id === planta && p.fecha >= start && p.fecha <= end)
          .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.id - b.id)),
      };
    }
    if (q.startsWith("insert into arr.compras ")) {
      const row = {
        id: this.nextId(),
        planta_id: Number(params[0]),
        proveedor_id: Number(params[1]),
        fecha: String(params[2]).slice(0, 10),
        kg: Number(params[3]),
        importe: Number(params[4]),
        created_by_usuario_id: params[5] ?? null,
        updated_by_usuario_id: params[5] ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.purchases.push(row);
      return { rows: [row] };
    }
    if (q.startsWith("update arr.compras")) {
      const row = this.purchases.find((p) => p.id === Number(params[0]));
      if (!row) return { rows: [] };
      row.proveedor_id = Number(params[1]);
      row.fecha = String(params[2]).slice(0, 10);
      row.kg = Number(params[3]);
      row.importe = Number(params[4]);
      row.updated_by_usuario_id = params[5] ?? null;
      row.updated_at = new Date().toISOString();
      return { rows: [row] };
    }
    if (q.startsWith("delete from arr.compras ")) {
      const id = Number(params[0]);
      this.docs = this.docs.filter((d) => d.compra_id !== id);
      this.purchases = this.purchases.filter((p) => p.id !== id);
      return { rows: [] };
    }

    if (q.includes("from arr.compras_documentos") && q.includes("join arr.compras")) {
      const doc = this.docs.find((d) => d.id === Number(params[0]) && d.compra_id === Number(params[1]));
      if (!doc) return { rows: [] };
      const compra = this.purchases.find((p) => p.id === doc.compra_id);
      return { rows: compra ? [{ ...doc, planta_id: compra.planta_id }] : [] };
    }
    if (q.includes("from arr.compras_documentos") && q.startsWith("select")) {
      if (Array.isArray(params[0])) {
        const ids = params[0] || [];
        return { rows: this.docs.filter((d) => ids.includes(d.compra_id)).sort((a, b) => a.id - b.id) };
      }
      return { rows: this.docs.filter((d) => d.compra_id === Number(params[0])).sort((a, b) => a.id - b.id) };
    }
    if (q.startsWith("insert into arr.compras_documentos")) {
      const row = {
        id: this.nextId(),
        compra_id: Number(params[0]),
        nombre_archivo: params[1],
        storage_key: params[2],
        mime_type: params[3],
        size_bytes: Number(params[4]),
        data: params[5],
        uploaded_by_usuario_id: params[6] ?? null,
        created_at: new Date().toISOString(),
      };
      this.docs.push(row);
      return { rows: [row] };
    }
    if (q.startsWith("delete from arr.compras_documentos")) {
      this.docs = this.docs.filter((d) => !(d.id === Number(params[0]) && d.compra_id === Number(params[1])));
      return { rows: [] };
    }
    throw new Error(`SQL no mockeado: ${sql}`);
  }
}

function fakeApp() {
  const routes = [];
  const add = (method) => (path, ...handlers) => routes.push({ method, path, handlers });
  return {
    get: add("GET"),
    post: add("POST"),
    patch: add("PATCH"),
    delete: add("DELETE"),
    async invoke(method, url, { query = {}, body = {}, auth = { actor_id: 9, plantas_permitidas: [1] } } = {}) {
      const [pathname] = url.split("?");
      const hit = routes.find((r) => r.method === method && matchPath(r.path, pathname));
      if (!hit) throw new Error(`no route ${method} ${pathname}`);
      const req = { query, body, params: extractParams(hit.path, pathname), dashboardAuth: auth };
      let status = 200;
      let payload;
      let sent;
      const res = {
        status(c) {
          status = c;
          return this;
        },
        json(p) {
          payload = p;
          return this;
        },
        send(b) {
          sent = b;
          return this;
        },
        setHeader() {},
      };
      for (const h of hit.handlers) {
        let nexted = false;
        await h(req, res, () => {
          nexted = true;
        });
        if (!nexted) break;
      }
      return { status, payload, sent };
    },
  };
}

function matchPath(pattern, pathname) {
  const a = pattern.split("/").filter(Boolean);
  const b = pathname.split("/").filter(Boolean);
  if (a.length !== b.length) return false;
  return a.every((p, i) => p.startsWith(":") || p === b[i]);
}

function extractParams(pattern, pathname) {
  const a = pattern.split("/").filter(Boolean);
  const b = pathname.split("/").filter(Boolean);
  const out = {};
  a.forEach((p, i) => {
    if (p.startsWith(":")) out[p.slice(1)] = b[i];
  });
  return out;
}

describe("013 compras — cálculos ponderados", () => {
  it("costo = importe/kg y blank si kg=0", () => {
    assert.equal(Number(compras.costKg(23500, 224778).toFixed(3)), 9.565);
    assert.equal(compras.costKg(0, 100), null);
    assert.equal(compras.costKg(null, 10), null);
  });

  it("NO suma costos: usa SUM(importe)/SUM(kg)", () => {
    const providers = [{ id: 1, nombre: "A" }];
    const purchases = [
      { id: 1, proveedor_id: 1, fecha: "2026-09-01", kg: 100, importe: 1000 },
      { id: 2, proveedor_id: 1, fecha: "2026-09-02", kg: 200, importe: 1800 },
    ];
    const grid = compras.aggregatePurchases(purchases, providers, 2026, 9);
    const week1 = grid.weeks[0];
    assert.equal(week1.providers[1].kg, 300);
    assert.equal(week1.providers[1].importe, 2800);
    assert.equal(Number(week1.providers[1].costo_kg.toFixed(3)), Number((2800 / 300).toFixed(3)));
    assert.notEqual(Number(week1.providers[1].costo_kg.toFixed(3)), Number(((10 + 9) / 2).toFixed(3)));
  });

  it("múltiples compras mismo proveedor/día se agregan en la celda", () => {
    const providers = [{ id: 7, nombre: "PEMEX" }];
    const purchases = [
      { id: 1, proveedor_id: 7, fecha: "2026-09-10", kg: 23500, importe: 224778 },
      { id: 2, proveedor_id: 7, fecha: "2026-09-10", kg: 23500, importe: 227456 },
    ];
    const grid = compras.aggregatePurchases(purchases, providers, 2026, 9);
    const day = grid.days.find((d) => d.ymd === "2026-09-10");
    assert.equal(day.cells[7].kg, 47000);
    assert.equal(day.cells[7].importe, 452234);
    assert.equal(day.cells[7].count, 2);
    assert.equal(Number(day.cells[7].costo_kg.toFixed(3)), 9.622);
    assert.equal(day.captured, true);
    assert.equal(grid.days.find((d) => d.ymd === "2026-09-11").captured, false);
  });

  it("consolidado diario suma proveedores", () => {
    const providers = [
      { id: 1, nombre: "A" },
      { id: 2, nombre: "B" },
    ];
    const purchases = [
      { id: 1, proveedor_id: 1, fecha: "2026-09-05", kg: 100, importe: 1000 },
      { id: 2, proveedor_id: 2, fecha: "2026-09-05", kg: 50, importe: 400 },
    ];
    const grid = compras.aggregatePurchases(purchases, providers, 2026, 9);
    const day = grid.days.find((d) => d.ymd === "2026-09-05");
    assert.equal(day.consolidado.kg, 150);
    assert.equal(day.consolidado.importe, 1400);
    assert.equal(Number(day.consolidado.costo_kg.toFixed(3)), Number((1400 / 150).toFixed(3)));
  });

  it("septiembre 2026 agrupa Semana 1 = 01-05 (dom-sáb)", () => {
    const rows = compras.buildMonthRows(2026, 9);
    const w1 = rows.find((r) => r.type === "week" && r.week === 1);
    assert.deepEqual(w1.ymds, ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"]);
    const w2 = rows.find((r) => r.type === "week" && r.week === 2);
    assert.equal(w2.ymds[0], "2026-09-06");
    assert.equal(w2.ymds.at(-1), "2026-09-12");
  });

  it("febrero bisiesto tiene 29 días y no bisiesto 28", () => {
    assert.equal(compras.daysInMonth(2024, 2), 29);
    assert.equal(compras.daysInMonth(2025, 2), 28);
    const leap = compras.buildMonthRows(2024, 2);
    assert.ok(leap.some((r) => r.type === "day" && r.ymd === "2024-02-29"));
    const common = compras.buildMonthRows(2025, 2);
    assert.ok(!common.some((r) => r.ymd === "2025-02-29"));
    assert.equal(common.filter((r) => r.type === "day").length, 28);
  });

  it("total mensual ponderado", () => {
    const providers = [{ id: 1, nombre: "A" }];
    const purchases = [
      { id: 1, proveedor_id: 1, fecha: "2026-09-01", kg: 10, importe: 100 },
      { id: 2, proveedor_id: 1, fecha: "2026-09-20", kg: 30, importe: 240 },
    ];
    const grid = compras.aggregatePurchases(purchases, providers, 2026, 9);
    assert.equal(grid.month.providers[1].kg, 40);
    assert.equal(grid.month.providers[1].importe, 340);
    assert.equal(Number(grid.month.providers[1].costo_kg.toFixed(3)), Number((340 / 40).toFixed(3)));
    assert.equal(grid.month.consolidado.kg, 40);
  });
});

describe("013 compras — CRUD y auth", () => {
  it("crea proveedores por planta y rechaza proveedor de otra planta", async () => {
    const db = new MemClient();
    const a = await compras.createProvider(db, 1, { nombre: "Alpha", orden: 1 });
    const b = await compras.createProvider(db, 2, { nombre: "Beta", orden: 1 });
    assert.equal(a.ok, true);
    const listed = await compras.listProviders(db, 1);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].nombre, "Alpha");
    const rejected = await compras.createPurchase(
      db,
      1,
      { proveedor_id: b.provider.id, fecha: "2026-09-10", kg: 10, importe: 100 },
      3
    );
    assert.equal(rejected.ok, false);
    assert.equal(rejected.status, 403);
    assert.equal(rejected.error, compras.USER_ERRORS.PROVIDER);
  });

  it("permite 2 compras mismo proveedor/día, edita y elimina", async () => {
    const db = new MemClient();
    const p = await compras.createProvider(db, 1, { nombre: "P1", orden: 0 });
    const c1 = await compras.createPurchase(db, 1, { proveedor_id: p.provider.id, fecha: "2026-09-10", kg: 23500, importe: 224778 }, 8);
    const c2 = await compras.createPurchase(db, 1, { proveedor_id: p.provider.id, fecha: "2026-09-10", kg: 23500, importe: 227456 }, 8);
    assert.equal(c1.ok && c2.ok, true);
    assert.notEqual(c1.purchase.id, c2.purchase.id);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    assert.equal(month.purchases.length, 2);
    const day = month.grid.days.find((d) => d.ymd === "2026-09-10");
    assert.equal(day.cells[p.provider.id].count, 2);
    const edited = await compras.patchPurchase(db, c1.purchase.id, 1, { kg: 24000, importe: 230000 }, 8);
    assert.equal(edited.ok, true);
    assert.equal(edited.purchase.kg, 24000);
    const del = await compras.deletePurchase(db, c2.purchase.id, 1);
    assert.equal(del.ok, true);
    const after = await compras.loadMonth(db, 1, 2026, 9);
    assert.equal(after.purchases.length, 1);
  });

  it("patch/delete de otra planta se rechaza", async () => {
    const db = new MemClient();
    const p = await compras.createProvider(db, 1, { nombre: "P1" });
    const c = await compras.createPurchase(db, 1, { proveedor_id: p.provider.id, fecha: "2026-09-01", kg: 1, importe: 1 }, 1);
    const patch = await compras.patchPurchase(db, c.purchase.id, 99, { kg: 2 }, 1);
    assert.equal(patch.status, 403);
    const del = await compras.deletePurchase(db, c.purchase.id, 99);
    assert.equal(del.status, 403);
  });

  it("factura PDF válida se adjunta; no-PDF se rechaza", async () => {
    const db = new MemClient();
    const p = await compras.createProvider(db, 1, { nombre: "P1" });
    const c = await compras.createPurchase(db, 1, { proveedor_id: p.provider.id, fecha: "2026-09-01", kg: 1, importe: 1 }, 1);
    const bad = await compras.attachDocument(db, c.purchase.id, 1, {
      buffer: Buffer.from("not-pdf"),
      nombre_archivo: "x.pdf",
      mime_type: "application/pdf",
    }, 1);
    assert.equal(bad.ok, false);
    assert.equal(bad.error, compras.USER_ERRORS.INVOICE);
    const ok = await compras.attachDocument(db, c.purchase.id, 1, {
      buffer: pdfBuf(),
      nombre_archivo: "factura-001.pdf",
      mime_type: "application/pdf",
      data: pdfBuf(),
    }, 1);
    assert.equal(ok.ok, true);
    const row = await compras.loadDocument(db, c.purchase.id, ok.document.id);
    assert.equal(Number(row.planta_id), 1);
  });

  it("validatePdfUpload exige magic %PDF", () => {
    assert.equal(compras.validatePdfUpload(Buffer.from("xx"), "application/pdf", "a.pdf").ok, false);
    assert.equal(compras.validatePdfUpload(pdfBuf(), "application/pdf", "a.pdf").ok, true);
    assert.equal(compras.validatePdfUpload(pdfBuf(), "image/png", "a.png").ok, false);
  });

  it("A) proveedor activo con compras entra al consolidado", async () => {
    const db = new MemClient();
    const p = await compras.createProvider(db, 1, { nombre: "Activo" });
    await compras.createPurchase(db, 1, { proveedor_id: p.provider.id, fecha: "2026-09-02", kg: 100, importe: 950 }, 1);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    assert.equal(month.providers.length, 1);
    assert.equal(month.providers[0].activo, true);
    assert.equal(month.grid.month.consolidado.kg, 100);
    assert.equal(month.grid.month.consolidado.importe, 950);
  });

  it("B) proveedor inactivo con historia sigue visible y en consolidado", async () => {
    const db = new MemClient();
    const p = await compras.createProvider(db, 1, { nombre: "Histórico" });
    await compras.createPurchase(db, 1, { proveedor_id: p.provider.id, fecha: "2026-09-03", kg: 200, importe: 1800 }, 1);
    await compras.patchProvider(db, 1, p.provider.id, { activo: false });
    const month = await compras.loadMonth(db, 1, 2026, 9);
    assert.equal(month.providers.some((x) => x.id === p.provider.id), true);
    assert.equal(month.providers.find((x) => x.id === p.provider.id).activo, false);
    assert.equal(month.grid.month.consolidado.kg, 200);
    assert.equal(month.grid.month.consolidado.importe, 1800);
    const day = month.grid.days.find((d) => d.ymd === "2026-09-03");
    assert.equal(day.cells[p.provider.id].kg, 200);
  });

  it("C) proveedor inactivo sin compras del mes se omite de la cuadrícula", async () => {
    const db = new MemClient();
    const live = await compras.createProvider(db, 1, { nombre: "Vivo" });
    const dead = await compras.createProvider(db, 1, { nombre: "Muerto" });
    await compras.createPurchase(db, 1, { proveedor_id: live.provider.id, fecha: "2026-09-01", kg: 10, importe: 90 }, 1);
    await compras.patchProvider(db, 1, dead.provider.id, { activo: false });
    const month = await compras.loadMonth(db, 1, 2026, 9);
    assert.equal(month.providers.some((x) => x.id === dead.provider.id), false);
    assert.equal(month.all_providers.some((x) => x.id === dead.provider.id), true);
  });

  it("D) proveedor inactivo no puede recibir compra nueva", async () => {
    const db = new MemClient();
    const p = await compras.createProvider(db, 1, { nombre: "Off" });
    await compras.patchProvider(db, 1, p.provider.id, { activo: false });
    const created = await compras.createPurchase(db, 1, { proveedor_id: p.provider.id, fecha: "2026-09-04", kg: 10, importe: 90 }, 1);
    assert.equal(created.ok, false);
    assert.equal(created.status, 400);
    assert.equal(created.error, compras.USER_ERRORS.INACTIVE);
  });
});

describe("013 compras — rutas HTTP", () => {
  it("GET mes y POST compra validan planta; download exige acceso", async () => {
    const db = new MemClient();
    const store = {};
    const app = fakeApp();
    compras.registerComprasRoutes(app, {
      pool: {
        async connect() {
          return {
            query: (...args) => db.query(...args),
            release() {},
          };
        },
      },
      dashboardAuthMiddleware: (req, _res, next) => next(),
      assertPlantaAccess: (req, plantaId) => (req.dashboardAuth.plantas_permitidas || []).includes(Number(plantaId)),
      uploadPdfToS3: async () => {},
      getBufferFromS3: async () => store.buf,
      s3Enabled: () => false,
    });

    const denied = await app.invoke("GET", "/api/compras", {
      query: { planta_id: "2", year: "2026", month: "9" },
      auth: { actor_id: 1, plantas_permitidas: [1] },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.payload.error, compras.USER_ERRORS.PLANT);

    const prov = await app.invoke("POST", "/api/compras/proveedores", {
      query: {},
      body: { planta_id: 1, nombre: "Local", orden: 0 },
    });
    assert.equal(prov.status, 201);

    const created = await app.invoke("POST", "/api/compras", {
      body: { planta_id: 1, proveedor_id: prov.payload.provider.id, fecha: "2026-09-10", kg: 10, importe: 95 },
    });
    assert.equal(created.status, 201);

    const factura = await app.invoke("POST", `/api/compras/${created.payload.purchase.id}/factura`, {
      body: { planta_id: 1, file_name: "f.pdf", fileBase64: pdfBuf().toString("base64") },
    });
    assert.equal(factura.status, 201);

    const forbiddenDl = await app.invoke(
      "GET",
      `/api/compras/${created.payload.purchase.id}/factura/${factura.payload.document.id}/download`,
      {
        query: { planta_id: "1" },
        auth: { actor_id: 2, plantas_permitidas: [99] },
      }
    );
    assert.equal(forbiddenDl.status, 403);

    const okDl = await app.invoke(
      "GET",
      `/api/compras/${created.payload.purchase.id}/factura/${factura.payload.document.id}/download`,
      { query: { planta_id: "1" } }
    );
    assert.equal(okDl.status, 200);
    assert.ok(Buffer.isBuffer(okDl.sent));
  });

  function mount(db, spies) {
    const app = fakeApp();
    compras.registerComprasRoutes(app, {
      pool: {
        async connect() {
          return { query: (...args) => db.query(...args), release() {} };
        },
      },
      dashboardAuthMiddleware: (req, _res, next) => next(),
      assertPlantaAccess: (req, plantaId) => (req.dashboardAuth.plantas_permitidas || []).includes(Number(plantaId)),
      uploadPdfToS3: spies.upload,
      deleteFromS3: spies.del,
      getBufferFromS3: async () => Buffer.from("%PDF"),
      s3Enabled: () => spies.s3 !== false,
    });
    return app;
  }

  it("PDF inválido / oversize / compra inexistente / otra planta no suben a S3", async () => {
    const db = new MemClient();
    const p = await compras.createProvider(db, 1, { nombre: "P1" });
    const c = await compras.createPurchase(db, 1, { proveedor_id: p.provider.id, fecha: "2026-09-01", kg: 1, importe: 1 }, 1);
    const p2 = await compras.createProvider(db, 2, { nombre: "P2" });
    const c2 = await compras.createPurchase(db, 2, { proveedor_id: p2.provider.id, fecha: "2026-09-01", kg: 1, importe: 1 }, 1);
    const calls = [];
    const spies = { upload: async () => calls.push("up"), del: async () => calls.push("del"), s3: true };
    const app = mount(db, spies);

    const invalid = await app.invoke("POST", `/api/compras/${c.purchase.id}/factura`, {
      body: { planta_id: 1, file_name: "x.pdf", fileBase64: Buffer.from("nope").toString("base64") },
    });
    assert.equal(invalid.status, 400);
    assert.equal(calls.length, 0);

    const huge = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(compras.MAX_PDF_BYTES + 1, 65)]);
    const oversize = await app.invoke("POST", `/api/compras/${c.purchase.id}/factura`, {
      body: { planta_id: 1, file_name: "big.pdf", fileBase64: huge.toString("base64") },
    });
    assert.equal(oversize.status, 400);
    assert.equal(calls.length, 0);

    const missing = await app.invoke("POST", `/api/compras/99999/factura`, {
      body: { planta_id: 1, file_name: "f.pdf", fileBase64: pdfBuf().toString("base64") },
    });
    assert.equal(missing.status, 404);
    assert.equal(calls.length, 0);

    const cross = await app.invoke("POST", `/api/compras/${c2.purchase.id}/factura`, {
      body: { planta_id: 1, file_name: "f.pdf", fileBase64: pdfBuf().toString("base64") },
      auth: { actor_id: 1, plantas_permitidas: [1] },
    });
    assert.equal(cross.status, 403);
    assert.equal(calls.length, 0);

    const ok = await app.invoke("POST", `/api/compras/${c.purchase.id}/factura`, {
      body: { planta_id: 1, file_name: "ok.pdf", fileBase64: pdfBuf().toString("base64") },
    });
    assert.equal(ok.status, 201);
    assert.deepEqual(calls, ["up"]);
  });

  it("DELETE factura con storage_key llama delete S3; BYTEA no; cross-plant no toca nada", async () => {
    const db = new MemClient();
    const p = await compras.createProvider(db, 1, { nombre: "P1" });
    const c = await compras.createPurchase(db, 1, { proveedor_id: p.provider.id, fecha: "2026-09-01", kg: 1, importe: 1 }, 1);
    const deleted = [];
    const spies = { upload: async (_b, key) => key, del: async (key) => deleted.push(key), s3: true };
    const app = mount(db, spies);
    const withKey = await app.invoke("POST", `/api/compras/${c.purchase.id}/factura`, {
      body: { planta_id: 1, file_name: "a.pdf", fileBase64: pdfBuf().toString("base64") },
    });
    assert.equal(withKey.status, 201);
    const doc = db.docs[0];
    assert.ok(doc.storage_key);

    const forbidden = await app.invoke(
      "DELETE",
      `/api/compras/${c.purchase.id}/factura/${withKey.payload.document.id}`,
      { query: { planta_id: "1" }, auth: { actor_id: 2, plantas_permitidas: [99] } }
    );
    assert.equal(forbidden.status, 403);
    assert.equal(deleted.length, 0);
    assert.equal(db.docs.length, 1);

    const okDel = await app.invoke("DELETE", `/api/compras/${c.purchase.id}/factura/${withKey.payload.document.id}`, {
      query: { planta_id: "1" },
    });
    assert.equal(okDel.status, 200);
    assert.deepEqual(deleted, [doc.storage_key]);
    assert.equal(db.docs.length, 0);

    const byteaDb = new MemClient();
    const pB = await compras.createProvider(byteaDb, 1, { nombre: "P1" });
    const cB = await compras.createPurchase(byteaDb, 1, { proveedor_id: pB.provider.id, fecha: "2026-09-01", kg: 1, importe: 1 }, 1);
    const byteaCalls = [];
    const appB = mount(byteaDb, { upload: async () => byteaCalls.push("up"), del: async () => byteaCalls.push("del"), s3: false });
    const att = await appB.invoke("POST", `/api/compras/${cB.purchase.id}/factura`, {
      body: { planta_id: 1, file_name: "b.pdf", fileBase64: pdfBuf().toString("base64") },
    });
    assert.equal(att.status, 201);
    assert.equal(byteaDb.docs[0].storage_key, null);
    const delB = await appB.invoke("DELETE", `/api/compras/${cB.purchase.id}/factura/${att.payload.document.id}`, {
      query: { planta_id: "1" },
    });
    assert.equal(delB.status, 200);
    assert.deepEqual(byteaCalls, []);
  });

  it("DELETE compra con 2 facturas elimina ambos objetos S3", async () => {
    const db = new MemClient();
    const p = await compras.createProvider(db, 1, { nombre: "P1" });
    const c = await compras.createPurchase(db, 1, { proveedor_id: p.provider.id, fecha: "2026-09-01", kg: 1, importe: 1 }, 1);
    const deleted = [];
    const app = mount(db, { upload: async (_b, key) => key, del: async (key) => deleted.push(key), s3: true });
    await app.invoke("POST", `/api/compras/${c.purchase.id}/factura`, {
      body: { planta_id: 1, file_name: "1.pdf", fileBase64: pdfBuf("a").toString("base64") },
    });
    await app.invoke("POST", `/api/compras/${c.purchase.id}/factura`, {
      body: { planta_id: 1, file_name: "2.pdf", fileBase64: pdfBuf("b").toString("base64") },
    });
    assert.equal(db.docs.length, 2);
    const keys = db.docs.map((d) => d.storage_key);
    const gone = await app.invoke("DELETE", `/api/compras/${c.purchase.id}`, { query: { planta_id: "1" } });
    assert.equal(gone.status, 200);
    assert.equal(deleted.length, 2);
    assert.deepEqual(deleted.sort(), keys.sort());
    assert.equal(db.purchases.length, 0);
    assert.equal(db.docs.length, 0);
  });
});

describe("013 compras — frontend", () => {
  const root = path.join(__dirname, "..", "frontend-dashboard");
  const client = fs.readFileSync(path.join(root, "components", "ComprasClient.tsx"), "utf8");
  const igf = fs.readFileSync(path.join(root, "components", "IgfForecastClient.tsx"), "utf8");
  const page = fs.readFileSync(path.join(root, "app", "compras", "page.tsx"), "utf8");
  const fmtSrc = fs.readFileSync(path.join(root, "lib", "compras-format.ts"), "utf8");

  it("botón Compras abre ruta propia /compras", () => {
    assert.match(igf, /comprasPageHref/);
    assert.match(igf, />\s*Compras\s*</);
    assert.match(igf, /\/compras/);
    assert.match(page, /ComprasClient/);
  });

  it("selectores planta/año/mes y fecha capturada", () => {
    assert.match(client, /selector planta/);
    assert.match(client, /selector año/);
    assert.match(client, /selector mes/);
    assert.match(client, /compras-fecha-capturada/);
    assert.match(client, /TOTAL MES/);
    assert.match(client, /Agregar compra/);
  });

  it("detalle admite múltiples compras y no edita el agregado", () => {
    assert.match(client, /purchases\.filter/);
    assert.match(client, /Guardar compra/);
    assert.doesNotMatch(client, /contentEditable/);
    assert.match(client, /no admite compras nuevas/);
  });

  it("formatos KG / costo / importe", () => {
    assert.match(fmtSrc, /maximumFractionDigits: 3/);
    assert.match(fmtSrc, /minimumFractionDigits: 2/);
    assert.match(fmtSrc, /formatCosto/);
    assert.match(client, /formatKg/);
    assert.match(client, /formatCosto/);
    assert.match(client, /formatImporte/);
  });
});
