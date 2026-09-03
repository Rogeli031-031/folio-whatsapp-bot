"use strict";

/**
 * Capa B PRE-DEPLOY RUNTIME.
 * Entra por handlePostChat → askDirectorIa. No LIVE_DB. No prosa LLM como PASS.
 * openaiChat solo evita HTTP real a OpenAI; nunca es criterio de PASS.
 */

const { RUNTIME_CASES, NOW_ISO } = require("../fixtures/director-ia-golden-cases");

const NOW = new Date(NOW_ISO);

const BOUNDARIES = Object.freeze([
  "HTTP_STATUS",
  "INTENT_ROUTE",
  "EVIDENCE_BUNDLE",
  "METRIC_PACK",
  "USER_VISIBLE_OUTCOME",
]);

const GENERIC_INTENT_RE = /no se pudo determinar una intenci[oó]n/i;

function mark(status, detail) {
  return { status, detail: detail == null ? null : String(detail) };
}

function captureRes() {
  const out = { statusCode: null, body: null };
  return {
    out,
    status(code) {
      out.statusCode = code;
      return this;
    },
    json(body) {
      out.body = body;
      return this;
    },
  };
}

function closedFinal(year, month, margenKg, empresa) {
  const vid = year * 100 + month;
  return {
    versions: [{ id: vid, version_number: 2, financial_state: "FINAL" }],
    lines: { [vid]: [{ empresa: empresa || "Acapulco", margen_kg: margenKg }] },
  };
}

function availableIgfMap() {
  return {
    "2026-1": closedFinal(2026, 1, 7.1),
    "2026-5": closedFinal(2026, 5, 7.11),
    "2026-8": closedFinal(2026, 8, 8.2),
  };
}

function catalogClientSales() {
  return [
    { month: "2026-01", cliente_norm: "TORTILLERIA ERICK", canal: "Casa", subcanal: "", kg: 10 },
    { month: "2026-08", cliente_norm: "TORTILLERIA ERICK", canal: "Casa", subcanal: "", kg: 40 },
    { month: "2026-08", cliente_norm: "TORTILLERIA", canal: "Casa", subcanal: "", kg: 15 },
  ];
}

function catalogClientDiscount() {
  return [
    { month: "2026-01", cliente_norm: "TORTILLERIA ERICK", canal: "Casa", subcanal: "", monto: 12, kg: 10 },
    { month: "2026-08", cliente_norm: "TORTILLERIA ERICK", canal: "Casa", subcanal: "", monto: 48, kg: 40 },
  ];
}

function igfQueryFns(map) {
  return {
    queryHistoricalMarginVersions: async (_c, y, m) => (map[`${y}-${m}`] || {}).versions || [],
    queryHistoricalMarginLatestVersion: async (_c, y, m) => ((map[`${y}-${m}`] || {}).versions || [])[0] || null,
    queryHistoricalMarginLines: async (_c, versionId) => {
      for (const pack of Object.values(map)) {
        if (pack.lines && pack.lines[versionId]) return pack.lines[versionId];
      }
      return [];
    },
  };
}

function metaOf(body) {
  return (body && body.context_meta) || {};
}

function packKind(body) {
  const meta = metaOf(body);
  const mode = String(meta.mode || "");
  const prompt = String(meta.prompt_mode || "");
  const parent = meta.conversation_state && meta.conversation_state.parent_intent;
  const bundle = meta.conversation_state && meta.conversation_state.last_evidence_bundle_type;
  const blob = [mode, prompt, parent, bundle].filter(Boolean).join(" ");
  if (mode === "historical_margin" || parent === "historical_margin" || bundle === "historical_margin") {
    return "historical_margin";
  }
  if (mode === "daily_executive_brief" || parent === "daily_executive_brief") return "daily_executive_brief";
  if (mode === "plant_diagnosis" || prompt === "executive_status" || prompt === "plant_diagnosis" || parent === "plant_diagnosis") {
    return "plant_diagnosis";
  }
  if (/discount|descuento/.test(blob)) return "descuento";
  if (mode === "conversation_clarification") return "clarification";
  if (mode === "client_profile") return "client_profile";
  return mode || parent || "unknown";
}

function isClientDiscountFamilyPack(body) {
  const pack = packKind(body);
  return pack === "descuento" || pack === "client_profile";
}

