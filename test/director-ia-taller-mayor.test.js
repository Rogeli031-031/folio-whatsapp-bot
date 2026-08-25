"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  resolveConversationTurn,
  INHERITABLE_INTENTS,
  sanitizeActiveEntities,
  sanitizeEchoedState,
} = require("../lib/director-ia-conversation-state");
const { getDirectorIaTool, validateDirectorIaToolRegistry } = require("../lib/director-ia-tools");
const { detectUnsupportedDirectorIaDomain, isTallerMayorQuery } = require("../lib/director-ia-capabilities");
const { matchTallerTipoCol } = require("../lib/taller-at-excel");
const {
  isTallerMayorQuestion,
  isTallerMayorFollowUp,
  resolveTallerMayorPeriod,
  assembleTallerMayorPack,
  loadTallerMayorForChat,
  rankHighestUnits,
  SYSTEM_ADDENDUM,
} = require("../lib/director-ia-taller-mayor");

const ROOT = path.join(__dirname, "..");
const LIB_FILES = [
  "director-ia-taller-mayor.js",
  "director-ia-planner.js",
  "director-ia-conversation-state.js",
  "director-ia-chat.js",
  "director-ia-tools.js",
  "director-ia-capabilities.js",
];

const CANONICAL = "¿Qué unidades de Puebla tienen apoyos de Taller Mayor este mes?";
const HOLDOUTS = [
  "En Puebla, ¿qué AT aparecen con reparación mayor en el mes en curso?",
  "Lista las unidades con Taller Mayor del mes actual",
  "¿Qué unidades cargan reparación mayor ahora?",
];

function echoTaller(over = {}) {
  return {
    parent_intent: "taller_mayor",
    planta_id: 1,
    active_entities: over.active_entities || [],
    last_evidence_bundle_type: "taller_mayor",
    pending_information_gap: null,
    active_date: null,
    active_period_months: over.active_period_months || ["2026-08"],
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

function folioRow(over = {}) {
  return {
    id: over.id != null ? over.id : 10,
    numero_folio: over.numero_folio || "F-10",
    planta_id: over.planta_id != null ? over.planta_id : 1,
    unidad: over.unidad != null ? over.unidad : "AT-10",
    subcategoria: over.subcategoria != null ? over.subcategoria : "REPARACIÓN MAYOR",
    concepto: over.concepto !== undefined ? over.concepto : "Motor",
    importe: over.importe != null ? over.importe : 1000,
    detalle_lineas: over.detalle_lineas != null ? over.detalle_lineas : null,
    mes_cargo: over.mes_cargo || "2026-08",
    estatus: over.estatus || "AUTORIZADO",
    planta_nombre: "Puebla",
    planta_clave: "PUE",
    categoria: over.categoria || "TALLER",
  };
}

function sampleRows() {
  return [
    folioRow({ id: 11, numero_folio: "F-11", unidad: "AT-10", importe: 1000, estatus: "AUTORIZADO", concepto: "Motor" }),
    folioRow({ id: 12, numero_folio: "F-12", unidad: "AT-10", importe: 400, estatus: "EN PROCESO", concepto: "Caja" }),
    folioRow({ id: 21, numero_folio: "F-21", unidad: "AT-20", importe: 800, estatus: "PAGADO", concepto: "Eje" }),
    folioRow({
      id: 31,
      numero_folio: "F-31",
      unidad: "AT-30",
      importe: 200,
      estatus: "AUTORIZADO",
      subcategoria: "PREVENTIVO",
      concepto: "Aceite",
    }),
    folioRow({ id: 41, numero_folio: "F-41", unidad: "", importe: 500, estatus: "AUTORIZADO", concepto: "Sin token" }),
  ];
}

function loadOpts(rows, over = {}) {
  return {
    question: over.question || CANONICAL,
    now: { year: 2026, month: 8 },
    active_unit: over.active_unit,
    active_folio_id: over.active_folio_id,
    active_period_months: over.active_period_months || ["2026-08"],
    queryTallerFolios: async () => rows,
    resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "PUE" }),
    ...over,
  };
}

