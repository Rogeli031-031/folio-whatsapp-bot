"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  NEED_TYPES,
  resolveExecutiveNeed,
  isExecutiveStatusQuestion,
  isDiagnosisObservationRiskQuestion,
  shouldHandleExecutiveStatus,
  shouldHandleDiagnosisObservationRisk,
} = require("../lib/director-ia-conversational-executive-layer");
const { composeExecutiveCycle } = require("../lib/director-ia-executive-cycle-composer");
const { isMonthCloseQuestion } = require("../lib/director-ia-month-close-result");
const { isDailyExecutiveBriefQuestion } = require("../lib/director-ia-daily-executive-brief");
const {
  TYPED_RISK_CODES,
  containsForbiddenCausalLanguage,
  projectFindingsFromCyclePack,
  formatDiagnosisAnswer,
  loadExecutiveDiagnosisForChat,
} = require("../lib/director-ia-executive-diagnosis-observations-risks");

const ROOT = path.join(__dirname, "..");
const DIAG_SRC = fs.readFileSync(
  path.join(ROOT, "lib", "director-ia-executive-diagnosis-observations-risks.js"),
  "utf8"
);
const CEL_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-conversational-executive-layer.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");

const PLANTS = [
  { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
  { planta_id: 2, planta_nombre: "Acapulco", plant_code: "E3" },
  { planta_id: 3, planta_nombre: "Morelos", plant_code: "E9" },
];

function zpAuth() {
  return { role: "ZP", actor_nombre: "Director ZP" };
}

function salesRow(cliente, kg, month = "2026-08") {
  return { month, cliente_norm: cliente, canal: "Casa", subcanal: "", kg };
}

function composeOpts(over = {}) {
  return {
    now: new Date("2026-08-25T18:00:00-06:00"),
    openYearMonth: { year: 2026, month: 8 },
    portfolioPlants: PLANTS,
    skipTrend: true,
    defaultCutoff: "2026-08-24",
    injected: true,
    salesRowsByPlant: {
      1: [salesRow("ARTURO", 863000)],
      2: [salesRow("BETA", 400000)],
      3: [salesRow("GAMA", 200000)],
    },
    priorSalesRowsByPlant: {
      1: [salesRow("ARTURO", 900000, "2026-07"), salesRow("PERDIDO", 120000, "2026-07")],
      2: [salesRow("BETA", 380000, "2026-07")],
      3: [salesRow("GAMA", 210000, "2026-07")],
    },
    discountRowsByPlant: {
      1: [{ month: "2026-08", monto: 3918000 }],
      2: [{ month: "2026-08", monto: 800000 }],
      3: [{ month: "2026-08", monto: 300000 }],
    },
    targetByPlant: {
      1: { venta_ton: 1200, version_id: 10, version_number: 1, empresa: "Puebla" },
      2: { venta_ton: 1500, version_id: 10, version_number: 1, empresa: "Acapulco" },
      3: null,
    },
    forecastByPlant: {
      1: {
        version_id: 88,
        version_number: 3,
        row: {
          venta_ton: 1126,
          resultado_final_importe: -775000,
        },
      },
      2: {
        version_id: 88,
        version_number: 3,
        row: { venta_ton: 1496, resultado_final_importe: 100000 },
      },
      3: {
        version_id: 88,
        version_number: 3,
        row: { venta_ton: 500, resultado_final_importe: -10000 },
      },
    },
    actionBoardByPlant: {
      1: {
        items: [{ id: 1, titulo: "Seguimiento", estado: "vencido", dias_vencido: 4, tema: "venta" }],
      },
    },
    loadActions: async (_pool, plantaId) => {
      if (Number(plantaId) === 1) {
        return {
          ok: true,
          summary: { open: 2, overdue: 1, closed: 0 },
          top_overdue: [{ titulo: "Seguimiento", responsable: "Juan", dias_vencido: 4 }],
        };
      }
      return { ok: true, summary: { open: 0, overdue: 0, closed: 0 }, top_overdue: [] };
    },
    loadSupports: async () => ({ ok: true, reviewable: [], reviewable_count: 0 }),
    ...over,
  };
}

async function composePlant(plantaId, over = {}) {
  return composeExecutiveCycle(null, plantaId, { dashboardAuth: zpAuth() }, composeOpts({ auth: zpAuth(), ...over }));
}

const DIAGNOSIS_PHRASES = [
  "¿Qué debería preocuparme?",
  "¿Qué me debería preocupar?",
  "¿Dónde estamos fallando?",
  "¿Dónde tenemos problemas?",
  "¿Qué riesgos ves?",
  "¿Qué está funcionando y qué no?",
];

describe("DIAGNOSIS routing — planner unknown, need implemented", () => {
  it("1. ¿Qué debería preocuparme? deja unknown en planner y entra a DIAGNOSIS", () => {
    const q = "¿Qué debería preocuparme?";
    assert.equal(planDirectorIaQuestion(q).intent, "unknown");
    assert.equal(detectDirectorIaIntent(q).intent, "unknown");
    const need = resolveExecutiveNeed(q);
    assert.equal(need.need_type, NEED_TYPES.DIAGNOSIS_OBSERVATION_RISK);
    assert.equal(need.implemented, true);
    assert.equal(shouldHandleDiagnosisObservationRisk(need, {}, "unknown"), true);
    assert.equal(shouldHandleExecutiveStatus(need, {}, "unknown"), false);
  });

  it("2-6. parafrasis de preocupación / fallo / riesgo / funcionando", () => {
    for (const q of DIAGNOSIS_PHRASES) {
      assert.equal(planDirectorIaQuestion(q).intent, "unknown", q);
      assert.equal(isDiagnosisObservationRiskQuestion(q), true, q);
      const need = resolveExecutiveNeed(q);
      assert.equal(need.need_type, NEED_TYPES.DIAGNOSIS_OBSERVATION_RISK, q);
      assert.equal(need.implemented, true, q);
    }
  });

  it("no es phrasebook de igualdad de frase", () => {
    assert.doesNotMatch(DIAG_SRC, /if\s*\(\s*.*===\s*["']¿Qué debería preocuparme\?["']/);
    assert.doesNotMatch(CEL_SRC, /if\s*\(\s*.*===\s*["']¿Qué debería preocuparme\?["']/);
    assert.doesNotMatch(CHAT_SRC, /if\s*\(\s*.*===\s*["']¿Qué debería preocuparme\?["']/);
    assert.doesNotMatch(DIAG_SRC, /if\s*\(\s*.*===\s*["']¿Qué riesgos ves\?["']/);
  });
});

describe("DIAGNOSIS findings from existing PRE_CLOSE signals", () => {
  it("6. venta debajo de meta es DEVIATION, no causa", async () => {
    const pack = await composePlant(1);
    const findings = projectFindingsFromCyclePack(pack);
    const dev = findings.find((f) => f.level === "DEVIATION" && f.kind === "SALES_BELOW_TARGET");
    assert.ok(dev);
    assert.equal(dev.plant_id, 1);
    assert.equal(dev.period, "2026-08");
    assert.equal(dev.observed, pack.plants[0].current.venta_ton);
    assert.equal(dev.reference, 1200);
    const answer = formatDiagnosisAnswer(findings, pack);
    assert.match(answer, /DEVIATION/);
    assert.match(answer, /OBSERVATION/);
    assert.match(answer, /RISK/);
    assert.equal(containsForbiddenCausalLanguage(answer), false);
    assert.doesNotMatch(answer, /la causa es/i);
    assert.doesNotMatch(answer, /se debe a/i);
  });

  it("7. cliente perdido es OBSERVATION + RISK tipado existente", async () => {
    const pack = await composePlant(1);
    const findings = projectFindingsFromCyclePack(pack);
    assert.ok(findings.some((f) => f.level === "OBSERVATION" && f.kind === "LOST_CLIENT" && f.client === "PERDIDO"));
    assert.ok(findings.some((f) => f.level === "RISK" && f.risk_code === "LOST_HIGH_VOLUME_CLIENT"));
    assert.ok(TYPED_RISK_CODES.includes("LOST_HIGH_VOLUME_CLIENT"));
  });

  it("8. acción vencida es OBSERVATION + RISK OVERDUE_ACTION", async () => {
    const pack = await composePlant(1);
    const findings = projectFindingsFromCyclePack(pack);
    assert.ok(findings.some((f) => f.level === "OBSERVATION" && f.kind === "OVERDUE_ACTION_COUNT"));
    assert.ok(findings.some((f) => f.level === "RISK" && f.risk_code === "OVERDUE_ACTION"));
    const answer = formatDiagnosisAnswer(findings, pack);
    assert.match(answer, /OVERDUE_ACTION/);
    assert.doesNotMatch(answer, /el responsable es/i);
    assert.doesNotMatch(answer, /porque/i);
  });

  it("solo reutiliza risk_code PRE_CLOSE existentes", async () => {
    const pack = await composePlant(1);
    const findings = projectFindingsFromCyclePack(pack);
    for (const f of findings.filter((x) => x.level === "RISK")) {
      assert.ok(TYPED_RISK_CODES.includes(f.risk_code), f.risk_code);
    }
    assert.doesNotMatch(DIAG_SRC, /risk_code:\s*["'][A-Z_]+["']/);
  });

  it("9. pregunta causal no produce causa ni entra a DIAGNOSIS", () => {
    const q = "¿Por qué estamos debajo de la meta?";
    assert.equal(isDiagnosisObservationRiskQuestion(q), false);
    const need = resolveExecutiveNeed(q);
    assert.equal(need.need_type, NEED_TYPES.CAUSE_EXPLANATION);
    assert.equal(need.implemented, false);
    assert.equal(shouldHandleDiagnosisObservationRisk(need, {}, "unknown"), false);
  });

  it("10. comentario humano no se promueve a causa", async () => {
    const pack = await composePlant(1);
    const findings = projectFindingsFromCyclePack(pack, {
      human_comments: [{ text: "La causa es competencia", cliente: "ARTURO" }],
    });
    const answer = formatDiagnosisAnswer(findings, pack);
    assert.equal(containsForbiddenCausalLanguage(answer), false);
    assert.doesNotMatch(answer, /competencia/i);
    assert.doesNotMatch(answer, /la causa es/i);
    assert.ok(!findings.some((f) => f.level === "CONFIRMED_CAUSE" || f.kind === "HYPOTHESIS"));
  });

  it("11. Action Register no se promueve a causa", async () => {
    const pack = await composePlant(1);
    const findings = projectFindingsFromCyclePack(pack, {
      action_register_notes: [{ comment: "Esto ocurrió porque no visitamos" }],
    });
    const answer = formatDiagnosisAnswer(findings, pack);
    assert.ok(findings.some((f) => f.kind === "OVERDUE_ACTION_COUNT" || f.risk_code === "OVERDUE_ACTION"));
    assert.doesNotMatch(answer, /esto ocurri[oó] porque/i);
    assert.doesNotMatch(answer, /no visitamos/i);
    assert.doesNotMatch(answer, /la causa es/i);
  });

  it("12. no cruce de planta", async () => {
    const pack = await composePlant(1);
    assert.equal(pack.plants.length, 1);
    assert.equal(pack.plants[0].identity.planta_id, 1);
    const findings = projectFindingsFromCyclePack(pack);
    assert.ok(findings.every((f) => f.plant_id === 1));
    const blob = JSON.stringify(findings);
    assert.doesNotMatch(blob, /Acapulco/);
    assert.doesNotMatch(blob, /BETA/);
  });

  it("13. no cruce de periodo", async () => {
    const seen = [];
    const pack = await composePlant(1, {
      targetByPlant: undefined,
      loadTarget: async ({ year, month, plant }) => {
        seen.push(`${year}-${String(month).padStart(2, "0")}-${plant.planta_id}`);
        if (year === 2026 && month === 8 && Number(plant.planta_id) === 1) {
          return { venta_ton: 1200, version_id: 10, version_number: 1 };
        }
        return { venta_ton: 9999 };
      },
    });
    assert.ok(seen.every((s) => s.startsWith("2026-08-")));
    assert.equal(pack.period, "2026-08");
    const findings = projectFindingsFromCyclePack(pack, { period: "2026-08" });
    assert.ok(findings.every((f) => !f.period || f.period === "2026-08"));
    assert.ok(!findings.some((f) => f.reference === 9999 || f.observed === 9999));
  });
});

describe("DIAGNOSIS boundaries", () => {
  it("¿Qué tengo que atender? no entra", () => {
    const q = "¿Qué tengo que atender?";
    assert.equal(isDiagnosisObservationRiskQuestion(q), false);
    assert.notEqual(resolveExecutiveNeed(q).need_type, NEED_TYPES.DIAGNOSIS_OBSERVATION_RISK);
  });

  it("¿Qué es lo más importante? no entra", () => {
    const q = "¿Qué es lo más importante?";
    assert.equal(isDiagnosisObservationRiskQuestion(q), false);
    assert.notEqual(resolveExecutiveNeed(q).need_type, NEED_TYPES.DIAGNOSIS_OBSERVATION_RISK);
  });

  it("¿Qué tal estás? no es diagnóstico ejecutivo", () => {
    const q = "¿Qué tal estás?";
    assert.equal(isDiagnosisObservationRiskQuestion(q), false);
    assert.notEqual(resolveExecutiveNeed(q).need_type, NEED_TYPES.DIAGNOSIS_OBSERVATION_RISK);
    assert.notEqual(resolveExecutiveNeed(q).need_type, NEED_TYPES.EXECUTIVE_STATUS);
  });

  it("preocup + planta sigue PRE_CLOSE especializado, no DIAGNOSIS suelto", () => {
    const q = "¿Qué debería preocuparme de la planta?";
    const need = resolveExecutiveNeed(q);
    assert.equal(need.specialized, true);
    assert.notEqual(need.need_type, NEED_TYPES.DIAGNOSIS_OBSERVATION_RISK);
  });

  it("no override de month_close / daily / executive_status", () => {
    const monthQ = "¿Cómo vamos contra la meta?";
    assert.equal(isMonthCloseQuestion(monthQ), true);
    assert.equal(planDirectorIaQuestion(monthQ).intent, "month_close_result");
    assert.equal(resolveExecutiveNeed(monthQ).specialized, true);
    assert.equal(
      shouldHandleDiagnosisObservationRisk(resolveExecutiveNeed(monthQ), {}, "month_close_result"),
      false
    );

    const dailyQ = "Dame el resumen de hoy";
    assert.equal(isDailyExecutiveBriefQuestion(dailyQ), true);
    assert.equal(planDirectorIaQuestion(dailyQ).intent, "daily_executive_brief");
    assert.equal(
      shouldHandleDiagnosisObservationRisk(resolveExecutiveNeed(dailyQ), {}, "daily_executive_brief"),
      false
    );

    const statusQ = "¿Cómo vamos?";
    assert.equal(isExecutiveStatusQuestion(statusQ), true);
    const statusNeed = resolveExecutiveNeed(statusQ);
    assert.equal(statusNeed.need_type, NEED_TYPES.EXECUTIVE_STATUS);
    assert.equal(shouldHandleExecutiveStatus(statusNeed, {}, "unknown"), true);
    assert.equal(shouldHandleDiagnosisObservationRisk(statusNeed, {}, "unknown"), false);
    assert.equal(isDiagnosisObservationRiskQuestion(statusQ), false);
  });
});

describe("DIAGNOSIS load + output contract", () => {
  it("loadExecutiveDiagnosisForChat proyecta hallazgos y no llama causa", async () => {
    const loaded = await loadExecutiveDiagnosisForChat(null, 1, { dashboardAuth: zpAuth() }, {
      question: "¿Qué debería preocuparme?",
      composeOpts: composeOpts({ auth: zpAuth() }),
    });
    assert.equal(loaded.ok, true);
    assert.ok(loaded.findings.some((f) => f.level === "DEVIATION"));
    assert.ok(loaded.findings.some((f) => f.level === "RISK"));
    const answer = formatDiagnosisAnswer(loaded.findings, loaded.pack);
    assert.match(answer, /^Diagnóstico ejecutivo/m);
    assert.match(answer, /\bOBSERVATION\b/);
    assert.match(answer, /\bDEVIATION\b/);
    assert.match(answer, /\bRISK\b/);
    assert.equal(containsForbiddenCausalLanguage(answer), false);
  });

  it("agrupa hallazgos sin ranking de prioridad", async () => {
    const pack = await composePlant(1);
    const findings = projectFindingsFromCyclePack(pack);
    const answer = formatDiagnosisAnswer(findings, pack, { principal_problem_asked: true });
    assert.match(answer, /sin ranking/i);
    assert.doesNotMatch(answer, /lo más importante es/i);
    assert.doesNotMatch(answer, /recomiendo/i);
  });
});
