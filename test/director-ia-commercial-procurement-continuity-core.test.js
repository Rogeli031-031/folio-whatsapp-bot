"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  classifyRawMovement,
  classifyDiscountMovement,
  extractClientMovementSpec,
  extractInactivityWindow,
  loadClientMovementForChat,
  buildClientMovementAnswer,
  MOVEMENT,
} = require("../lib/director-ia-client-movement");
const {
  isClientRankingQuestion,
  extractClientRankingSpec,
  loadClientRankingForChat,
  buildClientRankingAnswer,
  rankClients,
} = require("../lib/director-ia-client-ranking");
const {
  SOURCE_TYPES,
  groupBySourceType,
  loadClientEvidenceForChat,
  buildClientEvidenceAnswer,
  isClientEvidenceQuestion,
  isActionRegisterThemeQuestion,
} = require("../lib/director-ia-client-evidence");
const {
  extractProcurementSpec,
  computeUnitCost,
  extractAttributableQuantity,
  loadProcurementForChat,
  buildProcurementAnswer,
  OPS,
} = require("../lib/director-ia-procurement-by-concept");
const {
  extractFolioSearchFilters,
  loadFolioSearchForChat,
  buildFolioSearchAnswer,
  buildFolioSearchChatResult,
  classifyFolioExistenceFollowUp,
} = require("../lib/director-ia-folio-search");
const { isFolioResultSetFollowUp, sanitizeFolioSearchSpec } = require("../lib/director-ia-conversation-state");
const { extractExpenseAnalyticsSpec, CLASSIFICATIONS, buildExpenseAnalyticsAnswer, loadExpenseAnalyticsForChat } = require("../lib/director-ia-expense-analytics");
const { sanitizePlantScopeLabel, looksLikeInternalCode } = require("../lib/director-ia-display-sanitize");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");

const NOW = new Date("2026-09-16T12:00:00-06:00");
const AUTH = { dashboardAuth: { role: "ZP" } };

describe("raw vs display precision", () => {
  it("prev=10 current=0 → DEJO_DE_COMPRAR", () => {
    assert.equal(classifyRawMovement(10, 0), MOVEMENT.DEJO_DE_COMPRAR);
  });
  it("prev=10 current=2 → DISMINUCION", () => {
    assert.equal(classifyRawMovement(10, 2), MOVEMENT.DISMINUCION);
  });
  it("prev=2 current=10 → AUMENTO", () => {
    assert.equal(classifyRawMovement(2, 10), MOVEMENT.AUMENTO);
  });
  it("prev=0 current=5 → NUEVO no AUMENTO", () => {
    assert.equal(classifyRawMovement(0, 5), MOVEMENT.NUEVO);
  });
  it("prev=5 current=5 → SIN_CAMBIO", () => {
    assert.equal(classifyRawMovement(5, 5), MOVEMENT.SIN_CAMBIO);
  });
  it("current_raw 0.018 display 0.0 no es DEJO_DE_COMPRAR", () => {
    const raw = 0.018;
    const display = Math.round(raw * 10) / 10;
    assert.equal(display, 0);
    assert.equal(classifyRawMovement(1, raw), MOVEMENT.DISMINUCION);
    assert.notEqual(classifyRawMovement(1, raw), MOVEMENT.DEJO_DE_COMPRAR);
  });
  it("forecast no se usa: source_kind ACTUAL", async () => {
    const payload = await loadClientMovementForChat(null, 10, AUTH, {
      question: "qué clientes dejaron de consumir",
      now: NOW,
      selectedPeriod: "2026-09",
      plant_label: "Acapulco",
      currentSalesRows: [{ cliente_norm: "RESORT DIAMANTE", kg: 0, canal: "Casa" }],
      previousSalesRows: [{ cliente_norm: "RESORT DIAMANTE", kg: 3874, canal: "Casa" }],
    });
    assert.equal(payload.rows[0].movement_type, MOVEMENT.DEJO_DE_COMPRAR);
    assert.equal(payload.source_kind, "ACTUAL");
    assert.match(buildClientMovementAnswer(payload), /3\.874 ton/);
    assert.match(buildClientMovementAnswer(payload), /septiembre 2026/);
    assert.match(buildClientMovementAnswer(payload), /ARR actual \(no forecast\)/);
  });
});

