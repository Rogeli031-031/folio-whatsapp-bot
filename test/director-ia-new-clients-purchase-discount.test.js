"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { isCommercialTrendQuestion } = require("../lib/director-ia-commercial-trend");
const { isClientProfileQuestion } = require("../lib/director-ia-client-profile");
const { isPlantFinancialKpiQuestion } = require("../lib/director-ia-igf-arr");
const { COMMERCIAL_STATE_CLIENT_LIMIT } = require("../lib/director-ia-commercial-state");
const { DIRECTOR_IA_VERACITY, isDirectorIaDomainReadable } = require("../lib/director-ia-capabilities");
const { getDirectorIaTool, validateDirectorIaToolRegistry } = require("../lib/director-ia-tools");
const {
  isHistoricalNewClientsQuestion,
  resolveRequestedCalendarMonth,
  previousCalendarMonth,
  extractNamedPlant,
  classifyHistoricalNewClients,
  computeIngreso,
  loadHistoricalNewClientsForChat,
  buildHistoricalNewClientsChatResult,
  isDefendableHistoricalMargin,
  legacyCoerceMargin,
  IGF_MARGIN_SOURCE,
} = require("../lib/director-ia-new-clients");

const NOW = new Date("2026-09-01T18:00:00-06:00");
const LIB = path.join(__dirname, "..", "lib");

const P = {
  P1: "¿Qué clientes nuevos entraron en agosto?",
  P2: "¿Qué clientes nuevos entraron en agosto? ¿Cuánto compraron y con qué descuento?",
  P3: "¿Qué clientes nuevos entraron en agosto en Acapulco? ¿Cuánto compraron y con qué descuento?",
  P4: "¿Cuántos clientes nuevos hubo en agosto en Acapulco?",
  P5: "Dime los clientes nuevos de agosto en Acapulco.",
  P6: "Dime los nuevos de agosto en Acapulco, sus toneladas y descuento por kg.",
};

function factsFixture() {
  return [
    {
      cliente: "Nuevo Alpha",
      canal: "Casa",
      subcanal: "Tortillería",
      kgA: 0,
      kgB: 1200,
      montoA: null,
      montoB: -240,
      hasDiscountA: false,
      hasDiscountB: true,
    },
    {
      cliente: "Viejo Beta",
      canal: "Casa",
      subcanal: "Abarrotes",
      kgA: 800,
      kgB: 900,
      montoA: -80,
      montoB: -90,
      hasDiscountA: true,
      hasDiscountB: true,
    },
    {
      cliente: "Nuevo Gamma SinDesc",
      canal: "Comisionista",
      subcanal: "",
      kgA: 0,
      kgB: 500,
      montoA: null,
      montoB: null,
      hasDiscountA: false,
      hasDiscountB: false,
    },
  ];
}

function loadOpts(facts, extra = {}) {
  return {
    now: NOW,
    question: P.P1,
    resolvePlanta: async () => ({ id: 1, nombre: extra.plantaNombre || "Puebla", clave: "E7" }),
    resolvePlantByNombre: async (_c, nombre) => {
      if (String(nombre).toLowerCase() === "acapulco") return { id: 7, nombre: "Acapulco", clave: "AC" };
      return { id: 1, nombre: extra.plantaNombre || "Puebla", clave: "E7" };
    },
    loadMonthlyFacts: async () => facts,
    getMargenKgPorPeriodo: async (_c, _n, year, month) => {
      if (year === 2026 && month === 7) return 7.0;
      if (year === 2026 && month === 8) return 7.2;
      if (year === 2025 && month === 12) return 6.5;
      if (year === 2026 && month === 1) return 6.8;
      return 7.0;
    },
    ...extra,
  };
}

function sixtySixFacts() {
  const rows = [];
  for (let i = 1; i <= 66; i++) {
    rows.push({
      cliente: `Cliente Fixture ${String(i).padStart(2, "0")}`,
      canal: "Casa",
      subcanal: i <= 42 ? "A" : "B",
      kgA: 0,
      kgB: 100 + i,
      montoA: null,
      montoB: -(10 + i),
      hasDiscountA: false,
      hasDiscountB: true,
    });
  }
  return rows;
}

