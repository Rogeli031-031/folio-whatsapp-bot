"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  detectUnsupportedDirectorIaDomain,
  isDirectorIaDomainReadable,
  SOURCE_NOT_INTEGRATED,
  SOURCE_ERROR,
  SOURCE_RESTRICTED,
} = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  getDirectorIaTool,
  isDirectorIaToolExecutable,
  validateDirectorIaToolRegistry,
} = require("../lib/director-ia-tools");
const { buildDirectorIaToolPlan } = require("../lib/director-ia-tool-orchestrator");
const {
  loadDashboardKpisForChat,
  loadProyectosForChat,
  buildDashboardKpisChatResult,
  buildProyectosChatResult,
  assertM3KpisAccess,
  assertM3ProyectosAccess,
  KPI_SEMANTIC_CLASS,
  PROJECT_SEMANTIC_CLASS,
} = require("../lib/director-ia-m3-plantas-kpis-proyectos");

const LIB_DIR = path.join(__dirname, "..", "lib");

function emptyKpis() {
  return {
    total_activos: 0,
    total_mxn: 0,
    pendientes_zp: 0,
    avg_aging: null,
    top_planta: null,
    top_categoria: null,
    oldest: null,
  };
}

function sampleKpis() {
  return {
    total_activos: 4,
    total_mxn: 1200.5,
    pendientes_zp: 1,
    avg_aging: 12,
    top_planta: { nombre: "Puebla", count: 3, total_mxn: 800 },
    top_categoria: { nombre: "GASTOS", count: 2, total_mxn: 500 },
    oldest: { folio_codigo: "F-1", aging: 40, etapa: "APROBADO_ZP", planta: "Puebla" },
  };
}

function sampleProyectos() {
  return [
    {
      id: 9,
      codigo: "PRY-9",
      nombre: "Ampliación andén",
      fecha_inicio: "2026-01-01",
      fecha_cierre_estimada: "2026-02-01",
      estatus: "EN_CURSO",
      aprobado_zp: true,
    },
  ];
}

describe("M3 intent y gate", () => {
  it("consulta válida de proyectos ya no es SOURCE_NOT_INTEGRATED", () => {
    assert.equal(detectUnsupportedDirectorIaDomain("¿Qué proyectos están retrasados?"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("¿Qué proyectos hay en la planta?"), null);
    assert.equal(isDirectorIaDomainReadable("proyectos"), true);
  });

  it("KPIs dashboard se detectan y no van a IGF/ARR", () => {
    const plan = planDirectorIaQuestion("¿Cuáles son los kpis del dashboard?");
    assert.equal(plan.intent, "dashboard_kpis");
    assert.ok(plan.domains.includes("dashboard_kpis"));
    assert.ok(!plan.domains.includes("igf"));
    assert.ok(!plan.domains.includes("arr"));
    assert.equal(detectUnsupportedDirectorIaDomain("¿Cuáles son los kpis del dashboard?"), null);
    assert.equal(isDirectorIaDomainReadable("dashboard_kpis"), true);
  });

  it("clarificación Action Register vs Proyectos se conserva", () => {
    const plan = planDirectorIaQuestion("¿Cómo van los proyectos de mantenimiento?");
    assert.equal(plan.intent, "project_status");
    assert.equal(plan.requires_clarification, true);
    const toolPlan = buildDirectorIaToolPlan(plan, {
      planta_id: 1,
      question: "¿Cómo van los proyectos de mantenimiento?",
    });
    assert.equal(toolPlan.requires_clarification, true);
    assert.equal(toolPlan.can_execute, false);
  });

  it("cómo va IGF no se resuelve como KPIs dashboard", () => {
    const plan = planDirectorIaQuestion("¿Cómo va IGF?");
    assert.equal(plan.intent, "igf_status");
  });
});

describe("M3 registry", () => {
  it("get_project_status y get_dashboard_kpis tienen executor read-only", () => {
    const proyectos = getDirectorIaTool("get_project_status");
    assert.equal(proyectos.executor, "loadProyectosForChat");
    assert.equal(proyectos.readOnly, true);
    assert.equal(proyectos.status, "available_on_demand");
    assert.equal(isDirectorIaToolExecutable("get_project_status"), true);

    const kpis = getDirectorIaTool("get_dashboard_kpis");
    assert.equal(kpis.executor, "loadDashboardKpisForChat");
    assert.equal(kpis.readOnly, true);
    assert.equal(isDirectorIaToolExecutable("get_dashboard_kpis"), true);

    const reg = validateDirectorIaToolRegistry();
    assert.equal(reg.ok, true, reg.errors && reg.errors.join(", "));
  });
});

describe("M3 authz", () => {
  it("GA queda bloqueado en KPIs", () => {
    const denied = assertM3KpisAccess({ role: "GA", plantas_permitidas: [1] }, 1);
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 403);
    assert.equal(denied.code, SOURCE_RESTRICTED);
  });

  it("GV queda bloqueado en KPIs y proyectos", () => {
    assert.equal(assertM3KpisAccess({ role: "GV", plantas_permitidas: [1] }, 1).ok, false);
    assert.equal(assertM3ProyectosAccess({ role: "GV", plantas_permitidas: [1] }, 1).ok, false);
  });

  it("cross-planta bloqueado para GG/GA/AD con lista", () => {
    const deniedK = assertM3KpisAccess({ role: "GG", plantas_permitidas: [1] }, 2);
    const deniedP = assertM3ProyectosAccess({ role: "AD", plantas_permitidas: [1] }, 9);
    assert.equal(deniedK.ok, false);
    assert.equal(deniedP.ok, false);
  });
});