describe("taller_mayor planner + capabilities", () => {
  it("canónico y hold-outs van a taller_mayor; no phrasebook en lib", () => {
    assert.equal(detectDirectorIaIntent(CANONICAL).intent, "taller_mayor");
    assert.equal(planDirectorIaQuestion(CANONICAL).intent, "taller_mayor");
    assert.equal(detectUnsupportedDirectorIaDomain(CANONICAL), null);
    assert.equal(isTallerMayorQuery(CANONICAL), true);
    for (const q of HOLDOUTS) {
      assert.equal(isTallerMayorQuestion(q), true, q);
      assert.equal(detectDirectorIaIntent(q).intent, "taller_mayor", q);
      assert.equal(detectUnsupportedDirectorIaDomain(q), null, q);
    }
    const src = LIB_FILES.map((f) => fs.readFileSync(path.join(ROOT, "lib", f), "utf8")).join("\n");
    assert.equal(src.includes(CANONICAL), false);
    for (const q of HOLDOUTS) {
      assert.equal(src.includes(q), false, q);
    }
  });

  it("no se roba folio_status, taller_at, IGF plant-wide, profile, trend, brief, daily", () => {
    assert.equal(detectDirectorIaIntent("¿En qué etapa está el folio 123?").intent, "folio_status");
    assert.equal(detectDirectorIaIntent("taller de AT-15 2026-08").intent, "taller_at");
    assert.equal(detectDirectorIaIntent("¿Todavía se puede detener?").intent, "igf_reviewable_supports");
    assert.equal(detectDirectorIaIntent("¿Qué cliente de Puebla es el de mayor volumen?").intent, "client_profile");
    assert.equal(detectDirectorIaIntent("¿Cómo vamos en CASA los últimos 3 meses?").intent, "commercial_trend");
    assert.equal(detectDirectorIaIntent("¿Cómo nos fue ayer?").intent, "daily_executive_brief");
    assert.equal(detectDirectorIaIntent("¿Cómo estuvo la venta ayer?").intent, "daily_sales_deviation");
    assert.equal(detectDirectorIaIntent("¿Cómo estuvo el descuento ayer?").intent, "daily_discount_deviation");
  });

  it("tool read-only y registry válido", () => {
    const tool = getDirectorIaTool("get_taller_mayor");
    assert.equal(tool.executor, "loadTallerMayorForChat");
    assert.equal(tool.readOnly, true);
    assert.equal(tool.domain, "folios");
    assert.equal(validateDirectorIaToolRegistry().ok, true);
    assert.match(SYSTEM_ADDENDUM, /READ ONLY/i);
    assert.match(SYSTEM_ADDENDUM, /no es económico/i);
  });
});

