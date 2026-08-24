"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { isDirectorIaDomainReadable } = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { getDirectorIaTool, isDirectorIaToolExecutable } = require("../lib/director-ia-tools");
const {
  extractIgfComposition,
  formatIgfCompositionBlock,
  isIgfCompositionQuestion,
  isIgfForecastQuestion,
  shouldAttachIgfArrAnnex,
  IGF_COMPOSITION_SOURCE,
  IGF_COMPOSITION_CATALOG,
} = require("../lib/director-ia-igf-arr");

const LIB_DIR = path.join(__dirname, "..", "lib");
const IGF_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-igf-arr.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-chat.js"), "utf8");

function sampleRow(over = {}) {
  return {
    empresa: "Puebla",
    venta_ton: 10,
    margen_kg: 2.5,
    com_desc_kg: -0.4,
    deposito_cierre_kg: -0.1,
    presupuesto_kg: 0.3,
    folios_aprob_zp_kg: 0.2,
    folios_carro_kg: 0.05,
    impuesto_kg: 0.15,
    hg_kg: 1.2,
    bancos_planta_kg: 0.08,
    provision_planta_kg: 0.02,
    gasto_kg: 0.45,
    util_oper_kg: 1.1,
    gtos_apoyos_corp_kg: 0.2,
    bancos_corp_kg: 0.05,
    otros_programas_kg: 0.01,
    inversiones_kg: 0.3,
    resultado_final_kg: 0.54,
    hg_pct: 4.5,
    util_oper_importe: 11000,
    resultado_final_importe: 5400,
    ...over,
  };
}

describe("M7 IGF composition — intent y tools", () => {
  it("preguntas de composición se detectan y no son M9", () => {
    assert.equal(isIgfCompositionQuestion("de qué se compone el IGF"), true);
    assert.equal(isIgfCompositionQuestion("composición del compromiso"), true);
    assert.equal(isIgfCompositionQuestion("qué partidas tiene la utilidad IGF"), true);
    assert.equal(isIgfCompositionQuestion("cómo cambió la venta"), false);
    assert.equal(isIgfCompositionQuestion("cómo cambió el descuento"), false);
    assert.equal(isIgfCompositionQuestion("delta de ingreso"), false);
    assert.equal(shouldAttachIgfArrAnnex("de qué se compone el IGF"), true);
    assert.equal(isIgfForecastQuestion("de qué se compone el IGF"), true);
  });

  it("igf_status y financial_diagnosis se preservan; M6 y M9 también", () => {
    assert.equal(planDirectorIaQuestion("cómo va IGF").intent, "igf_status");
    const diag = planDirectorIaQuestion("por qué cayó el ingreso");
    assert.equal(diag.intent, "financial_diagnosis");
    assert.equal(planDirectorIaQuestion("cómo cambió la venta").intent, "delta_sales");
    assert.equal(planDirectorIaQuestion("cómo cambió el descuento").intent, "delta_discount");
    assert.equal(planDirectorIaQuestion("cómo cambió el ingreso").intent, "delta_income");
    assert.equal(planDirectorIaQuestion("qué gastos de folios existen 2026-08").intent, "expense_analysis");
  });

  it("tool get_igf_snapshot sigue ejecutable read-only", () => {
    const tool = getDirectorIaTool("get_igf_snapshot");
    assert.ok(tool);
    assert.equal(tool.executor, "loadIgfArrAnnexForChat");
    assert.equal(isDirectorIaToolExecutable("get_igf_snapshot"), true);
    assert.equal(isDirectorIaDomainReadable("igf"), true);
  });
});

