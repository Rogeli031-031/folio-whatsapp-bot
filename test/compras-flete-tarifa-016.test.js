"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const compras = require("../lib/compras-dashboard");
const { buildComprasWorkbook } = require("../lib/compras-excel");

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
    this.fleteTarifas = [];
    this.seq = 1;
  }
  nextId() {
    return this.seq++;
  }
  async query(sql, params = []) {
    const q = String(sql).replace(/\s+/g, " ").trim().toLowerCase();
    if (q.startsWith("create ") || q.startsWith("create schema")) return { rows: [] };
    if (q.includes("from public.plantas")) return { rows: [{ nombre: "Puebla" }] };

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
      const row = {
        id: this.nextId(),
        planta_id: Number(params[0]),
        fecha: asPgDate(params[1]),
        hg_kilos: Number(params[2]),
        created_by_usuario_id: params[3] ?? null,
        updated_by_usuario_id: params[3] ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.hg.push(row);
      return { rows: [row] };
    }

    if (q.includes("from arr.compras_flete_tarifas") && q.startsWith("select")) {
      const planta = Number(params[0]);
      const year = Number(params[1]);
      const month = Number(params[2]);
      return {
        rows: this.fleteTarifas.filter((t) => t.planta_id === planta && t.year === year && t.month === month),
      };
    }
    if (q.startsWith("insert into arr.compras_flete_tarifas")) {
      const key = `${params[0]}|${params[1]}|${params[2]}|${params[3]}`;
      const existing = this.fleteTarifas.find(
        (t) => `${t.planta_id}|${t.proveedor_id}|${t.year}|${t.month}` === key
      );
      if (existing) {
        existing.tarifa = Number(params[4]);
        existing.updated_by_usuario_id = params[5] ?? null;
        existing.updated_at = new Date().toISOString();
        return { rows: [existing] };
      }
      const row = {
        id: this.nextId(),
        planta_id: Number(params[0]),
        proveedor_id: Number(params[1]),
        year: Number(params[2]),
        month: Number(params[3]),
        tarifa: Number(params[4]),
        created_by_usuario_id: params[5] ?? null,
        updated_by_usuario_id: params[5] ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.fleteTarifas.push(row);
      return { rows: [row] };
    }
    if (q.startsWith("delete from arr.compras_flete_tarifas")) {
      const planta = Number(params[0]);
      const proveedor = Number(params[1]);
      const year = Number(params[2]);
      const month = Number(params[3]);
      this.fleteTarifas = this.fleteTarifas.filter(
        (t) => !(t.planta_id === planta && t.proveedor_id === proveedor && t.year === year && t.month === month)
      );
      return { rows: [] };
    }

    if (q.includes("from arr.compras") && q.startsWith("select") && !q.includes("compras_documentos") && !q.includes("compras_hg") && !q.includes("compras_flete")) {
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
      const res = {
        status(c) {
          status = c;
          return this;
        },
        json(p) {
          payload = p;
          return this;
        },
        send() {
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
      return { status, payload };
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

function byName(month, name) {
  return month.providers.find((p) => p.nombre === name);
}

function fleteDay(month, ymd, proveedorId) {
  const day = month.grid.days.find((d) => d.ymd === ymd);
  return day.flete.providers[proveedorId] || day.flete.providers[String(proveedorId)];
}

describe("016 compras TARIFA flete", () => {
  it("A/B/C) guardar tarifas Puebla septiembre y recargar", async () => {
    const db = new MemClient();
    const month0 = await compras.loadMonth(db, 1, 2026, 9);
    const pemex = byName(month0, "PEMEX TUXPAN");
    const tepeji = byName(month0, "TOMZA TEPEJI");
    const a = await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 1.23 }, 8);
    const b = await compras.upsertFleteTarifa(db, 1, { proveedor_id: tepeji.id, year: 2026, month: 9, tarifa: 1.08 }, 8);
    assert.equal(a.ok, true);
    assert.equal(a.tarifa.tarifa, 1.23);
    assert.equal(b.tarifa.tarifa, 1.08);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    const tarifas = month.tarifas_flete;
    assert.equal(tarifas.find((t) => t.proveedor_id === pemex.id).tarifa, 1.23);
    assert.equal(tarifas.find((t) => t.proveedor_id === tepeji.id).tarifa, 1.08);
  });

  it("D) planta A no mezcla tarifa planta B", async () => {
    const db = new MemClient();
    const a = await compras.loadMonth(db, 1, 2026, 9);
    const b = await compras.loadMonth(db, 2, 2026, 9);
    const pemexA = byName(a, "PEMEX TUXPAN");
    const pemexB = byName(b, "PEMEX TUXPAN");
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemexA.id, year: 2026, month: 9, tarifa: 1.23 }, 1);
    await compras.upsertFleteTarifa(db, 2, { proveedor_id: pemexB.id, year: 2026, month: 9, tarifa: 9.99 }, 1);
    const reloadA = await compras.loadMonth(db, 1, 2026, 9);
    const reloadB = await compras.loadMonth(db, 2, 2026, 9);
    assert.equal(reloadA.tarifas_flete.find((t) => t.proveedor_id === pemexA.id).tarifa, 1.23);
    assert.equal(reloadB.tarifas_flete.find((t) => t.proveedor_id === pemexB.id).tarifa, 9.99);
    assert.equal(reloadA.tarifas_flete.some((t) => t.tarifa === 9.99), false);
  });

  it("E) septiembre no mezcla tarifa octubre", async () => {
    const db = new MemClient();
    const sep = await compras.loadMonth(db, 1, 2026, 9);
    const pemex = byName(sep, "PEMEX TUXPAN");
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 1.23 }, 1);
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 10, tarifa: 2.5 }, 1);
    const rSep = await compras.loadMonth(db, 1, 2026, 9);
    const rOct = await compras.loadMonth(db, 1, 2026, 10);
    assert.equal(rSep.tarifas_flete[0].tarifa, 1.23);
    assert.equal(rOct.tarifas_flete[0].tarifa, 2.5);
  });

  it("F) actualizar tarifa no duplica fila", async () => {
    const db = new MemClient();
    const month = await compras.loadMonth(db, 1, 2026, 9);
    const pemex = byName(month, "PEMEX TUXPAN");
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 1.23 }, 1);
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 1.5 }, 1);
    assert.equal(db.fleteTarifas.length, 1);
    assert.equal(db.fleteTarifas[0].tarifa, 1.5);
  });

  it("G) vacío elimina tarifa y no la convierte en cero", async () => {
    const db = new MemClient();
    const month = await compras.loadMonth(db, 1, 2026, 9);
    const pemex = byName(month, "PEMEX TUXPAN");
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 1.23 }, 1);
    const cleared = await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: null }, 1);
    assert.equal(cleared.deleted, true);
    const reload = await compras.loadMonth(db, 1, 2026, 9);
    assert.equal(reload.tarifas_flete.length, 0);
    assert.equal(reload.grid.days[0].flete.providers[pemex.id].tarifa, null);
    assert.notEqual(reload.grid.days[0].flete.providers[pemex.id].tarifa, 0);
  });

  it("H) cross-plant rechazado", async () => {
    const db = new MemClient();
    const app = mount(db, [1]);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    const pemex = byName(month, "PEMEX TUXPAN");
    const res = await app.invoke("POST", "/api/compras/flete-tarifa", {
      body: { planta_id: 2, proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 1.23 },
      auth: { actor_id: 1, plantas_permitidas: [1] },
    });
    assert.equal(res.status, 403);
  });

  it("I) proveedor ajeno a planta rechazado", async () => {
    const db = new MemClient();
    await compras.loadMonth(db, 1, 2026, 9);
    const other = await compras.loadMonth(db, 2, 2026, 9);
    const pemexB = byName(other, "PEMEX TUXPAN");
    const out = await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemexB.id, year: 2026, month: 9, tarifa: 1.23 }, 1);
    assert.equal(out.ok, false);
    assert.equal(out.status, 403);
  });

  it("J/K/L/M) KG reutiliza compra; importe = kg×tarifa; consolidado ponderado", async () => {
    const db = new MemClient();
    const month0 = await compras.loadMonth(db, 1, 2026, 9);
    const pemex = byName(month0, "PEMEX TUXPAN");
    const tepeji = byName(month0, "TOMZA TEPEJI");
    await compras.createPurchase(db, 1, { proveedor_id: pemex.id, fecha: "2026-09-01", kg: 19330, importe: 100 }, 1);
    await compras.createPurchase(db, 1, { proveedor_id: tepeji.id, fecha: "2026-09-01", kg: 22860, importe: 200 }, 1);
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 1.23 }, 1);
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: tepeji.id, year: 2026, month: 9, tarifa: 1.08 }, 1);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    const day = month.grid.days.find((d) => d.ymd === "2026-09-01");
    const fp = fleteDay(month, "2026-09-01", pemex.id);
    const ft = fleteDay(month, "2026-09-01", tepeji.id);
    assert.equal(fp.kg, day.cells[pemex.id].kg);
    assert.equal(fp.kg, 19330);
    assert.equal(fp.importe, compras.freightImporte(19330, 1.23));
    assert.equal(fp.importe, 23775.9);
    assert.equal(ft.importe, compras.freightImporte(22860, 1.08));
    const cons = day.flete.consolidado;
    assert.equal(cons.kg, 19330 + 22860);
    assert.equal(cons.importe, Math.round((fp.importe + ft.importe) * 100) / 100);
    assert.equal(cons.tarifa, cons.importe / cons.kg);
    assert.notEqual(cons.tarifa, (1.23 + 1.08) / 2);
  });

  it("N) KG total 0: tarifa consolidada vacía, sin división por cero", async () => {
    const db = new MemClient();
    const month0 = await compras.loadMonth(db, 1, 2026, 9);
    const pemex = byName(month0, "PEMEX TUXPAN");
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 1.23 }, 1);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    const day = month.grid.days.find((d) => d.ymd === "2026-09-02");
    assert.equal(day.flete.consolidado.kg, 0);
    assert.equal(day.flete.consolidado.tarifa, null);
    assert.equal(day.flete.providers[pemex.id].tarifa, 1.23);
    assert.equal(day.flete.providers[pemex.id].importe, 0);
  });

  it("O/P) semana y total mes ponderados", async () => {
    const db = new MemClient();
    const month0 = await compras.loadMonth(db, 1, 2026, 9);
    const pemex = byName(month0, "PEMEX TUXPAN");
    await compras.createPurchase(db, 1, { proveedor_id: pemex.id, fecha: "2026-09-01", kg: 100, importe: 10 }, 1);
    await compras.createPurchase(db, 1, { proveedor_id: pemex.id, fecha: "2026-09-02", kg: 50, importe: 5 }, 1);
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 2 }, 1);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    const week = month.grid.weeks[0];
    const wf = week.flete.providers[pemex.id];
    assert.equal(wf.kg, 150);
    assert.equal(wf.importe, 300);
    assert.equal(wf.tarifa, 2);
    assert.equal(month.grid.month.flete.providers[pemex.id].kg, 150);
    assert.equal(month.grid.month.flete.consolidado.importe, 300);
    assert.equal(month.grid.month.flete.consolidado.tarifa, 2);
  });

  it("Q) proveedor adicional aparece dinámicamente", async () => {
    const db = new MemClient();
    await compras.loadMonth(db, 1, 2026, 9);
    const extra = await compras.createProvider(db, 1, { nombre: "GAS EXTRA", orden: 9 });
    await compras.createPurchase(db, 1, { proveedor_id: extra.provider.id, fecha: "2026-09-03", kg: 10, importe: 1 }, 1);
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: extra.provider.id, year: 2026, month: 9, tarifa: 3.5 }, 1);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    assert.ok(month.providers.some((p) => p.nombre === "GAS EXTRA"));
    assert.equal(fleteDay(month, "2026-09-03", extra.provider.id).importe, 35);
  });

  it("R/S) HG y compras existentes no cambian", async () => {
    const db = new MemClient();
    const month0 = await compras.loadMonth(db, 1, 2026, 9);
    const pemex = byName(month0, "PEMEX TUXPAN");
    await compras.createPurchase(db, 1, { proveedor_id: pemex.id, fecha: "2026-09-01", kg: 20, importe: 40 }, 1);
    await compras.upsertHg(db, 1, { fecha: "2026-09-01", hg_kilos: 4012 }, 1);
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 1.23 }, 1);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    const day = month.grid.days.find((d) => d.ymd === "2026-09-01");
    assert.equal(day.hg_kilos, 4012);
    assert.equal(day.cells[pemex.id].kg, 20);
    assert.equal(day.cells[pemex.id].importe, 40);
    assert.equal(day.cells[pemex.id].costo_kg, 2);
    assert.equal(day.consolidado.kg, 20);
    assert.equal(day.flete.providers[pemex.id].importe, 24.6);
    assert.notEqual(day.cells[pemex.id].costo_kg, 1.23);
  });

  it("T/U) Excel incluye VALOR DEL FLETE y no produce #DIV/0!", async () => {
    const db = new MemClient();
    const month0 = await compras.loadMonth(db, 1, 2026, 9);
    const pemex = byName(month0, "PEMEX TUXPAN");
    await compras.createPurchase(db, 1, { proveedor_id: pemex.id, fecha: "2026-09-01", kg: 19330, importe: 100 }, 1);
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 1.23 }, 1);
    const payload = await compras.loadMonth(db, 1, 2026, 9);
    const wb = await buildComprasWorkbook(payload, { plantName: "Puebla" });
    const ws = wb.getWorksheet("CONTROL DE COMPRAS");
    assert.equal(ws.getCell(4, 14).value, "CONSOLIDADO");
    assert.equal(ws.getCell(4, 18).value, "HG EN KILOS");
    let banner = null;
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        if (String(cell.value || "") === "VALOR DEL FLETE SEGÚN ORIGEN") banner = cell.value;
      });
    });
    assert.equal(banner, "VALOR DEL FLETE SEGÚN ORIGEN");
    let div0 = false;
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const v = String(cell.value == null ? "" : cell.value);
        if (v.includes("#DIV/0")) div0 = true;
      });
    });
    assert.equal(div0, false);
    assert.match(String(ws.getCell(3, 2).value || ""), /TARIFA/);
  });

  it("frontend: cuadro TARIFA, tabla flete y helper de guardado", () => {
    const root = path.join(__dirname, "..", "frontend-dashboard");
    const client = fs.readFileSync(path.join(root, "components", "ComprasClient.tsx"), "utf8");
    const fmt = fs.readFileSync(path.join(root, "lib", "compras-format.ts"), "utf8");
    const api = fs.readFileSync(path.join(root, "lib", "api.ts"), "utf8");
    assert.match(client, /TARIFA/);
    assert.match(client, /VALOR DEL FLETE SEGÚN ORIGEN/);
    assert.match(client, /TarifaCell/);
    assert.match(client, /FleteRowCells/);
    assert.match(client, /upsertComprasFleteTarifa/);
    assert.match(client, /HG EN KILOS/);
    assert.match(fmt, /function formatTarifa/);
    assert.match(api, /\/api\/compras\/flete-tarifa/);
    const sql = fs.readFileSync(path.join(__dirname, "..", "sql", "023_compras_flete_tarifas.sql"), "utf8");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS arr\.compras_flete_tarifas/);
    assert.match(sql, /UNIQUE \(planta_id, proveedor_id, year, month\)/);
    assert.doesNotMatch(sql, /ALTER TABLE arr\.compras /);
    assert.doesNotMatch(sql, /ALTER TABLE arr\.compras_hg/);
  });
});
