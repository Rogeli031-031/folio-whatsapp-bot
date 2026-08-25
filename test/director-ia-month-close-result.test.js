"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  resolveConversationTurn,
  INHERITABLE_INTENTS,
} = require("../lib/director-ia-conversation-state");
const { getDirectorIaTool } = require("../lib/director-ia-tools");
const { detectUnsupportedDirectorIaDomain, isMonthCloseQuery } = require("../lib/director-ia-capabilities");
const {
  isMonthCloseQuestion,
  isMonthCloseFollowUp,
  resolveCloseMonth,
  periodStatus,
  pickCurrentMetaVersion,
  assembleMonthClosePack,
  loadMonthCloseResultForChat,
  toYyyyMm,
} = require("../lib/director-ia-month-close-result");
const { findIgfRowForPlant } = require("../lib/director-ia-igf-arr");

const ROOT = path.join(__dirname, "..");
const LIB_FILES = [
  "director-ia-month-close-result.js",
  "director-ia-planner.js",
  "director-ia-conversation-state.js",
  "director-ia-chat.js",
  "director-ia-tools.js",
  "director-ia-capabilities.js",
];

function echoClose(over = {}) {
  return {
    parent_intent: "month_close_result",
    planta_id: 1,
    active_entities: [],
    last_evidence_bundle_type: "month_close_result",
    pending_information_gap: null,
    active_date: null,
    active_period_months: over.active_period_months || ["2026-06"],
    meeting_type: "monthly_close",
    previous_frame: null,
    ...over,
  };
}

function echoPre(over = {}) {
  return {
    parent_intent: "pre_meeting_brief",
    planta_id: 1,
    active_entities: [],
    last_evidence_bundle_type: "pre_meeting_brief",
    pending_information_gap: null,
    active_period_months: ["2026-08"],
    meeting_type: "monthly_close",
    previous_frame: null,
    ...over,
  };
}

function resolve(question, echoed, plantaId = 1) {
  return resolveConversationTurn({
    question,
    plantaId,
    echoedState: echoed,
    detectIntent: detectDirectorIaIntent,
  });
}

function salesRow(month, cliente, kg, canal = "Casa") {
  return { month, cliente_norm: cliente, canal, subcanal: "", kg };
}

function packOpts(over = {}) {
  return {
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "PUE" },
    planta_id: 1,
    year: 2026,
    month: 6,
    period_status: "COMPLETE",
    generated_at: "2026-08-24T00:00:00.000Z",
    salesRows: [
      salesRow("2026-06", "ACME", 8000, "Casa"),
      salesRow("2026-06", "BETA", 2000, "Comisionista"),
    ],
    priorSalesRows: [
      salesRow("2026-05", "ACME", 5000, "Casa"),
      salesRow("2026-05", "VIEJO", 3000, "Casa"),
    ],
    discountRows: [
      { month: "2026-06", cliente_norm: "ACME", canal: "Casa", subcanal: "", monto: -2000 },
      { month: "2026-06", cliente_norm: "BETA", canal: "Comisionista", subcanal: "", monto: -500 },
    ],
    target: {
      version_id: 9,
      version_number: 2,
      empresa: "Puebla",
      venta_ton: 12,
      row: { empresa: "Puebla", venta_ton: 12, margen_kg: 1.5, util_oper_importe: 100 },
    },
    forecast: {
      version_id: 3,
      version_number: 1,
      row: { empresa: "Puebla", venta_ton: 11, margen_kg: 1.2 },
      composition: { lines: [] },
    },
    actions: { ok: true, summary: { open: 2, closed: 1, overdue: 1 }, top_overdue: [{ resultado_cierre: null }] },
    comments: [],
    limitations: [],
    ...over,
  };
}

