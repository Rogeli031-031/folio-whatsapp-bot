"use strict";

/**
 * FIX-DIRECTOR-IA-FOLIO-SEARCH-AGGREGATION-FOLLOWUP-001
 * 001..094 — spec persistida, follow-up agregado, requery del universo.
 */

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  extractFolioSearchFilters,
  loadFolioSearchForChat,
  buildFolioSearchChatResult,
  buildFolioSearchSpecFromFilters,
  SCOPE_ALL_PUBLIC_FOLIOS,
  textMatchesSearch,
} = require("../lib/director-ia-folio-search");
const {
  INHERITABLE_INTENTS,
  sanitizeEchoedState,
  sanitizeFolioSearchSpec,
  isValidFolioSearchSpec,
  isFolioSearchAggregateFollowUp,
  resolveConversationTurn,
  emptyConversationState,
} = require("../lib/director-ia-conversation-state");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-09T12:00:00-06:00");
const T1 = "¿Qué folios de enero a agosto contienen la palabra aceite?";
const T2 = "puedes sumarlos y darme un total por mes?";
const EXPLICIT = "cuánto suman los folios de enero a agosto de aceite?";
const C4 = "¿cuántos fueron?";
const C5 = "¿y solo julio?";

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function row(over = {}) {
  return {
    id: 1,
    numero_folio: "F-1",
    folio_codigo: "FC-1",
    planta_id: 1,
    mes_cargo: "2026-01",
    importe: 8450,
    estatus: "PENDIENTE",
    categoria: "TALLER",
    subcategoria: "LUBRICANTES",
    concepto: "ACEITE MOTOR 15W40",
    beneficiario: "Taller Sur",
    solo_zp_ad: false,
    planta_nombre: "Acapulco",
    numero_cheque: "CH-900",
    proyecto_codigo: "PRJ-01",
    proyecto_nombre: "Patio Norte",
    ...over,
  };
}

function smallUniverse() {
  return [
    row({ id: 1, numero_folio: "F-1", mes_cargo: "2026-01", importe: 100, estatus: "PENDIENTE" }),
    row({ id: 2, numero_folio: "F-2", mes_cargo: "2026-02", importe: 200, estatus: "PAGADO" }),
    row({ id: 3, numero_folio: "F-3", mes_cargo: "2026-03", importe: null, estatus: "PENDIENTE" }),
    row({ id: 4, numero_folio: "F-4", mes_cargo: "2026-04", importe: 0, estatus: "PENDIENTE" }),
    row({ id: 5, numero_folio: "F-5", mes_cargo: "2026-05", importe: 999, estatus: "CANCELADO" }),
    row({ id: 6, numero_folio: "F-6", mes_cargo: "2026-06", importe: 50, concepto: "LLANTAS" }),
    row({ id: 7, numero_folio: "F-7", mes_cargo: "2026-08", importe: 300, estatus: "PENDIENTE" }),
  ];
}

function universeOver40() {
  const rows = [];
  let id = 1;
  for (const mes of ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]) {
    for (let i = 0; i < 8; i += 1) {
      rows.push(
        row({
          id,
          numero_folio: `F-${id}`,
          mes_cargo: mes,
          importe: 100,
          estatus: "PENDIENTE",
          concepto: "ACEITE MOTOR",
        })
      );
      id += 1;
    }
  }
  for (let i = 0; i < 10; i += 1) {
    rows.push(
      row({
        id,
        numero_folio: `F-${id}`,
        mes_cargo: "2026-08",
        importe: i === 9 ? 0 : 1000,
        estatus: i === 0 ? "PAGADO" : "PENDIENTE",
        concepto: "ACEITE",
      })
    );
    id += 1;
  }
  for (let i = 0; i < 5; i += 1) {
    rows.push(
      row({
        id,
        numero_folio: `F-${id}`,
        mes_cargo: "2026-01",
        importe: 9999,
        estatus: "CANCELADO",
        concepto: "ACEITE",
      })
    );
    id += 1;
  }
  for (let i = 0; i < 5; i += 1) {
    rows.push(
      row({
        id,
        numero_folio: `F-${id}`,
        mes_cargo: "2026-07",
        importe: null,
        estatus: "PENDIENTE",
        concepto: "ACEITE HIDRAULICO",
      })
    );
    id += 1;
  }
  rows.push(
    row({
      id,
      numero_folio: `F-${id}`,
      mes_cargo: "2026-01",
      importe: 50,
      concepto: "LLANTAS",
      proyecto_nombre: "Patio Norte",
    })
  );
  return rows;
}

