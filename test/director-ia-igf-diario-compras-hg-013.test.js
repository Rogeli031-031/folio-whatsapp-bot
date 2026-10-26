"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const semantic = require("../lib/director-ia-013-semantic");

const CUTOFF = "2026-10-26";
const COMPONENTS = {
  presupuesto_nomina_gastos: 1611265,
  presupuesto_imss_sua: 390000.03,
  extraordinarios: 234595.16,
  provisiones_planta: 237858.6,
  gasto_corporativo: 100000,
  inversiones: 50000,
  impuestos_federales: 20000,
};
const DAYS = [
  { fecha: "2026-10-18", ventaKg: 1000, precio: 20, costoKg: 12, fleteKg: 2, cdKg: 1, hgKg: 0.4 },
  { fecha: "2026-10-24", ventaKg: 1000, precio: 20, costoKg: 12, fleteKg: 2, cdKg: 1, hgKg: 0.4 },
  { fecha: "2026-10-25", ventaKg: 1000, precio: 20, costoKg: 10, fleteKg: 2, cdKg: 1, hgKg: 0.5 },
  { fecha: "2026-10-26", ventaKg: 3000, precio: 22, costoKg: 11, fleteKg: 2, cdKg: 1, hgKg: 0.5 },
];
const CALENDAR = [
  { fecha: "2026-10-25", inhabil: false },
  { fecha: "2026-10-26", inhabil: false },
  { fecha: "2026-10-27", inhabil: false },
  { fecha: "2026-10-28", inhabil: false },
];

function snapshot(extra) {
  return {
    plant: "Puebla",
    financial: {
      days: DAYS,
      components: COMPONENTS,
      calendar: CALENDAR,
      overrides: { presupuesto_nomina_gastos: { "2026-10-25": 700 } },
    },
    forecast: { margen: 6.92, operativos: 1 },
    historical: { margen: 5.5 },
    hgPhysical: [{ fecha: "2026-10-26", kg: 1200 }],
    purchases: [
      { fecha: "2026-10-26", kg: 100, importe: 1000, excel_kg: 90, excel_importe: 900, proveedor: "PEMEX", discrepant: true, has_document: false },
      { fecha: "2026-10-26", kg: 0, importe: 50, proveedor: "NOTA DE CARGO", has_document: true },
    ],
    ...extra,
  };
}

function ask(text, extra) {
  return semantic.turnDirectorIa013({ text, cutoffYmd: CUTOFF, snapshot: snapshot(), ...extra });
}

function route(text, extra) {
  return semantic.classifyDirectorIaQuestion(text, { cutoffYmd: CUTOFF, ...extra });
}