describe("M7 IGF composition — extract", () => {
  it("arma una sola fila con unidades y roles", () => {
    const comp = extractIgfComposition(sampleRow(), { year: 2026, month: 8, version_id: 9, version_number: 3 });
    assert.equal(comp.ok, true);
    assert.equal(comp.cardinality, 1);
    assert.equal(comp.source, IGF_COMPOSITION_SOURCE);
    assert.equal(comp.snapshot, true);
    assert.equal(comp.trend, false);
    assert.equal(comp.empresa, "Puebla");
    const byKey = Object.fromEntries(comp.lines.map((l) => [l.line_key, l]));
    assert.equal(byKey.venta_ton.unit, "ton");
    assert.equal(byKey.margen_kg.unit, "$/kg");
    assert.equal(byKey.hg_pct.unit, "%");
    assert.equal(byKey.util_oper_importe.unit, "MXN");
    assert.equal(byKey.margen_kg.formula_role, "add");
    assert.equal(byKey.hg_kg.formula_role, "subtract");
    assert.equal(byKey.gasto_kg.formula_role, "none");
    assert.equal(byKey.util_oper_kg.formula_role, "stored_subtotal");
    assert.equal(byKey.resultado_final_kg.formula_role, "stored_total");
    assert.ok(comp.lines.every((l) => l.source === IGF_COMPOSITION_SOURCE));
    const orders = comp.lines.map((l) => l.order);
    assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  });

  it("snapshot vacío no inventa líneas", () => {
    const none = extractIgfComposition(null);
    assert.equal(none.ok, false);
    assert.equal(none.cardinality, 0);
    assert.equal(none.lines.length, 0);
  });

  it("null se omite y no se convierte en 0", () => {
    const comp = extractIgfComposition(sampleRow({ impuesto_kg: null, bancos_planta_kg: "" }));
    const keys = comp.lines.map((l) => l.line_key);
    assert.equal(keys.includes("impuesto_kg"), false);
    assert.equal(keys.includes("bancos_planta_kg"), false);
    assert.ok(comp.omitted_null_keys.includes("impuesto_kg"));
    assert.ok(!comp.lines.some((l) => l.value === 0 && l.line_key === "impuesto_kg"));
  });

  it("hg_kg no se invierte", () => {
    const comp = extractIgfComposition(sampleRow({ hg_kg: 1.2 }));
    const hg = comp.lines.find((l) => l.line_key === "hg_kg");
    assert.equal(hg.value, 1.2);
    assert.ok(hg.value > 0);
  });

  it("gasto_kg no entra a la fórmula", () => {
    const spec = IGF_COMPOSITION_CATALOG.find((c) => c.key === "gasto_kg");
    assert.equal(spec.formula_role, "none");
    const text = formatIgfCompositionBlock(extractIgfComposition(sampleRow())).join("\n");
    assert.match(text, /gasto_kg[\s\S]*no entra a la fórmula/);
  });

  it("no mezcla unidades en el ranking de magnitud", () => {
    const comp = extractIgfComposition(sampleRow({ venta_ton: 999, util_oper_importe: 999999 }));
    for (const mag of comp.magnitude_usd_per_kg) {
      const line = comp.lines.find((l) => l.line_key === mag.line_key);
      assert.equal(line.unit, "$/kg");
      assert.ok(line.formula_role === "add" || line.formula_role === "subtract");
    }
  });

  it("*_kg se trata como $/kg", () => {
    for (const spec of IGF_COMPOSITION_CATALOG) {
      if (spec.key.endsWith("_kg")) assert.equal(spec.unit, "$/kg");
    }
  });
});

describe("M7 IGF composition — respuesta y fronteras", () => {
  it("copy factual sin causalidad ni prioridad", () => {
    const text = formatIgfCompositionBlock(extractIgfComposition(sampleRow())).join("\n");
    assert.match(text, /COMPOSICIÓN IGF \(snapshot, no tendencia\)/);
    assert.match(text, /COMPOSICIÓN != CAUSALIDAD/);
    assert.match(text, /no implica problema ni causa/);
    assert.doesNotMatch(text, /causó/);
    assert.doesNotMatch(text, /principal causa/);
    assert.doesNotMatch(text, /el problema/);
    assert.doesNotMatch(text, /responsable del resultado/);
    assert.doesNotMatch(text, /prioridad/);
  });

  it("sin fila no afirma ausencia de negocio", () => {
    const text = formatIgfCompositionBlock(extractIgfComposition(null)).join("\n");
    assert.match(text, /no hay líneas observadas/);
    assert.doesNotMatch(text, /no existe IGF/);
  });
});

describe("M7 IGF composition — source scan", () => {
  it("no ejecuta recálculo, overlay, ORDER_DELTAS ni HTTP", () => {
    assert.doesNotMatch(IGF_SRC, /recalcularUtilYResultado\s*\(/);
    assert.doesNotMatch(IGF_SRC, /ORDER_DELTAS/);
    assert.doesNotMatch(IGF_SRC, /folios_aprob_zpByPlanta|overlay/);
    assert.doesNotMatch(IGF_SRC, /axios|fetch\(|\/api\/dashboard\/igf/);
    assert.match(IGF_SRC, /extractIgfComposition/);
    assert.match(IGF_SRC, /formatIgfCompositionBlock/);
    assert.match(CHAT_SRC, /loadIgfArrAnnexForChat/);
  });
});