function inject(question, extras = {}) {
  const rows = extras.rows || smallUniverse();
  const calls = extras.calls || [];
  return {
    now: extras.now || NOW,
    question,
    auth: extras.auth || { role: "ZP" },
    resolveEquivalentIds: extras.resolveEquivalentIds || ((id) => [Number(id)]),
    inheritedFilters: extras.inheritedFilters,
    filtersOverride: extras.filtersOverride,
    searchSpec: extras.searchSpec,
    analysisOverride: extras.analysisOverride,
    queryPublicFolios:
      extras.queryPublicFolios ||
      (async (_c, plantaId, mesCargo) => {
        calls.push({ plantaId, mesCargo });
        return rows.filter(
          (r) => Number(r.planta_id) === Number(plantaId) && String(r.mes_cargo) === String(mesCargo)
        );
      }),
    calls,
  };
}

async function search(question, extras = {}) {
  const opts = inject(question, extras);
  const payload = await loadFolioSearchForChat(
    null,
    extras.plantaId != null ? extras.plantaId : 1,
    { body: {}, dashboardAuth: extras.auth || { role: "ZP" } },
    opts
  );
  return { payload, calls: opts.calls };
}

function canonicalSpec(over = {}) {
  return {
    version: 1,
    planta_id: 1,
    scope: "ALL_PUBLIC_FOLIOS",
    period_mode: "RANGE",
    period_month: null,
    period_start: "2026-01",
    period_end: "2026-08",
    period_field: "mes_cargo",
    concept_mode: "SINGLE",
    concept_query: "aceite",
    concept_alternatives: [],
    operation: "keyword_search",
    ...over,
  };
}

function specKeys(spec) {
  return spec ? Object.keys(spec).sort() : [];
}

function assertNoEvidenceCache(spec) {
  assert.ok(spec);
  assert.equal(spec.records, undefined);
  assert.equal(spec.rows, undefined);
  assert.equal(spec.analysis, undefined);
  assert.equal(spec.known_total, undefined);
  assert.equal(spec.answer, undefined);
  const blob = JSON.stringify(spec);
  assert.doesNotMatch(blob, /"records"/);
  assert.doesNotMatch(blob, /El importe total/);
}

let askDirectorIa;
let configureDirectorIaChat;

function configureFolioChat(rows, extras = {}) {
  const calls = extras.calls || [];
  configureDirectorIaChat({
    pool: {},
    now: extras.now || NOW,
    plantCatalog: extras.plantCatalog || [
      { planta_id: 1, nombre: "Acapulco", clave: "AC" },
      { planta_id: 2, nombre: "Otra", clave: "OT" },
    ],
    queryPublicFolios:
      extras.queryPublicFolios ||
      (async (_c, plantaId, mesCargo) => {
        calls.push({ plantaId, mesCargo });
        return rows.filter(
          (r) => Number(r.planta_id) === Number(plantaId) && String(r.mes_cargo) === String(mesCargo)
        );
      }),
    resolveEquivalentIds: extras.resolveEquivalentIds || ((id) => [Number(id)]),
    openaiChat: extras.openaiChat || (async () => {
      throw new Error("OpenAI no debe llamarse en folio_search");
    }),
  });
  return calls;
}

async function runChat(question, opts = {}) {
  return askDirectorIa(
    {
      body: {
        history: opts.history || [{ role: "user", content: question }],
        conversation_state: opts.conversation_state || undefined,
      },
      dashboardAuth: opts.auth || { role: "ZP" },
    },
    opts.plantaId == null ? 1 : opts.plantaId,
    question
  );
}

