"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const compras = require("../lib/compras-dashboard");
const { buildComprasWorkbook } = require("../lib/compras-excel");

const ROOT = path.join(__dirname, "..");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "ComprasClient.tsx"), "utf8");
const FMT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "compras-format.ts"), "utf8");
const EXCEL = fs.readFileSync(path.join(ROOT, "lib", "compras-excel.js"), "utf8");

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
      };
      const prev = this.hg.find((h) => h.planta_id === row.planta_id && fechaYmd(h.fecha) === fechaYmd(row.fecha));
      if (prev) {
        prev.hg_kilos = row.hg_kilos;
        return { rows: [prev] };
      }
      this.hg.push(row);
      return { rows: [row] };
    }
    if (q.startsWith("delete from arr.compras_hg")) {
      this.hg = this.hg.filter(
        (h) => !(h.planta_id === Number(params[0]) && fechaYmd(h.fecha) === String(params[1]).slice(0, 10))
      );
      return { rows: [] };
    }
    if (q.includes("from arr.compras_flete_tarifas") && q.startsWith("select")) {
      return { rows: this.fleteTarifas.filter((t) => t.planta_id === Number(params[0]) && t.year === Number(params[1]) && t.month === Number(params[2])) };
    }
    if (q.startsWith("insert into arr.compras_flete_tarifas")) {
      const row = {
        id: this.nextId(),
        planta_id: Number(params[0]),
        proveedor_id: Number(params[1]),
        year: Number(params[2]),
        month: Number(params[3]),
        tarifa: Number(params[4]),
      };
      const prev = this.fleteTarifas.find(
        (t) => t.planta_id === row.planta_id && t.proveedor_id === row.proveedor_id && t.year === row.year && t.month === row.month
      );
      if (prev) {
        prev.tarifa = row.tarifa;
        return { rows: [prev] };
      }
      this.fleteTarifas.push(row);
      return { rows: [row] };
    }
    if (q.includes("from arr.compras") && q.startsWith("select") && !q.includes("compras_")) {
      return {
        rows: this.purchases.filter(
          (p) => p.planta_id === Number(params[0]) && fechaYmd(p.fecha) >= String(params[1]).slice(0, 10) && fechaYmd(p.fecha) <= String(params[2]).slice(0, 10)
        ),
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
      };
      this.purchases.push(row);
      return { rows: [row] };
    }
    if (q.includes("from arr.compras_documentos")) return { rows: [] };
    return { rows: [] };
  }
}

function byName(month, name) {
  return month.providers.find((p) => p.nombre === name);
}