describe("M3 loaders", () => {
  it("happy path KPIs conserva shape y nulls de la fuente", async () => {
    const payload = await loadDashboardKpisForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "E7" }),
      queryKpis: async () => sampleKpis(),
      buildDashboardWhere: () => ({ where: "", params: [] }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.semantic_class, KPI_SEMANTIC_CLASS);
    assert.equal(payload.planta_clave, "E7");
    assert.equal(payload.kpis.total_activos, 4);
    assert.equal(payload.kpis.avg_aging, 12);
    assert.ok(payload.filters_applied.ventana_default);
    const chat = buildDashboardKpisChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /agregados observados/i);
    assert.match(chat.answer, /No expresan salud, desempeño ni causalidad/i);
    assert.match(chat.answer, /no IGF/i);
  });

  it("empty KPIs según semántica fuente (ceros y nulls)", async () => {
    const payload = await loadDashboardKpisForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "E7" }),
      queryKpis: async () => emptyKpis(),
      buildDashboardWhere: () => ({ where: "", params: [] }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.kpis.total_activos, 0);
    assert.equal(payload.kpis.total_mxn, 0);
    assert.equal(payload.kpis.avg_aging, null);
    assert.equal(payload.kpis.oldest, null);
    assert.equal(payload.kpis.top_planta, null);
    assert.equal(payload.kpis.top_categoria, null);
    const chat = buildDashboardKpisChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /n\/d/);
    assert.match(chat.answer, /No expresan salud, desempeño ni causalidad/i);
  });

  it("happy path proyectos lista campos reales", async () => {
    const payload = await loadProyectosForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "E7" }),
      listProyectos: async () => sampleProyectos(),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.semantic_class, PROJECT_SEMANTIC_CLASS);
    assert.equal(payload.proyectos_count, 1);
    assert.equal(payload.proyectos[0].codigo, "PRY-9");
    assert.equal(payload.proyectos[0].estatus, "EN_CURSO");
    assert.ok(payload.derived_delay_criterion);
    const chat = buildProyectosChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /módulo Proyectos/i);
    assert.doesNotMatch(chat.answer, /estatus retrasado/i);
  });

  it("proyectos vacíos no afirman ausencia universal", async () => {
    const payload = await loadProyectosForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "E7" }),
      listProyectos: async () => [],
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.proyectos_count, 0);
    const chat = buildProyectosChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /EN_CURSO/);
    assert.match(chat.answer, /no demuestra/i);
    assert.match(chat.answer, /Action Register/i);
  });

  it("error de carga no se convierte en cero/empty", async () => {
    const kpis = await loadDashboardKpisForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "E7" }),
      queryKpis: async () => {
        throw new Error("db down");
      },
      buildDashboardWhere: () => ({ where: "", params: [] }),
    });
    assert.equal(kpis.ok, false);
    assert.equal(kpis.code, SOURCE_ERROR);
    const kChat = buildDashboardKpisChatResult(kpis, { planta_id: 1 });
    assert.match(kChat.answer, /error de fuente/i);
    assert.doesNotMatch(kChat.answer, /total_activos: 0/);

    const proyectos = await loadProyectosForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "E7" }),
      listProyectos: async () => {
        throw new Error("db down");
      },
    });
    assert.equal(proyectos.ok, false);
    assert.equal(proyectos.code, SOURCE_ERROR);
    const pChat = buildProyectosChatResult(proyectos, { planta_id: 1 });
    assert.match(pChat.answer, /error de fuente/i);
    assert.doesNotMatch(pChat.answer, /No hay proyectos con estatus EN_CURSO/);
  });

  it("planta_id ausente falla cerrado", async () => {
    const kpis = await loadDashboardKpisForChat(null, null, { dashboardAuth: { role: "ZP" } });
    const proyectos = await loadProyectosForChat(null, undefined, { dashboardAuth: { role: "ZP" } });
    assert.equal(kpis.status, 400);
    assert.equal(proyectos.status, 400);
  });

  it("GA/GV no llegan a la fuente de KPIs", async () => {
    const ga = await loadDashboardKpisForChat(null, 1, { dashboardAuth: { role: "GA", plantas_permitidas: [1] } }, {
      resolvePlanta: async () => {
        throw new Error("no debe consultar planta");
      },
      queryKpis: async () => {
        throw new Error("no debe consultar kpis");
      },
    });
    assert.equal(ga.status, 403);
    const gv = await loadDashboardKpisForChat(null, 1, { dashboardAuth: { role: "GV" } }, {
      queryKpis: async () => {
        throw new Error("no debe consultar kpis");
      },
    });
    assert.equal(gv.status, 403);
  });

  it("GV no llega a la fuente de proyectos", async () => {
    const gv = await loadProyectosForChat(null, 1, { dashboardAuth: { role: "GV" } }, {
      listProyectos: async () => {
        throw new Error("no debe consultar proyectos");
      },
    });
    assert.equal(gv.status, 403);
  });
});

