"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  detectUnsupportedDirectorIaDomain,
  isDirectorIaDomainReadable,
  SOURCE_ERROR,
  SOURCE_RESTRICTED,
} = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  getDirectorIaTool,
  isDirectorIaToolExecutable,
  validateDirectorIaToolRegistry,
} = require("../lib/director-ia-tools");
const {
  assertM9DeltasAccess,
  resolvePeriodPair,
  percentChangeOrUnknown,
  loadDeltaVentaForChat,
  loadDeltaDescuentoForChat,
  loadDeltaIngresoForChat,
  buildDeltaVentaChatResult,
  buildDeltaDescuentoChatResult,
  buildDeltaIngresoChatResult,
  VENTA_SEMANTIC_CLASS,
  DESCUENTO_SEMANTIC_CLASS,
  INGRESO_SEMANTIC_CLASS,
} = require("../lib/director-ia-m9-deltas");

const LIB_DIR = path.join(__dirname, "..", "lib");

function ventaDatos() {
  return {
    planta: "Puebla",
    periodoA: "2026-01",
    periodoB: "2026-02",
    dejaron: { totalDeltaKg: 100, totalDeltaKgStr: "0.1", signPositive: false, clientes: [{ cliente: "A", kgA: 100, kgB: 0, deltaKg: -100 }] },
    mas: { totalDeltaKg: 50, totalDeltaKgStr: "0.1", signPositive: true, clientes: [{ cliente: "B", kgA: 10, kgB: 60, deltaKg: 50 }] },
    disminuyeron: { totalDeltaKg: 20, totalDeltaKgStr: "0.0", signPositive: false, clientes: [] },
  };
}

function descDatos() {
  return {
    planta: "Puebla",
    periodoA: "2026-01",
    periodoB: "2026-02",
    dejaron: { totalDeltaRatio: 0, totalDeltaRatioStr: "0.00 $/kg", signPositive: false, clientes: [] },
    mas: { totalDeltaRatio: -1.5, totalDeltaRatioStr: "-1.50 $/kg", signPositive: false, clientes: [] },
    disminuyeron: { totalDeltaRatio: 0.4, totalDeltaRatioStr: "0.40 $/kg", signPositive: true, clientes: [] },
  };
}

function ingresoDatos() {
  return {
    planta: "Puebla",
    periodoA: "2026-01",
    periodoB: "2026-02",
    margenAStr: "0.00 $/kg",
    margenBStr: "2.00 $/kg",
    dejaron: { totalDeltaIngreso: 10, totalDeltaIngresoStr: "$10", signPositive: false, clientes: [] },
    mas: { totalDeltaIngreso: 5, totalDeltaIngresoStr: "$5", signPositive: true, clientes: [] },
    disminuyeron: { totalDeltaIngreso: 1, totalDeltaIngresoStr: "$1", signPositive: false, clientes: [] },
  };
}

function loadOpts(datos, periodos) {
  return {
    resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "E7" }),
    listPeriodos: async () => periodos || ["2026-02", "2026-01"],
    loadDatos: async () => datos,
  };
}