describe("month_close_result planner + capabilities", () => {
  it("preguntas de cierre van a month_close_result; pre-cierre se preserva", () => {
    for (const q of [
      "¿Cómo cerramos?",
      "¿Cómo cerró Puebla en julio?",
      "¿Cómo quedamos contra la meta?",
      "¿Cuánto nos faltó para la meta?",
      "¿Qué porcentaje cumplimos?",
    ]) {
      assert.equal(detectDirectorIaIntent(q).intent, "month_close_result", q);
      assert.equal(planDirectorIaQuestion(q).intent, "month_close_result", q);
      assert.equal(isMonthCloseQuery(q), true, q);
    }
    assert.equal(detectDirectorIaIntent("Prepárame para la junta de cierre.").intent, "pre_meeting_brief");
    assert.equal(detectDirectorIaIntent("¿Cómo vamos en CASA los últimos 90 días?").intent, "commercial_trend");
  });

  it("no hay phrasebook de product copy en lib", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib", "director-ia-month-close-result.js"), "utf8");
    assert.equal(src.includes("Prepárame para la junta de cierre"), false);
  });

  it("tool read-only registrado", () => {
    const tool = getDirectorIaTool("get_month_close_result");
    assert.equal(tool.executor, "loadMonthCloseResultForChat");
    assert.equal(tool.readOnly, true);
  });

  it("intent inheritable", () => {
    assert.ok(INHERITABLE_INTENTS.includes("month_close_result"));
  });

  it("no dispara dominio no integrado", () => {
    assert.equal(detectUnsupportedDirectorIaDomain("¿Cómo cerramos contra la meta?"), null);
  });
});

describe("month_close_result period + target selection", () => {
  const now = new Date("2026-08-24T18:00:00-06:00");

  it("default es último mes COMPLETE, no 30/90", () => {
    const r = resolveCloseMonth("¿Cómo cerramos?", {}, now);
    assert.deepEqual(r, { year: 2026, month: 7, source: "default_last_complete" });
    assert.equal(periodStatus(2026, 7, now), "COMPLETE");
    assert.equal(periodStatus(2026, 8, now), "PARTIAL");
  });

  it("mes explícito YYYY-MM", () => {
    const r = resolveCloseMonth("¿Cómo cerró Puebla en 2026-06?", {}, now);
    assert.equal(r.year, 2026);
    assert.equal(r.month, 6);
  });

  it("is_current gana; sin current no hay leak de otro mes", () => {
    const versions = [
      { version_number: 1, is_current: false },
      { version_number: 2, is_current: true },
      { version_number: 3, is_current: false },
    ];
    assert.equal(pickCurrentMetaVersion(versions).version_number, 2);
    assert.equal(pickCurrentMetaVersion([{ version_number: 9, is_current: false }]), null);
    assert.equal(pickCurrentMetaVersion([]), null);
  });
});