describe("M3 no mutación / no HTTP interno / no cycle", () => {
  it("el módulo M3 no muta ni llama HTTP", () => {
    const src = fs.readFileSync(path.join(LIB_DIR, "director-ia-m3-plantas-kpis-proyectos.js"), "utf8");
    assert.doesNotMatch(src, /\b(INSERT|UPDATE|DELETE)\b/);
    assert.doesNotMatch(src, /app\.post\(\s*["']\/api\/proyectos/);
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /axios\./);
    assert.doesNotMatch(src, /director-ia-real-cycle/);
  });
});

describe("M3 chat end-to-end in-process", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  it("pregunta de KPIs llega al executor y no a SOURCE_NOT_INTEGRATED ni IGF", async () => {
    configureDirectorIaChat({
      pool: {
        connect: async () => ({
          query: async (sql) => {
            if (/FROM public\.plantas/.test(sql)) {
              return { rows: [{ id: 1, nombre: "Puebla", clave: "E7" }] };
            }
            if (/COUNT\(\*\)::INT AS total_activos/.test(sql)) {
              return { rows: [{ total_activos: 2, total_mxn: 10 }] };
            }
            if (/PENDIENTE_APROB_ZP/.test(sql)) return { rows: [{ c: 0 }] };
            if (/ORDER BY f\.creado_en ASC/.test(sql)) return { rows: [] };
            if (/AVG\(EXTRACT/.test(sql)) return { rows: [{ avg_aging: null }] };
            if (/GROUP BY f\.planta_id/.test(sql)) return { rows: [] };
            if (/GROUP BY UPPER/.test(sql)) return { rows: [] };
            throw new Error(`unexpected sql: ${sql}`);
          },
          release() {},
        }),
      },
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cuáles son los kpis del dashboard?"
    );
    assert.equal(result.ok, true);
    assert.notEqual(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.mode, "dashboard_kpis");
    assert.equal(result.context_meta.openai_called, false);
    assert.ok(result.dashboard_kpis);
    assert.equal(result.dashboard_kpis.kpis.avg_aging, null);
    assert.equal(result.dashboard_kpis.kpis.oldest, null);
    assert.match(result.answer, /no IGF/i);
  });

  it("pregunta válida de proyectos ya no es SOURCE_NOT_INTEGRATED", async () => {
    configureDirectorIaChat({
      pool: {
        connect: async () => ({
          query: async (sql) => {
            if (/FROM public\.plantas/.test(sql)) {
              return { rows: [{ id: 1, nombre: "Puebla", clave: "E7" }] };
            }
            if (/FROM public\.proyectos/.test(sql)) return { rows: sampleProyectos() };
            throw new Error(`unexpected sql: ${sql}`);
          },
          release() {},
        }),
      },
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Qué proyectos están retrasados?"
    );
    assert.equal(result.ok, true);
    assert.notEqual(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.mode, "project_status");
    assert.equal(result.context_meta.openai_called, false);
    assert.ok(result.proyectos);
    assert.doesNotMatch(result.answer, /estatus retrasado/i);
  });

  it("colisión AR vs proyectos pide clarificación sin OpenAI", async () => {
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo van los proyectos de mantenimiento?"
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.mode, "project_status_clarification");
    assert.equal(result.context_meta.openai_called, false);
    assert.match(result.answer, /Action Register/i);
  });
});