describe("IMPL-COMPRAS-HG-COSTO-IMPORTE-020 layout y encabezados", () => {
  it("A) columnas sobrantes w-3 intermedias ya no existen", () => {
    assert.doesNotMatch(CLIENT, /i > 0 \? <th className="w-3/);
    assert.doesNotMatch(CLIENT, /i > 0 \? <td className="w-3/);
    assert.doesNotMatch(CLIENT, /<th className="w-3 border-0 bg-white p-0" \/>\s*<th colSpan=\{3\}[^>]*>\s*CONSOLIDADO/);
  });

  it("B) CONSOLIDADO flete tiene COMPRA KG / TARIFA / IMPORTE", () => {
    assert.match(CLIENT, /function FleteMetricHeads/);
    assert.match(CLIENT, /CONSOLIDADO[\s\S]*FleteMetricHeads/);
    const heads = CLIENT.slice(CLIENT.indexOf("function FleteMetricHeads"), CLIENT.indexOf("function tarifaOf"));
    assert.match(heads, /COMPRA KG/);
    assert.match(heads, /TARIFA/);
    assert.match(heads, /IMPORTE/);
  });

  it("C) HG tiene COSTO / HG EN KILOS / IMPORTE", () => {
    assert.match(CLIENT, /function HgMetricHeads/);
    assert.match(CLIENT, /function HgDerivedCells/);
    const heads = CLIENT.slice(CLIENT.indexOf("function HgMetricHeads"), CLIENT.indexOf("function HgDerivedCells"));
    assert.match(heads, />\s*COSTO\s*</);
    assert.match(heads, /HG EN KILOS/);
    assert.match(heads, />\s*IMPORTE\s*</);
  });

  it("D) HG diario editable y gris", () => {
    assert.match(CLIENT, /bg-\[#d9d9d9\]/);
    assert.match(CLIENT, /aria-label=\{`HG EN KILOS \$\{fecha\}`\}/);
    assert.match(CLIENT, /upsertComprasHg/);
  });
});

describe("IMPL-COMPRAS-HG-COSTO-IMPORTE-020 fórmulas", () => {
  it("E/F) COSTO = costo kg consolidado + tarifa flete", () => {
    assert.equal(compras.hgCosto(11.095, 1.23), 12.325);
    assert.match(FMT, /function hgCosto/);
  });

  it("G) tarifa null → costo null", () => {
    assert.equal(compras.hgCosto(11.095, null), null);
  });

  it("H) tarifa 0 explícita → costo válido", () => {
    assert.equal(compras.hgCosto(11.095, 0), 11.095);
  });

  it("I) HG -100 + costo 12 → importe +1200", () => {
    assert.equal(compras.hgImporte(12, -100), 1200);
  });

  it("J) HG +100 + costo 12 → importe -1200", () => {
    assert.equal(compras.hgImporte(12, 100), -1200);
  });

  it("K) HG 0 → importe 0", () => {
    assert.equal(compras.hgImporte(12, 0), 0);
  });

  it("L) HG null → importe null", () => {
    assert.equal(compras.hgImporte(12, null), null);
  });

  it("M) costo null + HG → importe null", () => {
    assert.equal(compras.hgImporte(null, 100), null);
  });
});

describe("IMPL-COMPRAS-HG-COSTO-IMPORTE-020 semana y mes", () => {
  it("N–R) rollup HG, costo ponderado e importe suma diaria", async () => {
    const db = new MemClient();
    const month0 = await compras.loadMonth(db, 1, 2026, 9);
    const pemex = byName(month0, "PEMEX TUXPAN");
    await compras.createPurchase(db, 1, { proveedor_id: pemex.id, fecha: "2026-09-01", kg: 1000, importe: 11095 }, 1);
    await compras.createPurchase(db, 1, { proveedor_id: pemex.id, fecha: "2026-09-02", kg: 1000, importe: 20000 }, 1);
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 1.23 }, 1);
    await compras.upsertHg(db, 1, { fecha: "2026-09-01", hg_kilos: -100 }, 1);
    await compras.upsertHg(db, 1, { fecha: "2026-09-02", hg_kilos: 50 }, 1);
    const month = await compras.loadMonth(db, 1, 2026, 9);
    const d1 = month.grid.days.find((d) => d.ymd === "2026-09-01");
    const d2 = month.grid.days.find((d) => d.ymd === "2026-09-02");
    const c1 = compras.hgCosto(d1.consolidado.costo_kg, d1.flete.consolidado.tarifa);
    const c2 = compras.hgCosto(d2.consolidado.costo_kg, d2.flete.consolidado.tarifa);
    assert.equal(c1, 12.325);
    assert.equal(compras.hgImporte(c1, -100), 1232.5);
    assert.ok(c2 != null && c2 !== c1);
    assert.equal(compras.hgImporte(c2, 50), compras.hgImporte(c2, 50));
    const week = month.grid.weeks.find((w) => (w.ymds || []).includes("2026-09-01"));
    assert.equal(week.hg_kilos, -50);
    const weekImp = compras.hgImporteSum([d1, d2]);
    assert.equal(weekImp, 1232.5 + compras.hgImporte(c2, 50));
    const weekCosto = compras.hgCosto(week.consolidado.costo_kg, week.flete.consolidado.tarifa);
    assert.notEqual(weekImp, compras.hgImporte(weekCosto, week.hg_kilos));
    assert.equal(compras.hgImporteSum(month.grid.days), weekImp);
    const monthCosto = compras.hgCosto(month.grid.month.consolidado.costo_kg, month.grid.month.flete.consolidado.tarifa);
    assert.ok(monthCosto != null);
    const incomplete = compras.hgImporteSum([
      { hg_kilos: 10, consolidado: { costo_kg: 11 }, flete: { consolidado: { tarifa: null } } },
    ]);
    assert.equal(incomplete, null);
  });
});

describe("IMPL-COMPRAS-HG-COSTO-IMPORTE-020 Excel y no persistencia", () => {
  it("S–U) Excel bloque HG, fórmulas y sin errores", async () => {
    const db = new MemClient();
    const month0 = await compras.loadMonth(db, 1, 2026, 9);
    const pemex = byName(month0, "PEMEX TUXPAN");
    await compras.createPurchase(db, 1, { proveedor_id: pemex.id, fecha: "2026-09-01", kg: 1000, importe: 11095 }, 1);
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 1.23 }, 1);
    await compras.upsertHg(db, 1, { fecha: "2026-09-01", hg_kilos: -100 }, 1);
    const payload = await compras.loadMonth(db, 1, 2026, 9);
    const wb = await buildComprasWorkbook(payload, { plantName: "Puebla" });
    const ws = wb.getWorksheet("CONTROL DE COMPRAS");
    assert.equal(ws.getCell(4, 18).value, "HG EN KILOS");
    assert.equal(ws.getCell(5, 18).value, "COSTO");
    assert.equal(ws.getCell(5, 19).value, "HG EN KILOS");
    assert.equal(ws.getCell(5, 20).value, "IMPORTE");
    assert.equal(ws.getCell(6, 19).value, -100);
    const costoF = ws.getCell(6, 18).value;
    assert.ok(costoF && String(costoF.formula || "").includes("+"));
    const impF = ws.getCell(6, 20).value;
    assert.match(String(impF.formula || ""), /\*-1/);
    let fleteCons = null;
    for (let c = 19; c <= 80; c += 1) {
      if (ws.getCell(4, c).value === "CONSOLIDADO" && ws.getCell(5, c + 1).value === "TARIFA") fleteCons = c;
    }
    assert.ok(fleteCons);
    assert.equal(ws.getCell(5, fleteCons).value, "COMPRA KG");
    assert.equal(ws.getCell(5, fleteCons + 1).value, "TARIFA");
    assert.equal(ws.getCell(5, fleteCons + 2).value, "IMPORTE");
    let bad = false;
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const v = String(cell.value == null ? "" : cell.value.formula || cell.value);
        if (/#DIV\/0|#REF|#VALUE/.test(v)) bad = true;
      });
    });
    assert.equal(bad, false);
    assert.match(EXCEL, /writeHgBlock/);
    assert.doesNotMatch(EXCEL, /hg_costo|hg_importe/);
  });

  it("no persiste derivados", () => {
    assert.doesNotMatch(CLIENT, /upsertComprasHgCosto|hg_costo|hg_importe/);
    const dash = fs.readFileSync(path.join(ROOT, "lib", "compras-dashboard.js"), "utf8");
    assert.doesNotMatch(dash, /INSERT INTO arr\.compras_hg_costo/);
  });
});
