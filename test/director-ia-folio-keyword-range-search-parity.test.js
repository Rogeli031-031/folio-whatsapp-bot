"use strict";

/**
 * R-FOLIO-KW-001..061 — keyword + rango mes_cargo + paridad textual Kanban.
 * Vocabulario de negocio solo en este archivo de tests.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { buildDirectorIaToolPlan } = require("../lib/director-ia-tool-orchestrator");
const { getDirectorIaTool } = require("../lib/director-ia-tools");
const {
  extractFolioSearchFilters,
  resolveFolioSearchScope,
  loadFolioSearchForChat,
  buildFolioSearchAnswer,
  buildFolioSearchChatResult,
  normalizeForSearch,
  textMatchesSearch,
  SCOPE_ALL_PUBLIC_FOLIOS,
  SCOPE_SUPPORT_FAMILIES,
} = require("../lib/director-ia-folio-search");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-09T12:00:00-06:00");

const Q = Object.freeze({
  S1: "¿Qué folios de enero a agosto contienen la palabra aceite?",
  S2: "¿Qué folios de enero a agosto contienen aceite?",
  S3: "Busca los folios de enero a agosto con aceite.",
  S4: "¿Qué folios tenemos de aceite entre enero y agosto?",
  S5: "¿Qué folios de enero a hoy contienen aceite?",
  S6: "¿Qué folios de marzo contienen aceite?",
  S7: "¿Qué folios de enero a agosto contienen la palabra XXXXX?",
  BETWEEN: "folios entre enero y agosto de llantas",
  TO_TODAY: "folios de enero a hoy",
  OVER12: "folios de enero 2025 a febrero 2026 de llantas",
  FID: "estatus del folio 123",
  APOYOS: "qué apoyos de julio fueron de llantas?",
  AGG: "cuánto suman los folios de enero a agosto de aceite?",
  ZERO: "¿Qué folios de enero a agosto contienen la palabra zzxxyy?",
  MONTH_DISC: "¿En qué mes se apoyó para aceite?",
});

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
    proyecto_nombre: "Patio Aceites",
    ...over,
  };
}

function inject(question, extras = {}) {
  const rows = extras.rows || [row()];
  const calls = extras.calls || [];
  return {
    now: extras.now || NOW,
    question,
    auth: extras.auth || { role: "ZP" },
    resolveEquivalentIds: extras.resolveEquivalentIds || ((id) => [Number(id)]),
    queryPublicFolios:
      extras.queryPublicFolios ||
      (async (_c, plantaId, mesCargo) => {
        calls.push(mesCargo);
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

function months(start, end) {
  const out = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

describe("R-FOLIO-KW extractor y rangos", () => {
  it("001 BEFORE S1 ya no extrae el wrapper como concept_query", () => {
    const f = extractFolioSearchFilters(Q.S1, { now: NOW });
    assert.notEqual(f.concept_query, "contienen palabra aceite");
  });

  it("002 AFTER S1 search_term aceite", () => {
    assert.equal(extractFolioSearchFilters(Q.S1, { now: NOW }).concept_query, "aceite");
  });

  it("003 S1 intent folio_search", () => {
    assert.equal(planDirectorIaQuestion(Q.S1, { now: NOW }).intent, "folio_search");
    assert.equal(detectDirectorIaIntent(Q.S1).intent, "folio_search");
  });

  it("004 S1 universe ALL_PUBLIC_FOLIOS", () => {
    assert.equal(extractFolioSearchFilters(Q.S1, { now: NOW }).scope, SCOPE_ALL_PUBLIC_FOLIOS);
    assert.equal(resolveFolioSearchScope(Q.S1), SCOPE_ALL_PUBLIC_FOLIOS);
  });

  it("005 S1 Jan-Aug inclusive", () => {
    const f = extractFolioSearchFilters(Q.S1, { now: NOW });
    assert.equal(f.period_mode, "RANGE");
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
  });

  it("006/007 S1 usa mes_cargo y no fecha_creacion", async () => {
    const helper = read("lib/director-ia-folio-search.js");
    const igf = read("lib/director-ia-igf-reviewable-supports.js");
    assert.match(igf, /WHERE f\.mes_cargo = \$1/);
    assert.doesNotMatch(helper, /fecha_creacion/);
    assert.doesNotMatch(igf.slice(igf.indexOf("async function queryReviewableSupportFolios")), /fecha_creacion/);
    const { calls } = await search(Q.S1, {
      rows: [row(), row({ id: 8, mes_cargo: "2026-08", concepto: "ACEITE HIDRAULICO" })],
    });
    assert.deepEqual(calls, months("2026-01", "2026-08"));
  });

  it("008 S1 no hereda solo_activos", () => {
    const helper = read("lib/director-ia-folio-search.js");
    assert.doesNotMatch(helper, /solo_activos/);
  });

  it("009 CANCELADO puede listarse", async () => {
    const { payload } = await search(Q.S1, {
      rows: [row({ id: 2, mes_cargo: "2026-05", estatus: "CANCELADO", concepto: "CAMBIO DE ACEITE" })],
    });
    assert.equal(payload.count, 1);
    assert.equal(payload.records[0].estatus, "CANCELADO");
  });

  it("010 S2 search_term aceite", () => {
    assert.equal(extractFolioSearchFilters(Q.S2, { now: NOW }).concept_query, "aceite");
  });

  it("011 S3 search_term aceite", () => {
    assert.equal(extractFolioSearchFilters(Q.S3, { now: NOW }).concept_query, "aceite");
  });

  it("012/015 S4 entre enero y agosto", () => {
    const f = extractFolioSearchFilters(Q.S4, { now: NOW });
    assert.equal(f.period_mode, "RANGE");
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
    assert.equal(f.concept_query, "aceite");
    const between = extractFolioSearchFilters(Q.BETWEEN, { now: NOW });
    assert.equal(between.period_start, "2026-01");
    assert.equal(between.period_end, "2026-08");
  });

  it("013/016 S5 de enero a hoy = 2026-01..2026-09", () => {
    const f = extractFolioSearchFilters(Q.S5, { now: NOW });
    assert.equal(f.period_mode, "RANGE");
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-09");
    assert.equal(f.concept_query, "aceite");
    const bare = extractFolioSearchFilters(Q.TO_TODAY, { now: NOW });
    assert.equal(bare.period_start, "2026-01");
    assert.equal(bare.period_end, "2026-09");
  });

  it("014 S6 SINGLE marzo", () => {
    const f = extractFolioSearchFilters(Q.S6, { now: NOW });
    assert.equal(f.period_mode, "SINGLE");
    assert.equal(f.period_month, "2026-03");
    assert.equal(f.concept_query, "aceite");
  });

  it("017 max 12 months preserved", () => {
    const f = extractFolioSearchFilters(Q.OVER12, { now: NOW });
    assert.equal(f.period_code, "range_too_long");
  });
});

describe("R-FOLIO-KW matcher parity", () => {
  it("018 normalizer quita acentos", () => {
    assert.equal(normalizeForSearch("ACEITÉ"), "aceite");
  });

  it("019 normalizer lowercase", () => {
    assert.equal(normalizeForSearch("ACEITE"), "aceite");
  });

  it("020 puntuación normalizada", () => {
    assert.equal(normalizeForSearch("aceite, motor."), "aceite motor");
  });

  it("021 whitespace colapsado", () => {
    assert.equal(normalizeForSearch("  aceite   motor  "), "aceite motor");
  });

  it("022/023 substring una palabra aceite", () => {
    assert.equal(textMatchesSearch("ACEITE MOTOR", "aceite"), true);
    assert.equal(textMatchesSearch("FILTRO DE AIRE", "aceite"), false);
    assert.equal(textMatchesSearch("ACEITERA", "aceite"), true);
  });

  it("024 multi-token >=85%", () => {
    assert.equal(textMatchesSearch("cambio de aceite motor sintetico", "aceite motor sintetico"), true);
    assert.equal(textMatchesSearch("filtro aire cabina", "aceite motor sintetico"), false);
  });

  it("025 stopwords parity", () => {
    assert.equal(normalizeForSearch("aceite de motor"), "aceite de motor");
    assert.equal(textMatchesSearch("ACEITE MOTOR", "aceite de motor"), true);
  });

  it("026 numero_folio searchable", async () => {
    const { payload } = await search("¿Qué folios de enero a agosto contienen la palabra F-88?", {
      rows: [row({ numero_folio: "F-88", concepto: "FILTRO" })],
    });
    assert.equal(payload.count, 1);
  });

  it("027 folio_codigo searchable", async () => {
    const { payload } = await search("¿Qué folios de enero a agosto contienen la palabra FC-77?", {
      rows: [row({ folio_codigo: "FC-77", concepto: "FILTRO" })],
    });
    assert.equal(payload.count, 1);
  });

  it("028 descripcion/concepto searchable", async () => {
    const { payload } = await search(Q.S1, { rows: [row({ concepto: "ACEITE MOTOR" })] });
    assert.equal(payload.count, 1);
  });

  it("029 beneficiario searchable", async () => {
    const { payload } = await search(Q.S1, {
      rows: [row({ concepto: "FILTRO", beneficiario: "ACEITERA DEL SUR" })],
    });
    assert.equal(payload.count, 1);
  });

  it("030 categoria searchable", async () => {
    const { payload } = await search("¿Qué folios de enero a agosto contienen la palabra TALLER?", {
      rows: [row({ concepto: "FILTRO", categoria: "TALLER" })],
    });
    assert.equal(payload.count, 1);
  });

  it("031 subcategoria searchable", async () => {
    const { payload } = await search("¿Qué folios de enero a agosto contienen la palabra LUBRICANTES?", {
      rows: [row({ concepto: "FILTRO", subcategoria: "LUBRICANTES" })],
    });
    assert.equal(payload.count, 1);
  });

  it("032 proyecto_codigo searchable", async () => {
    const { payload } = await search("¿Qué folios de enero a agosto contienen la palabra PRJ-01?", {
      rows: [row({ concepto: "FILTRO", proyecto_codigo: "PRJ-01" })],
    });
    assert.equal(payload.count, 1);
  });

  it("033 proyecto_nombre searchable", async () => {
    const { payload } = await search("¿Qué folios de enero a agosto contienen la palabra Patio?", {
      rows: [row({ concepto: "FILTRO", proyecto_nombre: "Patio Aceites" })],
    });
    assert.equal(payload.count, 1);
  });

  it("034 planta_nombre searchable", async () => {
    const { payload } = await search("¿Qué folios de enero a agosto contienen la palabra Acapulco?", {
      rows: [row({ concepto: "FILTRO", planta_nombre: "Acapulco" })],
    });
    assert.equal(payload.count, 1);
  });

  it("035 numero_cheque searchable", async () => {
    const { payload } = await search("¿Qué folios de enero a agosto contienen la palabra CH-900?", {
      rows: [row({ concepto: "FILTRO", numero_cheque: "CH-900" })],
    });
    assert.equal(payload.count, 1);
  });

  it("036 importe searchable", async () => {
    const needle = Number(8450).toLocaleString("es-MX", { maximumFractionDigits: 0 });
    const { payload } = await search(`¿Qué folios de enero a agosto contienen la palabra ${needle}?`, {
      rows: [row({ concepto: "FILTRO", importe: 8450 })],
    });
    assert.equal(payload.count, 1);
  });
});

describe("R-FOLIO-KW SQL y truncación", () => {
  it("037/038 no ILIKE ni predicado textual SQL", () => {
    const igf = read("lib/director-ia-igf-reviewable-supports.js");
    const fn = igf.slice(igf.indexOf("async function queryReviewableSupportFolios"));
    const sql = fn.slice(0, fn.indexOf("return r.rows"));
    assert.doesNotMatch(sql, /\bILIKE\b/i);
    assert.doesNotMatch(sql, /\bLIKE\b/i);
    assert.doesNotMatch(sql, /concepto.*\$/);
  });

  it("039/040/041 no embeddings, sinónimos ni OpenAI match", () => {
    const helper = read("lib/director-ia-folio-search.js");
    assert.doesNotMatch(helper, /embedding/i);
    assert.doesNotMatch(helper, /sinonimo|synonym/i);
    assert.doesNotMatch(helper, /require\(["']openai["']\)/);
    assert.match(helper, /openai_called: false/);
  });

  it("042 query no pretrunca", () => {
    const igf = read("lib/director-ia-igf-reviewable-supports.js");
    const fn = igf.slice(igf.indexOf("async function queryReviewableSupportFolios"));
    const sql = fn.slice(0, fn.indexOf("return r.rows"));
    assert.doesNotMatch(sql, /\bLIMIT\b/i);
  });

  it("043/044 TOTAL_MATCHES antes de truncación", async () => {
    let n = 0;
    const { payload } = await search(Q.S1, {
      queryPublicFolios: async (_c, _p, mesCargo) => {
        const batch = [];
        for (let i = 0; i < 7; i += 1) {
          n += 1;
          batch.push(row({ id: n, numero_folio: `F-${n}`, mes_cargo: mesCargo, concepto: "ACEITE" }));
        }
        return batch;
      },
    });
    assert.equal(payload.count, 56);
    assert.equal(payload.match_count, 56);
    assert.equal(payload.truncated, true);
    assert.equal(payload.records.length, 40);
  });

  it("045 output distingue total/shown", async () => {
    let n = 0;
    const { payload } = await search(Q.S1, {
      queryPublicFolios: async (_c, _p, mesCargo) => {
        const batch = [];
        for (let i = 0; i < 7; i += 1) {
          n += 1;
          batch.push(row({ id: n, numero_folio: `F-${n}`, mes_cargo: mesCargo, concepto: "ACEITE" }));
        }
        return batch;
      },
    });
    const answer = buildFolioSearchAnswer(payload);
    assert.match(answer, /Encontré 56 folios/);
    assert.match(answer, /primeros 40/);
  });

  it("046 output usa importe registrado", async () => {
    const { payload } = await search(Q.S1);
    const answer = buildFolioSearchAnswer(payload);
    assert.match(answer, /importe registrado/i);
    assert.doesNotMatch(answer, /gastamos|gasto pagado|erogado|costo contable/i);
  });

  it("047/048 cero resultados truthful sin importe cero", async () => {
    const { payload } = await search(Q.ZERO, { rows: [row({ concepto: "FILTRO DE AIRE" })] });
    const answer = buildFolioSearchAnswer(payload);
    assert.equal(payload.count, 0);
    assert.match(answer, /No encontré folios que coincidan con "zzxxyy"/i);
    assert.doesNotMatch(answer, /\$0|0\.00|importe registrado/);
  });

  it("049/050 plant auth y no cross-plant", async () => {
    const denied = await search(Q.S1, {
      auth: { role: "GA", plantas_permitidas: [9] },
      plantaId: 1,
    });
    assert.equal(denied.payload.ok, false);
    assert.equal(denied.payload.code, "SOURCE_RESTRICTED");

    const { payload } = await search(Q.S1, {
      rows: [
        row({ id: 1, planta_id: 1, concepto: "ACEITE" }),
        row({ id: 2, planta_id: 2, concepto: "ACEITE", planta_nombre: "Otra" }),
      ],
    });
    assert.equal(payload.count, 1);
    assert.equal(payload.records[0].planta_id, 1);
  });
});

describe("R-FOLIO-KW JOIN Kanban y preservación", () => {
  it("KANBAN join signature reused exactly", () => {
    const kanban = read("server.js");
    const start = kanban.indexOf('app.get("/api/dashboard/kanban"');
    const chunk = kanban.slice(start, start + 3500);
    assert.match(chunk, /LEFT JOIN public\.proyectos pr ON pr\.id = f\.proyecto_id/);
    assert.match(chunk, /pr\.codigo AS proyecto_codigo, pr\.nombre AS proyecto_nombre/);
    assert.match(chunk, /f\.numero_cheque/);

    const igf = read("lib/director-ia-igf-reviewable-supports.js");
    const fn = igf.slice(igf.indexOf("async function queryReviewableSupportFolios"));
    const sql = fn.slice(0, fn.indexOf("return r.rows"));
    assert.match(sql, /LEFT JOIN public\.proyectos pr ON pr\.id = f\.proyecto_id/);
    assert.match(sql, /pr\.codigo AS proyecto_codigo/);
    assert.match(sql, /pr\.nombre AS proyecto_nombre/);
    assert.match(sql, /f\.numero_cheque/);
    assert.equal((sql.match(/LEFT JOIN public\.proyectos/g) || []).length, 1);
    assert.doesNotMatch(sql, /INNER JOIN public\.proyectos/);
    assert.doesNotMatch(sql, /JOIN public\.proyectos pr ON pr\.codigo/);
  });

  it("051 exact F-ID sigue en folio_status", () => {
    assert.equal(planDirectorIaQuestion(Q.FID).intent, "folio_status");
    assert.notEqual(planDirectorIaQuestion(Q.FID).intent, "folio_search");
  });

  it("052 support universe regression", () => {
    assert.equal(extractFolioSearchFilters(Q.APOYOS, { now: NOW }).scope, SCOPE_SUPPORT_FAMILIES);
  });

  it("053/054 aggregate y CANCELADO excluido del importe", async () => {
    const { payload } = await search(Q.AGG, {
      rows: [
        row({ id: 1, importe: 100, estatus: "PENDIENTE", concepto: "ACEITE" }),
        row({ id: 2, importe: 999, estatus: "CANCELADO", concepto: "ACEITE" }),
      ],
    });
    assert.equal(payload.filters.analysis_mode, "AGGREGATE");
    assert.equal(payload.analysis.aggregate_eligible_count, 1);
    assert.equal(payload.analysis.known_total, 100);
    assert.equal(payload.match_count, 2);
  });

  it("055 folio status regression", () => {
    assert.equal(planDirectorIaQuestion("¿En qué etapa está el folio 123?").intent, "folio_status");
  });

  it("056 previous range de-a still works", () => {
    const f = extractFolioSearchFilters("folios de enero a agosto de llantas", { now: NOW });
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
    assert.equal(f.concept_query, "llantas");
  });

  it("057 planner focal", () => {
    assert.equal(planDirectorIaQuestion(Q.S1, { now: NOW }).intent, "folio_search");
    assert.equal(planDirectorIaQuestion(Q.S7, { now: NOW }).concept_query || extractFolioSearchFilters(Q.S7, { now: NOW }).concept_query, "xxxxx");
  });

  it("058 tool/orchestrator focal", () => {
    const tool = getDirectorIaTool("get_folio_search");
    assert.ok(tool);
    const plan = planDirectorIaQuestion(Q.S1, { now: NOW });
    const toolPlan = buildDirectorIaToolPlan(plan, { planta_id: 1, question: Q.S1 });
    assert.ok(toolPlan.tools.some((t) => t.tool_id === "get_folio_search"));
  });

  it("059 Tier1 script present", () => {
    const src = read("scripts/director-ia-golden-regression.js");
    assert.match(src, /TIER 1|tier1/i);
  });

  it("060 pre-deploy --gate present", () => {
    const src = read("scripts/director-ia-golden-regression.js");
    assert.match(src, /--gate/);
  });

  it("061 no month-discovery ni OR conversacional en este slice", () => {
    const helper = read("lib/director-ia-folio-search.js");
    assert.doesNotMatch(helper, /month discovery/i);
    const f = extractFolioSearchFilters(Q.MONTH_DISC, { now: NOW });
    assert.equal(f.period_month == null || f.period_code === "missing_period" || !f.period_month, true);
  });

  it("S1 end-to-end match and wording", async () => {
    const { payload } = await search(Q.S1, {
      rows: [
        row({ id: 1, mes_cargo: "2026-01", concepto: "ACEITE MOTOR" }),
        row({
          id: 2,
          mes_cargo: "2026-08",
          concepto: "FILTRO",
          proyecto_nombre: "Obra civil",
          subcategoria: "FILTROS",
        }),
        row({ id: 3, mes_cargo: "2026-09", concepto: "ACEITE" }),
      ],
    });
    assert.equal(payload.count, 1);
    assert.equal(payload.filters.concept_query, "aceite");
    const answer = buildFolioSearchAnswer(payload);
    assert.match(answer, /coinciden con "aceite"/);
    assert.match(answer, /Acapulco/);
    const chat = buildFolioSearchChatResult(payload, { planta_id: 1 });
    assert.equal(chat.context_meta.openai_called, false);
  });

  it("S7 parametrizado XXXXX", () => {
    assert.equal(extractFolioSearchFilters(Q.S7, { now: NOW }).concept_query, "xxxxx");
  });
});