describe("month_close_result assemble truth classes", () => {
  it("actual + target + delta + attainment; clases separadas", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.sales.actual_class, "ACTUAL");
    assert.equal(pack.sales.target_class, "TARGET_COMMITMENT");
    assert.equal(pack.sales.actual_kg, 10000);
    assert.equal(pack.sales.actual_ton, 10);
    assert.equal(pack.sales.target_ton, 12);
    assert.equal(pack.sales.delta_ton, -2);
    assert.ok(Math.abs(pack.sales.attainment_pct - 1000 / 12) < 1e-9);
    assert.equal(pack.financial.actual.status, "UNSUPPORTED_METRIC");
    assert.equal(pack.financial.target.truth_class, "TARGET_COMMITMENT");
    assert.equal(pack.financial.forecast.truth_class, "FORECAST");
    assert.equal(pack.discount.per_kg, -2500 / 10000);
    assert.equal(pack.channels.casa_kg, 8000);
    assert.equal(pack.channels.comisionista_kg, 2000);
  });

  it("TARGET_MISSING_FOR_PERIOD no usa cero ni mes previo", () => {
    const pack = assembleMonthClosePack(packOpts({ target: null }));
    assert.equal(pack.sales.target_status, "TARGET_MISSING_FOR_PERIOD");
    assert.equal(pack.sales.target_ton, null);
    assert.equal(pack.sales.delta_ton, null);
    assert.equal(pack.sales.attainment_pct, null);
    assert.ok(pack.information_gaps.some((g) => g.kind === "TARGET_MISSING_FOR_PERIOD"));
    assert.equal(pack.sales.actual_ton, 10);
    assert.ok(pack.partial);
  });

  it("target cero no divide", () => {
    const pack = assembleMonthClosePack(
      packOpts({
        target: {
          version_id: 1,
          version_number: 1,
          empresa: "Puebla",
          venta_ton: 0,
          row: { empresa: "Puebla", venta_ton: 0 },
        },
      })
    );
    assert.equal(pack.sales.target_ton, 0);
    assert.equal(pack.sales.attainment_pct, null);
    assert.ok(pack.limitations.includes("target_zero_no_attainment"));
  });

  it("new/lost/movers por kg actual; mover != causa", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.clients.new.some((c) => c.cliente_norm === "BETA"), true);
    assert.equal(pack.clients.lost.some((c) => c.cliente_norm === "VIEJO"), true);
    assert.ok(pack.clients.top_positive_movers.some((c) => c.cliente_norm === "ACME"));
    assert.ok(pack.clients.rule.includes("mover != cause"));
    assert.ok(pack.information_gaps.some((g) => g.kind === "FINANCIAL_ACTUAL_UNSUPPORTED"));
  });

  it("partial: IGF missing no tumba venta", () => {
    const pack = assembleMonthClosePack(packOpts({ forecast: { missing: true } }));
    assert.equal(pack.sales.actual_ton, 10);
    assert.equal(pack.financial.forecast, null);
    assert.ok(pack.limitations.includes("igf_forecast_missing_for_period"));
  });

  it("partial: actions missing no tumba descuento", () => {
    const pack = assembleMonthClosePack(packOpts({ actions: { ok: false } }));
    assert.equal(pack.discount.status, "OK");
    assert.equal(pack.actions, null);
    assert.ok(pack.limitations.includes("actions_unavailable"));
  });

  it("findIgfRowForPlant no cruza de planta", () => {
    const row = findIgfRowForPlant(
      [
        { empresa: "Morelos", venta_ton: 99 },
        { empresa: "Puebla", venta_ton: 12 },
      ],
      "PUE",
      "Puebla"
    );
    assert.equal(row.empresa, "Puebla");
    assert.equal(row.venta_ton, 12);
  });
});

describe("month_close_result load isolation", () => {
  it("loadTarget del mes exacto; no se pide otro month", async () => {
    const months = [];
    const pack = await loadMonthCloseResultForChat(
      {},
      1,
      { dashboardAuth: { role: "ZP" } },
      {
        now: new Date("2026-08-24T18:00:00-06:00"),
        question: "¿Cómo cerró 2026-06?",
        plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "PUE" },
        plantCodesUpper: ["PUE"],
        salesRows: [salesRow("2026-06", "ACME", 1000)],
        priorSalesRows: [salesRow("2026-05", "ACME", 800)],
        discountRows: [{ month: "2026-06", cliente_norm: "ACME", canal: "Casa", subcanal: "", monto: -100 }],
        loadTarget: async ({ year, month }) => {
          months.push(`${year}-${month}`);
          return {
            version_id: 1,
            version_number: 1,
            empresa: "Puebla",
            venta_ton: 2,
            row: { empresa: "Puebla", venta_ton: 2 },
          };
        },
        loadForecast: async () => ({ missing: true }),
        loadActions: async () => ({ ok: true, summary: { open: 0, closed: 0, overdue: 0 }, top_overdue: [] }),
        comments: [],
      }
    );
    assert.deepEqual(months, ["2026-6"]);
    assert.equal(pack.month, "2026-06");
    assert.equal(pack.sales.target_ton, 2);
  });
});

