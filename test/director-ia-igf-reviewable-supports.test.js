"use strict";

process.env.ENABLE_DIRECTOR_IA = "true";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { detectUnsupportedDirectorIaDomain } = require("../lib/director-ia-capabilities");
const { INHERITABLE_INTENTS, resolveConversationTurn, emptyConversationState } = require("../lib/director-ia-conversation-state");
const { getDirectorIaTool, isDirectorIaToolExecutable, validateDirectorIaToolRegistry } = require("../lib/director-ia-tools");
const { DIRECTOR_IA_VERACITY } = require("../lib/director-ia-capabilities");
const {
  isIgfReviewableSupportsQuestion,
  classifyCancellationEligibility,
  igfFolioBucket,
  recalcularUtilYResultado,
  overlayFolioKgFromSums,
  applyGastoAndResult,
  addRowToSums,
  emptySums,
  loadIgfReviewableSupportsForChat,
  buildIgfReviewableSupportsAnswer,
  NON_CANCELLABLE_STATES,
} = require("../lib/director-ia-igf-reviewable-supports");

const LIB_DIR = path.join(__dirname, "..", "lib");
const MOD_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-igf-reviewable-supports.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-chat.js"), "utf8");
const SERVER_SRC = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

function folio(over = {}) {
  return {
    id: 1,
    numero_folio: "F-202608-001",
    folio_codigo: "F-202608-001",
    planta_id: 2,
    planta_nombre: "Puebla",
    mes_cargo: "2026-08",
    importe: 1000,
    estatus: "PENDIENTE_APROB_ZP",
    categoria: "GASTOS",
    subcategoria: "APOYO",
    concepto: "Apoyo cliente",
    beneficiario: "Prov",
    solo_zp_ad: false,
    ...over,
  };
}

function igfRow(over = {}) {
  return {
    empresa: "GT - Puebla",
    venta_ton: 100,
    margen_kg: 2,
    com_desc_kg: 0.1,
    presupuesto_kg: 0.2,
    impuesto_kg: 0.05,
    hg_kg: -0.1,
    bancos_planta_kg: 0,
    provision_planta_kg: 0,
    gtos_apoyos_corp_kg: 0.3,
    bancos_corp_kg: 0,
    otros_programas_kg: 0,
    inversiones_kg: 0.1,
    ...over,
  };
}

function injectLoad(rows, extras = {}) {
  return {
    nowYearMonth: extras.nowYearMonth || { year: 2026, month: 8 },
    resolveEquivalentIds: extras.resolveEquivalentIds || ((id) => [Number(id)]),
    resolvePlanta: extras.resolvePlanta || (async () => ({ id: 2, nombre: "Puebla", clave: "E7" })),
    queryFolios: extras.queryFolios || (async () => rows),
    loadIgfBlocks:
      extras.loadIgfBlocks ||
      (async () => ({
        ok: true,
        abort: false,
        year: 2026,
        month: 8,
        igf: { row: extras.igfRow || igfRow() },
      })),
    question: extras.question || "¿Qué podemos recortar de apoyos?",
    auth: extras.auth || { role: "ZP" },
  };
}