describe("taller_mayor identity + period + classification", () => {
  it("lista el mes actual CDMX por unidad y no mete preventivo ni token vacío", async () => {
    const pack = await loadTallerMayorForChat({}, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(sampleRows()));
    assert.equal(pack.ok, true);
    assert.equal(pack.period.yyyymm, "2026-08");
    assert.equal(pack.period.field, "mes_cargo");
    const tokens = pack.units.map((u) => u.unit_token);
    assert.deepEqual(tokens, ["AT-10", "AT-20"]);
    const at10 = pack.units.find((u) => u.unit_token === "AT-10");
    assert.equal(at10.folio_count, 2);
    assert.equal(at10.sum_importe, 1400);
    assert.equal(at10.folios.length, 2);
    assert.equal(
      pack.units.some((u) => u.folios.some((f) => matchTallerTipoCol(f.subcategoria) !== "mayor")),
      false
    );
    assert.ok(pack.limitations.some((l) => /token canónico/i.test(l)));
    assert.equal(pack.provenance.requery, true);
  });

  it("ranking por SUM(importe); N>1 no elige Folio", async () => {
    const pack = await loadTallerMayorForChat(
      {},
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(sampleRows(), { question: "¿Cuál tiene el importe más alto?" })
    );
    assert.equal(pack.selected_unit.unit_token, "AT-10");
    assert.equal(pack.selected_unit.folio_count, 2);
    assert.equal(pack.selected_folio, null);
    assert.equal(pack.active_entities[0].kind, "unit");
    assert.equal(pack.active_entities[0].folio_id, null);
    const { winners, tied } = rankHighestUnits(pack.units);
    assert.equal(tied, false);
    assert.equal(winners[0].unit_token, "AT-10");
  });

  it("empate de unidades no elige en silencio", () => {
    const pack = assembleTallerMayorPack({
      planta_id: 1,
      planta_nombre: "Puebla",
      periodYm: "2026-08",
      view: "rank_highest",
      expandedRows: [
        { folio_id: 1, numero_folio: "A", unidad: "AT-01", importe: 500, mes_cargo: "2026-08", tipo: "mayor", subcategoria: "REPARACIÓN MAYOR", estatus: "AUTORIZADO", concepto: "x" },
        { folio_id: 2, numero_folio: "B", unidad: "AT-02", importe: 500, mes_cargo: "2026-08", tipo: "mayor", subcategoria: "REPARACIÓN MAYOR", estatus: "AUTORIZADO", concepto: "y" },
      ],
    });
    assert.equal(pack.needs_clarification, true);
    assert.equal(pack.selected_unit, null);
    assert.match(pack.clarification.reason, /empate/i);
  });

  it("periodo este mes = YYYY-MM CDMX; mes pasado no se inventa", () => {
    const current = resolveTallerMayorPeriod("apoyos de Taller Mayor este mes", { now: { year: 2026, month: 8 } });
    assert.equal(current.ok, true);
    assert.equal(current.yyyymm, "2026-08");
    const inherited = resolveTallerMayorPeriod("háblame de esa unidad", {
      now: { year: 2026, month: 8 },
      active_period_months: ["2026-08"],
    });
    assert.equal(inherited.inherited, true);
    assert.equal(inherited.yyyymm, "2026-08");
    const past = resolveTallerMayorPeriod("Taller Mayor del mes pasado", { now: { year: 2026, month: 8 } });
    assert.equal(past.ok, false);
    assert.equal(past.code, "period_unresolved");
  });

  it("no afirma económico/placa y no clasifica por importe", () => {
    assert.equal(matchTallerTipoCol("REPARACIÓN MAYOR"), "mayor");
    assert.equal(matchTallerTipoCol("PREVENTIVO"), "preventivo");
    const src = fs.readFileSync(path.join(ROOT, "lib", "director-ia-taller-mayor.js"), "utf8");
    assert.equal(/\beconomico\b/.test(src.toLowerCase().replace("no es económico", "")), false);
    assert.match(SYSTEM_ADDENDUM, /no clasifiques por importe/i);
  });

  it("missing concepto no es cero; fail-closed cross-plant", async () => {
    const pack = await loadTallerMayorForChat(
      {},
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts([folioRow({ id: 9, unidad: "AT-09", concepto: "", importe: 300 })])
    );
    assert.equal(pack.units[0].folios[0].concepto, null);
    const denied = await loadTallerMayorForChat(
      {},
      9,
      { dashboardAuth: { role: "GA", plantas_permitidas: [1] } },
      loadOpts(sampleRows())
    );
    assert.equal(denied.abort, true);
    assert.equal(denied.status, 403);
  });
});

