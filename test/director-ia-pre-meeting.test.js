"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  resolveConversationTurn,
  INHERITABLE_INTENTS,
  emptyConversationState,
  sanitizeEchoedState,
} = require("../lib/director-ia-conversation-state");
const { getDirectorIaTool, validateDirectorIaToolRegistry } = require("../lib/director-ia-tools");
const {
  detectUnsupportedDirectorIaDomain,
  isPreMeetingQuery,
} = require("../lib/director-ia-capabilities");
const {
  isPreMeetingQuestion,
  isPreMeetingFollowUp,
  detectClosedMonthRequest,
  loadPreMeetingBriefForChat,
  formatPreMeetingContext,
  buildPreMeetingPrompt,
  SYSTEM_ADDENDUM,
  MEETING_TYPE,
} = require("../lib/director-ia-pre-meeting");

const ROOT = path.join(__dirname, "..");
const LIB_FILES = [
  "director-ia-pre-meeting.js",
  "director-ia-planner.js",
  "director-ia-conversation-state.js",
  "director-ia-chat.js",
  "director-ia-tools.js",
  "director-ia-capabilities.js",
];

const CANONICAL = [
  "Prepárame para la junta de cierre.",
  "¿Qué debo llevar preparado para la junta?",
  "Dame un pre-cierre ejecutivo.",
  "¿Qué debería revisar antes de entrar?",
  "¿Qué huecos tenemos antes de la junta?",
];
const HOLDOUTS = [
  "Necesito el panorama para la reunión de cierre",
  "Ármame el briefing de junta",
  "Qué puntos conviene aclarar antes de la reunión",
  "Quiero un recuento ejecutivo para entrar a la junta",
  "Hay algo que falte documentar antes de la junta",
];