describe("IMPL IGF reviewable supports — planner / guard", () => {
  it("clasifica el hop IGF → recortar apoyos", () => {
    assert.equal(planDirectorIaQuestion("¿Qué podemos recortar de apoyos?").intent, "igf_reviewable_supports");
    assert.equal(planDirectorIaQuestion("¿Cómo proyectamos cerrar el IGF de Puebla este mes?").intent, "igf_status");
  });

  it("no cae a cheques en depósito/cierre de este slice", () => {
    const q = "¿Cuáles todavía no están en depósito/cierre?";
    assert.equal(isIgfReviewableSupportsQuestion(q), true);
    assert.equal(planDirectorIaQuestion(q).intent, "igf_reviewable_supports");
    assert.equal(detectUnsupportedDirectorIaDomain(q).id, "cheques");
  });

  it("sigue bloqueando cheque operativo no relacionado", () => {
    const q = "¿Tiene cheque o depósito el folio?";
    assert.equal(isIgfReviewableSupportsQuestion(q), false);
    assert.equal(planDirectorIaQuestion(q).intent, "folio_financial_status");
  });

  it("no roba clasificación M4", () => {
    assert.equal(
      planDirectorIaQuestion("clasificación de apoyos 2026-01 2026-02").intent,
      "clasificacion_apoyos_query"
    );
  });

  it("efecto IGF + cancelar va a reviewable, no se pega a igf_status", () => {
    assert.equal(
      planDirectorIaQuestion("Si canceláramos los reviewable, ¿cómo quedaría el IGF?").intent,
      "igf_reviewable_supports"
    );
    assert.equal(
      planDirectorIaQuestion("Si quitamos esos apoyos, ¿qué efecto tendría sobre el IGF?").intent,
      "igf_reviewable_supports"
    );
  });

  it("intent es inheritable para follow-ups", () => {
    assert.ok(INHERITABLE_INTENTS.includes("igf_reviewable_supports"));
    const turn = resolveConversationTurn({
      question: "¿Cuánto suman?",
      plantaId: 2,
      detectIntent: (q) => {
        const p = planDirectorIaQuestion(q);
        return { intent: p.intent, confidence: p.confidence };
      },
      echoedState: {
        ...emptyConversationState(2),
        parent_intent: "igf_reviewable_supports",
        last_evidence_bundle_type: "igf_reviewable_supports",
        active_date: "2026-08-01",
      },
      history: [],
    });
    assert.equal(turn.inherit, true);
    assert.equal(turn.inherit_parent_intent, "igf_reviewable_supports");
  });
});

describe("IMPL IGF reviewable supports — estados", () => {
  it("bloquea PAGADO CERRADO COMPROBACIONES EVIDENCIAS", () => {
    for (const s of NON_CANCELLABLE_STATES) {
      const c = classifyCancellationEligibility(s);
      assert.equal(c.group, "not_cancellable");
      assert.equal(c.cancelable_under_current_rules, false);
    }
  });

  it("CANCELADO queda excluido", () => {
    const c = classifyCancellationEligibility("CANCELADO");
    assert.equal(c.group, "excluded");
  });

  it("CHEQUE_GENERADO / CUENTA_FONDOS / SOLICITANDO_PAGO / ZP son reviewable", () => {
    for (const s of [
      "CHEQUE_GENERADO",
      "CUENTA_FONDOS",
      "SOLICITANDO_PAGO",
      "PENDIENTE_APROB_ZP",
      "GENERADO",
      "CANCELACION_SOLICITADA",
    ]) {
      const c = classifyCancellationEligibility(s);
      assert.equal(c.group, "reviewable", s);
    }
  });

  it("no usa atajo no-depositado", () => {
    assert.match(MOD_SRC, /cancelable_under_current_rules/);
    assert.match(MOD_SRC, /No depositado no implica recortable/);
  });
});