describe("taller_mayor routing + reviewability", () => {
  it("INHERITABLE y sanitize unit/folio no son cliente_key", () => {
    assert.ok(INHERITABLE_INTENTS.includes("taller_mayor"));
    const [unit] = sanitizeActiveEntities([
      { kind: "unit", display: "AT-10", unit_token: "AT-10" },
    ]);
    assert.equal(unit.kind, "unit");
    assert.equal(unit.unit_token, "AT-10");
    assert.equal(unit.cliente_key, null);
    const [folio] = sanitizeActiveEntities([
      { kind: "folio", display: "F-11", unit_token: "AT-10", folio_id: 11, numero_folio: "F-11" },
    ]);
    assert.equal(folio.kind, "folio");
    assert.equal(folio.folio_id, 11);
    assert.equal(folio.cliente_key, null);
  });

  it("follow-ups heredan padre; detener con folio no salta a IGF de planta", () => {
    const listed = echoTaller();
    const ranked = echoTaller({
      active_entities: [{ kind: "unit", display: "AT-10", unit_token: "AT-10" }],
    });
    const withFolio = echoTaller({
      active_entities: [
        { kind: "folio", display: "F-21", unit_token: "AT-20", folio_id: 21, numero_folio: "F-21" },
      ],
    });
    assert.equal(resolve("¿Cuál tiene el importe más alto?", listed).inherit_parent_intent, "taller_mayor");
    assert.equal(resolve("Háblame de esa unidad.", ranked).inherit_parent_intent, "taller_mayor");
    assert.equal(resolve("¿Qué reparación le están haciendo?", ranked).inherit_parent_intent, "taller_mayor");
    assert.equal(resolve("¿Qué Folio es?", ranked).inherit_parent_intent, "taller_mayor");
    assert.equal(resolve("¿En qué estatus está?", withFolio).inherit_parent_intent, "taller_mayor");
    const stay = resolve("¿Todavía se puede detener?", withFolio);
    assert.equal(stay.inherit_parent_intent, "taller_mayor");
    assert.equal(stay.detected_intent, "igf_reviewable_supports");
    const plantWide = resolve("¿Todavía se puede detener?", null);
    assert.equal(plantWide.inherit_parent_intent, null);
    assert.equal(plantWide.detected_intent, "igf_reviewable_supports");
    assert.equal(resolve("¿Cómo afectaría al IGF si no entrara?", withFolio).inherit_parent_intent, "taller_mayor");
  });

  it("same-plant keep; cross-plant limpia entidad", () => {
    const echoed = echoTaller({
      planta_id: 1,
      active_entities: [{ kind: "unit", display: "AT-10", unit_token: "AT-10" }],
    });
    const same = sanitizeEchoedState(echoed, 1);
    assert.equal(same.active_entities[0].unit_token, "AT-10");
    const cross = sanitizeEchoedState(echoed, 2);
    assert.equal(cross.plant_mismatch, true);
    assert.deepEqual(cross.active_entities, []);
  });

  it("reviewability del Folio activo; N>1 aclara", async () => {
    const multi = await loadTallerMayorForChat(
      {},
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(sampleRows(), {
        question: "¿Todavía se puede detener?",
        active_unit: "AT-10",
      })
    );
    assert.equal(multi.needs_clarification, true);
    assert.equal(multi.clarification.target, "folio");
    assert.equal(multi.selected_folio, null);
    assert.equal(multi.selected_unit.folio_count, 2);

    const single = await loadTallerMayorForChat(
      {},
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(sampleRows(), {
        question: "¿Todavía se puede detener?",
        active_unit: "AT-20",
        active_folio_id: 21,
      })
    );
    assert.equal(single.selected_folio.folio_id, 21);
    assert.equal(single.selected_folio.reviewability.group, "not_cancellable");
    assert.equal(single.igf_hypothetical, null);
    assert.ok(single.limitations.some((l) => /este Folio activo/i.test(l)));
  });

  it("historial misma identidad; default no expande el mes", async () => {
    const rows = [
      ...sampleRows(),
      folioRow({ id: 99, numero_folio: "F-99", unidad: "AT-10", importe: 50, mes_cargo: "2026-06", concepto: "Previo" }),
    ];
    const current = await loadTallerMayorForChat(
      {},
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(rows, { question: "¿Cuánto llevamos en reparaciones de esa unidad?", active_unit: "AT-10" })
    );
    assert.equal(current.running_total.scope, "thread_period");
    assert.equal(current.running_total.sum_importe, 1400);

    const hist = await loadTallerMayorForChat(
      {},
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(rows, { question: "¿Qué otros Folios ha tenido esa unidad?", active_unit: "AT-10" })
    );
    assert.equal(hist.view, "history");
    const histUnit = hist.history_units.find((u) => u.unit_token === "AT-10");
    assert.ok(histUnit.folios.some((f) => f.folio_id === 99));
    assert.ok(histUnit.folios.every((f) => f.unit_token === "AT-10"));
  });

  it("follow-up hold-out wording hereda", () => {
    const withUnit = echoTaller({
      active_entities: [{ kind: "unit", display: "AT-10", unit_token: "AT-10" }],
    });
    assert.equal(isTallerMayorFollowUp("¿Quién concentra más monto este periodo?", "other", { hasActiveUnit: true }), true);
    assert.equal(resolve("¿Quién concentra más monto este periodo?", echoTaller()).inherit_parent_intent, "taller_mayor");
    assert.equal(resolve("Descríbeme esa AT", withUnit).inherit_parent_intent, "taller_mayor");
  });
});