describe("historical new clients — P1-P6 routing", () => {
  it("P1-P6 convergen a historical_new_clients y no a trend/IGF/profile", () => {
    for (const [id, q] of Object.entries(P)) {
      assert.equal(isHistoricalNewClientsQuestion(q, NOW), true, id);
      const plan = planDirectorIaQuestion(q);
      assert.equal(plan.intent, "historical_new_clients", id);
      assert.notEqual(plan.intent, "commercial_trend", id);
      assert.notEqual(plan.intent, "client_profile", id);
      assert.notEqual(plan.intent, "commercial_state", id);
    }
    assert.equal(isPlantFinancialKpiQuestion(P.P2), true);
    assert.equal(planDirectorIaQuestion(P.P2).intent, "historical_new_clients");
    assert.equal(extractNamedPlant(P.P3), "Acapulco");
    assert.equal(isClientProfileQuestion(P.P3), true);
    assert.equal(planDirectorIaQuestion(P.P3).intent, "historical_new_clients");
  });

  it("agosto es mes calendario 2026-08, no trailing 30d", () => {
    const m = resolveRequestedCalendarMonth(P.P1, NOW);
    assert.deepEqual({ year: m.year, month: m.month }, { year: 2026, month: 8 });
    assert.notEqual(m.source, "trailing");
    const explicit = resolveRequestedCalendarMonth("clientes nuevos en 2026-08", NOW);
    assert.equal(explicit.source, "yyyy_mm");
    assert.equal(explicit.month, 8);
  });
});

describe("historical new clients — periodo y planta", () => {
  it("planta actual cuando no se nombra planta", async () => {
    const payload = await loadHistoricalNewClientsForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(factsFixture()));
    assert.equal(payload.ok, true);
    assert.equal(payload.planta_nombre, "Puebla");
    assert.equal(payload.planta_id, 1);
  });

  it("Acapulco explícito se trata como planta autorizada", async () => {
    const payload = await loadHistoricalNewClientsForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      { ...loadOpts(factsFixture()), question: P.P3 }
    );
    assert.equal(payload.ok, true);
    assert.equal(payload.planta_nombre, "Acapulco");
    assert.equal(payload.planta_id, 7);
    assert.equal(planDirectorIaQuestion(P.P3).intent, "historical_new_clients");
  });

  it("autorización de planta se preserva", async () => {
    const ga = await loadHistoricalNewClientsForChat(
      null,
      1,
      { dashboardAuth: { role: "GA", plantas_permitidas: [1] } },
      {
        ...loadOpts(factsFixture()),
        loadMonthlyFacts: async () => {
          throw new Error("no debe consultar fuente");
        },
      }
    );
    assert.equal(ga.code, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    const cross = await loadHistoricalNewClientsForChat(
      null,
      2,
      { dashboardAuth: { role: "GG", plantas_permitidas: [1] } },
      loadOpts(factsFixture())
    );
    assert.equal(cross.code, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
  });

  it("enero → diciembre del año anterior", () => {
    const prev = previousCalendarMonth(2026, 1);
    assert.deepEqual(prev, { year: 2025, month: 12 });
    const m = resolveRequestedCalendarMonth("clientes nuevos en enero 2026", NOW);
    assert.deepEqual({ year: m.year, month: m.month }, { year: 2026, month: 1 });
  });
});

describe("historical new clients — fórmula Nuevo cerrada", () => {
  it("equivale a DICF ingreso_A<=0 && ingreso_B>0 con kg reales", () => {
    const pack = classifyHistoricalNewClients(factsFixture(), 7, 7.2);
    const names = pack.clients.map((c) => c.cliente);
    assert.ok(names.includes("Nuevo Alpha"));
    assert.ok(names.includes("Nuevo Gamma SinDesc"));
    assert.ok(!names.includes("Viejo Beta"));
    const alpha = pack.clients.find((c) => c.cliente === "Nuevo Alpha");
    assert.equal(alpha.kg, 1200);
    assert.equal(alpha.discount_kg, 240 / 1200);
    assert.ok(!Object.prototype.hasOwnProperty.call(alpha, "kg_mes_forecast"));
  });

  it("cliente con compra anterior no es Nuevo", () => {
    const onlyOld = classifyHistoricalNewClients(
      [
        {
          cliente: "Continuidad",
          kgA: 100,
          kgB: 80,
          montoA: 0,
          montoB: 0,
          hasDiscountA: true,
          hasDiscountB: true,
        },
      ],
      7,
      7
    );
    assert.equal(onlyOld.source_count, 0);
  });

  it("sin ingreso anterior y con ingreso real B positivo sí es Nuevo", () => {
    const ingresoA = computeIngreso(0, 7, 0);
    const ingresoB = computeIngreso(500, 7.2, 0);
    assert.ok(ingresoA <= 0 && ingresoB > 0);
  });
});