function normalizeBlob(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function entityParticipates(runtimeCase, body) {
  const expected = runtimeCase.expected_entity;
  if (!expected) return true;
  const meta = metaOf(body);
  const state = (meta && meta.conversation_state) || {};
  const entities = Array.isArray(state.active_entities) ? state.active_entities : [];
  const profile = body && body.client_profile;
  const identity = profile && profile.identity;
  const blob = [
    body && body.answer,
    identity && identity.display_name,
    identity && identity.cliente_norm,
    ...entities.map((e) => e && (e.display || e.cliente_norm || e.cliente_key)),
  ]
    .filter(Boolean)
    .join(" ");
  return normalizeBlob(blob).includes(normalizeBlob(expected));
}

function isSpecificDiscountClarification(body) {
  const meta = metaOf(body);
  if (!meta.requires_clarification) return false;
  const answer = String((body && body.answer) || "");
  if (GENERIC_INTENT_RE.test(answer)) return false;
  return /descuento|cliente|agosto|alcance/i.test(answer);
}

function looksLikePlantMarginAnswer(body) {
  const answer = String((body && body.answer) || "");
  return /\$\/kg/.test(answer) && /enero|agosto|mayo|variaci[oó]n/i.test(answer);
}

function mentionsErick(body) {
  return /tortilleria erick/i.test(String((body && body.answer) || ""));
}

function firstBadBoundary(boundaries) {
  for (const name of BOUNDARIES) {
    if (boundaries[name] && boundaries[name].status === "FAIL") return name;
  }
  return null;
}

async function postChat(handlePostChat, question, conversationState, history) {
  const res = captureRes();
  let threw = null;
  try {
    await handlePostChat(
      {
        body: {
          planta_id: 1,
          question,
          conversation_state: conversationState || undefined,
          history: Array.isArray(history) ? history : [],
        },
        dashboardAuth: { role: "ZP", actor_id: 1 },
      },
      res
    );
  } catch (err) {
    threw = err;
  }
  return { http: res.out.statusCode, body: res.out.body, threw };
}

function installRuntimeDeps(chat, map) {
  chat.configureDirectorIaChat({
    now: NOW,
    pool: {
      connect: async () => ({
        query: async () => ({ rows: [] }),
        release() {},
      }),
    },
    resolveHistoricalMarginPlanta: async () => ({ id: 1, nombre: "Acapulco", clave: "AC" }),
    resolveHistoricalMarginPlantByNombre: async () => null,
    resolveClientProfilePlanta: async () => ({ id: 1, nombre: "Acapulco", clave: "E3" }),
    resolveClientProfilePlantCodes: async () => ({ not_found: false, uniqueCodes: ["E3"], plantCode: "E3" }),
    queryClientProfileSales: async () => ({ rows: catalogClientSales() }),
    queryClientProfileDiscount: async () => ({ rows: catalogClientDiscount() }),
    queryClientProfileComments: async () => [],
    queryClientProfileActions: async () => [],
    queryClientProfileHistorial: async () => new Map(),
    ...igfQueryFns(map),
    openaiChat: async () => "STUB_OPENAI_TRANSPORT",
  });
}

function clearRuntimeDeps(chat) {
  chat.configureDirectorIaChat({
    now: undefined,
    pool: null,
    resolveHistoricalMarginPlanta: undefined,
    resolveHistoricalMarginPlantByNombre: undefined,
    resolveClientProfilePlanta: undefined,
    resolveClientProfilePlantCodes: undefined,
    queryClientProfileSales: undefined,
    queryClientProfileDiscount: undefined,
    queryClientProfileComments: undefined,
    queryClientProfileActions: undefined,
    queryClientProfileHistorial: undefined,
    queryHistoricalMarginVersions: undefined,
    queryHistoricalMarginLatestVersion: undefined,
    queryHistoricalMarginLines: undefined,
    openaiChat: undefined,
  });
}

function evaluateLastTurn(runtimeCase, last) {
  const boundaries = {};
  for (const name of BOUNDARIES) boundaries[name] = mark("NOT_REACHED");

  if (last.threw) {
    boundaries.HTTP_STATUS = mark("FAIL", `throw: ${last.threw.message || last.threw}`);
    return { boundaries, http: null, pack: null };
  }

  const http = last.http;
  if (http == null) {
    boundaries.HTTP_STATUS = mark("FAIL", "handlePostChat no asignó status");
    return { boundaries, http, pack: null };
  }
  if (http >= 500) {
    boundaries.HTTP_STATUS = mark("FAIL", `http=${http} error=${last.body && last.body.error}`);
    return { boundaries, http, pack: packKind(last.body) };
  }
  boundaries.HTTP_STATUS = mark("PASS", `http=${http}`);

  const body = last.body || {};
  const meta = metaOf(body);
  const pack = packKind(body);
  boundaries.INTENT_ROUTE = mark("PASS", `mode=${meta.mode || "none"} pack=${pack}`);
  boundaries.EVIDENCE_BUNDLE = mark(
    "PASS",
    `bundle=${(meta.conversation_state && meta.conversation_state.last_evidence_bundle_type) || meta.mode || "none"}`
  );

  const forbidden = runtimeCase.forbidden_packs || [];
  if (forbidden.includes(pack) || (forbidden.includes("materialidad") && pack === "plant_diagnosis")) {
    boundaries.METRIC_PACK = mark("FAIL", `pack=${pack} forbidden`);
    return { boundaries, http, pack };
  }
  if (runtimeCase.expected_pack && pack !== runtimeCase.expected_pack) {
    boundaries.METRIC_PACK = mark("FAIL", `expected_pack=${runtimeCase.expected_pack} pack=${pack}`);
    return { boundaries, http, pack };
  }
  if (runtimeCase.must_return_client_historical_discount) {
    if (
      !isClientDiscountFamilyPack(body) ||
      meta.requires_clarification ||
      !entityParticipates(runtimeCase, body) ||
      looksLikePlantMarginAnswer(body)
    ) {
      boundaries.METRIC_PACK = mark(
        "FAIL",
        `expected client historical discount; pack=${pack} clarify=${Boolean(meta.requires_clarification)} entity=${entityParticipates(runtimeCase, body)} plant_margin=${looksLikePlantMarginAnswer(body)}`
      );
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.must_return_client_margin) {
    if (!mentionsErick(body) || looksLikePlantMarginAnswer(body)) {
      boundaries.METRIC_PACK = mark(
        "FAIL",
        `operation=${meta.operation || "none"} pack=${pack} erick=${mentionsErick(body)} plant_margin=${looksLikePlantMarginAnswer(body)}`
      );
      return { boundaries, http, pack };
    }
  }
  if (
    (runtimeCase.expected_metrics || []).includes("descuento") &&
    !isClientDiscountFamilyPack(body) &&
    !isSpecificDiscountClarification(body)
  ) {
    boundaries.METRIC_PACK = mark("FAIL", `expected descuento; pack=${pack} http=${http} error=${body.error || ""}`);
    return { boundaries, http, pack };
  }
  boundaries.METRIC_PACK = mark("PASS", pack);

  const answer = String(body.answer || "");
  if (runtimeCase.forbid_generic_intent && GENERIC_INTENT_RE.test(answer)) {
    boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", "generic_intent_clarification");
    return { boundaries, http, pack };
  }
  if (
    (runtimeCase.expected_metrics || []).includes("descuento") &&
    !isClientDiscountFamilyPack(body) &&
    !isSpecificDiscountClarification(body)
  ) {
    boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", `not_discount answer=${answer.slice(0, 120)}`);
    return { boundaries, http, pack };
  }
  if (runtimeCase.must_return_client_historical_discount && (meta.requires_clarification || !isClientDiscountFamilyPack(body))) {
    boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", `not_client_historical_discount pack=${pack}`);
    return { boundaries, http, pack };
  }
  if (runtimeCase.expected_pack === "historical_margin" && pack !== "historical_margin") {
    boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", `expected plant historical_margin pack=${pack}`);
    return { boundaries, http, pack };
  }
  boundaries.USER_VISIBLE_OUTCOME = mark(
    "PASS",
    meta.requires_clarification ? "specific_or_allowed_clarification" : `mode=${meta.mode || "none"}`
  );
  return { boundaries, http, pack };
}

async function evaluateRuntimeCase(runtimeCase, chat) {
  const history = [];
  let state = null;
  let last = null;
  const turnTrace = [];

  for (const turn of runtimeCase.turns) {
    last = await postChat(chat.handlePostChat, turn.question, state, history);
    history.push({ role: "user", content: turn.question });
    const meta = metaOf(last.body);
    if (meta.conversation_state) state = meta.conversation_state;
    turnTrace.push({
      question: turn.question,
      http: last.http,
      threw: last.threw ? String(last.threw.message || last.threw) : null,
      mode: meta.mode || null,
      operation: meta.operation || null,
      pack: packKind(last.body),
      error: (last.body && last.body.error) || null,
      executed: "handlePostChat → askDirectorIa",
    });
    if (last.threw) break;
  }

  const evaluated = evaluateLastTurn(runtimeCase, last || { threw: new Error("sin turnos"), http: null, body: null });
  const first = firstBadBoundary(evaluated.boundaries);
  const official5xx = evaluated.http >= 500 ? 1 : 0;

  let emptyIgf = null;
  if (runtimeCase.id === "R-RUNTIME-001") {
    installRuntimeDeps(chat, {});
    const emptyLast = await postChat(chat.handlePostChat, runtimeCase.turns[0].question, null, []);
    emptyIgf = {
      http: emptyLast.http,
      threw: emptyLast.threw ? String(emptyLast.threw.message || emptyLast.threw) : null,
      ok: emptyLast.body && emptyLast.body.ok,
      veracity: metaOf(emptyLast.body).veracity || null,
      operation: metaOf(emptyLast.body).operation || null,
      note: "Misma pregunta y loader real; IGF sin FILAS FINAL. handlePostChat mapea ok:false sin status a 500.",
    };
    installRuntimeDeps(chat, availableIgfMap());
  }

  return {
    id: runtimeCase.id,
    label: runtimeCase.label,
    category: runtimeCase.category,
    question: (runtimeCase.turns[runtimeCase.turns.length - 1] || {}).question,
    result: first ? "FAIL" : "PASS",
    failure_class: first ? "PRODUCT_GOLDEN_FAILURE" : null,
    first_bad_boundary: first,
    boundaries: evaluated.boundaries,
    http: evaluated.http,
    pack: evaluated.pack,
    official_http_5xx: official5xx,
    http_500_with_available_igf: runtimeCase.id === "R-RUNTIME-001" ? (evaluated.http >= 500 ? "REPRODUCED" : "NOT_REPRODUCED") : null,
    http_500_empty_igf: emptyIgf,
    turn_trace: turnTrace,
    notes: runtimeCase.notes || "",
  };
}

async function runRuntimeSet(cases) {
  const list = cases || RUNTIME_CASES;
  process.env.ENABLE_DIRECTOR_IA = "true";
  process.env.AI_ENABLED = "true";
  if (!process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = "runtime-golden-not-live";

  const chat = require("../../lib/director-ia-chat");
  installRuntimeDeps(chat, availableIgfMap());

  const rows = [];
  try {
    for (const c of list) {
      try {
        rows.push(await evaluateRuntimeCase(c, chat));
      } catch (err) {
        const boundaries = {};
        for (const name of BOUNDARIES) boundaries[name] = mark("NOT_REACHED");
        boundaries.HTTP_STATUS = mark("FAIL", `HARNESS: ${err && err.message}`);
        rows.push({
          id: c.id,
          label: c.label,
          category: c.category,
          question: (c.turns[c.turns.length - 1] || {}).question,
          result: "FAIL",
          failure_class: "HARNESS_FAILURE",
          first_bad_boundary: "HTTP_STATUS",
          boundaries,
          http: null,
          pack: null,
          official_http_5xx: 0,
          http_500_with_available_igf: null,
          http_500_empty_igf: null,
          turn_trace: [],
          notes: String(err && err.stack ? err.stack.split("\n")[0] : err),
        });
      }
    }
  } finally {
    clearRuntimeDeps(chat);
  }

  const pass = rows.filter((r) => r.result === "PASS").length;
  const fail = rows.filter((r) => r.result === "FAIL").length;
  const harnessFail = rows.filter((r) => r.failure_class === "HARNESS_FAILURE").length;
  const productFail = rows.filter((r) => r.failure_class === "PRODUCT_GOLDEN_FAILURE").length;
  const http5xx = rows.reduce((n, r) => n + (r.official_http_5xx || 0), 0);
  return { rows, pass, fail, harnessFail, productFail, http5xx, total: rows.length };
}

function formatRuntimeReport(summary) {
  const lines = [];
  lines.push("RUNTIME");
  for (const row of summary.rows) {
    const pad = row.label || row.id;
    const bound = row.first_bad_boundary ? `  FIRST_BAD_BOUNDARY=${row.first_bad_boundary}` : "";
    lines.push(`${row.id}  ${pad}  ${row.result}${bound}`);
  }
  lines.push(`HTTP 5xx ...................................... ${summary.http5xx}`);
  return lines.join("\n");
}

module.exports = {
  BOUNDARIES,
  RUNTIME_CASES,
  NOW,
  runRuntimeSet,
  formatRuntimeReport,
  firstBadBoundary,
  evaluateRuntimeCase,
};
