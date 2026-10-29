"use strict";

const { before, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.join(__dirname, "..");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "ComprasClient.tsx"), "utf8");
const HELPER = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "compras-participation.ts"), "utf8");
const DASH = fs.readFileSync(path.join(ROOT, "lib", "compras-dashboard.js"), "utf8");
const EXCEL = fs.readFileSync(path.join(ROOT, "lib", "compras-excel.js"), "utf8");

const PEMEX = { id: 1, nombre: "PEMEX TUXPAN" };
const TOMZA_TUXPAN = { id: 2, nombre: "TOMZA TUXPAN" };
const TOMZA_TEPEJI = { id: 3, nombre: "TOMZA TEPEJI" };
const NOTA = { id: 9, nombre: "NOTA DE CARGO" };
const OTRO = { id: 4, nombre: "GAS DEL NORTE" };

function bag(entries) {
  const out = {};
  for (const [id, kg] of entries) out[String(id)] = { kg };
  return out;
}

function productColSpan() {
  const match = CLIENT.match(/export function comprasGridColSpan[\s\S]*?\n\}/);
  assert.ok(match, "comprasGridColSpan ausente");
  const js = match[0].replace(/: number/g, "").replace(/: boolean/g, "").replace(/^export /m, "");
  return new Function(`${js}; return comprasGridColSpan;`)();
}

function legacyColSpan(providerCount, fleteExpanded) {
  const n = Number.isFinite(providerCount) && providerCount > 0 ? Math.floor(providerCount) : 0;
  const fecha = 1;
  const compras = n * 3 + n;
  const notaCargo = 1;
  const consolidado = 3;
  const sepHg = 1;
  const hg = 3;
  const sepFlete = 1;
  const flete = fleteExpanded ? n * 3 + n + 3 : 0;
  return fecha + compras + notaCargo + consolidado + sepHg + hg + sepFlete + flete;
}