describe("CLIENT_RANKING discount + period fallback", () => {
  it("top 5 descuento usa DESCUENTO_POR_KG", () => {
    const spec = extractClientRankingSpec("top 5 clientes con mayor descuento", null, {
      now: NOW,
      selectedPeriod: "2026-09",
    });
    assert.equal(spec.metric, "DESCUENTO_POR_KG");
    assert.equal(spec.ranking_direction, "TOP");
    assert.equal(spec.limit, 5);
  });
  it("menor descuento es BOTTOM", () => {
    const spec = extractClientRankingSpec("quién tiene el descuento más bajo", null, { now: NOW, selectedPeriod: "2026-09" });
    assert.equal(spec.ranking_direction, "BOTTOM");
  });
  it("venta no se confunde con descuento", () => {
    const spec = extractClientRankingSpec("top 5 clientes que más compran", null, { now: NOW, selectedPeriod: "2026-09" });
    assert.equal(spec.metric, "VENTA_TON");
  });
  it("period fallback latest ARR informado", async () => {
    const payload = await loadClientRankingForChat(null, 10, AUTH, {
      question: "top 5 clientes de venta casa",
      now: NOW,
      plant_label: "Acapulco",
      latestArrPeriod: "2026-09",
      salesRows: [{ cliente_norm: "Cliente X", kg: 84300, canal: "Casa" }],
    });
    assert.equal(payload.spec.period, "2026-09");
    assert.equal(payload.spec.period_origin, "latest_arr");
    assert.match(buildClientRankingAnswer(payload), /último periodo disponible en ARR/);
  });
  it("ranking descuento usa valor real", () => {
    const ranked = rankClients(
      [
        { cliente_norm: "A", kg: 1000, canal: "Casa" },
        { cliente_norm: "B", kg: 1000, canal: "Casa" },
      ],
      { metric: "DESCUENTO_POR_KG", ranking_direction: "TOP", limit: 2 },
      [
        { cliente_norm: "A", monto: 6273 },
        { cliente_norm: "B", monto: 6265 },
      ]
    );
    assert.equal(ranked[0].cliente, "A");
    assert.ok(Math.abs(ranked[0].descuento_actual - 6.273) < 1e-9);
  });
});

describe("inactivity window", () => {
  it("30 días explícitos", () => {
    const w = extractInactivityWindow("quién lleva 30 días sin comprar", NOW);
    assert.equal(w.days, 30);
    assert.equal(w.declared, true);
  });
  it("sin ventana no inventa", () => {
    const spec = extractClientMovementSpec("qué clientes están inactivos", null, { now: NOW });
    assert.equal(spec.movement_type, MOVEMENT.INACTIVO);
    assert.equal(spec.inactivity_window, null);
  });
});

describe("entity-set follow-up", () => {
  it("cuánto disminuyeron opera solo sobre entidades previas", async () => {
    const payload = await loadClientMovementForChat(null, 10, AUTH, {
      question: "¿Cuánto disminuyeron?",
      now: NOW,
      selectedPeriod: "2026-09",
      plant_label: "Acapulco",
      priorSpec: {
        ok: true,
        current_period: "2026-09",
        previous_period: "2026-08",
        customer_segment: "ALL",
        entity_names: ["PUBLICO EN GENERAL", "GRUPO MOVE EMPRESARIAL"],
      },
      currentSalesRows: [
        { cliente_norm: "PUBLICO EN GENERAL", kg: 100, canal: "Casa" },
        { cliente_norm: "GRUPO MOVE EMPRESARIAL", kg: 50, canal: "Comisionista" },
        { cliente_norm: "OTRO", kg: 10, canal: "Casa" },
      ],
      previousSalesRows: [
        { cliente_norm: "PUBLICO EN GENERAL", kg: 200, canal: "Casa" },
        { cliente_norm: "GRUPO MOVE EMPRESARIAL", kg: 80, canal: "Comisionista" },
        { cliente_norm: "OTRO", kg: 40, canal: "Casa" },
      ],
    });
    assert.deepEqual(
      payload.rows.map((r) => r.cliente).sort(),
      ["GRUPO MOVE EMPRESARIAL", "PUBLICO EN GENERAL"]
    );
    assert.ok(payload.rows.every((r) => r.cliente !== "OTRO"));
  });
});

