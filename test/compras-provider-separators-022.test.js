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
  return 1 + n * 3 + n + 3 + 1 + 3 + 1 + (fleteExpanded ? n * 3 + n + 3 : 0);
}

function fleteToggleBlock() {
  const idx = CLIENT.indexOf("aria-expanded={fleteExpanded}");
  assert.ok(idx >= 0, "toggle de flete ausente");
  return CLIENT.slice(idx, idx + 500);
}

describe("IMPL-COMPRAS-PROVIDER-SEPARATORS-022 gaps de compras", () => {
  it("A) existe gap entre PEMEX y TOMZA TUXPAN", () => {
    assert.match(CLIENT, /compras-provider-gap/);
    assert.match(CLIENT, /providers\.map\(\(p\) => \(\s*<Fragment key=\{`t-\$\{p\.id\}`\}>[\s\S]*COMPRAS_PROVIDER_GAP_CLS/);
  });

  it("B) existe gap entre TOMZA TUXPAN y TOMZA TEPEJI", () => {
    assert.match(
      CLIENT,
      /<Fragment key=\{`t-\$\{p\.id\}`\}>[\s\S]*?<th rowSpan=\{3\} className=\{COMPRAS_PROVIDER_GAP_CLS\} \/>\s*<\/Fragment>/
    );
  });

  it("C) existe gap antes de CONSOLIDADO", () => {
    assert.match(
      CLIENT,
      /<th rowSpan=\{3\} className=\{COMPRAS_PROVIDER_GAP_CLS\} \/>\s*<\/Fragment>\s*\)\)\}\s*<th colSpan=\{3\}[^>]*>\s*CONSOLIDADO/
    );
  });

  it("D) gap proveedor ≈ 12px", () => {
    assert.match(CLIENT, /const COMPRAS_PROVIDER_GAP_CLS = "compras-provider-gap w-3 min-w-\[12px\] border-0 bg-white p-0"/);
  });

  it("E) gap proveedor blanco y sin texto", () => {
    assert.match(CLIENT, /COMPRAS_PROVIDER_GAP_CLS = "[^"]*bg-white[^"]*"/);
    assert.match(CLIENT, /<th rowSpan=\{3\} className=\{COMPRAS_PROVIDER_GAP_CLS\} \/>/);
    assert.match(CLIENT, /<td className=\{COMPRAS_PROVIDER_GAP_CLS\} \/>/);
  });

  it("F) gap proveedor sin borde negro", () => {
    assert.match(CLIENT, /COMPRAS_PROVIDER_GAP_CLS = "[^"]*border-0[^"]*"/);
    assert.doesNotMatch(CLIENT, /compras-provider-gap[^"]*border-black/);
  });

  it("G) fila diaria mantiene gaps", () => {
    const day = CLIENT.slice(CLIENT.indexOf('if (row.type === "day")'), CLIENT.indexOf("const week = weekByNum"));
    assert.match(day, /<td className=\{COMPRAS_PROVIDER_GAP_CLS\} \/>/);
    assert.match(day, /ProviderCells/);
  });

  it("H) Semana mantiene gaps", () => {
    const week = CLIENT.slice(CLIENT.indexOf("Semana {row.week}"), CLIENT.indexOf("compras-week-gap"));
    assert.match(week, /<td className=\{COMPRAS_PROVIDER_GAP_CLS\} \/>/);
    assert.match(week, /ReadOnlyTriple/);
  });

  it("I) TOTAL MES mantiene gaps", () => {
    const total = CLIENT.slice(CLIENT.indexOf(">TOTAL MES<"), CLIENT.indexOf("Haz clic en las celdas"));
    assert.match(total, /<td className=\{COMPRAS_PROVIDER_GAP_CLS\} \/>/);
    assert.match(total, /ReadOnlyTriple/);
  });
});

describe("IMPL-COMPRAS-PROVIDER-SEPARATORS-022 bloques grandes y flete", () => {
  it("J) separador grande compra→HG sigue 70px", () => {
    assert.match(CLIENT, /const COMPRAS_SEP_CLS = "min-w-\[70px\] w-\[70px\] border-0 bg-white p-0"/);
    assert.match(CLIENT, /compras-hg-gap \$\{COMPRAS_SEP_CLS\}/);
  });

  it("K) separador grande HG→Flete sigue 70px", () => {
    assert.match(CLIENT, /compras-flete-gap \$\{COMPRAS_SEP_CLS\}/);
  });

  it("L) flete oculto no ocupa gaps internos", () => {
    assert.match(CLIENT, /fleteExpanded && <FleteRowCells/);
    assert.doesNotMatch(CLIENT, /fleteExpanded &&[\s\S]{0,40}compras-provider-gap/);
    const fleteFn = CLIENT.slice(CLIENT.indexOf("function FleteRowCells"), CLIENT.indexOf("function TarifaCell"));
    assert.match(fleteFn, /COMPRAS_PROVIDER_GAP_CLS/);
  });

  it("M) flete desplegado tiene gaps entre orígenes", () => {
    const fleteFn = CLIENT.slice(CLIENT.indexOf("function FleteRowCells"), CLIENT.indexOf("function TarifaCell"));
    assert.match(fleteFn, /formatFleteImporte[\s\S]*COMPRAS_PROVIDER_GAP_CLS/);
    assert.match(CLIENT, /compras-flete-origin[\s\S]{0,280}COMPRAS_PROVIDER_GAP_CLS/);
  });

  it("N) flete CONSOLIDADO no tiene gap final", () => {
    const fleteFn = CLIENT.slice(CLIENT.indexOf("function FleteRowCells"), CLIENT.indexOf("function TarifaCell"));
    const afterCons = fleteFn.slice(fleteFn.lastIndexOf("cons.importe"));
    assert.doesNotMatch(afterCons, /COMPRAS_PROVIDER_GAP_CLS/);
  });

  it("O) colSpan correcto flete oculto", () => {
    assert.equal(comprasGridColSpan(0, false), 9);
    assert.equal(comprasGridColSpan(3, false), 21);
    assert.match(CLIENT, /const compras = n \* 3 \+ n;/);
    assert.match(CLIENT, /colSpan=\{comprasGridColSpan\(providers\.length, fleteExpanded\)\}/);
  });

  it("P) colSpan correcto flete desplegado", () => {
    assert.equal(comprasGridColSpan(0, true), 12);
    assert.equal(comprasGridColSpan(3, true), 36);
    assert.match(CLIENT, /const flete = fleteExpanded \? n \* 3 \+ n \+ 3 : 0;/);
  });
});

describe("IMPL-COMPRAS-PROVIDER-SEPARATORS-022 regresiones", () => {
  it("Q) 021 toggle sigue funcionando", () => {
    assert.match(CLIENT, /const \[fleteExpanded, setFleteExpanded\] = useState\(false\);/);
    const toggle = fleteToggleBlock();
    assert.match(toggle, /▶ MOSTRAR FLETE/);
    assert.match(toggle, /▼ OCULTAR FLETE/);
    assert.match(toggle, /onClick=\{\(\) => setFleteExpanded\(\(v\) => !v\)\}/);
    assert.match(CLIENT, /fleteExpanded && \(\s*<th[\s\S]*VALOR DEL FLETE SEGÚN ORIGEN/);
  });

  it("R) 020 HG sigue intacto", () => {
    assert.equal(compras.hgCosto(11.095, 1.23), 12.325);
    assert.equal(compras.hgImporte(12, -100), 1200);
    assert.match(CLIENT, /function HgMetricHeads/);
    assert.match(CLIENT, /function HgDerivedCells/);
    assert.match(FMT, /function hgCosto/);
  });

  it("S) 016 flete sigue intacto", () => {
    const heads = CLIENT.slice(CLIENT.indexOf("function FleteMetricHeads"), CLIENT.indexOf("function tarifaOf"));
    assert.match(heads, /COMPRA KG/);
    assert.match(heads, /TARIFA/);
    assert.match(heads, /IMPORTE/);
    assert.match(CLIENT, /function FleteRowCells/);
    assert.match(CLIENT, /upsertComprasFleteTarifa/);
  });

  it("T) no llamadas API nuevas", () => {
    assert.doesNotMatch(CLIENT, /setFleteExpanded\([\s\S]{0,80}loadMonth/);
    assert.doesNotMatch(CLIENT, /fetchComprasMonth\([\s\S]{0,40}fleteExpanded/);
    assert.doesNotMatch(CLIENT, /localStorage\.(get|set)Item\([^)]*flete/i);
  });
});