describe("M9 intent y gate", () => {
  it("las tres familias se detectan y son legibles", () => {
    assert.equal(planDirectorIaQuestion("¿Cómo cambió la venta?").intent, "delta_sales");
    assert.equal(planDirectorIaQuestion("¿Cómo cambió el descuento?").intent, "delta_discount");
    assert.equal(planDirectorIaQuestion("¿Cómo cambió el ingreso?").intent, "delta_income");
    const forecastPlan = planDirectorIaQuestion(
      "Dame 5 clientes que tengan el mayor impacto negativo en el ingreso para septiembre."
    );
    assert.equal(forecastPlan.intent, "delta_income");
    assert.equal(forecastPlan.evidence.some((e) => e.value === "delta_ingreso_forecast"), true);
    const commentsPlan = planDirectorIaQuestion(
      "Dame 5 clientes que tengan el mayor impacto negativo en el ingreso para el mes de septiembre, y ponme sus comentarios."
    );
    assert.equal(commentsPlan.intent, "delta_income");
    assert.notEqual(commentsPlan.intent, "commercial_trend");
    assert.equal(detectUnsupportedDirectorIaDomain("¿Cómo cambió la venta?"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("¿Cómo cambió el descuento?"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("¿Cómo cambió el ingreso?"), null);
    assert.equal(isDirectorIaDomainReadable("delta_venta"), true);
    assert.equal(isDirectorIaDomainReadable("delta_descuento"), true);
    assert.equal(isDirectorIaDomainReadable("delta_ingreso"), true);
  });

  it("no redirige a IGF/ARR/M3/M19", () => {
    const venta = planDirectorIaQuestion("¿Cómo cambió la venta?");
    assert.deepEqual(venta.domains, ["delta_venta"]);
    const desc = planDirectorIaQuestion("¿Cómo cambió el descuento?");
    assert.deepEqual(desc.domains, ["delta_descuento"]);
    const ing = planDirectorIaQuestion("¿Cómo cambió el ingreso?");
    assert.deepEqual(ing.domains, ["delta_ingreso"]);
    assert.equal(planDirectorIaQuestion("¿Cómo va IGF?").intent, "igf_status");
    assert.equal(planDirectorIaQuestion("¿Cuáles son los kpis del dashboard?").intent, "dashboard_kpis");
  });
});

describe("M9 registry", () => {
  it("las tres tools tienen executor read-only", () => {
    for (const [id, exec] of [
      ["get_delta_sales", "loadDeltaVentaForChat"],
      ["get_delta_discount", "loadDeltaDescuentoForChat"],
      ["get_delta_income", "loadDeltaIngresoForChat"],
    ]) {
      const t = getDirectorIaTool(id);
      assert.equal(t.executor, exec);
      assert.equal(t.readOnly, true);
      assert.equal(t.status, "available_on_demand");
      assert.equal(isDirectorIaToolExecutable(id), true);
    }
    const reg = validateDirectorIaToolRegistry();
    assert.equal(reg.ok, true, reg.errors && reg.errors.join(", "));
  });
});

describe("M9 authz", () => {
  it("GA y GV quedan bloqueados", () => {
    assert.equal(assertM9DeltasAccess({ role: "GA", plantas_permitidas: [1] }, 1).ok, false);
    assert.equal(assertM9DeltasAccess({ role: "GV", plantas_permitidas: [1] }, 1).ok, false);
    assert.equal(assertM9DeltasAccess({ role: "GA", plantas_permitidas: [1] }, 1).status, 403);
  });

  it("cross-planta bloqueado para GG/AD", () => {
    const denied = assertM9DeltasAccess({ role: "GG", plantas_permitidas: [1] }, 2);
    assert.equal(denied.ok, false);
    assert.equal(denied.code, SOURCE_RESTRICTED);
  });
});

describe("M9 periodos", () => {
  it("usa YYYY-MM de la pregunta cuando hay dos distintos", () => {
    const pair = resolvePeriodPair("compara 2026-01 y 2026-03", ["2026-04", "2026-03", "2026-01"]);
    assert.equal(pair.ok, true);
    assert.equal(pair.periodoA, "2026-01");
    assert.equal(pair.periodoB, "2026-03");
    assert.equal(pair.source, "question");
  });

  it("periodos iguales fallan", () => {
    const pair = resolvePeriodPair("2026-01 vs 2026-01", ["2026-02", "2026-01"]);
    assert.equal(pair.ok, false);
  });

  it("sin YYYY-MM usa los dos más recientes de la lista", () => {
    const pair = resolvePeriodPair("¿Cómo cambió la venta?", ["2026-04", "2026-03", "2026-01"]);
    assert.equal(pair.ok, true);
    assert.equal(pair.periodoB, "2026-04");
    assert.equal(pair.periodoA, "2026-03");
    assert.equal(pair.source, "default_latest_two");
  });

  it("un solo periodo disponible no inventa el par", () => {
    const pair = resolvePeriodPair("¿Cómo cambió la venta?", ["2026-01"]);
    assert.equal(pair.ok, false);
  });
});

describe("M9 nulls y división por cero", () => {
  it("no produce porcentaje válido con base 0, null o unknown", () => {
    assert.equal(percentChangeOrUnknown(0, 10), null);
    assert.equal(percentChangeOrUnknown(null, 10), null);
    assert.equal(percentChangeOrUnknown(undefined, 10), null);
    assert.equal(percentChangeOrUnknown(20, null), null);
    assert.equal(percentChangeOrUnknown(20, 10), 0.5);
  });
});

describe("M9 loaders", () => {
  it("happy path Delta Venta", async () => {
    const payload = await loadDeltaVentaForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      ...loadOpts(ventaDatos()),
      question: "¿Cómo cambió la venta?",
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.semantic_class, VENTA_SEMANTIC_CLASS);
    assert.equal(payload.family, "delta_venta");
    assert.equal(payload.unit, "kg");
    assert.equal(payload.periodoA, "2026-01");
    assert.equal(payload.periodoB, "2026-02");
    assert.equal(payload.datos.mas.signPositive, true);
    const chat = buildDeltaVentaChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /Delta Venta/i);
    assert.match(chat.answer, /\bIGF\b/);
    assert.match(chat.answer, /No afirma causalidad/i);
    assert.equal(chat.context_meta.openai_called, false);
  });

  it("happy path Delta Descuento", async () => {
    const payload = await loadDeltaDescuentoForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      ...loadOpts(descDatos()),
      question: "¿Cómo cambió el descuento?",
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.semantic_class, DESCUENTO_SEMANTIC_CLASS);
    assert.equal(payload.unit, "$/kg");
    const chat = buildDeltaDescuentoChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /Delta Descuento/i);
    assert.match(chat.answer, /weekly LD/i);
    assert.match(chat.answer, /ni M19/);
  });

  it("happy path Delta Ingreso", async () => {
    const payload = await loadDeltaIngresoForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      ...loadOpts(ingresoDatos()),
      question: "¿Cómo cambió el ingreso?",
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.semantic_class, INGRESO_SEMANTIC_CLASS);
    assert.equal(payload.datos.margenAStr, "0.00 $/kg");
    const chat = buildDeltaIngresoChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /Delta Ingreso/i);
    assert.match(chat.answer, /insumo/i);
    assert.match(chat.answer, /ni M19/);
    assert.match(chat.answer, /forecast de ingreso/i);
  });

  it("fuente vacía de periodos no inventa", async () => {
    const payload = await loadDeltaVentaForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "E7" }),
      listPeriodos: async () => [],
      loadDatos: async () => {
        throw new Error("no debe consultar datos");
      },
      question: "¿Cómo cambió la venta?",
    });
    assert.equal(payload.ok, false);
    const chat = buildDeltaVentaChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /periodos/i);
  });

  it("periodos inválidos iguales fallan cerrado", async () => {
    const payload = await loadDeltaVentaForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      ...loadOpts(ventaDatos(), ["2026-02", "2026-01"]),
      question: "compara 2026-02 y 2026-02",
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 400);
  });

  it("planta_id ausente falla cerrado", async () => {
    const r = await loadDeltaVentaForChat(null, null, { dashboardAuth: { role: "ZP" } });
    assert.equal(r.status, 400);
  });

  it("GA/GV no llegan a la fuente", async () => {
    const ga = await loadDeltaVentaForChat(null, 1, { dashboardAuth: { role: "GA", plantas_permitidas: [1] } }, {
      resolvePlanta: async () => {
        throw new Error("no debe consultar planta");
      },
      listPeriodos: async () => {
        throw new Error("no debe consultar periodos");
      },
      loadDatos: async () => {
        throw new Error("no debe consultar datos");
      },
    });
    assert.equal(ga.status, 403);
    const gv = await loadDeltaDescuentoForChat(null, 1, { dashboardAuth: { role: "GV" } }, {
      loadDatos: async () => {
        throw new Error("no debe consultar datos");
      },
    });
    assert.equal(gv.status, 403);
  });

  it("cross-planta no llega a la fuente", async () => {
    const r = await loadDeltaIngresoForChat(null, 2, { dashboardAuth: { role: "GG", plantas_permitidas: [1] } }, {
      loadDatos: async () => {
        throw new Error("no debe consultar datos");
      },
    });
    assert.equal(r.status, 403);
  });

  it("error de fuente no se convierte en ceros", async () => {
    const r = await loadDeltaVentaForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "E7" }),
      listPeriodos: async () => ["2026-02", "2026-01"],
      loadDatos: async () => {
        throw new Error("db down");
      },
      question: "¿Cómo cambió la venta?",
    });
    assert.equal(r.ok, false);
    assert.equal(r.code, SOURCE_ERROR);
    const chat = buildDeltaVentaChatResult(r, { planta_id: 1 });
    assert.match(chat.answer, /error de fuente|db down/i);
    assert.doesNotMatch(chat.answer, /totalDeltaKg/);
  });
});