describe("client evidence provenance", () => {
  it("nunca mezcla DICF y Action Register", async () => {
    const payload = await loadClientEvidenceForChat(null, 10, AUTH, {
      question: "qué comentarios y acciones tiene Grupo Move",
      evidenceItems: [
        { cliente: "GRUPO MOVE EMPRESARIAL", source_type: SOURCE_TYPES.DICF, summary: "DICF-1", responsable: "Ana", fecha: "2026-09-01", estado: "abierta" },
        { cliente: "GRUPO MOVE EMPRESARIAL", source_type: SOURCE_TYPES.ACTION_REGISTER, summary: "AR-9", responsable: "Luis", fecha: "2026-09-02", estado: "abierta" },
        { cliente: "GRUPO MOVE EMPRESARIAL", source_type: SOURCE_TYPES.ARR_COMMENT, body: "comentario ARR", fecha: "2026-08-20" },
        { cliente: "GRUPO MOVE EMPRESARIAL", source_type: SOURCE_TYPES.BITACORA, body: "nota bitácora", fecha: "2026-08-21" },
      ],
    });
    const by = payload.by_type;
    assert.equal(by.DICF.length, 1);
    assert.equal(by.ACTION_REGISTER.length, 1);
    assert.equal(by.ARR_COMMENT.length, 1);
    assert.equal(by.BITACORA.length, 1);
    const answer = buildClientEvidenceAnswer(payload);
    assert.match(answer, /DICF/);
    assert.match(answer, /Action Register/);
    assert.doesNotMatch(answer, /Acciones DICF abiertas: 1/);
    assert.ok(!answer.includes("ACTION_REGISTER → DICF"));
  });
  it("tema Clientes en Action Register no es evidencia de un cliente", () => {
    assert.equal(isActionRegisterThemeQuestion("qué acciones tenemos de Clientes en Action Register"), true);
    assert.equal(isClientEvidenceQuestion("qué acciones tenemos de Clientes en Action Register"), false);
  });
});

describe("procurement + unit cost", () => {
  it("gasto relacionado no afirma exclusivo", async () => {
    const spec = extractExpenseAnalyticsSpec("¿Cuánto he gastado en llantas de enero a agosto?", { now: NOW });
    assert.notEqual(spec.classification, CLASSIFICATIONS.BREAKDOWN_MISSING);
    const payload = await loadExpenseAnalyticsForChat(null, 10, AUTH, {
      question: "¿Cuánto he gastado en llantas de enero a agosto?",
      now: NOW,
      queryPublicFolios: async (_c, _id, mes) =>
        mes === "2026-01" ? [{ id: 1, importe: 40000, estatus: "PAGADO", concepto: "COMPRA DE LLANTAS", mes_cargo: "2026-01" }] : [],
    });
    const answer = buildExpenseAnalyticsAnswer(payload);
    assert.match(answer, /no necesariamente al gasto exclusivo en llantas/);
  });
  it("beneficiario != proveedor", async () => {
    const payload = await loadProcurementForChat(null, 10, AUTH, {
      question: "qué proveedores nos venden llantas",
      now: NOW,
      folioItems: [{ concepto: "llantas", beneficiario: "LLANTAS DEL SUR", importe: 1000, mes_cargo: "2026-01" }],
    });
    assert.equal(payload.supplier_field_present, false);
    assert.match(buildProcurementAnswer(payload), /no puedo afirmar que todos sean proveedores/);
  });
  it("unit cost fail-closed sin cantidad", () => {
    const unit = computeUnitCost([{ concepto: "llantas varias", importe: 40000 }], "llantas");
    assert.equal(unit.status, "NOT_DETERMINABLE");
  });
  it("unit cost calcula si 4 llantas inequívocas", () => {
    const hit = extractAttributableQuantity({ concepto: "COMPRA DE 4 LLANTAS", importe: 40000 }, "llantas");
    assert.equal(hit.quantity, 4);
    const unit = computeUnitCost([{ concepto: "COMPRA DE 4 LLANTAS", importe: 40000 }], "llantas");
    assert.equal(unit.status, "OK");
    assert.equal(unit.unit_cost, 10000);
  });
  it("folio mezclado fail-closed", () => {
    const hit = extractAttributableQuantity(
      { concepto: "COMPRA DE 4 LLANTAS y servicio de alineación", importe: 40000 },
      "llantas"
    );
    assert.equal(hit, null);
  });
});