describe("historical new clients — kg real, descuento real, no margen", () => {
  it("compra usa kg REAL B y descuento real B", async () => {
    const payload = await loadHistoricalNewClientsForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(factsFixture()));
    const alpha = payload.clients.find((c) => c.cliente === "Nuevo Alpha");
    assert.equal(alpha.kg, 1200);
    assert.equal(payload.forecast_used, false);
    assert.equal(payload.presented_as_closed_actual, true);
    assert.equal(alpha.discount_monto, -240);
    assert.equal(alpha.discount_kg, 0.2);
  });

  it("margen no aparece como sustituto de descuento", async () => {
    const payload = await loadHistoricalNewClientsForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      { ...loadOpts(factsFixture()), question: P.P2 }
    );
    const chat = buildHistoricalNewClientsChatResult(payload, { planta_id: 1 });
    assert.doesNotMatch(chat.answer, /COMPARACION MARGEN/);
    assert.match(chat.answer, /descuento/i);
    assert.equal(chat.context_meta.margin_used_as_discount, false);
    assert.equal(payload.margin_used_as_discount, false);
  });

  it("missing discount no se convierte a cero", () => {
    const pack = classifyHistoricalNewClients(factsFixture(), 7, 7.2);
    const gamma = pack.clients.find((c) => c.cliente === "Nuevo Gamma SinDesc");
    assert.equal(gamma.discount_monto, null);
    assert.equal(gamma.discount_kg, null);
    assert.equal(gamma.discount_status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.notEqual(gamma.discount_kg, 0);
  });
});

describe("historical new clients — lista completa y agregados", () => {
  it("fixture 66 se transporta completo y no usa el límite 20", () => {
    const pack = classifyHistoricalNewClients(sixtySixFacts(), 7, 7);
    assert.equal(pack.source_count, 66);
    assert.equal(pack.transport_count, 66);
    assert.equal(pack.clients.length, 66);
    assert.equal(COMMERCIAL_STATE_CLIENT_LIMIT, 20);
    const raw = sixtySixFacts().reduce((s, r) => s + r.kgB, 0);
    assert.equal(pack.total_kg, raw);
    const formattedSum = pack.clients.reduce((s, c) => s + Number((c.kg / 1000).toFixed(1)), 0);
    assert.notEqual(Number(pack.total_ton.toFixed(4)), Number(formattedSum.toFixed(4)));
  });

  it("respuesta determinista contiene cliente + compra + descuento de toda la lista", async () => {
    const payload = await loadHistoricalNewClientsForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      { ...loadOpts(sixtySixFacts()), question: P.P5 }
    );
    const chat = buildHistoricalNewClientsChatResult(payload, { planta_id: 1 });
    assert.equal(chat.context_meta.openai_called, false);
    assert.equal(chat.historical_new_clients.transport_count, 66);
    assert.match(chat.answer, /Cliente Fixture 01/);
    assert.match(chat.answer, /Cliente Fixture 66/);
    assert.match(chat.answer, /120 kg|166 kg/);
    assert.match(chat.answer, /descuento\/kg/);
    assert.doesNotMatch(chat.answer, /top 20/);
  });

  it("sin ventas → DATA_NOT_FOUND fail-closed", async () => {
    const payload = await loadHistoricalNewClientsForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts([]));
    assert.equal(payload.ok, false);
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    const chat = buildHistoricalNewClientsChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /No pude completar|No hay ventas/i);
    assert.equal(chat.historical_new_clients, null);
  });
});