describe("FIX folio_search aggregation follow-up", () => {
  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    configureDirectorIaChat({
      pool: null,
      openaiChat: undefined,
      queryPublicFolios: undefined,
      resolveEquivalentIds: undefined,
      now: undefined,
      loadFolioSearchForChat: undefined,
      plantCatalog: [{ planta_id: 1, nombre: "Acapulco", clave: "AC" }],
    });
  });

  it("001 T1 exact question → folio_search", () => {
    assert.equal(planDirectorIaQuestion(T1, { now: NOW }).intent, "folio_search");
  });

  it("002 T1 scope ALL_PUBLIC_FOLIOS", () => {
    assert.equal(extractFolioSearchFilters(T1, { now: NOW }).scope, SCOPE_ALL_PUBLIC_FOLIOS);
  });

  it("003 T1 period_mode RANGE", () => {
    assert.equal(extractFolioSearchFilters(T1, { now: NOW }).period_mode, "RANGE");
  });

  it("004 T1 period_start 2026-01", () => {
    assert.equal(extractFolioSearchFilters(T1, { now: NOW }).period_start, "2026-01");
  });

  it("005 T1 period_end 2026-08", () => {
    assert.equal(extractFolioSearchFilters(T1, { now: NOW }).period_end, "2026-08");
  });

  it("006 T1 period field mes_cargo", () => {
    const spec = buildFolioSearchSpecFromFilters(extractFolioSearchFilters(T1, { now: NOW }), 1);
    assert.equal(spec.period_field, "mes_cargo");
    assert.doesNotMatch(read("lib/director-ia-folio-search.js"), /fecha_creacion/);
  });

  it("007 T1 operation keyword_search", () => {
    assert.equal(extractFolioSearchFilters(T1, { now: NOW }).operation, "keyword_search");
  });

  it("008 T1 concept/search term aceite", () => {
    assert.equal(extractFolioSearchFilters(T1, { now: NOW }).concept_query, "aceite");
  });

  it("009 T1 writes conversation_state", async () => {
    const { payload } = await search(T1);
    const result = buildFolioSearchChatResult(payload, { planta_id: 1 });
    assert.ok(result.context_meta.conversation_state);
    assert.equal(result.context_meta.conversation_state.parent_intent, "folio_search");
  });

  it("010 T1 state parent_intent folio_search", async () => {
    configureFolioChat(smallUniverse());
    const result = await runChat(T1);
    assert.equal(result.context_meta.conversation_state.parent_intent, "folio_search");
  });

  it("011 T1 state contains canonical search spec", async () => {
    const { payload } = await search(T1);
    const result = buildFolioSearchChatResult(payload, { planta_id: 1 });
    const spec = result.context_meta.conversation_state.folio_search_spec;
    assert.ok(isValidFolioSearchSpec(spec, 1));
    assert.deepEqual(specKeys(spec), specKeys(canonicalSpec()));
  });

  it("012 spec contains planta_id", async () => {
    const { payload } = await search(T1);
    const spec = buildFolioSearchChatResult(payload, { planta_id: 1 }).context_meta.conversation_state
      .folio_search_spec;
    assert.equal(spec.planta_id, 1);
  });

  it("013 spec contains scope", async () => {
    const { payload } = await search(T1);
    const spec = buildFolioSearchChatResult(payload, { planta_id: 1 }).context_meta.conversation_state
      .folio_search_spec;
    assert.equal(spec.scope, "ALL_PUBLIC_FOLIOS");
  });

  it("014 spec contains period", async () => {
    const { payload } = await search(T1);
    const spec = buildFolioSearchChatResult(payload, { planta_id: 1 }).context_meta.conversation_state
      .folio_search_spec;
    assert.equal(spec.period_mode, "RANGE");
    assert.equal(spec.period_start, "2026-01");
    assert.equal(spec.period_end, "2026-08");
    assert.equal(spec.period_field, "mes_cargo");
  });

  it("015 spec contains concept/search term", async () => {
    const { payload } = await search(T1);
    const spec = buildFolioSearchChatResult(payload, { planta_id: 1 }).context_meta.conversation_state
      .folio_search_spec;
    assert.equal(spec.concept_query, "aceite");
  });

  it("016 spec contains operation", async () => {
    const { payload } = await search(T1);
    const spec = buildFolioSearchChatResult(payload, { planta_id: 1 }).context_meta.conversation_state
      .folio_search_spec;
    assert.equal(spec.operation, "keyword_search");
  });

  it("017 spec contains no records", async () => {
    const { payload } = await search(T1);
    const spec = buildFolioSearchChatResult(payload, { planta_id: 1 }).context_meta.conversation_state
      .folio_search_spec;
    assert.equal(Object.prototype.hasOwnProperty.call(spec, "records"), false);
  });

  it("018 spec contains no rows", async () => {
    const { payload } = await search(T1);
    const spec = buildFolioSearchChatResult(payload, { planta_id: 1 }).context_meta.conversation_state
      .folio_search_spec;
    assert.equal(Object.prototype.hasOwnProperty.call(spec, "rows"), false);
  });

  it("019 spec contains no analysis amounts", async () => {
    const { payload } = await search(T1);
    const spec = buildFolioSearchChatResult(payload, { planta_id: 1 }).context_meta.conversation_state
      .folio_search_spec;
    assertNoEvidenceCache(spec);
  });

  it("020 spec contains no rendered response text", async () => {
    const { payload } = await search(T1);
    const result = buildFolioSearchChatResult(payload, { planta_id: 1 });
    const spec = result.context_meta.conversation_state.folio_search_spec;
    assert.doesNotMatch(JSON.stringify(spec), /Encontré/);
    assert.match(result.answer, /Encontré/);
  });

  it("021 echoed spec sanitized", () => {
    const echoed = sanitizeEchoedState(
      {
        parent_intent: "folio_search",
        planta_id: 1,
        folio_search_spec: { ...canonicalSpec(), extra_junk: true, records: [{ id: 9 }] },
      },
      1
    );
    assert.ok(echoed.folio_search_spec);
    assert.equal(echoed.folio_search_spec.extra_junk, undefined);
    assert.equal(echoed.folio_search_spec.records, undefined);
    assert.equal(echoed.folio_search_spec.concept_query, "aceite");
  });

  it("022 arbitrary fields removed", () => {
    const spec = sanitizeFolioSearchSpec(
      { ...canonicalSpec(), sql: "drop table", rows: [1], analysis: { known_total: 9 } },
      1
    );
    assert.equal(spec.sql, undefined);
    assert.equal(spec.rows, undefined);
    assert.equal(spec.analysis, undefined);
  });

  it("023 malformed period rejected", () => {
    assert.equal(sanitizeFolioSearchSpec({ ...canonicalSpec(), period_start: "enero" }, 1), null);
    assert.equal(sanitizeFolioSearchSpec({ ...canonicalSpec(), period_end: "2026-13" }, 1), null);
    assert.equal(
      sanitizeFolioSearchSpec({ ...canonicalSpec(), period_start: "2026-08", period_end: "2026-01" }, 1),
      null
    );
  });

  it("024 malformed scope rejected", () => {
    assert.equal(sanitizeFolioSearchSpec({ ...canonicalSpec(), scope: "ALL_ROWS" }, 1), null);
  });

  it("025 malformed operation rejected", () => {
    assert.equal(sanitizeFolioSearchSpec({ ...canonicalSpec(), operation: "sql_search" }, 1), null);
  });

  it("026 empty/malformed concept fails closed", () => {
    assert.equal(sanitizeFolioSearchSpec({ ...canonicalSpec(), concept_query: "" }, 1), null);
    assert.equal(sanitizeFolioSearchSpec({ ...canonicalSpec(), concept_query: "aceite; DROP" }, 1), null);
    assert.equal(sanitizeFolioSearchSpec({ ...canonicalSpec(), concept_query: "aceite--" }, 1), null);
  });

  it("027 state plant mismatch drops folio spec", () => {
    const echoed = sanitizeEchoedState(
      { parent_intent: "folio_search", planta_id: 1, folio_search_spec: canonicalSpec() },
      2
    );
    assert.equal(echoed.plant_mismatch, true);
    assert.equal(echoed.folio_search_spec, null);
  });

  it("028 folio_search inheritable only with valid spec", () => {
    assert.ok(INHERITABLE_INTENTS.includes("folio_search"));
    assert.equal(isFolioSearchAggregateFollowUp(T2), true);
    assert.equal(isValidFolioSearchSpec(canonicalSpec(), 1), true);
    const turn = resolveConversationTurn({
      question: T2,
      history: [],
      plantaId: 1,
      echoedState: {
        parent_intent: "folio_search",
        planta_id: 1,
        folio_search_spec: canonicalSpec(),
      },
      detectIntent: (q) => planDirectorIaQuestion(q, { now: NOW }),
    });
    assert.equal(turn.inherit, false);
    assert.equal(turn.inherit_parent_intent, null);
  });

  it("029 parent_intent alone without spec is insufficient", () => {
    assert.equal(isValidFolioSearchSpec(null, 1), false);
    const turn = resolveConversationTurn({
      question: T2,
      history: [],
      plantaId: 1,
      echoedState: { parent_intent: "folio_search", planta_id: 1 },
      detectIntent: (q) => planDirectorIaQuestion(q, { now: NOW }),
    });
    assert.equal(turn.inherit, false);
  });

  it("030 T2 exact phrase recognized with valid spec", async () => {
    configureFolioChat(smallUniverse());
    const first = await runChat(T1);
    const second = await runChat(T2, { conversation_state: first.context_meta.conversation_state });
    assert.equal(second.context_meta.requested_domain, "folio_search");
    assert.equal(second.folio_search.filters.analysis_mode, "AGGREGATE");
    assert.match(second.answer, /importe (total|conocido)/i);
  });

  it("031 T2 does not invent concept from pronoun", async () => {
    configureFolioChat(smallUniverse());
    const first = await runChat(T1);
    const second = await runChat(T2, { conversation_state: first.context_meta.conversation_state });
    assert.equal(second.folio_search.filters.concept_query, "aceite");
    assert.notEqual(second.folio_search.filters.concept_query, "los");
  });

  it("032 T2 inherits planta_id", async () => {
    configureFolioChat(smallUniverse());
    const first = await runChat(T1);
    const second = await runChat(T2, { conversation_state: first.context_meta.conversation_state });
    assert.equal(second.folio_search.filters ? second.context_meta.planta_id : null, 1);
    assert.equal(second.context_meta.conversation_state.folio_search_spec.planta_id, 1);
  });

  it("033 T2 inherits scope", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.filters.scope, "ALL_PUBLIC_FOLIOS");
  });

  it("034 T2 inherits period_start", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.filters.period_start, "2026-01");
  });

  it("035 T2 inherits period_end", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.filters.period_end, "2026-08");
  });

  it("036 T2 inherits keyword/concept", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.filters.concept_query, "aceite");
  });

  it("037 T2 inherits operation", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.filters.operation, "keyword_search");
  });

  it("038 T2 sets analysis_mode AGGREGATE", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.filters.analysis_mode, "AGGREGATE");
  });

  it("039 T2 sets aggregation SUM", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.filters.aggregation, "SUM");
  });

  it("040 T2 sets group_by MONTH", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.filters.group_by, "MONTH");
  });

  it("041 T2 cumulative NO", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.filters.cumulative, "NO");
  });

  it("042 T2 requery executes source", async () => {
    const calls = [];
    await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
      calls,
    });
    assert.deepEqual(
      calls.map((c) => c.mesCargo),
      ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]
    );
  });

  it("043 T2 does not aggregate prior displayed records", async () => {
    const src = read("lib/director-ia-chat.js");
    assert.doesNotMatch(src, /payload\.records/);
    const follow = src.slice(src.indexOf("folio_search aggregate follow-up"));
    assert.match(follow, /inheritedFilters/);
    assert.doesNotMatch(follow.slice(0, 800), /records/);
  });

  it("044 T2 operates on full matched set", async () => {
    const { payload } = await search(T2, {
      rows: universeOver40(),
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.match_count, 60);
    assert.equal(payload.analysis.aggregate_eligible_count, 55);
  });

  it("045 T2 survives >40 matched fixture", async () => {
    const { payload: listed } = await search(T1, { rows: universeOver40() });
    assert.equal(listed.truncated, true);
    assert.equal(listed.records.length, 40);
    const { payload } = await search(T2, {
      rows: universeOver40(),
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.ok(payload.match_count > 40);
  });

  it("046 totals include matches beyond display row 40", async () => {
    const { payload } = await search(T2, {
      rows: universeOver40(),
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.analysis.known_total, 13000);
    assert.notEqual(payload.analysis.known_total, 4000);
  });

  it("047 T2 groups by mes_cargo", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.deepEqual(
      payload.analysis.months.map((m) => m.mes_cargo),
      ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]
    );
    assert.equal(payload.analysis.months.find((m) => m.mes_cargo === "2026-01").known_subtotal, 100);
  });

  it("048 T2 does not group by creation date", () => {
    const helper = read("lib/director-ia-folio-search.js");
    const agg = helper.slice(helper.indexOf("function buildAggregate"));
    assert.match(agg, /row\.mes_cargo/);
    assert.doesNotMatch(agg.slice(0, 400), /fecha_creacion/);
  });

  it("049 T2 does not group by payment date", () => {
    const helper = read("lib/director-ia-folio-search.js");
    const agg = helper.slice(helper.indexOf("function buildAggregate"), helper.indexOf("async function loadFolioSearchForChat"));
    assert.doesNotMatch(agg, /fecha_pago|payment_date/);
  });

  it("050 CANCELADO remains present in T1 list", async () => {
    const { payload } = await search(T1);
    assert.ok(payload.records.some((r) => r.estatus === "CANCELADO"));
  });

  it("051 CANCELADO excluded from T2 main aggregate", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.match_count, 6);
    assert.equal(payload.analysis.aggregate_eligible_count, 5);
    assert.equal(payload.analysis.known_total, 600);
  });

  it("052 non-cancelled rows included", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.analysis.known_amount_count, 4);
  });

  it("053 null importe treated by existing incomplete-total contract", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.analysis.is_complete, false);
    assert.equal(payload.analysis.unknown_amount_count, 1);
    const answer = buildFolioSearchChatResult(payload, { planta_id: 1 }).answer;
    assert.match(answer, /importe no registrado/);
  });

  it("054 zero importe remains known zero", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.analysis.months.find((m) => m.mes_cargo === "2026-04").known_subtotal, 0);
    assert.equal(payload.analysis.months.find((m) => m.mes_cargo === "2026-04").known_amount_count, 1);
  });

  it("055 PAGADO semantics unchanged", async () => {
    const { payload } = await search(T2, {
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.analysis.has_pagado, true);
    const answer = buildFolioSearchChatResult(payload, { planta_id: 1 }).answer;
    assert.match(answer, /PAGADO no prueba gasto contable/);
  });

  it("056 safe label is importe registrado", async () => {
    const { payload } = await search(T1);
    const result = buildFolioSearchChatResult(payload, { planta_id: 1 });
    assert.match(result.answer, /Importe registrado en el folio/);
  });

  it("057 no claim of gasto pagado", async () => {
    configureFolioChat(smallUniverse());
    const first = await runChat(T1);
    const second = await runChat(T2, { conversation_state: first.context_meta.conversation_state });
    assert.doesNotMatch(second.answer, /gasto pagado/i);
  });

  it("058 no claim of gasto contable", async () => {
    configureFolioChat(smallUniverse());
    const first = await runChat(T1);
    const second = await runChat(T2, { conversation_state: first.context_meta.conversation_state });
    assert.match(second.answer, /PAGADO no prueba gasto contable/);
    assert.doesNotMatch(second.answer, /el gasto contable es/i);
  });

  it("059 no LLM math", () => {
    const chat = read("lib/director-ia-chat.js");
    const block = chat.slice(chat.indexOf("folio_search aggregate follow-up"), chat.indexOf("continuity out_of_slice"));
    assert.doesNotMatch(block, /openaiDirectorIaChat|openaiChat\(/);
  });

  it("060 no OpenAI call required", async () => {
    configureFolioChat(smallUniverse());
    const first = await runChat(T1);
    const second = await runChat(T2, { conversation_state: first.context_meta.conversation_state });
    assert.equal(first.context_meta.openai_called, false);
    assert.equal(second.context_meta.openai_called, false);
  });

  it("061 fresh chat T2 without state → unknown/clarification", async () => {
    const calls = configureFolioChat(smallUniverse());
    const result = await runChat(T2);
    assert.equal(result.context_meta.requires_clarification, true);
    assert.equal(result.context_meta.requested_domain == null || result.folio_search == null, true);
    assert.equal(calls.length, 0);
  });

  it("062 fresh chat T2 does not execute folio requery", async () => {
    let queried = 0;
    configureFolioChat(smallUniverse(), {
      queryPublicFolios: async () => {
        queried += 1;
        return [];
      },
    });
    await runChat(T2);
    assert.equal(queried, 0);
  });

  it("063 fresh chat T2 does not assume all folios", async () => {
    configureFolioChat(smallUniverse());
    const result = await runChat(T2);
    assert.doesNotMatch(result.answer || "", /aceite/i);
    assert.doesNotMatch(result.answer || "", /importe total/i);
  });

  it("064 cross-plant echoed state dropped", () => {
    const echoed = sanitizeEchoedState(
      { parent_intent: "folio_search", planta_id: 1, folio_search_spec: canonicalSpec() },
      2
    );
    assert.equal(echoed.folio_search_spec, null);
  });

  it("065 cross-plant T2 not executed from old spec", async () => {
    let queried = 0;
    configureFolioChat(smallUniverse(), {
      queryPublicFolios: async () => {
        queried += 1;
        return [];
      },
    });
    const result = await runChat(T2, {
      plantaId: 2,
      conversation_state: {
        parent_intent: "folio_search",
        planta_id: 1,
        folio_search_spec: canonicalSpec(),
      },
    });
    assert.equal(queried, 0);
    assert.equal(result.context_meta.requires_clarification, true);
  });

  it("066 authorization rechecked for current planta", async () => {
    configureFolioChat(smallUniverse());
    const first = await runChat(T1);
    const denied = await runChat(T2, {
      conversation_state: first.context_meta.conversation_state,
      auth: { role: "GG", plantas_permitidas: [2] },
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 403);
    assert.equal(denied.code, "SOURCE_RESTRICTED");
  });

  it("067 T1 response/list behavior unchanged", async () => {
    const { payload } = await search(T1);
    assert.equal(payload.filters.analysis_mode, "LIST");
    assert.ok(payload.records.length > 0);
    assert.match(buildFolioSearchChatResult(payload, { planta_id: 1 }).answer, /Encontré \d+ folios/);
  });

  it("068 T1 display limit remains 40", async () => {
    const { payload } = await search(T1, { rows: universeOver40() });
    assert.equal(payload.records.length, 40);
    assert.equal(payload.truncated, true);
  });

  it("069 T1 match_count remains before display limit", async () => {
    const { payload } = await search(T1, { rows: universeOver40() });
    assert.equal(payload.match_count, 60);
    assert.equal(payload.count, 60);
  });

  it("070 keyword matcher unchanged", () => {
    assert.equal(textMatchesSearch("ACEITE MOTOR 15W40", "aceite"), true);
    assert.equal(textMatchesSearch("LLANTAS", "aceite"), false);
  });

  it("071 project join parity unchanged", () => {
    const igf = read("lib/director-ia-igf-reviewable-supports.js");
    const fn = igf.slice(igf.indexOf("async function queryReviewableSupportFolios"));
    const sql = fn.slice(0, fn.indexOf("return r.rows"));
    assert.match(sql, /LEFT JOIN public\.proyectos pr ON pr\.id = f\.proyecto_id/);
    assert.equal((sql.match(/LEFT JOIN public\.proyectos/g) || []).length, 1);
  });

  it("072 resolvePlantCodes unrelated", () => {
    assert.doesNotMatch(read("lib/director-ia-folio-search.js"), /resolvePlantCodes/);
    assert.doesNotMatch(read("lib/director-ia-conversation-state.js"), /resolvePlantCodes/);
  });

  it("073 C4 ¿cuántos fueron? remains outside this FIX", async () => {
    configureFolioChat(smallUniverse());
    const first = await runChat(T1);
    const c4 = await runChat(C4, { conversation_state: first.context_meta.conversation_state });
    assert.equal(c4.context_meta.requires_clarification, true);
    assert.equal(c4.folio_search == null, true);
  });

  it("074 C5 ¿y solo julio? remains outside this FIX", async () => {
    configureFolioChat(smallUniverse());
    const first = await runChat(T1);
    const c5 = await runChat(C5, { conversation_state: first.context_meta.conversation_state });
    assert.equal(c5.context_meta.requires_clarification, true);
    assert.equal(isFolioSearchAggregateFollowUp(C5), false);
  });

  it("075 existing explicit aggregate question still PASS", async () => {
    const { payload } = await search(EXPLICIT);
    assert.equal(payload.filters.analysis_mode, "AGGREGATE");
    assert.equal(payload.filters.aggregation, "SUM");
    assert.equal(payload.analysis.known_total, 600);
  });

  it("076 explicit aggregate does not require conversation state", async () => {
    const { payload } = await search(EXPLICIT);
    assert.equal(payload.ok, true);
    assert.equal(payload.filters.concept_query, "aceite");
  });

  it("077 explicit aggregate and follow-up aggregate produce same result fixture", async () => {
    const rows = universeOver40();
    const explicit = await search(EXPLICIT, { rows });
    const follow = await search(T2, {
      rows,
      inheritedFilters: canonicalSpec(),
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(explicit.payload.analysis.known_total, follow.payload.analysis.known_total);
    assert.equal(explicit.payload.match_count, follow.payload.match_count);
    assert.equal(explicit.payload.analysis.aggregate_eligible_count, follow.payload.analysis.aggregate_eligible_count);
    assert.equal(explicit.payload.analysis.unknown_amount_count, follow.payload.analysis.unknown_amount_count);
    assert.equal(explicit.payload.analysis.is_complete, follow.payload.analysis.is_complete);
  });

  it("078 folio-search keyword range suite file present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-folio-keyword-range-search-parity.test.js")), true);
  });

  it("079 folio aggregate existing tests still compute CANCELADO exclusion", async () => {
    const { payload } = await search(EXPLICIT, {
      rows: [
        row({ id: 1, importe: 100, estatus: "PENDIENTE", concepto: "ACEITE" }),
        row({ id: 2, importe: 999, estatus: "CANCELADO", concepto: "ACEITE" }),
      ],
    });
    assert.equal(payload.analysis.aggregate_eligible_count, 1);
    assert.equal(payload.analysis.known_total, 100);
  });

  it("080 M2 folio status/history/documents suites present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-m2-folio-status.test.js")), true);
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-m2-history.test.js")), true);
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-m2-documents-metadata.test.js")), true);
  });

  it("081 IGF reviewable suite present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-igf-reviewable-supports.test.js")), true);
  });

  it("082 conversation-state existing suite present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-conversational-continuity.test.js")), true);
  });

  it("083 Tier 1/applicable gate present", () => {
    const src = read("scripts/director-ia-golden-regression.js");
    assert.match(src, /TIER 1|tier1/i);
    assert.match(src, /--gate/);
  });

  it("084 no new SQL", () => {
    const diff = spawnSync("git", ["diff", "--", "lib/director-ia-folio-search.js", "lib/director-ia-conversation-state.js", "lib/director-ia-chat.js"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(diff.status, 0);
    assert.doesNotMatch(diff.stdout, /SELECT |INSERT |UPDATE |CREATE TABLE/i);
  });

  it("085 no schema", () => {
    const diff = spawnSync("git", ["diff", "--name-only"], { cwd: ROOT, encoding: "utf8" });
    assert.doesNotMatch(diff.stdout, /schema|migrations?\//i);
  });

  it("086 no migration", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "migrations")), fs.existsSync(path.join(ROOT, "migrations")));
    const diff = spawnSync("git", ["diff", "--name-only"], { cwd: ROOT, encoding: "utf8" });
    assert.doesNotMatch(diff.stdout, /migration/i);
  });

  it("087 no new tool", () => {
    assert.doesNotMatch(read("lib/director-ia-chat.js"), /get_folio_search_aggregate/);
    const tools = read("lib/director-ia-tools.js");
    assert.doesNotMatch(spawnSync("git", ["diff", "--", "lib/director-ia-tools.js"], { cwd: ROOT, encoding: "utf8" }).stdout, /\+/);
  });

  it("088 no endpoint", () => {
    const diff = spawnSync("git", ["diff", "--name-only"], { cwd: ROOT, encoding: "utf8" });
    assert.doesNotMatch(diff.stdout, /server\.js|routes/);
  });

  it("089 no server.js", () => {
    const diff = spawnSync("git", ["diff", "--name-only", "--", "server.js"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(String(diff.stdout || "").trim(), "");
  });

  it("090 no frontend", () => {
    const diff = spawnSync("git", ["diff", "--name-only"], { cwd: ROOT, encoding: "utf8" });
    assert.doesNotMatch(diff.stdout, /\.tsx$|DirectorIaChatPanel/);
  });

  it("091 no planner unless STOP", () => {
    const diff = spawnSync("git", ["diff", "--name-only", "--", "lib/director-ia-planner.js"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(String(diff.stdout || "").trim(), "");
  });

  it("092 no LIVE_DB", () => {
    assert.doesNotMatch(read("lib/director-ia-folio-search.js"), /LIVE_DB/);
    assert.doesNotMatch(read("lib/director-ia-chat.js"), /LIVE_DB/);
  });

  it("093 diff --check PASS", () => {
    const chk = spawnSync("git", ["diff", "--check"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(chk.status, 0, chk.stdout || chk.stderr);
  });

  it("094 NEW FAILURE = 0 placeholder satisfied by this suite completing", () => {
    assert.equal(emptyConversationState(1).folio_search_spec, null);
  });
});