describe("universal folio result-set", () => {
  const items = [
    { id: 1, numero_folio: "F1", importe: 100, estatus: "PAGADO", categoria: "TALLER", concepto: "aceite", beneficiario: "A", mes_cargo: "2026-09", planta_nombre: "E9" },
    { id: 2, numero_folio: "F2", importe: 50, estatus: "PAGADO", categoria: "GASTOS", concepto: "papelería", beneficiario: "B", mes_cargo: "2026-09", planta_nombre: "E9" },
    { id: 3, numero_folio: "F3", importe: 20, estatus: "PAGADO", categoria: "TALLER", concepto: "filtro", beneficiario: "A", mes_cargo: "2026-09", planta_nombre: "E9" },
  ];
  it("paid set persiste sin concepto y permite SUM", async () => {
    const first = await loadFolioSearchForChat(null, 10, AUTH, {
      question: "¿Qué folios se han pagado hasta ahorita en septiembre?",
      now: NOW,
      queryPublicFolios: async () => items,
    });
    assert.equal(first.count, 3);
    const spec = buildFolioSearchChatResult(first, { planta_id: 10 }).context_meta.conversation_state.folio_search_spec;
    assert.ok(spec);
    assert.equal(spec.concept_mode, "NONE");
    assert.equal(spec.status_filter, "PAGADO");
    const sum = await loadFolioSearchForChat(null, 10, AUTH, {
      question: "¿Cuál es la suma total?",
      now: NOW,
      inheritedFilters: spec,
      queryPublicFolios: async () => items,
    });
    assert.equal(sum.filters.analysis_mode, "AGGREGATE");
    assert.equal(sum.analysis.known_total, 170);
    assert.match(buildFolioSearchAnswer(sum), /170/);
  });
  it("no expone E9", () => {
    const answer = buildFolioSearchAnswer({
      ok: true,
      count: 3,
      records: items,
      filters: { period_mode: "SINGLE", period_month: "2026-09", scope: "ALL_PUBLIC_FOLIOS" },
      planta_nombre: "E9",
      planta_id: 10,
    });
    assert.doesNotMatch(answer, /\bE9\b/);
    assert.equal(looksLikeInternalCode("E9"), true);
    assert.equal(sanitizePlantScopeLabel("E9"), null);
  });
  it("follow-up universal", () => {
    assert.equal(isFolioResultSetFollowUp("¿Cuál es la suma total?"), true);
    assert.equal(classifyFolioExistenceFollowUp("¿Cuál fue el de mayor importe?"), "HIGHEST_AMOUNT");
    assert.equal(classifyFolioExistenceFollowUp("¿Cuántos son de Taller?"), "FILTER_CATEGORY");
    assert.equal(classifyFolioExistenceFollowUp("¿Quiénes son los beneficiarios?"), "GROUP_BY_BENEFICIARY");
  });
});

describe("anti-collision planner", () => {
  it("ranking descuento vs venta", () => {
    assert.equal(isClientRankingQuestion("Top 5 clientes con mayor descuento"), true);
    assert.equal(extractClientRankingSpec("Top 5 clientes con mayor descuento", null, { now: NOW, selectedPeriod: "2026-09" }).metric, "DESCUENTO_POR_KG");
    assert.equal(extractClientRankingSpec("Top 5 clientes que más compran", null, { now: NOW, selectedPeriod: "2026-09" }).metric, "VENTA_TON");
  });
  it("procurement vs folios count", () => {
    assert.equal(planDirectorIaQuestion("¿Qué proveedores nos venden llantas?").intent, "procurement_by_concept");
    assert.equal(extractProcurementSpec("¿Qué beneficiarios tenemos en llantas?", null, { now: NOW }).operation, OPS.BENEFICIARIES);
    assert.equal(extractProcurementSpec("¿Cuánto cuesta cada llanta?", null, { now: NOW }).operation, OPS.UNIT_COST);
  });
});