describe("historical new clients — mes abierto y regresiones", () => {
  it("mes actual abierto no se presenta como cierre real", async () => {
    const payload = await loadHistoricalNewClientsForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      {
        ...loadOpts(factsFixture(), {
          loadMonthlyFacts: async () => {
            throw new Error("no debe cargar facts en mes abierto");
          },
        }),
        question: "¿Qué clientes nuevos entraron en septiembre?",
      }
    );
    assert.equal(payload.ok, true);
    assert.equal(payload.period_kind, "open_current_month");
    assert.equal(payload.presented_as_closed_actual, false);
    assert.equal(payload.forecast_used, false);
    const chat = buildHistoricalNewClientsChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /MES ABIERTO/);
    assert.match(chat.answer, /No presento forecast/);
    assert.doesNotMatch(chat.answer, /compra real cerrada de septiembre/i);
    assert.equal(payload.facts_consulted, false);
    assert.deepEqual(payload.sources, []);
    assert.deepEqual(chat.sources, []);
    assert.equal(chat.sources.includes("arr.ventas_diarias_cliente"), false);
    assert.equal(chat.sources.includes("arr.descuentos_diarios_cliente"), false);
  });

  it("regresión commercial_trend / client_profile / M9 / IGF / compound", () => {
    assert.equal(planDirectorIaQuestion("¿Qué clientes son nuevos?").intent, "commercial_trend");
    assert.equal(isCommercialTrendQuestion("¿Qué clientes son nuevos?"), true);
    assert.equal(planDirectorIaQuestion("¿Cuánto compró Arturo en agosto?").intent, "client_profile");
    assert.equal(isClientProfileQuestion("¿Cuánto compró Arturo en agosto?"), true);
    assert.equal(planDirectorIaQuestion("¿Cómo cambió el descuento?").intent, "delta_discount");
    assert.equal(planDirectorIaQuestion("¿Cómo se comportó el margen?").intent, "financial_diagnosis");
    assert.equal(planDirectorIaQuestion("¿Qué clientes aumentaron en agosto en Acapulco?").intent, "commercial_trend");
    assert.equal(isHistoricalNewClientsQuestion("¿Cuánto compró Y GRUPO MOVE en agosto?", NOW), false);
  });

  it("no hay hardcodes observacionales ni mutación/HTTP", () => {
    const src = fs.readFileSync(path.join(LIB, "director-ia-new-clients.js"), "utf8");
    assert.doesNotMatch(src, /\b108482\b/);
    assert.doesNotMatch(src, /\b15\.4\b/);
    assert.doesNotMatch(src, /\b15\.5\b/);
    assert.doesNotMatch(src, /66 clientes/);
    assert.doesNotMatch(src, /\bINSERT\b|\bUPDATE\b|\bDELETE\b/);
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /axios\./);
    assert.equal(COMMERCIAL_STATE_CLIENT_LIMIT, 20);
    const dicf = fs.readFileSync(path.join(LIB, "dicf.js"), "utf8");
    assert.match(dicf, /ingreso_anterior <= 0 && ingreso_forecast > 0/);
  });

  it("capability y tool registry", () => {
    assert.equal(isDirectorIaDomainReadable("historical_new_clients"), true);
    assert.equal(getDirectorIaTool("get_historical_new_clients").executor, "loadHistoricalNewClientsForChat");
    const v = validateDirectorIaToolRegistry();
    assert.equal(v.ok, true, (v.errors || []).join(","));
  });
});