describe("M9 no mutación / no HTTP / no M19 / no forecast write", () => {
  it("el módulo M9 no muta ni llama HTTP ni M19", () => {
    const src = fs.readFileSync(path.join(LIB_DIR, "director-ia-m9-deltas.js"), "utf8");
    assert.doesNotMatch(src, /\b(INSERT|UPDATE|DELETE)\b/);
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /axios\./);
    assert.doesNotMatch(src, /director-ia-real-cycle/);
    assert.doesNotMatch(src, /delta-ingreso-ai/);
    assert.doesNotMatch(src, /computeDeltaIngresoForecast/);
    assert.doesNotMatch(src, /\/api\/ai\/delta-ingreso/);
  });
});

describe("M9 chat end-to-end in-process", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  function poolWith(periodos, extraQuery) {
    return {
      connect: async () => ({
        query: async (sql, params) => {
          if (/FROM public\.plantas/.test(sql) && /id = \$1/.test(sql)) {
            return { rows: [{ id: 1, nombre: "Puebla", clave: "E7" }] };
          }
          if (/to_char\(v\.fecha/.test(sql) || /to_char\(d\.fecha/.test(sql)) {
            return { rows: (periodos || ["2026-02", "2026-01"]).map((periodo) => ({ periodo })) };
          }
          if (extraQuery) return extraQuery(sql, params);
          return { rows: [] };
        },
        release() {},
      }),
    };
  }

  it("pregunta de venta llega al executor y no a IGF", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo cambió la venta?"
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.mode, "delta_sales");
    assert.equal(result.context_meta.openai_called, false);
    assert.ok(result.delta_venta);
    assert.match(result.answer, /Delta Venta/i);
    assert.match(result.answer, /\bIGF\b/);
  });

  it("pregunta de descuento no cae a IGF annex", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo cambió el descuento?"
    );
    assert.equal(result.context_meta.mode, "delta_discount");
    assert.equal(result.context_meta.openai_called, false);
    assert.match(result.answer, /Delta Descuento/i);
  });

  it("pregunta de ingreso no es M19 ni forecast", async () => {
    configureDirectorIaChat({
      pool: poolWith(["2026-02", "2026-01"], (sql) => {
        if (/FROM igf\.versions/.test(sql)) return { rows: [] };
        return { rows: [] };
      }),
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo cambió el ingreso?"
    );
    assert.equal(result.context_meta.mode, "delta_income");
    assert.equal(result.context_meta.openai_called, false);
    assert.match(result.answer, /Delta Ingreso/i);
    assert.match(result.answer, /ni M19/);
  });
});