describe("IMPL-COMPRAS-PARTICIPACION-TUXPAN-TEPEJI-089", () => {
  let participation;

  before(async () => {
    participation = await import(pathToFileURL(path.join(ROOT, "frontend-dashboard", "lib", "compras-participation.ts")).href);
    assert.equal(typeof participation.comprasParticipation, "function");
  });

  it("A/B/C PEMEX y TOMZA TUXPAN se suman; TEPEJI es solo TOMZA TEPEJI contra consolidado", () => {
    const result = participation.comprasParticipation(
      [PEMEX, TOMZA_TUXPAN, TOMZA_TEPEJI],
      bag([[1, 70720], [2, 0], [3, 25870]]),
      96590
    );
    assert.equal(result.tuxpan.kg, 70720);
    assert.equal(result.tepeji.kg, 25870);
    assert.equal(participation.formatParticipationPct(result.tuxpan.pct), "73.22%");
    assert.equal(participation.formatParticipationPct(result.tepeji.pct), "26.78%");
    assert.equal((result.tuxpan.pct + result.tepeji.pct).toFixed(2), "100.00");
  });

  it("D/E/F Nota de Cargo y otros proveedores quedan fuera del numerador y dentro del denominador", () => {
    const result = participation.comprasParticipation(
      [PEMEX, TOMZA_TEPEJI, NOTA, OTRO],
      bag([[1, 50], [3, 30], [9, 999], [4, 20]]),
      100
    );
    assert.equal(result.tuxpan.kg, 50);
    assert.equal(result.tepeji.kg, 30);
    assert.equal(participation.formatParticipationPct(result.tuxpan.pct), "50.00%");
    assert.equal(participation.formatParticipationPct(result.tepeji.pct), "30.00%");
    assert.notEqual(result.tuxpan.pct, 62.5);
    assert.notEqual(result.tepeji.pct, 37.5);
  });

  it("G total 0 deja el porcentaje en null", () => {
    const result = participation.comprasParticipation([PEMEX], bag([[1, 0]]), 0);
    assert.equal(result.tuxpan.pct, null);
    assert.equal(result.tuxpan.kg, 0);
    assert.equal(participation.formatParticipationPct(result.tuxpan.pct), "—");
    assert.equal(result.tuxpan.kg, 0);
    assert.equal(participation.comprasParticipation([PEMEX], bag([[1, 10]]), -5).tuxpan.pct, null);
  });

  it("H proveedor ausente aporta 0", () => {
    const result = participation.comprasParticipation([PEMEX], bag([[1, 40]]), 40);
    assert.equal(result.tepeji.kg, 0);
    assert.equal(result.tepeji.pct, 0);
    assert.equal(participation.formatParticipationPct(result.tepeji.pct), "0.00%");
    assert.equal(result.tepeji.kg, 0);
  });

  it("I/J normaliza caso, acento y espacio, y no acepta un nombre parecido", () => {
    const result = participation.comprasParticipation(
      [
        { id: 1, nombre: "  pemex   túxpan " },
        { id: 2, nombre: "Tomza   Tuxpan" },
        { id: 3, nombre: "tómza tepejí" },
        { id: 8, nombre: "PEMEX TUXPAN NORTE" },
        { id: 7, nombre: "TUXPAN" },
      ],
      bag([[1, 10], [2, 5], [3, 7], [8, 100], [7, 50]]),
      22
    );
    assert.equal(result.tuxpan.kg, 15);
    assert.equal(result.tepeji.kg, 7);
    assert.equal(participation.normalizeParticipationName("  nota   de   cáRGO "), "NOTA DE CARGO");
  });

  it("K/L la semana usa sus kilos y el mes no promedia porcentajes", () => {
    const providers = [PEMEX, TOMZA_TEPEJI];
    const week1 = participation.comprasParticipation(providers, bag([[1, 90], [3, 10]]), 100);
    const week2 = participation.comprasParticipation(providers, bag([[1, 0], [3, 10]]), 10);
    const month = participation.comprasParticipation(providers, bag([[1, 90], [3, 20]]), 110);
    const average = (week1.tuxpan.pct + week2.tuxpan.pct) / 2;
    assert.equal(week1.tuxpan.kg, 90);
    assert.equal(week2.tuxpan.kg, 0);
    assert.equal(month.tuxpan.kg, 90);
    assert.notEqual(month.tuxpan.pct, average);
    assert.equal(participation.formatParticipationPct(month.tuxpan.pct), "81.82%");
  });

  it("M colSpan suma exactamente 2 con flete cerrado y abierto", () => {
    const span = productColSpan();
    for (const expanded of [false, true]) {
      assert.equal(span(0, expanded), legacyColSpan(0, expanded) + 2);
      assert.equal(span(3, expanded), legacyColSpan(3, expanded) + 2);
    }
    assert.match(CLIENT, /const participacion = 2;/);
    assert.match(CLIENT, /compras-week-gap[\s\S]*colSpan=\{comprasGridColSpan\(providers\.length, fleteExpanded\)\}/);
  });

  it("N/O/P días vacíos, semanas y TOTAL MES muestran la participación", () => {
    const day = CLIENT.slice(CLIENT.indexOf('if (row.type === "day")'), CLIENT.indexOf("const week = weekByNum"));
    const week = CLIENT.slice(CLIENT.indexOf("Semana {row.week}"), CLIENT.indexOf("compras-week-gap"));
    const total = CLIENT.slice(CLIENT.indexOf(">TOTAL MES<"), CLIENT.indexOf("Haz clic en las celdas"));
    assert.equal((day.match(/<PurchaseParticipationBlank \/>/g) || []).length, 2);
    assert.equal(day.includes("PurchaseParticipationCells"), false);
    assert.match(day, /HgDerivedCells[\s\S]*PurchaseParticipationBlank \/>[\s\S]*compras-flete-gap/);
    assert.match(week, /PurchaseParticipationCells[\s\S]*bag=\{week\?\.providers\}[\s\S]*consolidatedKg=\{week\?\.consolidado\?\.kg\}/);
    assert.match(total, /PurchaseParticipationCells[\s\S]*bag=\{data\.grid\.month\.providers\}[\s\S]*consolidatedKg=\{data\.grid\.month\.consolidado\?\.kg\}/);
    assert.match(CLIENT, /const participation = comprasParticipation\(providers, bag, consolidatedKg\);/);
  });

  it("Q/S TUXPAN y TEPEJI quedan entre HG y el flete, con el porcentaje más grande", () => {
    const header = CLIENT.slice(CLIENT.indexOf("compras-hg-title"), CLIENT.indexOf("VALOR DEL FLETE SEGÚN ORIGEN"));
    assert.match(header, /HG[\s\S]*TUXPAN[\s\S]*TEPEJI[\s\S]*compras-flete-gap[\s\S]*fleteExpanded/);
    const cell = CLIENT.slice(CLIENT.indexOf("function PurchaseParticipationCell"), CLIENT.indexOf("function PurchaseParticipationCells"));
    const pctAt = cell.indexOf("text-[16px] font-bold");
    const kgAt = cell.indexOf("text-[11px] font-medium");
    assert.ok(pctAt >= 0 && kgAt > pctAt);
    assert.match(cell, /formatParticipationPct\(pct\)/);
    assert.match(cell, /formatKg\(kg, true\)\} kg/);
    assert.match(CLIENT, /className="overflow-x-auto bg-white text-slate-900 shadow"/);
  });

  it("R el porcentaje visible usa dos decimales y los kilos el formato de compras", async () => {
    const fmt = await import(pathToFileURL(path.join(ROOT, "frontend-dashboard", "lib", "compras-format.ts")).href);
    assert.equal(participation.formatParticipationPct(51.126), "51.13%");
    assert.equal(`${fmt.formatKg(449820, true)} kg`, "449,820 kg");
    assert.equal(`${fmt.formatKg(0, true)} kg`, "0 kg");
    assert.match(CLIENT, /\$\{formatKg\(kg, true\)\} kg/);
    assert.match(HELPER, /toFixed\(2\)/);
    assert.match(HELPER, /PEMEX TUXPAN/);
    assert.match(HELPER, /TOMZA TUXPAN/);
    assert.match(HELPER, /TOMZA TEPEJI/);
  });

  it("T no toca backend, Excel ni la fórmula de compras", () => {
    assert.equal(DASH.includes("comprasParticipation"), false);
    assert.equal(EXCEL.includes("comprasParticipation"), false);
    assert.equal(HELPER.includes("arr.compras"), false);
    assert.doesNotMatch(HELPER, /\b(INSERT|UPDATE|DELETE|query)\b/);
    assert.equal(CLIENT.includes("lib/compras-dashboard"), false);
  });
});