describe("askDirectorIa taller_mayor", () => {
  let askDirectorIa;
  let configureDirectorIaChat;
  let loadCount;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    configureDirectorIaChat({
      pool: null,
      openaiChat: undefined,
      loadTallerMayorForChat: undefined,
      loadIgfReviewableSupportsForChat: undefined,
      loadTallerAtForChat: undefined,
      loadClientProfileForChat: undefined,
      loadDailyExecutiveBriefForChat: undefined,
    });
  });

  it("lista → más alto → unidad → detener evalúa el hilo; IGF suelto se preserva", async () => {
    loadCount = 0;
    configureDirectorIaChat({
      pool: { connect: async () => ({ release() {} }) },
      openaiChat: async () => "Síntesis Taller Mayor. No recomiendo cancelar.",
      loadTallerMayorForChat: async (_p, _id, _req, opts) => {
        loadCount += 1;
        if (/detener/i.test(opts.question)) {
          assert.equal(opts.active_folio_id, 21);
          return {
            ok: true,
            period: { yyyymm: "2026-08", field: "mes_cargo" },
            view: "reviewability",
            units: [],
            selected_unit: { unit_token: "AT-20", folio_count: 1, sum_importe: 800, folios: [] },
            selected_folio: {
              folio_id: 21,
              numero_folio: "F-21",
              reviewability: { group: "not_cancellable", cancelable_under_current_rules: false },
            },
            active_entities: [
              { kind: "folio", display: "F-21", unit_token: "AT-20", folio_id: 21, numero_folio: "F-21" },
            ],
            limitations: ["Reviewability aplica a este Folio activo."],
            provenance: { requery: true },
            assembly_status: "ok",
            partial: false,
          };
        }
        if (/importe|alto/i.test(opts.question)) {
          return {
            ok: true,
            period: { yyyymm: "2026-08", field: "mes_cargo" },
            view: "rank_highest",
            units: [{ unit_token: "AT-20", folio_count: 1, sum_importe: 800, folios: [{ folio_id: 21 }] }],
            selected_unit: { unit_token: "AT-20", folio_count: 1, sum_importe: 800, folios: [{ folio_id: 21 }] },
            selected_folio: { folio_id: 21, numero_folio: "F-21" },
            active_entities: [
              { kind: "folio", display: "F-21", unit_token: "AT-20", folio_id: 21, numero_folio: "F-21" },
            ],
            limitations: [],
            provenance: { requery: true },
            assembly_status: "ok",
            partial: false,
          };
        }
        return {
          ok: true,
          period: { yyyymm: "2026-08", field: "mes_cargo" },
          view: "list",
          units: [
            { unit_token: "AT-10", folio_count: 2, sum_importe: 1400, folios: [{ folio_id: 11 }, { folio_id: 12 }] },
            { unit_token: "AT-20", folio_count: 1, sum_importe: 800, folios: [{ folio_id: 21 }] },
          ],
          selected_unit: null,
          selected_folio: null,
          active_entities: [],
          limitations: [],
          provenance: { requery: true },
          assembly_status: "ok",
          partial: false,
        };
      },
      loadIgfReviewableSupportsForChat: async () => {
        throw new Error("IGF plant-wide no debe correr en el hilo Taller Mayor");
      },
    });

    const req = { dashboardAuth: { role: "ZP" }, body: {} };
    const t1 = await askDirectorIa(req, 1, CANONICAL);
    assert.equal(t1.context_meta.mode, "taller_mayor");
    assert.equal(t1.context_meta.conversation_state.parent_intent, "taller_mayor");
    assert.deepEqual(t1.context_meta.conversation_state.active_period_months, ["2026-08"]);

    const t2 = await askDirectorIa(
      { ...req, body: { conversation_state: t1.context_meta.conversation_state } },
      1,
      "¿Cuál tiene el importe más alto?"
    );
    assert.equal(t2.context_meta.mode, "taller_mayor");
    assert.equal(t2.context_meta.conversation_state.active_entities[0].unit_token, "AT-20");
    assert.equal(t2.context_meta.conversation_state.active_entities[0].folio_id, 21);

    const t3 = await askDirectorIa(
      { ...req, body: { conversation_state: t2.context_meta.conversation_state } },
      1,
      "¿Todavía se puede detener?"
    );
    assert.equal(t3.context_meta.mode, "taller_mayor");
    assert.equal(t3.taller_mayor.selected_folio.folio_id, 21);
    assert.ok(loadCount >= 3);

    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Listado reviewable de planta.",
      loadTallerMayorForChat: async () => {
        throw new Error("taller_mayor no debe correr en IGF plant-wide");
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
    const igf = await askDirectorIa({ dashboardAuth: { role: "ZP" }, body: {} }, 1, "¿Todavía se puede detener?");
    assert.equal(igf.context_meta.mode, "igf_reviewable_supports");
  });

  it("preserva brief y taller_at", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Brief diario intacto.",
      loadDailyExecutiveBriefForChat: async () => ({
        ok: true,
        plant: { planta_id: 1, planta_nombre: "Puebla" },
        target_date: "2026-08-19",
        today_ymd: "2026-08-20",
        sales: { available: true, assembled: { detection: { target_date: "2026-08-19" } }, limitations: [] },
        discount: { available: true, assembled: { detection: { target_date: "2026-08-19" } }, limitations: [] },
        brief_limitations: [],
        information_gaps: { sales: [], discount: [] },
        provenance: {},
        partial: false,
        assembly_status: "ok",
      }),
      loadTallerMayorForChat: async () => {
        throw new Error("taller_mayor no debe correr en brief");
      },
    });
    const brief = await askDirectorIa({ dashboardAuth: { role: "ZP" }, body: {} }, 1, "¿Cómo nos fue ayer?");
    assert.equal(brief.context_meta.mode, "daily_executive_brief");

    configureDirectorIaChat({
      pool: {},
      loadTallerAtForChat: async () => ({
        ok: true,
        planta_id: 1,
        planta_nombre: "Puebla",
        unidades: ["AT-15"],
        periodo: { mes_desde: "2026-08", mes_hasta: "2026-08" },
        count: 1,
        total: 10,
        truncated: false,
        records: [{ unidad: "AT-15", numero_folio: "F-1", importe: 10, periodo: "2026-08", estatus: "AUTORIZADO" }],
        source: "public.folios",
        semantic_class: "taller_at_unidad",
      }),
      loadTallerMayorForChat: async () => {
        throw new Error("taller_mayor no debe correr en taller_at");
      },
    });
    const taller = await askDirectorIa({ dashboardAuth: { role: "ZP" }, body: {} }, 1, "taller de AT-15 2026-08");
    assert.equal(taller.context_meta.mode, "taller_at");
  });
});