function echoPre(over = {}) {
  return {
    parent_intent: "pre_meeting_brief",
    planta_id: 1,
    active_entities: [],
    last_evidence_bundle_type: "pre_meeting_brief",
    pending_information_gap: null,
    active_date: null,
    active_period_months: over.active_period_months || ["2026-08"],
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

function dailyOk(over = {}) {
  return {
    ok: true,
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
    target_date: "2026-08-23",
    today_ymd: "2026-08-24",
    sales: { available: true, assembled: { detection: { target_date: "2026-08-23" } }, limitations: [] },
    discount: { available: true, assembled: { detection: { target_date: "2026-08-23" } }, limitations: [] },
    brief_limitations: [],
    information_gaps: {
      sales: over.salesGaps || [
        { cliente_norm: "ARTURO", explanation_gap: true },
      ],
      discount: [],
    },
    provenance: { source: "arr.ventas_diarias_cliente", requery: true },
    partial: false,
    assembly_status: "ok",
    limitations: [],
    ...over,
  };
}

function trendOk(over = {}) {
  return {
    ok: true,
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
    range_days: 90,
    channel: "both",
    first_mover: {
      cliente_key: "puebla|arturo",
      cliente: "ARTURO",
      display: "ARTURO",
    },
    top_movers: [
      { cliente_key: "puebla|arturo", cliente: "ARTURO", display: "ARTURO" },
      { cliente_key: "puebla|beta", cliente: "BETA", display: "BETA" },
    ],
    provenance: { source: "commercial_trend", requery: true, range_days: 90 },
    limitations: [],
    ...over,
  };
}

function profileOk(over = {}) {
  return {
    ok: true,
    identity: {
      cliente_key: over.cliente_key || "puebla|arturo",
      display_name: over.display_name || "ARTURO",
    },
    comments: over.comments || [],
    actions: over.actions || [],
    limitations: ["ingreso actual no soportado"],
    provenance: { requery: true },
    ...over,
  };
}

function igfOk() {
  return {
    ok: true,
    year: 2026,
    month: 8,
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
    igf: {
      version_number: 3,
      version_id: 88,
      row: { utilidad: 12 },
      composition: null,
      load_error: null,
    },
  };
}

function supportsOk() {
  return {
    ok: true,
    planta_id: 1,
    planta_nombre: "Puebla",
    periodo: { mes_cargo: "2026-08" },
    reviewable: [{ id: 11, numero_folio: "F-11" }],
    reviewable_count: 1,
    not_cancellable: [],
    not_cancellable_count: 0,
    limitations: ["reviewable != cancelar != ahorro"],
  };
}

function actionsOk() {
  return {
    ok: true,
    period: { kind: "board_snapshot", as_of: "2026-08-24" },
    summary: { open: 2, closed: 0, overdue: 1 },
    top_overdue: [
      {
        id: 41,
        titulo: "Cerrar evidencia de Oficinas",
        tema: "Oficinas",
        dias_vencido: 23,
        responsable: "Julio Pérez",
      },
    ],
    provenance: { source: "arr.action_register_items", requery: true },
    limitations: [],
  };
}

function loadOpts(over = {}) {
  return {
    question: over.question || CANONICAL[0],
    now: new Date("2026-08-24T18:00:00-06:00"),
    openYearMonth: { year: 2026, month: 8 },
    auth: { role: "ZP" },
    loadDailyBrief: async () => dailyOk(),
    loadTrend: async () => trendOk(),
    loadProfile: async (_p, _id, _req, opts) =>
      profileOk({
        cliente_key: opts.cliente_key,
        display_name: opts.display_name,
      }),
    loadIgf: async () => igfOk(),
    loadSupports: async () => supportsOk(),
    loadActions: async () => actionsOk(),
    ...over,
  };
}

describe("pre_meeting_brief planner + capabilities", () => {
  it("canónicos y hold-outs van a pre_meeting_brief; no phrasebook en lib", () => {
    for (const q of CANONICAL) {
      assert.equal(isPreMeetingQuestion(q), true, q);
      assert.equal(detectDirectorIaIntent(q).intent, "pre_meeting_brief", q);
      assert.equal(planDirectorIaQuestion(q).intent, "pre_meeting_brief", q);
      assert.equal(detectUnsupportedDirectorIaDomain(q), null, q);
      assert.equal(isPreMeetingQuery(q), true, q);
    }
    for (const q of HOLDOUTS) {
      assert.equal(isPreMeetingQuestion(q), true, q);
      assert.equal(detectDirectorIaIntent(q).intent, "pre_meeting_brief", q);
      assert.equal(detectUnsupportedDirectorIaDomain(q), null, q);
    }
    const src = LIB_FILES.map((f) => fs.readFileSync(path.join(ROOT, "lib", f), "utf8")).join("\n");
    for (const q of [...CANONICAL, ...HOLDOUTS]) {
      assert.equal(src.includes(q), false, q);
    }
  });

  it("no sobrecarga plant_diagnosis, daily, trend, profile, reviewable, taller", () => {
    assert.equal(detectDirectorIaIntent("¿Cómo va la planta?").intent, "plant_diagnosis");
    assert.equal(detectDirectorIaIntent("¿Cómo nos fue ayer?").intent, "daily_executive_brief");
    assert.equal(detectDirectorIaIntent("¿Cómo estuvo la venta ayer?").intent, "daily_sales_deviation");
    assert.equal(detectDirectorIaIntent("¿Cómo estuvo el descuento ayer?").intent, "daily_discount_deviation");
    assert.equal(detectDirectorIaIntent("¿Cómo vamos en CASA?").intent, "commercial_trend");
    assert.equal(detectDirectorIaIntent("Háblame del cliente Arturo").intent, "client_profile");
    assert.equal(detectDirectorIaIntent("¿Qué apoyos puedo revisar?").intent, "igf_reviewable_supports");
    assert.equal(detectDirectorIaIntent("¿Qué unidades tienen Taller Mayor?").intent, "taller_mayor");
    assert.equal(detectDirectorIaIntent("¿Qué acciones están vencidas?").intent, "overdue_actions");
  });

  it("tool read-only y registry válido", () => {
    const tool = getDirectorIaTool("get_pre_meeting_brief");
    assert.equal(tool.executor, "loadPreMeetingBriefForChat");
    assert.equal(tool.readOnly, true);
    assert.equal(tool.domain, "arr");
    assert.equal(validateDirectorIaToolRegistry().ok, true);
    assert.match(SYSTEM_ADDENDUM, /No inventes causa/i);
    assert.match(SYSTEM_ADDENDUM, /El Consejo te va a preguntar/i);
    assert.ok(INHERITABLE_INTENTS.includes("pre_meeting_brief"));
  });
});

describe("pre_meeting_brief compose", () => {
  it("una planta, mes abierto, cinco secciones + gaps", async () => {
    const pack = await loadPreMeetingBriefForChat({}, 1, { dashboardAuth: { role: "ZP" } }, loadOpts());
    assert.equal(pack.ok, true);
    assert.equal(pack.plant.planta_id, 1);
    assert.equal(pack.meeting_period, "2026-08");
    assert.equal(pack.meeting_type, MEETING_TYPE);
    assert.equal(pack.commercial.daily.available, true);
    assert.equal(pack.commercial.trend.available, true);
    assert.ok(pack.commercial.profiles.length >= 1);
    assert.ok(pack.commercial.profiles.length <= 3);
    assert.equal(pack.financial.igf.available, true);
    assert.equal(pack.actions.available, true);
    assert.equal(pack.supports.available, true);
    assert.ok(Array.isArray(pack.information_gaps));
    assert.ok(pack.information_gaps.length > 0);
    assert.ok(pack.information_gaps.some((g) => g.kind === "commercial_movement_unexplained"));
    assert.ok(pack.information_gaps.some((g) => g.kind === "igf_no_causal_driver"));
    assert.ok(pack.information_gaps.some((g) => /No encuentro evidencia|No hay resultado|Conviene obtener/i.test(g.statement)));
    assert.equal(pack.provenance.requery, true);
    assert.ok(pack.limitations.includes("taller_mayor_excluded_from_first_slice"));
    assert.ok(pack.limitations.includes("mejora_continua_excluded_from_first_slice"));
    assert.ok(pack.limitations.includes("plaud_excluded"));
    assert.ok(pack.limitations.includes("read_only"));
    const ctx = formatPreMeetingContext(pack);
    assert.match(ctx, /BLOQUE COMERCIAL/);
    assert.match(ctx, /BLOQUE IGF/);
    assert.match(ctx, /BLOQUE ACCIONES/);
    assert.match(ctx, /BLOQUE APOYOS REVIEWABLE/);
    assert.match(ctx, /INFORMATION GAPS/);
    assert.doesNotMatch(ctx, /=== BLOQUE TALLER MAYOR/);
    assert.doesNotMatch(ctx, /=== BLOQUE MEJORA CONTINUA/);
    assert.doesNotMatch(ctx, /\bPlaud runtime\b/);
    for (const r of pack.suggested_requests) {
      assert.equal(r.writes, false);
      assert.equal(r.sends_message, false);
    }
  });

  it("una fuente puede fallar; missing != 0; error aislado", async () => {
    const pack = await loadPreMeetingBriefForChat(
      {},
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts({
        loadDailyBrief: async () => {
          throw new Error("daily boom");
        },
      })
    );
    assert.equal(pack.ok, true);
    assert.equal(pack.partial, true);
    assert.equal(pack.assembly_status, "partial");
    assert.equal(pack.commercial.daily.available, false);
    assert.equal(pack.commercial.daily.missing, true);
    assert.equal(pack.financial.igf.available, true);
    assert.equal(pack.actions.available, true);
    assert.ok(pack.limitations.includes("commercial:daily_unavailable"));
    assert.ok(pack.information_gaps.some((g) => g.kind === "source_unavailable"));
    assert.equal(
      pack.information_gaps.some((g) => /daily boom/.test(g.statement) && /causa/i.test(g.statement)),
      false
    );
    const ctx = formatPreMeetingContext(pack);
    assert.match(ctx, /missing=true/);
    assert.doesNotMatch(ctx, /venta kg=0 por error/);
  });

  it("todas las críticas abortan authz → fail closed", async () => {
    const denied = {
      ok: false,
      abort: true,
      status: 403,
      code: "SOURCE_RESTRICTED",
      error: "Sin acceso",
    };
    const pack = await loadPreMeetingBriefForChat(
      {},
      9,
      { dashboardAuth: { role: "GA", plantas_permitidas: [1] } },
      loadOpts({
        loadDailyBrief: async () => denied,
        loadTrend: async () => denied,
        loadIgf: async () => denied,
        loadSupports: async () => denied,
        loadActions: async () => denied,
      })
    );
    assert.equal(pack.abort, true);
    assert.equal(pack.status, 403);
  });

  it("mes cerrado nombrado es limitation; no sustituye el abierto", async () => {
    const igfQuestions = [];
    const pack = await loadPreMeetingBriefForChat(
      {},
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts({
        question: "Prepárame la junta de mayo",
        loadIgf: async (_p, _id, _req, question) => {
          igfQuestions.push(question);
          return igfOk();
        },
      })
    );
    assert.equal(pack.ok, true);
    assert.equal(pack.closed_month_named, true);
    assert.ok(pack.named_closed_periods.includes("2026-05"));
    assert.equal(pack.meeting_period, "2026-08");
    assert.ok(pack.limitations.includes("closed_month_requested_out_of_first_slice"));
    assert.ok(pack.limitations.includes("open_month_not_substituted_as_named_closed_month"));
    assert.ok(pack.information_gaps.some((g) => g.kind === "closed_month_out_of_scope"));
    assert.deepEqual(igfQuestions, ["igf"]);
    const closed = detectClosedMonthRequest("el mes cerrado de mayo", { year: 2026, month: 8 });
    assert.equal(closed.requested, true);
  });

  it("requery fresco y no mutación", async () => {
    let loads = 0;
    const opts = loadOpts({
      loadDailyBrief: async () => {
        loads += 1;
        return dailyOk();
      },
    });
    const a = await loadPreMeetingBriefForChat({}, 1, { dashboardAuth: { role: "ZP" } }, opts);
    const b = await loadPreMeetingBriefForChat({}, 1, { dashboardAuth: { role: "ZP" } }, opts);
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.equal(loads, 2);
    const src = fs.readFileSync(path.join(ROOT, "lib", "director-ia-pre-meeting.js"), "utf8");
    assert.equal(/\bINSERT INTO\b/.test(src), false);
    assert.equal(/\bcancelFolio\b/.test(src), false);
    assert.equal(/\bsendWhatsApp\b/.test(src), false);
    assert.match(src, /writes:\s*false/);
  });
});

describe("pre_meeting_brief follow-ups", () => {
  it("preocupa y falta explicar heredan; standalones se van", () => {
    const echoed = echoPre();
    assert.equal(isPreMeetingFollowUp("¿Qué me preocupa más?", "other"), true);
    assert.equal(resolve("¿Qué me preocupa más?", echoed).inherit_parent_intent, "pre_meeting_brief");
    assert.equal(resolve("¿Qué falta explicar?", echoed).inherit_parent_intent, "pre_meeting_brief");
    assert.equal(resolve("¿Qué acciones están vencidas?", echoed).inherit_parent_intent, null);
    assert.equal(resolve("¿Qué acciones están vencidas?", echoed).detected_intent, "overdue_actions");
    assert.equal(resolve("¿Qué apoyos puedo revisar?", echoed).inherit_parent_intent, null);
    assert.equal(resolve("¿Qué apoyos puedo revisar?", echoed).detected_intent, "igf_reviewable_supports");
    assert.equal(resolve("Háblame del cliente Arturo", echoed).inherit_parent_intent, null);
    assert.equal(resolve("Háblame del cliente Arturo", echoed).detected_intent, "client_profile");
    assert.equal(resolve("¿Cómo vamos en CASA?", echoed).inherit_parent_intent, null);
    assert.equal(resolve("¿Cómo vamos en CASA?", echoed).detected_intent, "commercial_trend");
    assert.equal(resolve("¿Qué unidades tienen Taller Mayor?", echoed).inherit_parent_intent, null);
    assert.equal(resolve("¿Qué unidades tienen Taller Mayor?", echoed).detected_intent, "taller_mayor");
    assert.equal(resolve("Háblame del primero", echoed).detected_intent !== "client_profile", true);
  });

  it("same-plant keep; cross-plant limpia", () => {
    const echoed = echoPre({ planta_id: 1 });
    const same = sanitizeEchoedState(echoed, 1);
    assert.equal(same.meeting_type, "monthly_close");
    assert.deepEqual(same.active_period_months, ["2026-08"]);
    const cross = sanitizeEchoedState(echoed, 2);
    assert.equal(cross.plant_mismatch, true);
    assert.equal(cross.meeting_type, null);
    const empty = emptyConversationState(1);
    assert.equal(empty.meeting_type, null);
  });
});

describe("askDirectorIa pre_meeting_brief", () => {
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
      loadPreMeetingBriefForChat: undefined,
      loadDailyExecutiveBriefForChat: undefined,
      loadCommercialTrendForChat: undefined,
      loadClientProfileForChat: undefined,
      loadIgfReviewableSupportsForChat: undefined,
      loadTallerMayorForChat: undefined,
      loadTallerAtForChat: undefined,
    });
  });

  it("una síntesis GPT y state mínimo; inherit reconsulta", async () => {
    let loads = 0;
    let openaiCalls = 0;
    configureDirectorIaChat({
      pool: { connect: async () => ({ release() {} }) },
      preMeetingOpenYearMonth: { year: 2026, month: 8 },
      openaiChat: async () => {
        openaiCalls += 1;
        return "Síntesis de preparación. Conviene estar preparado para explicar los huecos.";
      },
      loadPreMeetingBriefForChat: async (_p, plantaId) => {
        loads += 1;
        assert.equal(plantaId, 1);
        return {
          ok: true,
          plant: { planta_id: 1, planta_nombre: "Puebla" },
          meeting_period: "2026-08",
          meeting_type: "monthly_close",
          information_gaps: [{ kind: "commercial_movement_unexplained", statement: "No encuentro evidencia cargada que explique este movimiento." }],
          suggested_requests: [],
          limitations: ["read_only"],
          partial: false,
          assembly_status: "complete",
          provenance: { requery: true },
          pending_information_gap: { missing_fields: ["comentario_o_dicf"], why_blocks: "falta evidencia", physical_source: null, physical_person: null },
        };
      },
    });
    const req = { dashboardAuth: { role: "ZP" }, body: {} };
    const t1 = await askDirectorIa(req, 1, CANONICAL[0]);
    assert.equal(t1.ok, true);
    assert.equal(t1.context_meta.mode, "pre_meeting_brief");
    assert.equal(t1.context_meta.openai_call_count, 1);
    assert.equal(t1.context_meta.writes, false);
    assert.equal(t1.context_meta.plaud, false);
    assert.equal(t1.context_meta.taller_mayor_included, false);
    assert.equal(t1.context_meta.conversation_state.parent_intent, "pre_meeting_brief");
    assert.equal(t1.context_meta.conversation_state.meeting_type, "monthly_close");
    assert.deepEqual(t1.context_meta.conversation_state.active_period_months, ["2026-08"]);
    assert.deepEqual(t1.context_meta.conversation_state.active_entities, []);
    assert.equal(t1.context_meta.conversation_state.pre_meeting_brief, undefined);
    assert.equal(openaiCalls, 1);

    const t2 = await askDirectorIa(
      { ...req, body: { conversation_state: t1.context_meta.conversation_state } },
      1,
      "¿Qué me preocupa más?"
    );
    assert.equal(t2.context_meta.mode, "pre_meeting_brief");
    assert.ok(loads >= 2);
    assert.equal(openaiCalls, 2);
  });

  it("handoffs canónicos no quedan atrapados en el brief", async () => {
    const state = {
      parent_intent: "pre_meeting_brief",
      planta_id: 1,
      active_entities: [],
      last_evidence_bundle_type: "pre_meeting_brief",
      pending_information_gap: null,
      active_period_months: ["2026-08"],
      meeting_type: "monthly_close",
      previous_frame: null,
    };
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Perfil.",
      loadPreMeetingBriefForChat: async () => {
        throw new Error("pre_meeting no debe correr en client_profile");
      },
      loadClientProfileForChat: async () => ({
        ok: true,
        identity: { cliente_key: "puebla|arturo", display_name: "Arturo" },
        months: [],
        comments: [],
        actions: [],
        limitations: [],
        provenance: { requery: true },
        period: { months: ["2026-06", "2026-07", "2026-08"] },
      }),
    });
    const profile = await askDirectorIa(
      { dashboardAuth: { role: "ZP" }, body: { conversation_state: state } },
      1,
      "Háblame del cliente Arturo"
    );
    assert.equal(profile.context_meta.mode, "client_profile");

    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Trend.",
      loadPreMeetingBriefForChat: async () => {
        throw new Error("pre_meeting no debe correr en commercial_trend");
      },
      loadCommercialTrendForChat: async () => ({
        ok: true,
        plant: { planta_id: 1, planta_nombre: "Puebla" },
        range_days: 90,
        channel: "casa",
        series: [],
        top_movers: [],
        limitations: [],
        provenance: { requery: true },
      }),
    });
    const trend = await askDirectorIa(
      { dashboardAuth: { role: "ZP" }, body: { conversation_state: state } },
      1,
      "¿Cómo vamos en CASA?"
    );
    assert.equal(trend.context_meta.mode, "commercial_trend");

    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Reviewable.",
      loadPreMeetingBriefForChat: async () => {
        throw new Error("pre_meeting no debe correr en reviewable");
      },
      loadIgfReviewableSupportsForChat: async () => ({
        ok: true,
        periodo: { mes_cargo: "2026-08" },
        reviewable: [{ id: 99, numero_folio: "X" }],
        reviewable_count: 1,
        not_cancellable: [],
        not_cancellable_count: 0,
        limitations: [],
      }),
    });
    const supports = await askDirectorIa(
      { dashboardAuth: { role: "ZP" }, body: { conversation_state: state } },
      1,
      "¿Qué apoyos puedo revisar?"
    );
    assert.equal(supports.context_meta.mode, "igf_reviewable_supports");

    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Taller.",
      loadPreMeetingBriefForChat: async () => {
        throw new Error("pre_meeting no debe correr en taller_mayor");
      },
      loadTallerMayorForChat: async () => ({
        ok: true,
        period: { yyyymm: "2026-08", field: "mes_cargo" },
        view: "list",
        units: [],
        selected_unit: null,
        selected_folio: null,
        active_entities: [],
        limitations: [],
        provenance: { requery: true },
        assembly_status: "ok",
        partial: false,
      }),
    });
    const taller = await askDirectorIa(
      { dashboardAuth: { role: "ZP" }, body: { conversation_state: state } },
      1,
      "¿Qué unidades tienen Taller Mayor?"
    );
    assert.equal(taller.context_meta.mode, "taller_mayor");
  });

  it("preserva brief diario", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Brief diario intacto.",
      loadDailyExecutiveBriefForChat: async () => ({
        ok: true,
        plant: { planta_id: 1, planta_nombre: "Puebla" },
        target_date: "2026-08-23",
        today_ymd: "2026-08-24",
        sales: { available: true, assembled: { detection: { target_date: "2026-08-23" } }, limitations: [] },
        discount: { available: true, assembled: { detection: { target_date: "2026-08-23" } }, limitations: [] },
        brief_limitations: [],
        information_gaps: { sales: [], discount: [] },
        provenance: {},
        partial: false,
        assembly_status: "ok",
      }),
      loadPreMeetingBriefForChat: async () => {
        throw new Error("pre_meeting no debe correr en brief diario");
      },
    });
    const brief = await askDirectorIa({ dashboardAuth: { role: "ZP" }, body: {} }, 1, "¿Cómo nos fue ayer?");
    assert.equal(brief.context_meta.mode, "daily_executive_brief");
  });
});

describe("pre_meeting prompt contract", () => {
  it("permite preparación y prohíbe adivinar al Consejo", () => {
    const prompt = buildPreMeetingPrompt(
      {
        plant: { planta_id: 1, planta_nombre: "Puebla" },
        meeting_period: "2026-08",
        meeting_type: "monthly_close",
        generated_at: "2026-08-24T00:00:00.000Z",
        commercial: {},
        financial: {},
        actions: {},
        supports: {},
        information_gaps: [],
        suggested_requests: [],
        limitations: ["read_only"],
        partial: false,
        assembly_status: "complete",
      },
      "panorama de junta"
    );
    assert.match(prompt.systemPrompt, /Conviene estar preparado para explicar/);
    assert.match(prompt.systemPrompt, /El Consejo te va a preguntar/);
    assert.match(prompt.systemPrompt, /Prohibido/);
  });
});
