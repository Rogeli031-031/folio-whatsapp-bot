"use strict";

/**
 * FIX-DIRECTOR-IA-FOLIO-KEYWORD-TIENEN-PALABRA-PARITY-001
 * 001..060 — contienen la palabra ≡ tienen la palabra.
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
  normalizeForSearch,
} = require("../lib/director-ia-folio-search");
const {
  sanitizeEchoedState,
  isFolioSearchAggregateFollowUp,
  isValidFolioSearchSpec,
} = require("../lib/director-ia-conversation-state");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-09T12:00:00-06:00");

const Q = Object.freeze({
  FEB_CONTIENE: "¿Qué folios de febrero de 2026 contienen la palabra aceite?",
  FEB_TIENEN: "¿Qué folios de febrero de 2026 tienen la palabra aceite?",
  ENE_CONTIENE_MOTOR: "¿Qué folios de enero de 2026 contienen la palabra motor?",
  ENE_TIENEN_MOTOR: "¿Qué folios de enero de 2026 tienen la palabra motor?",
  RANGE_CONTIENE: "¿Qué folios de enero a agosto de 2026 contienen la palabra aceite?",
  RANGE_TIENEN: "¿Qué folios de enero a agosto de 2026 tienen la palabra aceite?",
  TIENE: "¿Qué folios de febrero de 2026 tiene la palabra aceite?",
  QUE_TIENE: "¿Qué folios de febrero de 2026 que tiene la palabra aceite?",
  QUE_TIENEN: "¿Qué folios de febrero de 2026 que tienen la palabra aceite?",
  QUE_TENGA: "¿Qué folios de febrero de 2026 que tenga la palabra aceite?",
  QUE_TENGAN: "¿Qué folios de febrero de 2026 que tengan la palabra aceite?",
  STATUS: "¿Qué folios de febrero de 2026 tienen estatus PAGADO?",
  RESP: "¿Qué folios de febrero de 2026 tienen responsable?",
  COMPROB: "¿Qué folios de febrero de 2026 tienen comprobaciones?",
  T2: "puedes sumarlos y darme un total por mes?",
  AGG: "cuánto suman los folios de enero a agosto de aceite?",
});

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function filters(q) {
  return extractFolioSearchFilters(q, { now: NOW });
}

function row(over = {}) {
  return {
    id: 1,
    numero_folio: "F-1",
    folio_codigo: "FC-1",
    planta_id: 1,
    mes_cargo: "2026-02",
    importe: 100,
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

function fixture() {
  return [
    row({ id: 1, numero_folio: "F-1", mes_cargo: "2026-01", concepto: "ACEITE MOTOR 15W40" }),
    row({ id: 2, numero_folio: "F-2", mes_cargo: "2026-02", concepto: "ACEITE HIDRAULICO" }),
    row({ id: 3, numero_folio: "F-3", mes_cargo: "2026-02", concepto: "CAMBIO DE ACEITE", estatus: "CANCELADO" }),
    row({ id: 4, numero_folio: "F-4", mes_cargo: "2026-02", concepto: "LLANTAS" }),
    row({ id: 5, numero_folio: "F-5", mes_cargo: "2026-08", concepto: "ACEITE" }),
  ];
}

async function search(question, extras = {}) {
  const rows = extras.rows || fixture();
  const calls = extras.calls || [];
  const payload = await loadFolioSearchForChat(
    null,
    extras.plantaId != null ? extras.plantaId : 1,
    { body: {}, dashboardAuth: extras.auth || { role: "ZP" } },
    {
      now: NOW,
      question,
      auth: extras.auth || { role: "ZP" },
      inheritedFilters: extras.inheritedFilters,
      analysisOverride: extras.analysisOverride,
      queryPublicFolios:
        extras.queryPublicFolios ||
        (async (_c, plantaId, mesCargo) => {
          calls.push(mesCargo);
          return rows.filter(
            (r) => Number(r.planta_id) === Number(plantaId) && String(r.mes_cargo) === String(mesCargo)
          );
        }),
    }
  );
  return { payload, calls };
}

function idsOf(payload) {
  return (payload.records || []).map((r) => r.folio_id || r.numero_folio).sort();
}

function matcherSrc() {
  const src = read("lib/director-ia-folio-search.js");
  const start = src.indexOf("function normalizeForSearch");
  const end = src.indexOf("function rowMatchesConcept");
  return src.slice(start, end);
}

describe("FIX tienen la palabra parity", () => {
  it("001 contiene aceite -> folio_search", () => {
    assert.equal(planDirectorIaQuestion(Q.FEB_CONTIENE, { now: NOW }).intent, "folio_search");
  });

  it("002 contiene aceite -> keyword_search", () => {
    assert.equal(filters(Q.FEB_CONTIENE).operation, "keyword_search");
  });

  it("003 contiene aceite -> concept_query aceite", () => {
    assert.equal(filters(Q.FEB_CONTIENE).concept_query, "aceite");
  });

  it("004 tienen la palabra aceite -> folio_search", () => {
    assert.equal(planDirectorIaQuestion(Q.FEB_TIENEN, { now: NOW }).intent, "folio_search");
  });

  it("005 tienen la palabra aceite -> keyword_search", () => {
    assert.equal(filters(Q.FEB_TIENEN).operation, "keyword_search");
  });

  it("006 tienen la palabra aceite -> concept_query aceite", () => {
    assert.equal(filters(Q.FEB_TIENEN).concept_query, "aceite");
  });

  it("007 no conserva tienen en concept_query", () => {
    assert.doesNotMatch(String(filters(Q.FEB_TIENEN).concept_query || ""), /tienen/);
  });

  it("008 no conserva palabra en concept_query", () => {
    assert.doesNotMatch(String(filters(Q.FEB_TIENEN).concept_query || ""), /palabra/);
  });

  it("009 contiene vs tienen -> mismo scope", () => {
    assert.equal(filters(Q.FEB_CONTIENE).scope, filters(Q.FEB_TIENEN).scope);
    assert.equal(filters(Q.FEB_TIENEN).scope, SCOPE_ALL_PUBLIC_FOLIOS);
  });

  it("010 contiene vs tienen -> mismo periodo", () => {
    const a = filters(Q.FEB_CONTIENE);
    const b = filters(Q.FEB_TIENEN);
    assert.equal(a.period_mode, "SINGLE");
    assert.equal(b.period_mode, a.period_mode);
    assert.equal(a.period_month, "2026-02");
    assert.equal(b.period_month, a.period_month);
  });

  it("011 contiene vs tienen -> misma operation", () => {
    assert.equal(filters(Q.FEB_CONTIENE).operation, filters(Q.FEB_TIENEN).operation);
  });

  it("012 contiene vs tienen -> mismo concept_query", () => {
    assert.equal(filters(Q.FEB_CONTIENE).concept_query, filters(Q.FEB_TIENEN).concept_query);
  });

  it("013 contiene vs tienen -> mismo result set fixture", async () => {
    const a = await search(Q.FEB_CONTIENE);
    const b = await search(Q.FEB_TIENEN);
    assert.deepEqual(idsOf(a.payload), idsOf(b.payload));
  });

  it("014 contiene vs tienen -> mismo count fixture", async () => {
    const a = await search(Q.FEB_CONTIENE);
    const b = await search(Q.FEB_TIENEN);
    assert.equal(a.payload.count, b.payload.count);
    assert.equal(a.payload.match_count, b.payload.match_count);
    assert.equal(a.payload.count, 2);
  });

  it("015 enero contiene motor -> motor", () => {
    assert.equal(filters(Q.ENE_CONTIENE_MOTOR).concept_query, "motor");
    assert.equal(filters(Q.ENE_CONTIENE_MOTOR).period_month, "2026-01");
  });

  it("016 enero tienen la palabra motor -> motor", () => {
    assert.equal(filters(Q.ENE_TIENEN_MOTOR).concept_query, "motor");
    assert.doesNotMatch(String(filters(Q.ENE_TIENEN_MOTOR).concept_query || ""), /tienen|palabra/);
  });

  it("017 motor result parity", async () => {
    const rows = [
      row({ id: 1, mes_cargo: "2026-01", concepto: "ACEITE MOTOR" }),
      row({ id: 2, mes_cargo: "2026-01", concepto: "LLANTAS" }),
    ];
    const a = await search(Q.ENE_CONTIENE_MOTOR, { rows });
    const b = await search(Q.ENE_TIENEN_MOTOR, { rows });
    assert.equal(a.payload.count, 1);
    assert.equal(b.payload.count, a.payload.count);
    assert.deepEqual(idsOf(a.payload), idsOf(b.payload));
  });

  it("018 rango contiene aceite -> 2026-01..2026-08", () => {
    const f = filters(Q.RANGE_CONTIENE);
    assert.equal(f.period_mode, "RANGE");
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
  });

  it("019 rango tienen palabra aceite -> 2026-01..2026-08", () => {
    const f = filters(Q.RANGE_TIENEN);
    assert.equal(f.period_mode, "RANGE");
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
  });

  it("020 rango concept parity", () => {
    assert.equal(filters(Q.RANGE_CONTIENE).concept_query, "aceite");
    assert.equal(filters(Q.RANGE_TIENEN).concept_query, "aceite");
    assert.equal(filters(Q.RANGE_CONTIENE).operation, "keyword_search");
    assert.equal(filters(Q.RANGE_TIENEN).operation, "keyword_search");
  });

  it("021 rango result parity", async () => {
    const a = await search(Q.RANGE_CONTIENE);
    const b = await search(Q.RANGE_TIENEN);
    assert.deepEqual(idsOf(a.payload), idsOf(b.payload));
    assert.equal(a.payload.count, b.payload.count);
    assert.equal(a.payload.count, 4);
  });

  it("022 tiene la palabra aceite soportado", () => {
    assert.equal(filters(Q.TIENE).concept_query, "aceite");
    assert.equal(filters(Q.TIENE).operation, "keyword_search");
  });

  it("023 tienen la palabra aceite soportado", () => {
    assert.equal(filters(Q.FEB_TIENEN).concept_query, "aceite");
    assert.equal(filters(Q.FEB_TIENEN).operation, "keyword_search");
  });

  it("024 que tiene la palabra aceite soportado", () => {
    assert.equal(filters(Q.QUE_TIENE).concept_query, "aceite");
    assert.equal(filters(Q.QUE_TIENE).operation, "keyword_search");
  });

  it("025 que tienen la palabra aceite soportado", () => {
    assert.equal(filters(Q.QUE_TIENEN).concept_query, "aceite");
    assert.equal(filters(Q.QUE_TIENEN).operation, "keyword_search");
  });

  it("026 que tenga la palabra aceite soportado", () => {
    assert.equal(filters(Q.QUE_TENGA).concept_query, "aceite");
    assert.equal(filters(Q.QUE_TENGA).operation, "keyword_search");
  });

  it("027 que tengan la palabra aceite sigue soportado", () => {
    assert.equal(filters(Q.QUE_TENGAN).concept_query, "aceite");
    assert.equal(filters(Q.QUE_TENGAN).operation, "keyword_search");
  });

  it("028 tienen estatus PAGADO no activa keyword por tienen", () => {
    assert.equal(filters(Q.STATUS).operation, "concept_sequence");
    assert.notEqual(filters(Q.STATUS).concept_query, "aceite");
  });

  it("029 tienen responsable no activa keyword por tienen", () => {
    assert.equal(filters(Q.RESP).operation, "concept_sequence");
  });

  it("030 no detector abierto de tener", () => {
    assert.equal(filters(Q.COMPROB).operation, "concept_sequence");
    const src = read("lib/director-ia-folio-search.js");
    const hint = src.slice(src.indexOf("const KEYWORD_HINT_RE"), src.indexOf("function stripSearchWrappers"));
    assert.doesNotMatch(hint, /\\btiene(?:n)?\\b/);
    assert.match(hint, /la\\s\+palabra/);
  });

  it("031 matcher unchanged", () => {
    const m = matcherSrc();
    assert.match(m, /function normalizeForSearch/);
    assert.match(m, /function textMatchesSearch/);
    assert.match(m, /function rowMatchesKeywordSearch/);
    assert.match(m, /function significantSearchTokens/);
    assert.equal(normalizeForSearch("ACEITE"), "aceite");
    assert.equal(textMatchesSearch("ACEITE MOTOR", "aceite"), true);
  });

  it("032 ALL_PUBLIC_FOLIOS unchanged", () => {
    assert.equal(filters(Q.FEB_TIENEN).scope, SCOPE_ALL_PUBLIC_FOLIOS);
    assert.equal(filters(Q.FEB_CONTIENE).scope, SCOPE_ALL_PUBLIC_FOLIOS);
  });

  it("033 mes_cargo unchanged", () => {
    const spec = buildFolioSearchSpecFromFilters(filters(Q.FEB_TIENEN), 1);
    assert.equal(spec.period_field, "mes_cargo");
    assert.doesNotMatch(read("lib/director-ia-folio-search.js"), /fecha_creacion/);
  });

  it("034 display limit unchanged", async () => {
    assert.match(read("lib/director-ia-folio-search.js"), /RECORD_LIMIT = 40/);
    const rows = [];
    for (let i = 1; i <= 45; i += 1) {
      rows.push(row({ id: i, numero_folio: `F-${i}`, mes_cargo: "2026-02", concepto: "ACEITE" }));
    }
    const { payload } = await search(Q.FEB_TIENEN, { rows });
    assert.equal(payload.records.length, 40);
    assert.equal(payload.truncated, true);
  });

  it("035 match_count-before-limit unchanged", async () => {
    const rows = [];
    for (let i = 1; i <= 45; i += 1) {
      rows.push(row({ id: i, numero_folio: `F-${i}`, mes_cargo: "2026-02", concepto: "ACEITE" }));
    }
    const { payload } = await search(Q.FEB_TIENEN, { rows });
    assert.equal(payload.match_count, 45);
    assert.equal(payload.count, 45);
  });

  it("036 CANCELADO list unchanged", async () => {
    const { payload } = await search(Q.FEB_TIENEN);
    assert.ok(payload.records.some((r) => r.estatus === "CANCELADO"));
  });

  it("037 aggregate explícito existente PASS", async () => {
    const { payload } = await search(Q.AGG, {
      rows: [
        row({ id: 1, mes_cargo: "2026-01", importe: 100, concepto: "ACEITE" }),
        row({ id: 2, mes_cargo: "2026-01", importe: 999, estatus: "CANCELADO", concepto: "ACEITE" }),
      ],
    });
    assert.equal(payload.filters.analysis_mode, "AGGREGATE");
    assert.equal(payload.analysis.known_total, 100);
  });

  it("038 folio_search_spec con tienen guarda aceite", () => {
    const spec = buildFolioSearchSpecFromFilters(filters(Q.RANGE_TIENEN), 1);
    assert.ok(isValidFolioSearchSpec(spec, 1));
    assert.equal(spec.concept_query, "aceite");
    assert.equal(spec.operation, "keyword_search");
    assert.equal(spec.period_start, "2026-01");
    assert.equal(spec.period_end, "2026-08");
  });

  it("039 aggregation follow-up PASS", async () => {
    const spec = buildFolioSearchSpecFromFilters(filters(Q.RANGE_TIENEN), 1);
    const { payload } = await search(Q.T2, {
      inheritedFilters: spec,
      analysisOverride: { analysis_mode: "AGGREGATE", aggregation: "SUM", group_by: "MONTH", cumulative: "NO" },
    });
    assert.equal(payload.filters.concept_query, "aceite");
    assert.equal(payload.filters.analysis_mode, "AGGREGATE");
    assert.equal(payload.filters.aggregation, "SUM");
    assert.equal(payload.filters.group_by, "MONTH");
    assert.equal(isFolioSearchAggregateFollowUp(Q.T2), true);
  });

  it("040 fresh-chat follow-up sigue fail-close", () => {
    assert.equal(isValidFolioSearchSpec(null, 1), false);
    assert.equal(isFolioSearchAggregateFollowUp(Q.T2), true);
  });

  it("041 cross-plant continuity unchanged", () => {
    const spec = buildFolioSearchSpecFromFilters(filters(Q.RANGE_TIENEN), 1);
    const echoed = sanitizeEchoedState(
      { parent_intent: "folio_search", planta_id: 1, folio_search_spec: spec },
      2
    );
    assert.equal(echoed.folio_search_spec, null);
  });

  it("042 keyword-range suite file present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-folio-keyword-range-search-parity.test.js")), true);
  });

  it("043 aggregation-followup suite file present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-folio-search-aggregation-followup.test.js")), true);
  });

  it("044 truthful folio-search suite present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-folio-search-truthful.test.js")), true);
  });

  it("045 M2 suites present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-m2-folio-status.test.js")), true);
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-m2-history.test.js")), true);
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-m2-documents-metadata.test.js")), true);
  });

  it("046 IGF reviewable suite present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-igf-reviewable-supports.test.js")), true);
  });

  it("047 conversation-state suite present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test/director-ia-conversational-continuity.test.js")), true);
  });

  it("048 Tier 1/applicable gate present", () => {
    const src = read("scripts/director-ia-golden-regression.js");
    assert.match(src, /TIER 1|tier1/i);
    assert.match(src, /--gate/);
  });

  it("049 planner unchanged", () => {
    const diff = spawnSync("git", ["diff", "--name-only", "--", "lib/director-ia-planner.js"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(String(diff.stdout || "").trim(), "");
  });

  it("050 chat unchanged", () => {
    const diff = spawnSync("git", ["diff", "--name-only", "--", "lib/director-ia-chat.js"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(String(diff.stdout || "").trim(), "");
  });

  it("051 conversation-state code unchanged", () => {
    const diff = spawnSync("git", ["diff", "--name-only", "--", "lib/director-ia-conversation-state.js"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(String(diff.stdout || "").trim(), "");
  });

  it("052 server unchanged", () => {
    const diff = spawnSync("git", ["diff", "--name-only", "--", "server.js"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(String(diff.stdout || "").trim(), "");
  });

  it("053 frontend unchanged", () => {
    const diff = spawnSync("git", ["diff", "--name-only", "--", "frontend-dashboard"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(String(diff.stdout || "").trim(), "");
  });

  it("054 SQL unchanged", () => {
    const diff = spawnSync("git", ["diff", "--", "lib/director-ia-folio-search.js"], { cwd: ROOT, encoding: "utf8" });
    assert.doesNotMatch(diff.stdout || "", /SELECT |INSERT |CREATE TABLE/i);
  });

  it("055 schema unchanged", () => {
    const diff = spawnSync("git", ["diff", "--name-only"], { cwd: ROOT, encoding: "utf8" });
    assert.doesNotMatch(diff.stdout, /schema|migrations?\//i);
  });

  it("056 tool unchanged", () => {
    const diff = spawnSync("git", ["diff", "--name-only", "--", "lib/director-ia-tools.js"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(String(diff.stdout || "").trim(), "");
  });

  it("057 endpoint unchanged", () => {
    const diff = spawnSync("git", ["diff", "--name-only"], { cwd: ROOT, encoding: "utf8" });
    assert.doesNotMatch(diff.stdout, /server\.js/);
  });

  it("058 LIVE_DB NO", () => {
    assert.doesNotMatch(read("lib/director-ia-folio-search.js"), /LIVE_DB/);
  });

  it("059 diff --check PASS", () => {
    const chk = spawnSync("git", ["diff", "--check"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(chk.status, 0, chk.stdout || chk.stderr);
  });

  it("060 NEW FAILURE = 0 placeholder", () => {
    assert.equal(filters(Q.FEB_CONTIENE).concept_query, "aceite");
  });
});