describe("IMPL IGF reviewable supports — math live", () => {
  it("recalcularUtilYResultado coincide con el cuerpo de server.js", () => {
    const start = SERVER_SRC.indexOf("function recalcularUtilYResultado(row)");
    assert.ok(start > 0);
    const serverFn = SERVER_SRC.slice(start, SERVER_SRC.indexOf("/** PATCH IGF Forecast", start));
    const row = igfRow({
      folios_aprob_zp_kg: 0.1,
      folios_carro_kg: 0.2,
      deposito_cierre_kg: -0.05,
    });
    const ours = recalcularUtilYResultado(row);
    assert.match(serverFn, /resultado_final_kg = util_oper_kg - gtosCorp/);
    assert.ok(Number.isFinite(ours.resultado_final_kg));
  });

  it("cubos IGF: zp / carro / deposito_cierre / CANCELADO fuera", () => {
    assert.equal(igfFolioBucket("PENDIENTE_APROB_ZP", "GASTOS", null, true), "aprob_zp");
    assert.equal(igfFolioBucket("CHEQUE_GENERADO", "GASTOS", null, true), "carro");
    assert.equal(igfFolioBucket("PAGADO", "GASTOS", null, true), "deposito_cierre");
    assert.equal(igfFolioBucket("CANCELADO", "GASTOS", null, true), "none");
    assert.equal(igfFolioBucket("GENERADO", "GASTOS", null, true), "none");
  });

  it("contrafactual resta solo reviewable que hoy entra al cubo", async () => {
    const rows = [
      folio({ id: 1, estatus: "PENDIENTE_APROB_ZP", importe: 10000 }),
      folio({ id: 2, numero_folio: "F-2", estatus: "PAGADO", importe: 5000 }),
      folio({ id: 3, numero_folio: "F-3", estatus: "CANCELADO", importe: 8000 }),
    ];
    const payload = await loadIgfReviewableSupportsForChat(null, 2, { dashboardAuth: { role: "ZP" } }, injectLoad(rows));
    assert.equal(payload.ok, true);
    assert.equal(payload.reviewable_count, 1);
    assert.equal(payload.not_cancellable_count, 1);
    assert.equal(payload.mutated, false);
    assert.equal(payload.read_only, true);
    assert.ok(payload.igf_current);
    assert.ok(payload.igf_counterfactual);
    assert.ok(payload.delta_counterfactual);
    assert.equal(payload.folios_included_in_scenario.length, 1);
    assert.ok(payload.igf_current.folios_aprob_zp_kg > payload.igf_counterfactual.folios_aprob_zp_kg);
  });

  it("no muta: queryFolios no hace writes y el módulo no tiene UPDATE", async () => {
    assert.doesNotMatch(MOD_SRC, /\bUPDATE\b/);
    assert.doesNotMatch(MOD_SRC, /\bINSERT\b/);
    assert.doesNotMatch(MOD_SRC, /\bDELETE\b/);
    let called = 0;
    await loadIgfReviewableSupportsForChat(
      null,
      2,
      { dashboardAuth: { role: "ZP" } },
      injectLoad([folio()], {
        queryFolios: async () => {
          called += 1;
          return [folio()];
        },
      })
    );
    assert.equal(called, 1);
  });

  it("overlay kg usa venta_ton * 1000 y depósito negativo", () => {
    const kg = overlayFolioKgFromSums(100, 1, { aprob_zp: 0, carro: 0, deposito: 20000, cierre: 0, comprobaciones: 0, evidencias: 0, inversiones: 0 }, true, 0);
    assert.equal(kg.deposito_cierre_kg, -0.2);
    const live = applyGastoAndResult(igfRow(), kg);
    assert.ok(Number.isFinite(live.resultado_final_kg));
  });

  it("reconcilia exclusión de un folio carro", () => {
    const sums = emptySums();
    addRowToSums(sums, folio({ estatus: "APROBADO_ZP", importe: 10000, categoria: "GASTOS" }), true);
    const before = overlayFolioKgFromSums(100, 1, sums, true, 0);
    const afterSums = emptySums();
    const after = overlayFolioKgFromSums(100, 1, afterSums, true, 0);
    assert.ok(before.folios_carro_kg > after.folios_carro_kg);
  });
});

describe("IMPL IGF reviewable supports — authz / periodo", () => {
  it("GV no lee folios", async () => {
    const payload = await loadIgfReviewableSupportsForChat(
      null,
      2,
      { dashboardAuth: { role: "GV" } },
      injectLoad([folio()])
    );
    assert.equal(payload.ok, false);
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
  });

  it("GA lista folios pero no contrafactual IGF", async () => {
    const payload = await loadIgfReviewableSupportsForChat(
      null,
      2,
      { dashboardAuth: { role: "GA", plantas_permitidas: [2] } },
      injectLoad([folio()], {
        loadIgfBlocks: async () => ({
          ok: false,
          abort: true,
          status: 403,
          error: "GA no tiene acceso a KPIs financieros.",
        }),
      })
    );
    assert.equal(payload.ok, true);
    assert.equal(payload.reviewable_count, 1);
    assert.equal(payload.igf_current, null);
    assert.ok(payload.limitations.some((l) => /financieros/i.test(l)));
  });

  it("misma planta y mes_cargo; CANCELADO fuera del listado", async () => {
    const payload = await loadIgfReviewableSupportsForChat(
      null,
      2,
      { dashboardAuth: { role: "ZP" } },
      injectLoad([
        folio({ id: 9, estatus: "CANCELADO", importe: 1 }),
        folio({ id: 8, estatus: "GENERADO", importe: 50 }),
      ])
    );
    assert.equal(payload.reviewable.every((r) => r.estatus !== "CANCELADO"), true);
    assert.equal(payload.periodo.mes_cargo, "2026-08");
    assert.equal(payload.planta_id, 2);
  });

  it("no convierte falta de venta en overlay cero", async () => {
    const payload = await loadIgfReviewableSupportsForChat(
      null,
      2,
      { dashboardAuth: { role: "ZP" } },
      injectLoad([folio()], { igfRow: igfRow({ venta_ton: 0 }) })
    );
    assert.equal(payload.igf_current, null);
    assert.equal(payload.missing_denominator, true);
  });
});