describe("historical new clients — margen fail-closed y sources", () => {
  it("BEFORE: Number(null) se coerce a 0, no a fallback 1", () => {
    assert.equal(Number(null), 0);
    assert.equal(Number.isFinite(0), true);
    assert.equal(legacyCoerceMargin(null), 0);
    assert.notEqual(legacyCoerceMargin(null), 1);
    assert.equal(isDefendableHistoricalMargin(null), false);
  });

  async function loadWithMargen(margenFn) {
    return loadHistoricalNewClientsForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      { ...loadOpts(factsFixture()), getMargenKgPorPeriodo: margenFn }
    );
  }

  it("margen A null → no clasificación fail-closed", async () => {
    const payload = await loadWithMargen(async (_c, _n, year, month) =>
      year === 2026 && month === 7 ? null : 7.2
    );
    assert.equal(payload.ok, false);
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(payload.clients.length, 0);
    assert.equal(payload.margin_source_available, false);
    assert.match(payload.error, /margen histórico defendible/i);
    const chat = buildHistoricalNewClientsChatResult(payload, { planta_id: 1 });
    assert.equal(chat.historical_new_clients, null);
    assert.doesNotMatch(chat.answer, /Nuevo Alpha/);
  });

  it("margen B null → no clasificación fail-closed", async () => {
    const payload = await loadWithMargen(async (_c, _n, year, month) =>
      year === 2026 && month === 8 ? null : 7.0
    );
    assert.equal(payload.ok, false);
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(payload.clients.length, 0);
    assert.match(payload.error, /margen histórico defendible/i);
  });

  it("margen 0 → fail-closed", async () => {
    const payload = await loadWithMargen(async () => 0);
    assert.equal(payload.ok, false);
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(isDefendableHistoricalMargin(0), false);
  });

  it("margen NaN / no finito → fail-closed", async () => {
    const nanP = await loadWithMargen(async () => Number.NaN);
    assert.equal(nanP.ok, false);
    assert.equal(nanP.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    const infP = await loadWithMargen(async () => Number.POSITIVE_INFINITY);
    assert.equal(infP.ok, false);
    assert.equal(infP.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
  });

  it("ambos márgenes válidos conservan clasificación existente", async () => {
    const payload = await loadHistoricalNewClientsForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(factsFixture())
    );
    assert.equal(payload.ok, true);
    assert.equal(payload.margin_source_available, true);
    assert.ok(payload.clients.some((c) => c.cliente === "Nuevo Alpha"));
    assert.ok(!payload.clients.some((c) => c.cliente === "Viejo Beta"));
    assert.equal(Object.prototype.hasOwnProperty.call(payload, "margen_fallback_used"), false);
  });

  it("closed-month sources incluye ventas, descuentos y IGF real", async () => {
    const payload = await loadHistoricalNewClientsForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(factsFixture())
    );
    const chat = buildHistoricalNewClientsChatResult(payload, { planta_id: 1 });
    assert.ok(chat.sources.includes("arr.ventas_diarias_cliente"));
    assert.ok(chat.sources.includes("arr.descuentos_diarios_cliente"));
    assert.ok(chat.sources.includes(IGF_MARGIN_SOURCE));
    assert.equal(IGF_MARGIN_SOURCE, "igf.compromiso_lines");
    assert.equal(chat.context_meta.margin_source_available, true);
  });
});

describe("historical new clients — askDirectorIa in-process", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  after(() => {
    configureDirectorIaChat({
      loadHistoricalNewClientsForChat: undefined,
      resolveHistoricalNewClientsPlanta: undefined,
      loadHistoricalNewClientsFacts: undefined,
      getHistoricalNewClientsMargen: undefined,
    });
  });

  it("P2 no cae a IGF y enumera descuento, no margen", async () => {
    configureDirectorIaChat({
      pool: { connect: async () => ({ release() {} }) },
      loadHistoricalNewClientsForChat: async () => {
        const classified = classifyHistoricalNewClients(factsFixture(), 7, 7.2);
        return {
          ok: true,
          period_kind: "closed_month",
          presented_as_closed_actual: true,
          forecast_used: false,
          margin_used_as_discount: false,
          planta_id: 1,
          planta_nombre: "Puebla",
          periodoA: "2026-07",
          periodoB: "2026-08",
          ...classified,
        };
      },
    });
    const result = await askDirectorIa({ body: {}, dashboardAuth: { role: "ZP" } }, 1, P.P2);
    assert.equal(result.context_meta.mode, "historical_new_clients");
    assert.equal(result.context_meta.openai_called, false);
    assert.doesNotMatch(result.answer, /COMPARACION MARGEN/);
    assert.match(result.answer, /Nuevo Alpha/);
    assert.match(result.answer, /descuento/);
  });
});