describe("month_close_result routing", () => {
  it("pre_meeting handoff a month_close y requery", () => {
    const t = resolve("¿Y cómo cerramos el mes?", echoPre());
    assert.equal(t.inherit_parent_intent, "month_close_result");
    assert.equal(t.month_close_handoff_from_pre_meeting, true);
  });

  it("follow-up de meta/canal hereda month_close", () => {
    assert.equal(resolve("¿Contra la meta?", echoClose()).inherit_parent_intent, "month_close_result");
    assert.equal(resolve("¿Y CASA?", echoClose()).inherit_parent_intent, "month_close_result");
    assert.equal(resolve("¿Qué pasó con el descuento?", echoClose()).inherit_parent_intent, "month_close_result");
    assert.equal(resolve("¿Qué clientes perdimos?", echoClose()).inherit_parent_intent, "month_close_result");
    assert.equal(isMonthCloseFollowUp("¿Contra la meta?"), true);
  });

  it("client handoff cuando hay entidad activa", () => {
    const echoed = echoClose({
      active_entities: [{ kind: "client", display: "ACME", cliente_key: "1|x|casa||acme", cliente_keys: ["1|x|casa||acme"] }],
    });
    const t = resolve("Háblame del cliente ACME", echoed);
    assert.equal(t.inherit_parent_intent, "client_profile");
  });
});

describe("askDirectorIa month_close_result", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    configureDirectorIaChat({
      pool: null,
      openaiChat: undefined,
      loadMonthCloseResultForChat: undefined,
      loadPreMeetingBriefForChat: undefined,
      loadClientProfileForChat: undefined,
      loadCommercialTrendForChat: undefined,
    });
  });

  it("una síntesis y state de routing; inherit reconsulta", async () => {
    let loads = 0;
    configureDirectorIaChat({
      pool: { connect: async () => ({ release() {} }) },
      openaiChat: async () => "La venta real fue 10 t frente a una meta comprometida de 12 t.",
      loadMonthCloseResultForChat: async (_p, plantaId, _r, opts) => {
        loads += 1;
        assert.equal(plantaId, 1);
        return {
          ok: true,
          plant: { planta_id: 1, planta_nombre: "Puebla" },
          month: opts && String(opts.question || "").includes("2026-06") ? "2026-06" : "2026-07",
          period_status: "COMPLETE",
          sales: { actual_ton: 10, target_ton: 12, target_status: "OK" },
          information_gaps: [],
          limitations: [],
          provenance: { requery: true },
        };
      },
    });
    const req = { dashboardAuth: { role: "ZP" }, body: {} };
    const t1 = await askDirectorIa(req, 1, "¿Cómo cerramos?");
    assert.equal(t1.ok, true);
    assert.equal(t1.context_meta.mode, "month_close_result");
    assert.equal(t1.context_meta.writes, false);
    assert.equal(t1.context_meta.plaud, false);
    assert.equal(t1.context_meta.conversation_state.parent_intent, "month_close_result");
    assert.equal(t1.context_meta.truth_classes.target, "igf_meta");
    assert.equal(t1.context_meta.truth_classes.financial_actual, "UNSUPPORTED_METRIC");

    const t2 = await askDirectorIa(
      { ...req, body: { conversation_state: t1.context_meta.conversation_state } },
      1,
      "¿Contra la meta?"
    );
    assert.equal(t2.context_meta.mode, "month_close_result");
    assert.ok(loads >= 2);
  });

  it("handoff desde pre_meeting no reabre el brief", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Cierre.",
      loadPreMeetingBriefForChat: async () => {
        throw new Error("pre_meeting no debe correr");
      },
      loadMonthCloseResultForChat: async () => ({
        ok: true,
        plant: { planta_id: 1, planta_nombre: "Puebla" },
        month: "2026-07",
        period_status: "COMPLETE",
        sales: { actual_ton: 1, target_status: "TARGET_MISSING_FOR_PERIOD" },
        information_gaps: [{ kind: "TARGET_MISSING_FOR_PERIOD" }],
        limitations: ["TARGET_MISSING_FOR_PERIOD"],
        provenance: { requery: true },
      }),
    });
    const out = await askDirectorIa(
      {
        dashboardAuth: { role: "ZP" },
        body: {
          conversation_state: echoPre(),
        },
      },
      1,
      "¿Y cómo cerramos el mes?"
    );
    assert.equal(out.context_meta.mode, "month_close_result");
  });
});

describe("month_close_result no-regression files exist", () => {
  for (const f of LIB_FILES) {
    it(`lib/${f}`, () => {
      assert.ok(fs.existsSync(path.join(ROOT, "lib", f)));
    });
  }
});