describe("IMPL IGF reviewable supports — respuesta / chat", () => {
  it("lenguaje hipotético, sin ahorro/cash/debes cancelar", async () => {
    const payload = await loadIgfReviewableSupportsForChat(
      null,
      2,
      { dashboardAuth: { role: "ZP" } },
      injectLoad([folio({ importe: 10000 })], { question: "Si canceláramos los reviewable, ¿cómo quedaría el IGF?" })
    );
    const answer = buildIgfReviewableSupportsAnswer(payload, "Si canceláramos los reviewable, ¿cómo quedaría el IGF?");
    assert.match(answer, /ESCENARIO HIPOTÉTICO/);
    assert.match(answer, /Si estos folios/);
    assert.doesNotMatch(answer, /ahorrarías/i);
    assert.doesNotMatch(answer, /impacto de caja aumenta/i);
    assert.doesNotMatch(answer, /debes cancelar/i);
    assert.doesNotMatch(answer, /el IGF real mejorará/i);
  });

  it("riesgo comercial pide el vínculo faltante", async () => {
    const payload = await loadIgfReviewableSupportsForChat(
      null,
      2,
      { dashboardAuth: { role: "ZP" } },
      injectLoad([folio()], { question: "¿Qué riesgo tendría cancelar esos?" })
    );
    const answer = buildIgfReviewableSupportsAnswer(payload, "¿Qué riesgo tendría cancelar esos?");
    assert.match(answer, /Falta ese vínculo/);
  });

  it("askDirectorIa recortar apoyos no aclara unknown ni cheques", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      loadIgfReviewableSupportsForChat: async () =>
        loadIgfReviewableSupportsForChat(null, 2, { dashboardAuth: { role: "ZP" } }, injectLoad([folio()])),
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      2,
      "¿Qué podemos recortar de apoyos?"
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.mode, "igf_reviewable_supports");
    assert.equal(result.context_meta.conversation_state.parent_intent, "igf_reviewable_supports");
    assert.doesNotMatch(result.answer, /todavía no está integrado/i);
  });

  it("askDirectorIa depósito/cierre no responde cheques", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      loadIgfReviewableSupportsForChat: async () =>
        loadIgfReviewableSupportsForChat(null, 2, { dashboardAuth: { role: "ZP" } }, injectLoad([folio()])),
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      2,
      "¿Cuáles todavía no están en depósito/cierre?"
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.requested_domain, "igf_reviewable_supports");
    assert.doesNotMatch(result.answer, /Cheques \/ depósito de folio todavía no está integrado/);
  });

  it("follow-up cuánto suman hereda el pack", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      loadIgfReviewableSupportsForChat: async () =>
        loadIgfReviewableSupportsForChat(null, 2, { dashboardAuth: { role: "ZP" } }, injectLoad([folio()])),
    });
    const result = await askDirectorIa(
      {
        body: {
          conversation_state: {
            parent_intent: "igf_reviewable_supports",
            planta_id: 2,
            last_evidence_bundle_type: "igf_reviewable_supports",
            active_date: "2026-08-01",
            active_entities: [],
            previous_frame: null,
          },
        },
        dashboardAuth: { role: "ZP" },
      },
      2,
      "¿Cuánto suman?"
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.mode, "igf_reviewable_supports");
    assert.match(result.answer, /REVIEWABLE/);
  });

  it("tool registry read-only y chat no cancela", () => {
    assert.equal(validateDirectorIaToolRegistry().ok, true);
    const t = getDirectorIaTool("get_igf_reviewable_supports");
    assert.equal(t.readOnly, true);
    assert.equal(isDirectorIaToolExecutable("get_igf_reviewable_supports"), true);
    assert.match(CHAT_SRC, /intent === "igf_reviewable_supports"/);
    assert.doesNotMatch(CHAT_SRC, /updateFolioEstatus/);
    assert.doesNotMatch(CHAT_SRC, /updateFolioCancelado/);
  });
});
