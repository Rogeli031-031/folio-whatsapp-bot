"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const compras = require("../lib/compras-dashboard");

const ROOT = path.join(__dirname, "..");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "ComprasClient.tsx"), "utf8");
const FMT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "compras-format.ts"), "utf8");

function comprasGridColSpan(providerCount, fleteExpanded) {
  const n = Number.isFinite(providerCount) && providerCount > 0 ? Math.floor(providerCount) : 0;
  return 1 + n * 3 + 3 + 1 + 3 + 1 + (fleteExpanded ? n * 3 + 3 : 0);
}

function fleteToggleBlock() {
  const idx = CLIENT.indexOf("aria-expanded={fleteExpanded}");
  assert.ok(idx >= 0, "toggle de flete ausente");
  return CLIENT.slice(idx, idx + 500);
}

describe("IMPL-COMPRAS-FLETE-COLLAPSE-021 default y toggle", () => {
  it("A) default fleteExpanded = false", () => {
    assert.match(CLIENT, /const \[fleteExpanded, setFleteExpanded\] = useState\(false\);/);
  });

  it("B) por default no se renderiza VALOR DEL FLETE SEGÚN ORIGEN", () => {
    assert.match(CLIENT, /fleteExpanded && \(\s*<th[\s\S]*VALOR DEL FLETE SEGÚN ORIGEN/);
    assert.doesNotMatch(CLIENT, /<th[\s\S]*VALOR DEL FLETE SEGÚN ORIGEN[\s\S]*<\/th>\s*\{fleteExpanded/);
  });

  it("C) por default no se renderizan columnas de proveedores de flete", () => {
    assert.match(CLIENT, /fleteExpanded &&\s*providers\.map\(\(p\) => \(\s*<Fragment[\s\S]*compras-flete-origin/);
    assert.match(CLIENT, /fleteExpanded && <FleteRowCells/);
    assert.equal((CLIENT.match(/fleteExpanded && <FleteRowCells/g) || []).length, 3);
  });

  it("D) MOSTRAR FLETE renderiza el bloque completo", () => {
    const toggle = fleteToggleBlock();
    assert.match(toggle, /▶ MOSTRAR FLETE/);
    assert.match(CLIENT, /fleteExpanded && \(\s*<th[\s\S]*VALOR DEL FLETE SEGÚN ORIGEN/);
    assert.match(CLIENT, /fleteExpanded && <FleteMetricHeads/);
    assert.match(CLIENT, /fleteExpanded && <FleteRowCells/);
  });

  it("E) OCULTAR FLETE retira el bloque", () => {
    const toggle = fleteToggleBlock();
    assert.match(toggle, /▼ OCULTAR FLETE/);
    assert.match(toggle, /onClick=\{\(\) => setFleteExpanded\(\(v\) => !v\)\}/);
  });

  it("F) HG permanece visible siempre", () => {
    assert.match(CLIENT, /className="compras-hg-title[\s\S]*>\s*HG\s*</);
    assert.doesNotMatch(CLIENT, /fleteExpanded &&[\s\S]{0,40}compras-hg-title/);
    assert.match(CLIENT, /function HgMetricHeads/);
    assert.match(CLIENT, /function HgDerivedCells/);
  });

  it("G) compras permanece visible siempre", () => {
    assert.match(CLIENT, />\s*CONSOLIDADO\s*</);
    assert.match(CLIENT, /function MetricHeads/);
    assert.match(CLIENT, /function ProviderCells/);
    assert.doesNotMatch(CLIENT, /fleteExpanded &&[\s\S]{0,80}function ProviderCells/);
  });
});

describe("IMPL-COMPRAS-FLETE-COLLAPSE-021 separadores", () => {
  it("H) separador antes de HG = 70px", () => {
    assert.match(CLIENT, /const COMPRAS_SEP_CLS = "min-w-\[70px\] w-\[70px\] border-0 bg-white p-0"/);
    assert.match(CLIENT, /compras-hg-gap \$\{COMPRAS_SEP_CLS\}/);
  });

  it("I) separador después de HG = 70px", () => {
    assert.match(CLIENT, /compras-flete-gap \$\{COMPRAS_SEP_CLS\}/);
  });

  it("J) separadores visibles con flete oculto", () => {
    assert.doesNotMatch(CLIENT, /fleteExpanded &&[\s\S]{0,40}compras-hg-gap/);
    assert.doesNotMatch(CLIENT, /fleteExpanded &&[\s\S]{0,40}compras-flete-gap/);
    assert.match(CLIENT, /<th rowSpan=\{3\} className=\{`compras-hg-gap \$\{COMPRAS_SEP_CLS\}`\} \/>/);
    assert.match(CLIENT, /<th rowSpan=\{3\} className=\{`compras-flete-gap \$\{COMPRAS_SEP_CLS\}`\} \/>/);
  });

  it("K) separadores visibles con flete desplegado", () => {
    const daySep = CLIENT.slice(CLIENT.indexOf("<td className={`compras-flete-gap ${COMPRAS_SEP_CLS}`} />"), CLIENT.indexOf("{fleteExpanded && <FleteRowCells providers={providers} flete={day?.flete} />}"));
    assert.match(daySep, /compras-flete-gap/);
    assert.equal((CLIENT.match(/compras-hg-gap \$\{COMPRAS_SEP_CLS\}/g) || []).length, 4);
    assert.equal((CLIENT.match(/compras-flete-gap \$\{COMPRAS_SEP_CLS\}/g) || []).length, 4);
  });
});

describe("IMPL-COMPRAS-FLETE-COLLAPSE-021 colspan dinámico", () => {
  it("L) loading/empty colSpan correcto oculto", () => {
    assert.equal(comprasGridColSpan(0, false), 9);
    assert.equal(comprasGridColSpan(3, false), 18);
    assert.match(CLIENT, /colSpan=\{comprasGridColSpan\(providers\.length, fleteExpanded\)\}/);
  });

  it("M) loading/empty colSpan correcto desplegado", () => {
    assert.equal(comprasGridColSpan(0, true), 12);
    assert.equal(comprasGridColSpan(3, true), 30);
    assert.match(CLIENT, /export function comprasGridColSpan/);
  });

  it("N) Semana colSpan correcto oculto", () => {
    assert.match(CLIENT, /compras-week-gap[\s\S]*colSpan=\{comprasGridColSpan\(providers\.length, fleteExpanded\)\}/);
    assert.equal(comprasGridColSpan(2, false), 15);
  });

  it("O) Semana colSpan correcto desplegado", () => {
    assert.equal(comprasGridColSpan(2, true), 24);
    assert.doesNotMatch(CLIENT, /providers\.length \* 4 \+ 7/);
  });

  it("P) TOTAL MES alineado", () => {
    const total = CLIENT.slice(CLIENT.indexOf(">TOTAL MES<"), CLIENT.indexOf("Haz clic en las celdas"));
    assert.match(total, /compras-hg-gap \$\{COMPRAS_SEP_CLS\}/);
    assert.match(total, /HgDerivedCells/);
    assert.match(total, /compras-flete-gap \$\{COMPRAS_SEP_CLS\}/);
    assert.match(total, /fleteExpanded && <FleteRowCells providers=\{providers\} flete=\{data\.grid\.month\.flete\}/);
  });
});

describe("IMPL-COMPRAS-FLETE-COLLAPSE-021 contratos intactos", () => {
  it("Q) 020 fórmulas HG siguen intactas", () => {
    assert.equal(compras.hgCosto(11.095, 1.23), 12.325);
    assert.equal(compras.hgCosto(11.095, null), null);
    assert.equal(compras.hgCosto(11.095, 0), 11.095);
    assert.equal(compras.hgImporte(12, -100), 1200);
    assert.equal(compras.hgImporte(12, 100), -1200);
    assert.equal(compras.hgImporte(12, 0), 0);
    assert.equal(compras.hgImporte(12, null), null);
    assert.match(FMT, /function hgCosto/);
    assert.match(FMT, /function hgImporte/);
    assert.match(CLIENT, /hgCosto\(day\?\.consolidado\?\.costo_kg, day\?\.flete\?\.consolidado\?\.tarifa\)/);
  });

  it("R) 016 flete sigue intacto al desplegar", () => {
    const heads = CLIENT.slice(CLIENT.indexOf("function FleteMetricHeads"), CLIENT.indexOf("function tarifaOf"));
    assert.match(heads, /COMPRA KG/);
    assert.match(heads, /TARIFA/);
    assert.match(heads, /IMPORTE/);
    assert.match(CLIENT, /function FleteRowCells/);
    assert.match(CLIENT, /formatFleteImporte/);
    assert.match(CLIENT, /VALOR DEL FLETE SEGÚN ORIGEN/);
    assert.match(CLIENT, /upsertComprasFleteTarifa/);
  });

  it("S) no hay llamadas API nuevas por toggle", () => {
    const toggle = fleteToggleBlock();
    assert.match(toggle, /onClick=\{\(\) => setFleteExpanded\(\(v\) => !v\)\}/);
    assert.doesNotMatch(toggle, /loadMonth|fetchComprasMonth|upsertCompras|downloadCompras/);
    assert.doesNotMatch(CLIENT, /setFleteExpanded\([\s\S]{0,80}loadMonth/);
    assert.doesNotMatch(CLIENT, /setFleteExpanded\([\s\S]{0,80}fetchComprasMonth/);
  });

  it("T) no se usa localStorage para fleteExpanded", () => {
    assert.doesNotMatch(CLIENT, /localStorage\.(get|set)Item\([^)]*flete/i);
    assert.doesNotMatch(CLIENT, /fleteExpanded[\s\S]{0,80}localStorage/);
    assert.doesNotMatch(CLIENT, /localStorage[\s\S]{0,80}fleteExpanded/);
    assert.match(CLIENT, /localStorage\.setItem\(COMPRAS_SHEET_KEY, JSON\.stringify\(\{ plantaId, year, month \}\)\)/);
  });
});
