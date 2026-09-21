"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const compras = require("../lib/compras-dashboard");
const { buildComprasWorkbook } = require("../lib/compras-excel");
const { commitHgWrite, HG_SAVE_ERROR } = require("../frontend-dashboard/lib/compras-hg-write");

function asPgDate(value) {
  const y = value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10);
  return new Date(`${y}T00:00:00.000Z`);
}

function fechaYmd(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10);
}

class MemClient {
  constructor() {
    this.providers = [];
    this.purchases = [];
    this.docs = [];
    this.hg = [];
    this.seq = 1;
  }
  nextId() {
    return this.seq++;
  }
  async query(sql, params = []) {
    const q = String(sql).replace(/\s+/g, " ").trim().toLowerCase();
    if (q.startsWith("create ") || q.startsWith("create schema")) return { rows: [] };
    if (q.includes("from public.plantas")) return { rows: [{ nombre: "Morelos" }] };

    if (q.includes("from arr.compras_proveedores") && q.startsWith("select")) {
      if (q.includes("where id =")) return { rows: this.providers.filter((p) => p.id === Number(params[0])) };
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

    if (q.includes("from arr.compras_hg") && q.startsWith("select")) {
      const planta = Number(params[0]);
      const start = String(params[1] || "").slice(0, 10);
      const end = String(params[2] || "").slice(0, 10);
      return {
        rows: this.hg
          .filter((h) => h.planta_id === planta && fechaYmd(h.fecha) >= start && fechaYmd(h.fecha) <= end)
          .sort((a, b) => fechaYmd(a.fecha).localeCompare(fechaYmd(b.fecha))),
      };
    }
    if (q.startsWith("insert into arr.compras_hg")) {
      const plantaId = Number(params[0]);
      const fecha = asPgDate(params[1]);
      const existing = this.hg.find((h) => h.planta_id === plantaId && fechaYmd(h.fecha) === fechaYmd(fecha));
      if (existing) {
        existing.hg_kilos = Number(params[2]);
        existing.updated_by_usuario_id = params[3] ?? null;
        existing.updated_at = new Date().toISOString();
        return { rows: [existing] };
      }
      const row = {
        id: this.nextId(),
        planta_id: plantaId,
        fecha,
        hg_kilos: Number(params[2]),
        created_by_usuario_id: params[3] ?? null,
        updated_by_usuario_id: params[3] ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.hg.push(row);
      return { rows: [row] };
    }
    if (q.startsWith("delete from arr.compras_hg")) {
      const plantaId = Number(params[0]);
      const fecha = fechaYmd(params[1]);
      this.hg = this.hg.filter((h) => !(h.planta_id === plantaId && fechaYmd(h.fecha) === fecha));
      return { rows: [] };
    }

    if (q.includes("from arr.compras") && q.startsWith("select") && !q.includes("compras_documentos") && !q.includes("compras_hg")) {
      if (q.includes("where id =")) return { rows: this.purchases.filter((p) => p.id === Number(params[0])) };
      const planta = Number(params[0]);
      const start = String(params[1]).slice(0, 10);
      const end = String(params[2]).slice(0, 10);
      return {
        rows: this.purchases.filter((p) => p.planta_id === planta && fechaYmd(p.fecha) >= start && fechaYmd(p.fecha) <= end),
      };
    }
    if (q.startsWith("insert into arr.compras ")) {
      const row = {
        id: this.nextId(),
        planta_id: Number(params[0]),
        proveedor_id: Number(params[1]),
        fecha: asPgDate(params[2]),
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
    if (q.includes("from arr.compras_documentos")) return { rows: [] };
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
      const hit = routes.find((r) => r.method === method && r.path === pathname);
      if (!hit) throw new Error(`no route ${method} ${pathname}`);
      const req = { query, body, params: {}, dashboardAuth: auth };
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

function mount(db, plantasPermitidas = [1]) {
  const app = fakeApp();
  compras.registerComprasRoutes(app, {
    pool: {
      connect: async () => ({
        query: (sql, params) => db.query(sql, params),
        release() {},
      }),
    },
    dashboardAuthMiddleware: (_req, _res, next) => next(),
    assertPlantaAccess: (req, plantaId) => (req.dashboardAuth.plantas_permitidas || plantasPermitidas).includes(Number(plantaId)),
    uploadPdfToS3: async () => null,
    getBufferFromS3: async () => null,
    deleteFromS3: async () => {},
    s3Enabled: () => false,
  });
  return app;
}

describe("014 compras HG EN KILOS", () => {
  it("parseHgInput: vacío no es cero; 0 es valor explícito", () => {
    assert.equal(compras.parseHgInput({ fecha: "2026-09-01" }).empty, true);
    assert.equal(compras.parseHgInput({ fecha: "2026-09-01", hg_kilos: "" }).empty, true);
    assert.equal(compras.parseHgInput({ fecha: "2026-09-01", hg_kilos: null }).empty, true);
    const zero = compras.parseHgInput({ fecha: "2026-09-01", hg_kilos: 0 });
    assert.equal(zero.empty, false);
    assert.equal(zero.hg_kilos, 0);
    const neg = compras.parseHgInput({ fecha: "2026-09-01", hg_kilos: -787 });
    assert.equal(neg.hg_kilos, -787);
  });

  it("guardar HG positivo, negativo y cero; recargar mes los recupera", async () => {
    const db = new MemClient();
    const pos = await compras.upsertHg(db, 1, { fecha: "2026-09-01", hg_kilos: 4772 }, 8);
    const neg = await compras.upsertHg(db, 1, { fecha: "2026-09-02", hg_kilos: -787 }, 8);
    const zero = await compras.upsertHg(db, 1, { fecha: "2026-09-03", hg_kilos: 0 }, 8);
    assert.equal(pos.ok, true);
    assert.equal(pos.hg.hg_kilos, 4772);
    assert.equal(neg.hg.hg_kilos, -787);
    assert.equal(zero.hg.hg_kilos, 0);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    assert.equal(month.grid.days.find((d) => d.ymd === "2026-09-01").hg_kilos, 4772);
    assert.equal(month.grid.days.find((d) => d.ymd === "2026-09-02").hg_kilos, -787);
    assert.equal(month.grid.days.find((d) => d.ymd === "2026-09-03").hg_kilos, 0);
    assert.equal(month.grid.days.find((d) => d.ymd === "2026-09-04").hg_kilos, null);
    assert.equal(month.hg.length, 3);
  });

  it("vaciar elimina el dato y no lo convierte en 0", async () => {
    const db = new MemClient();
    await compras.upsertHg(db, 1, { fecha: "2026-09-01", hg_kilos: 4012 }, 1);
    const cleared = await compras.upsertHg(db, 1, { fecha: "2026-09-01", hg_kilos: null }, 1);
    assert.equal(cleared.deleted, true);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    assert.equal(month.grid.days.find((d) => d.ymd === "2026-09-01").hg_kilos, null);
    assert.equal(month.hg.length, 0);
    assert.notEqual(month.grid.days.find((d) => d.ymd === "2026-09-01").hg_kilos, 0);
  });

  it("actualizar valor existente no duplica fila", async () => {
    const db = new MemClient();
    await compras.upsertHg(db, 1, { fecha: "2026-09-10", hg_kilos: 100 }, 1);
    await compras.upsertHg(db, 1, { fecha: "2026-09-10", hg_kilos: 250 }, 1);
    assert.equal(db.hg.length, 1);
    assert.equal(db.hg[0].hg_kilos, 250);
  });

  it("planta A no mezcla HG con planta B; mes A no mezcla con mes B", async () => {
    const db = new MemClient();
    await compras.upsertHg(db, 1, { fecha: "2026-09-01", hg_kilos: 100 }, 1);
    await compras.upsertHg(db, 2, { fecha: "2026-09-01", hg_kilos: 999 }, 1);
    await compras.upsertHg(db, 1, { fecha: "2026-10-01", hg_kilos: 50 }, 1);
    const sep = await compras.loadMonth(db, 1, 2026, 9);
    const oct = await compras.loadMonth(db, 1, 2026, 10);
    const b = await compras.loadMonth(db, 2, 2026, 9);
    assert.equal(sep.grid.days.find((d) => d.ymd === "2026-09-01").hg_kilos, 100);
    assert.equal(oct.grid.days.find((d) => d.ymd === "2026-10-01").hg_kilos, 50);
    assert.equal(oct.grid.days.find((d) => d.ymd === "2026-10-02").hg_kilos, null);
    assert.equal(b.grid.days.find((d) => d.ymd === "2026-09-01").hg_kilos, 999);
    assert.equal(sep.hg.every((h) => h.planta_id === 1), true);
  });

  it("Semana 1, Semana 2 y TOTAL MES suman solo los días con HG", async () => {
    const db = new MemClient();
    await compras.upsertHg(db, 1, { fecha: "2026-09-01", hg_kilos: -787 }, 1);
    await compras.upsertHg(db, 1, { fecha: "2026-09-02", hg_kilos: 4772 }, 1);
    await compras.upsertHg(db, 1, { fecha: "2026-09-03", hg_kilos: 4012 }, 1);
    await compras.upsertHg(db, 1, { fecha: "2026-09-06", hg_kilos: 10 }, 1);
    await compras.upsertHg(db, 1, { fecha: "2026-09-07", hg_kilos: 20 }, 1);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    const w1 = month.grid.weeks.find((w) => w.week === 1);
    const w2 = month.grid.weeks.find((w) => w.week === 2);
    assert.deepEqual(w1.ymds, ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"]);
    assert.equal(w1.hg_kilos, -787 + 4772 + 4012);
    assert.equal(w2.hg_kilos, 30);
    assert.equal(month.grid.month.hg_kilos, -787 + 4772 + 4012 + 30);
    assert.equal(month.grid.month.consolidado.kg, 0);
  });

  it("HG no altera COMPRA KG / COSTO / IMPORTE / CONSOLIDADO", async () => {
    const db = new MemClient();
    const p = await compras.createProvider(db, 1, { nombre: "Activo" });
    await compras.createPurchase(db, 1, { proveedor_id: p.provider.id, fecha: "2026-09-02", kg: 100, importe: 950 }, 1);
    await compras.upsertHg(db, 1, { fecha: "2026-09-02", hg_kilos: 4000 }, 1);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    assert.equal(month.grid.month.consolidado.kg, 100);
    assert.equal(month.grid.month.consolidado.importe, 950);
    assert.equal(Number(month.grid.month.consolidado.costo_kg.toFixed(3)), 9.5);
    assert.equal(month.grid.days.find((d) => d.ymd === "2026-09-02").hg_kilos, 4000);
  });

  it("cross-plant rechazado en POST y DELETE HG", async () => {
    const db = new MemClient();
    const app = mount(db);
    const denied = await app.invoke("POST", "/api/compras/hg", {
      body: { planta_id: 2, fecha: "2026-09-01", hg_kilos: 10 },
      auth: { actor_id: 1, plantas_permitidas: [1] },
    });
    assert.equal(denied.status, 403);
    const del = await app.invoke("DELETE", "/api/compras/hg", {
      query: { planta_id: "2", fecha: "2026-09-01" },
      auth: { actor_id: 1, plantas_permitidas: [1] },
    });
    assert.equal(del.status, 403);
    assert.equal(db.hg.length, 0);
  });

  it("GET excel incluye HG EN KILOS a la derecha de CONSOLIDADO y conserva bloques", async () => {
    const db = new MemClient();
    await compras.upsertHg(db, 1, { fecha: "2026-09-01", hg_kilos: -787 }, 1);
    const payload = await compras.loadMonth(db, 1, 2026, 9);
    const wb = await buildComprasWorkbook(payload, { plantName: "Morelos" });
    const ws = wb.getWorksheet("CONTROL DE COMPRAS");
    assert.equal(ws.getCell(4, 14).value, "CONSOLIDADO");
    assert.equal(ws.getCell(5, 2).value, "COMPRA KG");
    assert.equal(ws.getCell(4, 18).value, "HG EN KILOS");
    assert.equal(ws.getColumn(17).width, 2.2);
    assert.equal(ws.getCell(6, 18).value, -787);
    const weekRow = [...Array(40).keys()].map((i) => i + 6).find((r) => ws.getCell(r, 1).value === "Semana 1");
    assert.ok(weekRow);
    assert.equal(ws.getCell(weekRow, 18).value, -787);
    const totRow = [...Array(50).keys()].map((i) => i + 6).find((r) => ws.getCell(r, 1).value === "TOTAL MES");
    assert.ok(totRow);
    assert.equal(ws.getCell(totRow, 18).value, -787);
  });

  it("A) HG save OK recarga y no muestra error", async () => {
    const errors = [];
    let reloaded = 0;
    const out = await commitHgWrite({
      next: 4012,
      confirmed: null,
      write: async () => {},
      reload: async () => {
        reloaded += 1;
      },
      onError: (m) => errors.push(m),
    });
    assert.equal(out.ok, true);
    assert.equal(reloaded, 1);
    assert.deepEqual(errors, [null]);
  });

  it("B) HG save falla: error visible y restaura el último valor confirmado", async () => {
    const errors = [];
    let reloaded = 0;
    const out = await commitHgWrite({
      next: 4000,
      confirmed: -787,
      write: async () => {
        throw new Error("network");
      },
      reload: async () => {
        reloaded += 1;
      },
      onError: (m) => errors.push(m),
    });
    assert.equal(out.ok, false);
    assert.equal(reloaded, 0);
    assert.equal(out.restore, -787);
    assert.deepEqual(errors, [HG_SAVE_ERROR]);
    assert.equal(HG_SAVE_ERROR, "No se pudo guardar HG.");
  });

  it("C) vacío/delete falla: error visible y vuelve el valor anterior", async () => {
    const errors = [];
    const out = await commitHgWrite({
      next: null,
      confirmed: 4772,
      write: async () => {
        throw new Error("db");
      },
      reload: async () => {},
      onError: (m) => errors.push(m),
    });
    assert.equal(out.ok, false);
    assert.equal(out.restore, 4772);
    assert.notEqual(out.restore, null);
    assert.deepEqual(errors, ["No se pudo guardar HG."]);
  });

  it("D) el fallo no se convierte en cero ni en vacío persistente", async () => {
    const fromNeg = await commitHgWrite({
      next: 10,
      confirmed: -787,
      write: async () => {
        throw new Error("fail");
      },
      reload: async () => {},
      onError: () => {},
    });
    assert.equal(fromNeg.restore, -787);
    assert.notEqual(fromNeg.restore, 0);
    assert.notEqual(fromNeg.restore, null);
    const fromZero = await commitHgWrite({
      next: null,
      confirmed: 0,
      write: async () => {
        throw new Error("fail");
      },
      reload: async () => {},
      onError: () => {},
    });
    assert.equal(fromZero.restore, 0);
  });

  it("frontend: bloque HG separado, celda editable y formato entero", () => {
    const root = path.join(__dirname, "..", "frontend-dashboard");
    const client = fs.readFileSync(path.join(root, "components", "ComprasClient.tsx"), "utf8");
    const fmt = fs.readFileSync(path.join(root, "lib", "compras-format.ts"), "utf8");
    const api = fs.readFileSync(path.join(root, "lib", "api.ts"), "utf8");
    assert.match(client, /HG EN KILOS/);
    assert.match(client, /compras-hg-gap/);
    assert.match(client, /HgDayCell/);
    assert.match(client, /upsertComprasHg/);
    assert.match(client, /commitHgWrite/);
    assert.match(client, /onError=\{setError\}/);
    assert.match(client, /formatHgKilos\(out\.restore\)/);
    assert.match(client, /persist\(null\)/);
    assert.match(client, /hg_kilos: hg/);
    assert.match(fmt, /function formatHgKilos/);
    assert.match(fmt, /maximumFractionDigits: 0/);
    assert.match(api, /\/api\/compras\/hg/);
    assert.doesNotMatch(client, /arr\.compras_hg/);
  });

  it("migración 022 crea arr.compras_hg y no toca arr.compras", () => {
    const sql = fs.readFileSync(path.join(__dirname, "..", "sql", "022_compras_hg.sql"), "utf8");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS arr\.compras_hg/);
    assert.match(sql, /UNIQUE \(planta_id, fecha\)/);
    assert.doesNotMatch(sql, /ALTER TABLE arr\.compras/);
  });
});