describe("DIRECTOR-IA-013", () => {
  it("1 octubre 2026 usa IGF Diario acumulado", () => {
    const got = route("margen de octubre");
    assert.equal(got.truth, "FINANCIAL_ACTUAL");
    assert.equal(got.source, "IGF_DIARIO_ACUMULADO");
  });

  it("2 septiembre conserva la fuente histórica", () => {
    const got = route("margen de septiembre");
    assert.equal(got.truth, "FINANCIAL_HISTORICAL");
    assert.equal(got.source, "FORECAST_HISTORICAL_EXISTING");
    const answer = ask("margen de septiembre").answer;
    assert.match(answer, /históric|Forecast existente/i);
    assert.doesNotMatch(answer, /IGF Diario acumulado/);
  });

  it("3 proyectado usa forecast", () => {
    const got = route("margen proyectado de octubre");
    assert.equal(got.truth, "FINANCIAL_FORECAST");
    assert.equal(got.source, "IGF_FORECAST");
    assert.match(ask("margen proyectado de octubre").answer, /IGF Forecast/);
  });

  it("4 el actual incompleto no cae a forecast", () => {
    const answer = ask("margen de octubre", {
      snapshot: snapshot({ financial: { incomplete: true, days: DAYS, components: COMPONENTS } }),
    }).answer;
    assert.equal(answer, semantic.INSUFFICIENT_ACUMULADO);
    assert.doesNotMatch(answer, /Forecast/i);
  });

  it("5 el margen coincide con el cálculo productivo", () => {
    const period = { from: "2026-10-01", to: "2026-10-26", time_scope: "MONTH" };
    const fin = semantic.financialOf(snapshot(), period);
    const answer = ask("cuál es el margen de octubre").answer;
    assert.equal(fin.margenKg, semantic.weightedByVenta(DAYS, (day) => semantic.margenOf(day), (day) => day.ventaKg));
    assert.match(answer, /7\.83/);
  });

  it("6 un override de margen cambia la respuesta", () => {
    const changed = snapshot();
    changed.financial.days = DAYS.map((day) => day.fecha === "2026-10-26" ? { ...day, precio: 30 } : day);
    const base = semantic.financialOf(snapshot(), { from: "2026-10-01", to: "2026-10-26", time_scope: "MONTH" });
    const fin = semantic.financialOf(changed, { from: "2026-10-01", to: "2026-10-26", time_scope: "MONTH" });
    assert.notEqual(fin.margenKg, base.margenKg);
    assert.equal(Math.round(fin.margenKg * 100) / 100, 11.83);
    const answer = semantic.turnDirectorIa013({ text: "margen de octubre", cutoffYmd: CUTOFF, snapshot: changed }).answer;
    assert.match(answer, /11\.83/);
  });

  it("7 el margen semanal está ponderado por venta", () => {
    const week = { from: "2026-10-25", to: "2026-10-26", time_scope: "CURRENT_WEEK" };
    const fin = semantic.financialOf(snapshot(), week);
    const simple = ((20 - 10 - 2) + (22 - 11 - 2)) / 2;
    assert.equal(fin.margenKg, 8.75);
    assert.notEqual(fin.margenKg, simple);
  });

  it("8 operativos de Puebla suman los cuatro componentes", () => {
    const fin = semantic.applyExpenses(semantic.summarizeDays(DAYS), COMPONENTS, null);
    assert.equal(fin.operativosImporte, 2473718.79);
    assert.match(ask("cuál es el total de gastos operativos de octubre").answer, /2,473,718\.79/);
  });

  it("9 el desglose de operativos usa los componentes reales", () => {
    const answer = ask("qué rubro pesa más en gastos operativos").answer;
    assert.match(answer, /nómina y gastos/);
    assert.match(answer, /1,611,265\.00/);
    assert.match(answer, /IMSS\/SUA/);
  });

  it("10 la semana suma la distribución diaria real", () => {
    const schedule = semantic.buildExpenseDailySchedule({
      monthlyAmount: COMPONENTS.presupuesto_nomina_gastos,
      days: CALENDAR,
      overrides: { "2026-10-25": 700 },
    });
    const week = semantic.sumAssignedForWeek(schedule, CALENDAR.slice(0, 2));
    const flat = (COMPONENTS.presupuesto_nomina_gastos / CALENDAR.length) * 2;
    assert.notEqual(week, flat);
    const fin = semantic.financialOf(snapshot(), { from: "2026-10-25", to: "2026-10-26", time_scope: "CURRENT_WEEK" });
    assert.equal(typeof fin.operativosImporte, "number");
    assert.notEqual(fin.operativosImporte, COMPONENTS.presupuesto_nomina_gastos + COMPONENTS.presupuesto_imss_sua + COMPONENTS.extraordinarios + COMPONENTS.provisiones_planta);
  });

  it("11 no divide el mensual entre los días", () => {
    const fin = semantic.financialOf(snapshot(), { from: "2026-10-01", to: "2026-10-26", time_scope: "MONTH" });
    assert.equal(fin.operativosImporte, 2473718.79);
  });

  it("12 corporativos coinciden con gasto corporativo más inversiones", () => {
    const fin = semantic.financialOf(snapshot(), { from: "2026-10-01", to: "2026-10-26", time_scope: "MONTH" });
    assert.equal(fin.corporativosImporte, 150000);
    assert.match(ask("cuál es el total de gastos corporativos de octubre").answer, /150,000\.00/);
  });

  it("13 el resultado final coincide con el mini", () => {
    const { fin, mini } = semantic.acumuladoMiniFromSnapshot(snapshot());
    assert.equal(fin.resultadoFinalImporte, mini.rows[0].resultadoFinalImporte);
    assert.match(ask("cuál es el resultado final de octubre").answer, /IGF Diario acumulado/);
  });

  it("14 HG financiero responde en MXN/kg", () => {
    const answer = ask("HG financiero de octubre").answer;
    assert.match(answer, /MXN\/kg/);
    assert.doesNotMatch(answer, /HG físico/);
  });

  it("15 HG físico responde en kg", () => {
    const answer = ask("HG en kilos de octubre").answer;
    assert.match(answer, /1,200 kg/);
    assert.match(answer, /arr\.compras_hg/);
  });

  it("16 HG en kilos nunca responde MXN/kg", () => {
    assert.doesNotMatch(ask("kilos de HG").answer, /MXN/);
  });

  it("17 HG $/kg nunca responde como kilos físicos", () => {
    assert.doesNotMatch(ask("HG $/kg de octubre").answer, /HG físico/);
  });

  it("18 compras ambiguas piden la aclaración exacta", () => {
    const answer = ask("cuáles son las compras").answer;
    assert.equal(answer, semantic.CLARIFICATION);
  });

  it("19 compras de gas LP enrutan a CONTROL DE COMPRAS", () => {
    const got = ask("cuánto compramos de gas LP en octubre");
    assert.equal(got.domain, "GAS_LP_PURCHASES");
    assert.equal(got.source, "CONTROL_DE_COMPRAS");
    assert.match(got.answer, /CONTROL DE COMPRAS/);
  });

  it("20 compras de cliente conservan su dominio", () => {
    const got = route("última compra del cliente Socorro");
    assert.equal(got.domain, "CLIENT_PURCHASES");
    assert.equal(got.purchase_domain, "CLIENT_PURCHASES");
    assert.equal(ask("última compra del cliente Socorro").answer, null);
  });

  it("21 un follow-up hereda gas LP", () => {
    const first = ask("compras de gas LP");
    const second = ask("¿y la semana pasada?", { purchaseDomain: first.purchase_domain });
    assert.equal(first.purchase_domain, "GAS_LP");
    assert.equal(second.domain, "GAS_LP_PURCHASES");
    assert.equal(second.clarification, false);
  });

  it("22 un follow-up hereda compras de clientes", () => {
    const first = route("compras en general");
    const second = route("¿y la semana pasada?", { purchaseDomain: first.purchase_domain });
    assert.equal(second.domain, "CLIENT_PURCHASES");
    assert.equal(second.clarification, false);
  });

  it("23 Excel tiene precedencia sobre la captura", () => {
    const totals = semantic.purchaseTotals(snapshot().purchases, { from: "2026-10-01", to: "2026-10-26" });
    assert.equal(totals.physicalKg, 90);
    assert.equal(totals.physicalImporte, 900);
  });

  it("24 no suma captura más Excel", () => {
    const row = snapshot().purchases[0];
    assert.equal(semantic.effectiveKg(row), 90);
    assert.notEqual(semantic.effectiveKg(row), row.kg + row.excel_kg);
  });

  it("25 la semana va de domingo a sábado", () => {
    const got = route("compras de gas de la semana pasada");
    assert.equal(got.period.from, "2026-10-18");
    assert.equal(got.period.to, "2026-10-24");
    assert.equal(new Date(`${got.period.from}T00:00:00Z`).getUTCDay(), 0);
    assert.equal(new Date(`${got.period.to}T00:00:00Z`).getUTCDay(), 6);
  });

  it("26 los últimos 7 días no son la semana calendario", () => {
    const rolling = route("últimos 7 días de gas LP");
    const week = route("compras de gas de la semana pasada");
    assert.equal(rolling.period.from, "2026-10-20");
    assert.notEqual(rolling.period.from, week.period.from);
  });

  it("27 la nota de cargo no suma kilos", () => {
    const totals = semantic.purchaseTotals(snapshot().purchases, { from: "2026-10-01", to: "2026-10-26" });
    assert.equal(totals.physicalKg, 90);
    assert.equal(totals.notaCount, 1);
  });

  it("28 la nota de cargo suma al importe", () => {
    const totals = semantic.purchaseTotals(snapshot().purchases, { from: "2026-10-01", to: "2026-10-26" });
    assert.equal(totals.notaImporte, 50);
    assert.equal(totals.consolidated, 950);
    assert.match(ask("cuántas notas de cargo tenemos").answer, /50\.00/);
  });

  it("29 muestra compras de gas sin factura y no revela storage", () => {
    const answer = ask("qué compras de gas no tienen factura").answer;
    assert.match(answer, /1 compras de gas LP sin factura/);
    assert.doesNotMatch(answer, /storage_key|s3:\/\//i);
  });

  it("30 muestra la discrepancia de Excel con las dos etiquetas", () => {
    const answer = ask("qué compras no coinciden con el excel").answer;
    assert.match(answer, /CAPTURADO \/ FACTURA/);
    assert.match(answer, /EXCEL — USADO PARA CALCULO/);
    assert.match(answer, /900\.00/);
  });

  it("31 la auditoría dice la fuente y el corte", () => {
    const answer = ask("de dónde sale", { lastSource: "IGF_DIARIO_ACUMULADO" }).answer;
    assert.match(answer, /IGF Diario acumulado/);
    assert.match(answer, new RegExp(CUTOFF));
  });

  it("32 no muestra códigos internos", () => {
    const hidden = semantic.hideInternalCodes("RESULT_WITH_EVIDENCE: el margen es 8.75");
    assert.equal(hidden, "el margen es 8.75");
    const answer = ask("margen de octubre").answer;
    assert.doesNotMatch(answer, /RESULT_WITH_EVIDENCE|INSUFFICIENT_EVIDENCE|DATA_NOT_FOUND|SOURCE_RESTRICTED/);
    const panel = fs.readFileSync(path.join(__dirname, "../frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx"), "utf8");
    assert.match(panel, /hideDirectorIaInternalCodes\(res\.answer\)/);
  });

  it("33 compara actual contra forecast con las dos fuentes", () => {
    const answer = ask("compara margen actual vs forecast").answer;
    assert.match(answer, /IGF Diario acumulado/);
    assert.match(answer, /IGF Forecast/);
    assert.match(answer, /6\.92/);
  });

  it("34 compara la semana contra la anterior", () => {
    const answer = ask("compara margen contra la semana pasada").answer;
    assert.match(answer, /2026-10-25 a 2026-10-26/);
    assert.match(answer, /2026-10-18 a 2026-10-24/);
    assert.match(answer, /Delta/);
  });

  it("35 el diagnóstico solo afirma la cadena aritmética", () => {
    const answer = ask("por qué cayó el resultado").answer;
    assert.match(answer, /No atribuyo causas externas/);
    assert.match(answer, /operativos/);
    assert.match(answer, /resultado final/);
  });

  it("36 el puente costo-margen se etiqueta como aproximación", () => {
    const answer = ask("compara precio costo y flete del margen").answer;
    assert.match(answer, /aproximación/i);
    assert.match(answer, /simulación/i);
    assert.match(answer, /precio/);
    assert.match(answer, /costo/);
    assert.match(answer, /flete/);
  });

  it("37 el resumen ejecutivo nombra las fuentes y el corte", () => {
    const answer = ask("dame un resumen de la planta").answer;
    assert.match(answer, /Venta:/);
    assert.match(answer, /Compras gas LP:/);
    assert.match(answer, /HG físico:/);
    assert.match(answer, /IGF Diario acumulado/);
    assert.match(answer, /CONTROL DE COMPRAS/);
    assert.match(answer, new RegExp(CUTOFF));
  });

  it("38-44 esta semana termina en el corte y un día vacío no inventa cero", () => {
    const week = route("margen de esta semana");
    assert.equal(week.period.from, "2026-10-25");
    assert.equal(week.period.to, CUTOFF);
    const empty = semantic.turnDirectorIa013({
      text: "margen de ayer",
      cutoffYmd: "2026-10-20",
      snapshot: snapshot(),
    });
    assert.equal(empty.time_scope, "DAY");
    assert.match(empty.answer, /sin cifra/);
    assert.doesNotMatch(empty.answer, /sin cifra 0| 0\.00/);
  });

  it("45-52 la simulación de equilibrio no guarda nada y HG solo responde ambas etiquetas", () => {
    const answer = ask("cuánto tendrían que bajar gastos para llegar a cero").answer;
    assert.match(answer, /simulación matemática/i);
    assert.match(answer, /No guardé ningún cambio/);
    const both = ask("cuál es el HG").answer;
    assert.match(both, /HG financiero/);
    assert.match(both, /HG físico/);
  });

  it("53-60 el chat no escribe y el corpus cubre las 23 familias", () => {
    const source = fs.readFileSync(path.join(__dirname, "../lib/director-ia-013-semantic.js"), "utf8");
    assert.doesNotMatch(source, /\b(insert|update|delete)\s+/i);
    const cases = semantic.directorIa013Corpus();
    const families = [...new Set(cases.map((item) => item.family))];
    assert.equal(families.length, 23);
    for (const family of families) {
      const rows = cases.filter((item) => item.family === family);
      assert.ok(rows.length >= 40, family);
      assert.equal(new Set(rows.map((item) => item.text)).size, rows.length, family);
    }
    const metrics = new Set(cases.filter((item) => item.family === "FINANCIAL_ACTUAL_GENERIC").map((item) => item.expect.metric));
    assert.equal(metrics.size, 12);
    assert.ok(cases.length >= 920);
  });

  it("las 920 frases clasifican y las compras ambiguas no adivinan", () => {
    const cases = semantic.directorIa013Corpus();
    for (const item of cases) {
      const got = route(item.text);
      assert.equal(typeof got.domain, "string", item.text);
      if (item.family === "FINANCIAL_ACTUAL_GENERIC" || item.family === "OPERATIVOS_TOTAL" || item.family === "CORPORATIVOS_TOTAL" || item.family === "MARGEN_ACUMULADO") {
        assert.equal(got.truth, "FINANCIAL_ACTUAL", item.text);
        assert.equal(got.source, "IGF_DIARIO_ACUMULADO", item.text);
      }
      if (item.family === "FINANCIAL_FORECAST") {
        assert.equal(got.truth, "FINANCIAL_FORECAST", item.text);
        assert.equal(got.source, "IGF_FORECAST", item.text);
      }
      if (item.family === "AMBIGUOUS_PURCHASES") {
        assert.equal(got.clarification, true, item.text);
        assert.equal(semantic.composeDirectorIa013(got, null), semantic.CLARIFICATION);
      }
      if (item.family === "HG_PHYSICAL") {
        assert.ok(got.domain === "HG_PHYSICAL" || got.domain === "HG_BOTH", item.text);
        if (got.domain === "HG_PHYSICAL") assert.equal(got.unit, "KG", item.text);
      }
      if (item.expect) {
        for (const key of ["domain", "metric", "truth", "source", "unit", "time_scope", "dimension"]) {
          assert.equal(got[key], item.expect[key], `${item.family} ${item.text} ${key}`);
        }
      }
      if (item.family === "GAS_LP_PURCHASES" || item.family === "GAS_LP_PURCHASE_COST" || item.family === "NOTA_CARGO") {
        assert.equal(got.domain, "GAS_LP_PURCHASES", item.text);
      }
      if (item.family === "MARGEN_DIARIO") {
        assert.equal(got.metric, "margen", item.text);
      }
    }
  });
});
