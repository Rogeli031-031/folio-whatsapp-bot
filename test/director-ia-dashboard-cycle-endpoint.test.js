"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const {
  createDirectorIaDashboardCycleTransport,
  composeDirectorIaDashboardRealCycle,
  configureDirectorIaDashboardCycle,
  handlePostDashboardCycle,
  resetDirectorIaDashboardCycleForTests,
  ROUTE_PATH,
  SLICE_INTENT,
  SLICE_QUESTION,
  PROJECTION_DEPTH,
} = require("../lib/director-ia-dashboard-cycle-transport");
const { dashboardAuthMiddleware, createDashboardToken } = require("../lib/dashboard-auth");

const LIB_PATH = path.join(__dirname, "..", "lib", "director-ia-dashboard-cycle-transport.js");
const SERVER_PATH = path.join(__dirname, "..", "server.js");
const CHAT_LIB = path.join(__dirname, "..", "lib", "director-ia-chat.js");
const CLOCK = () => "2026-08-21T08:53:17.000Z";
const SECRET_MARKERS = [
  "sk-",
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "TWILIO",
  "ACCOUNT_SID",
  "AUTH_TOKEN",
  "password",
  "Bearer ",
];

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function serialized(v) {
  return JSON.stringify(v);
}

function capturingLogger() {
  const events = [];
  return {
    events,
    info(payload) {
      events.push(payload);
    },
  };
}

function fakeCycle(resultOrFn) {
  const calls = [];
  return {
    calls,
    async run(input) {
      const stored = {
        ...clone({
          ...input,
          client: undefined,
        }),
        client: input && Object.prototype.hasOwnProperty.call(input, "client") ? { kind: "present" } : undefined,
      };
      calls.push(stored);
      if (typeof resultOrFn === "function") return resultOrFn(input, calls.length);
      return clone(resultOrFn);
    },
  };
}

function channelOut() {
  return {
    channel: "DASHBOARD",
    content_blocks: [{ type: "COVERAGE", text: "ilustrativo" }],
  };
}

function cycleResult(status, extras) {
  const extra = extras || {};
  return {
    trace_id: extra.trace_id || "trace_fake_1",
    arr_cycle: {
      trace_id: extra.trace_id || "trace_fake_1",
      envelopes: [
        {
          status,
          payload: extra.payload !== undefined ? extra.payload : {},
        },
      ],
    },
    ies: {
      status: extra.ies_status || (status === "ACQUIRED_OK" ? "VALIDATED" : "PARTIAL"),
      knowledge_coverage: extra.knowledge_coverage || { coverage_token: "ilustrativo" },
      source_health: extra.source_health || [{ execution_status: extra.execution_status || "DATA_AVAILABLE", tool_id: "get_arr_snapshot" }],
    },
    reasoning_run: { status: extra.reasoning_status || "ABSTAIN" },
    channel_output: extra.channel_output || channelOut(),
  };
}

function dashboardRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s/g, "").toUpperCase();
}

function assertPlantaAccess(req, plantaId) {
  const roleNorm = dashboardRoleNorm(req.dashboardAuth);
  if (roleNorm === "ZP" || roleNorm === "AD" || roleNorm === "CF_CDMX") return true;
  const allowed = new Set((req.dashboardAuth.plantas_permitidas || []).map((x) => Number(x)).filter(Number.isFinite));
  return allowed.has(Number(plantaId));
}

function blockGAFinancialKpis(req, res) {
  const roleNorm = req.dashboardAuth && req.dashboardAuth.role ? String(req.dashboardAuth.role).toUpperCase() : "";
  if (roleNorm === "GA") {
    res.status(403).json({ error: "GA no tiene acceso a KPIs financieros." });
    return true;
  }
  return false;
}

function fakePool() {
  return {
    async connect() {
      return {
        async query() {
          return { rows: [] };
        },
        release() {},
      };
    },
  };
}

function tokenFor(payload) {
  return createDashboardToken(payload);
}

async function withServer(setup, fn) {
  const app = express();
  app.use(express.json());
  setup(app);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function postJson(base, route, { token, body }) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${route}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
  const json = await res.json();
  return { status: res.status, json };
}

function mountCycle(app) {
  app.post(ROUTE_PATH, dashboardAuthMiddleware, handlePostDashboardCycle);
  app.post("/api/director-ia/chat", dashboardAuthMiddleware, (req, res) => {
    res.status(200).json({
      ok: true,
      legacy: true,
      question: req.body && req.body.question,
      planta_id: req.body && req.body.planta_id,
    });
  });
}

describe("Director IA dashboard cycle transport — factory", () => {
  it("factory expone handle y exige realCycle.run", () => {
    const cycle = fakeCycle(cycleResult("ACQUIRED_OK"));
    const t = createDirectorIaDashboardCycleTransport({ realCycle: cycle, clock: CLOCK });
    assert.equal(typeof t.handle, "function");
    assert.throws(
      () => createDirectorIaDashboardCycleTransport({}),
      (err) => err && err.code === "INVALID_DEPENDENCIES"
    );
  });
});

describe("Director IA dashboard cycle transport — unit", () => {
  it("request válido invoca el ciclo real exactamente una vez", async () => {
    const cycle = fakeCycle(cycleResult("ACQUIRED_OK"));
    const t = createDirectorIaDashboardCycleTransport({ realCycle: cycle, clock: CLOCK });
    const out = await t.handle({ planta_id: 9001, year: 2026, month: 7, plant_code: "SYN-NTE" });
    assert.equal(cycle.calls.length, 1);
    assert.equal(out.httpStatus, 200);
    assert.equal(out.invokedCycle, true);
  });

  it("mapea planta_id sin plant_code de cliente y no muta el input", async () => {
    const cycle = fakeCycle(cycleResult("ENTITY_UNRESOLVED"));
    const t = createDirectorIaDashboardCycleTransport({ realCycle: cycle, clock: CLOCK });
    const input = {
      planta_id: 9001,
      year: 2026,
      month: 7,
      trace_id: "client_trace",
      query_context_metadata: { intent: "tamper", channel: "whatsapp" },
      source: { system: "tamper" },
      raw_payload_reference: "raw://secret",
      content_author_id: "attacker",
      projectionDepth: "L3_AUDIT",
    };
    const before = clone(input);
    await t.handle(input);
    assert.deepEqual(input, before);
    assert.equal(cycle.calls.length, 1);
    assert.equal(cycle.calls[0].planta_id, 9001);
    assert.equal(Object.prototype.hasOwnProperty.call(cycle.calls[0], "plant_code"), false);
    assert.equal(cycle.calls[0].query_context_metadata.intent, SLICE_INTENT);
    assert.equal(cycle.calls[0].query_context_metadata.channel, "dashboard");
    assert.equal(cycle.calls[0].query_context_metadata.trace_id, "pending_arr_trace");
    assert.equal(cycle.calls[0].projectionDepth, PROJECTION_DEPTH);
    assert.equal(cycle.calls[0].question, SLICE_QUESTION);
    assert.equal(cycle.calls[0].plan.intent, SLICE_INTENT);
  });

  it("preserva trace_id del ciclo y CP DASHBOARD", async () => {
    const cycle = fakeCycle(cycleResult("ACQUIRED_OK", { trace_id: "trace_owned_by_arr" }));
    const t = createDirectorIaDashboardCycleTransport({ realCycle: cycle, clock: CLOCK });
    const out = await t.handle({ planta_id: 9001, year: 2026, month: 7, plant_code: "SYN-NTE" });
    assert.equal(out.body.trace_id, "trace_owned_by_arr");
    assert.equal(out.body.channel_output.channel, "DASHBOARD");
    assert.equal(Object.prototype.hasOwnProperty.call(out.body, "arr_cycle"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out.body, "ies"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out.body, "reasoning_result"), false);
  });

  it("el transporte no sintetiza N1-N5 ni importa LLM/chat/Twilio", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(/to_n1|to_n2|to_n3|to_n4/.test(src), false);
    assert.equal(/require\(["']twilio["']\)/.test(src), false);
    assert.equal(/director-ia-chat|openai|anthropic|whatsapp/i.test(src), false);
    for (const marker of SECRET_MARKERS) {
      assert.equal(src.includes(marker), false, marker);
    }
  });
});

describe("Director IA dashboard cycle transport — status mapping", () => {
  it("ACQUIRED_OK -> 200", async () => {
    const t = createDirectorIaDashboardCycleTransport({
      realCycle: fakeCycle(cycleResult("ACQUIRED_OK")),
      clock: CLOCK,
    });
    const out = await t.handle({ planta_id: 9001, year: 2026, month: 7, plant_code: "SYN-NTE" });
    assert.equal(out.httpStatus, 200);
    assert.equal(out.body.acquisition_status, "ACQUIRED_OK");
    assert.equal(out.body.ok, true);
  });

  it("ACQUIRED_EMPTY -> 200 y conserva DATA_NOT_FOUND; jamás 404 ni ausencia", async () => {
    const t = createDirectorIaDashboardCycleTransport({
      realCycle: fakeCycle(
        cycleResult("ACQUIRED_EMPTY", {
          ies_status: "PARTIAL",
          execution_status: "DATA_NOT_FOUND",
          knowledge_coverage: { partial_domains: ["arr"] },
          payload: {},
        })
      ),
      clock: CLOCK,
    });
    const out = await t.handle({ planta_id: 9001, year: 2026, month: 7, plant_code: "SYN-NTE" });
    assert.equal(out.httpStatus, 200);
    assert.equal(out.body.acquisition_status, "ACQUIRED_EMPTY");
    assert.equal(out.body.source_health[0].execution_status, "DATA_NOT_FOUND");
    assert.equal(serialized(out.body).includes("ABSENCE_CONFIRMED"), false);
    assert.equal(serialized(out.body).includes('"venta_ton":0'), false);
  });

  it("ENTITY_UNRESOLVED -> 200 con detalle", async () => {
    const t = createDirectorIaDashboardCycleTransport({
      realCycle: fakeCycle(
        cycleResult("ENTITY_UNRESOLVED", {
          knowledge_coverage: { unresolved_entities: ["arr", "9001"] },
        })
      ),
      clock: CLOCK,
    });
    const out = await t.handle({ planta_id: 9001, year: 2026, month: 7 });
    assert.equal(out.httpStatus, 200);
    assert.equal(out.body.acquisition_status, "ENTITY_UNRESOLVED");
    assert.deepEqual(out.body.knowledge_coverage.unresolved_entities, ["arr", "9001"]);
  });

  it("QUERY_SCOPE_INCOMPLETE -> 200 con detalle", async () => {
    const t = createDirectorIaDashboardCycleTransport({
      realCycle: fakeCycle(
        cycleResult("QUERY_SCOPE_INCOMPLETE", {
          knowledge_coverage: { incomplete_scopes: ["arr"] },
        })
      ),
      clock: CLOCK,
    });
    const out = await t.handle({ planta_id: 9001, year: 2026, plant_code: "SYN-NTE" });
    assert.equal(out.httpStatus, 200);
    assert.equal(out.body.acquisition_status, "QUERY_SCOPE_INCOMPLETE");
    assert.deepEqual(out.body.knowledge_coverage.incomplete_scopes, ["arr"]);
  });

  it("ABSTAIN/NO_KNOWLEDGE -> 200", async () => {
    const t = createDirectorIaDashboardCycleTransport({
      realCycle: fakeCycle(
        cycleResult("ACQUIRED_OK", { reasoning_status: "ABSTAIN", ies_status: "VALIDATED" })
      ),
      clock: CLOCK,
    });
    const out = await t.handle({ planta_id: 9001, year: 2026, month: 7, plant_code: "SYN-NTE" });
    assert.equal(out.httpStatus, 200);
    assert.equal(out.body.reasoning_status, "ABSTAIN");
  });

  it("INVALID_INPUT -> 400 sin invocar el ciclo si falta planta_id", async () => {
    const cycle = fakeCycle(cycleResult("ACQUIRED_OK"));
    const t = createDirectorIaDashboardCycleTransport({ realCycle: cycle, clock: CLOCK });
    const out = await t.handle({ year: 2026, month: 7 });
    assert.equal(out.httpStatus, 400);
    assert.equal(out.body.code, "INVALID_INPUT");
    assert.equal(cycle.calls.length, 0);
  });

  it("TOOL_ERROR -> 502 con código estructurado", async () => {
    const t = createDirectorIaDashboardCycleTransport({
      realCycle: fakeCycle(
        cycleResult("TOOL_ERROR", {
          knowledge_coverage: { failed_tools: ["get_arr_snapshot"] },
          execution_status: "TOOL_ERROR",
        })
      ),
      clock: CLOCK,
    });
    const out = await t.handle({ planta_id: 9001, year: 2026, month: 7, plant_code: "SYN-NTE" });
    assert.equal(out.httpStatus, 502);
    assert.equal(out.body.code, "TOOL_ERROR");
    assert.equal(out.body.acquisition_status, "TOOL_ERROR");
    assert.equal(out.body.ok, false);
  });

  it("error inesperado -> 500 product-safe", async () => {
    const cycle = fakeCycle(async () => {
      const err = new Error("boom pg password=secret");
      err.code = "INVALID_BUNDLE";
      throw err;
    });
    const t = createDirectorIaDashboardCycleTransport({ realCycle: cycle, clock: CLOCK });
    const out = await t.handle({ planta_id: 9001, year: 2026, month: 7, plant_code: "SYN-NTE" });
    assert.equal(out.httpStatus, 500);
    assert.equal(out.body.error, "Error interno");
    assert.equal(serialized(out.body).includes("password"), false);
    assert.equal(serialized(out.body).includes("boom pg"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out.body, "stack"), false);
  });
});

describe("Director IA dashboard cycle transport — data exposure / observability", () => {
  it("respuesta mínima sin leakage de ARR/JWT/stack", async () => {
    const t = createDirectorIaDashboardCycleTransport({
      realCycle: fakeCycle({
        ...cycleResult("ACQUIRED_OK"),
        arr_cycle: {
          envelopes: [{ status: "ACQUIRED_OK", payload: { metric_or_event: "venta_ton", value: 95 }, raw_payload_reference: "raw://secret" }],
        },
        ies: { status: "VALIDATED", facts: [{ fact_id: "f1" }], evidence: [], diagnoses: [] },
        reasoning_result: { hypotheses: [], recommendations: [] },
      }),
      clock: CLOCK,
    });
    const out = await t.handle({
      planta_id: 9001,
      year: 2026,
      month: 7,
      plant_code: "SYN-NTE",
      jwt: "header.payload.sig",
    });
    const body = serialized(out.body);
    assert.equal(Object.prototype.hasOwnProperty.call(out.body, "arr_cycle"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out.body, "raw_payload_reference"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out.body, "jwt"), false);
    assert.equal(body.includes("raw://secret"), false);
    assert.equal(body.includes("header.payload.sig"), false);
    assert.equal(out.body.trace_id, "trace_fake_1");
    assert.equal(out.body.channel_output.channel, "DASHBOARD");
  });

  it("eventos start/completion contienen trace_id y duración; logger no recibe secretos", async () => {
    const logger = capturingLogger();
    const t = createDirectorIaDashboardCycleTransport({
      realCycle: fakeCycle({
        ...cycleResult("ACQUIRED_OK", { trace_id: "trace_obs_1" }),
        arr_cycle: {
          envelopes: [{ status: "ACQUIRED_OK", payload: { value: 95, desc_kg: 1.2 } }],
        },
      }),
      logger,
      clock: CLOCK,
    });
    await t.handle({
      planta_id: 9001,
      year: 2026,
      month: 7,
      plant_code: "SYN-NTE",
      jwt: "secret.jwt.token",
    });
    const names = logger.events.map((e) => e.event);
    assert.equal(names.includes("cycle_request_started"), true);
    assert.equal(names.includes("cycle_request_completed"), true);
    const started = logger.events.find((e) => e.event === "cycle_request_started");
    const completed = logger.events.find((e) => e.event === "cycle_request_completed");
    assert.equal(Object.prototype.hasOwnProperty.call(started, "trace_id"), true);
    assert.equal(completed.trace_id, "trace_obs_1");
    assert.equal(typeof completed.duration_ms, "number");
    const dump = serialized(logger.events);
    assert.equal(dump.includes("secret.jwt.token"), false);
    assert.equal(dump.includes("desc_kg"), false);
    assert.equal(dump.includes('"value":95'), false);
  });

  it("fallo del logger no altera el outcome", async () => {
    const t = createDirectorIaDashboardCycleTransport({
      realCycle: fakeCycle(cycleResult("ACQUIRED_OK")),
      logger: {
        info() {
          throw new Error("logger down");
        },
      },
      clock: CLOCK,
    });
    const out = await t.handle({ planta_id: 9001, year: 2026, month: 7, plant_code: "SYN-NTE" });
    assert.equal(out.httpStatus, 200);
    assert.equal(out.body.acquisition_status, "ACQUIRED_OK");
  });
});

describe("Director IA dashboard cycle transport — concurrency", () => {
  it("requests paralelos no comparten trace_id ni mutan estado global", async () => {
    const cycle = fakeCycle(async (_input, n) => cycleResult("ACQUIRED_OK", { trace_id: `trace_p_${n}` }));
    const t = createDirectorIaDashboardCycleTransport({ realCycle: cycle, clock: CLOCK });
    const [a, b] = await Promise.all([
      t.handle({ planta_id: 9001, year: 2026, month: 7, plant_code: "SYN-A" }),
      t.handle({ planta_id: 9002, year: 2026, month: 7, plant_code: "SYN-B" }),
    ]);
    assert.equal(cycle.calls.length, 2);
    assert.notEqual(a.body.trace_id, b.body.trace_id);
    assert.equal(cycle.calls[0].planta_id + cycle.calls[1].planta_id, 18003);
  });
});

describe("Director IA dashboard cycle endpoint — authz harness", () => {
  beforeEach(() => {
    resetDirectorIaDashboardCycleForTests();
  });
  afterEach(() => {
    resetDirectorIaDashboardCycleForTests();
  });

  it("JWT ausente/inválido se rechaza antes del ciclo", async () => {
    const cycle = fakeCycle(cycleResult("ACQUIRED_OK"));
    configureDirectorIaDashboardCycle({
      realCycle: cycle,
      isEnabled: () => true,
      assertPlantaAccess,
      blockGAFinancialKpis,
      clock: CLOCK,
    });
    await withServer(mountCycle, async (base) => {
      const missing = await postJson(base, ROUTE_PATH, { body: { planta_id: 9001, year: 2026, month: 7 } });
      assert.equal(missing.status, 401);
      const bad = await postJson(base, ROUTE_PATH, {
        token: "not-a-jwt",
        body: { planta_id: 9001, year: 2026, month: 7 },
      });
      assert.equal(bad.status, 401);
    });
    assert.equal(cycle.calls.length, 0);
  });

  it("planta no autorizada se rechaza antes del ciclo", async () => {
    const cycle = fakeCycle(cycleResult("ACQUIRED_OK"));
    configureDirectorIaDashboardCycle({
      realCycle: cycle,
      isEnabled: () => true,
      assertPlantaAccess,
      blockGAFinancialKpis,
      clock: CLOCK,
    });
    const token = tokenFor({ role: "GV", actor_id: 11, plantas_permitidas: [1] });
    await withServer(mountCycle, async (base) => {
      const out = await postJson(base, ROUTE_PATH, {
        token,
        body: { planta_id: 9001, year: 2026, month: 7 },
      });
      assert.equal(out.status, 403);
      assert.equal(out.json.error, "Sin acceso a esta planta");
      assert.equal(serialized(out.json).includes("arr"), false);
      assert.equal(serialized(out.json).includes("provincia_plants"), false);
    });
    assert.equal(cycle.calls.length, 0);
  });

  it("GA financiero se bloquea antes del ciclo", async () => {
    const cycle = fakeCycle(cycleResult("ACQUIRED_OK"));
    configureDirectorIaDashboardCycle({
      realCycle: cycle,
      isEnabled: () => true,
      assertPlantaAccess,
      blockGAFinancialKpis,
      clock: CLOCK,
    });
    const token = tokenFor({ role: "GA", actor_id: 12, plantas_permitidas: [9001] });
    await withServer(mountCycle, async (base) => {
      const out = await postJson(base, ROUTE_PATH, {
        token,
        body: { planta_id: 9001, year: 2026, month: 7 },
      });
      assert.equal(out.status, 403);
      assert.equal(out.json.error, "GA no tiene acceso a KPIs financieros.");
    });
    assert.equal(cycle.calls.length, 0);
  });

  it("ruta dedicada usa JWT middleware y un solo run; ignora plant_code del cliente", async () => {
    const cycle = fakeCycle(cycleResult("ACQUIRED_OK", { trace_id: "trace_http_1" }));
    configureDirectorIaDashboardCycle({
      realCycle: cycle,
      isEnabled: () => true,
      assertPlantaAccess,
      blockGAFinancialKpis,
      pool: fakePool(),
      resolvePlant: async () => ({ plant_code: "SYN-NTE", plant_label: "Norte ilustrativa" }),
      clock: CLOCK,
    });
    const token = tokenFor({ role: "ZP", actor_id: "user_zp", plantas_permitidas: [] });
    await withServer(mountCycle, async (base) => {
      const out = await postJson(base, ROUTE_PATH, {
        token,
        body: {
          planta_id: 9001,
          year: 2026,
          month: 7,
          plant_code: "EVIL-CODE",
          trace_id: "client_trace",
          query_context_metadata: { intent: "tamper" },
          source: { system: "tamper" },
        },
      });
      assert.equal(out.status, 200);
      assert.equal(out.json.trace_id, "trace_http_1");
      assert.equal(out.json.channel_output.channel, "DASHBOARD");
    });
    assert.equal(cycle.calls.length, 1);
    assert.equal(cycle.calls[0].plant_code, "SYN-NTE");
    assert.notEqual(cycle.calls[0].plant_code, "EVIL-CODE");
    assert.equal(cycle.calls[0].query_context_metadata.intent, SLICE_INTENT);
  });

  it("chat legado permanece distinto y funcional en el harness", async () => {
    const cycle = fakeCycle(cycleResult("ACQUIRED_OK"));
    configureDirectorIaDashboardCycle({
      realCycle: cycle,
      isEnabled: () => true,
      assertPlantaAccess,
      blockGAFinancialKpis,
      clock: CLOCK,
    });
    const token = tokenFor({ role: "ZP", actor_id: 1, plantas_permitidas: [] });
    await withServer(mountCycle, async (base) => {
      const chat = await postJson(base, "/api/director-ia/chat", {
        token,
        body: { planta_id: 9001, question: "hola legado" },
      });
      assert.equal(chat.status, 200);
      assert.equal(chat.json.legacy, true);
      assert.equal(chat.json.question, "hola legado");
    });
    assert.equal(cycle.calls.length, 0);
  });
});

describe("Director IA dashboard cycle — real cycle through transport", () => {
  it("compone el ciclo real una vez y mapea empty/tool/unresolved/scope/ok", async () => {
    const arrCalls = [];
    const arrSource = async (client, year, month, plant_code) => {
      arrCalls.push({ client: Boolean(client), year, month, plant_code });
      if (plant_code === "SYN-ERR") {
        const err = new Error("upstream");
        err.code = "TOOL_ERROR";
        throw err;
      }
      if (plant_code === "SYN-EMPTY") return { venta_ton: null, desc_kg: null };
      return { venta_ton: 95, desc_kg: 1.25 };
    };
    const realCycle = composeDirectorIaDashboardRealCycle({
      arrSource,
      clock: CLOCK,
      idFactory: (() => {
        let n = 0;
        return (prefix) => `${prefix}_${++n}`;
      })(),
    });
    const t = createDirectorIaDashboardCycleTransport({ realCycle, clock: CLOCK });

    const ok = await t.handle({
      planta_id: 9001,
      year: 2026,
      month: 7,
      plant_code: "SYN-NTE",
      client: { kind: "synthetic" },
    });
    assert.equal(ok.httpStatus, 200);
    assert.equal(ok.body.acquisition_status, "ACQUIRED_OK");
    assert.equal(ok.body.reasoning_status, "ABSTAIN");
    assert.equal(ok.body.channel_output.channel, "DASHBOARD");

    const empty = await t.handle({
      planta_id: 9001,
      year: 2026,
      month: 7,
      plant_code: "SYN-EMPTY",
      client: { kind: "synthetic" },
    });
    assert.equal(empty.httpStatus, 200);
    assert.equal(empty.body.acquisition_status, "ACQUIRED_EMPTY");
    assert.equal(empty.body.source_health[0].execution_status, "DATA_NOT_FOUND");
    assert.equal(serialized(empty.body).includes("ABSENCE_CONFIRMED"), false);

    const tool = await t.handle({
      planta_id: 9001,
      year: 2026,
      month: 7,
      plant_code: "SYN-ERR",
      client: { kind: "synthetic" },
    });
    assert.equal(tool.httpStatus, 502);
    assert.equal(tool.body.code, "TOOL_ERROR");

    const unresolved = await t.handle({ planta_id: 9001, year: 2026, month: 7 });
    assert.equal(unresolved.httpStatus, 200);
    assert.equal(unresolved.body.acquisition_status, "ENTITY_UNRESOLVED");

    const scope = await t.handle({ planta_id: 9001, year: 2026, plant_code: "SYN-NTE" });
    assert.equal(scope.httpStatus, 200);
    assert.equal(scope.body.acquisition_status, "QUERY_SCOPE_INCOMPLETE");

    assert.equal(arrCalls.length, 3);
  });
});

describe("Director IA dashboard cycle — server wiring", () => {
  it("server.js registra ruta dedicada, JWT y helpers; chat intacto; solo wiring", () => {
    const serverSrc = fs.readFileSync(SERVER_PATH, "utf8");
    const chatSrc = fs.readFileSync(CHAT_LIB, "utf8");
    assert.equal(serverSrc.includes("/api/director-ia/cycle"), true);
    assert.equal(serverSrc.includes("handlePostDashboardCycle"), true);
    assert.equal(serverSrc.includes("/health-director-ia"), true);
    assert.equal(serverSrc.includes("handleGetDirectorIaReadiness"), true);
    assert.equal(serverSrc.includes("/health-db"), true);
    assert.equal(serverSrc.includes("JSON.stringify(payload)"), true);
    assert.equal(serverSrc.includes("DIRECTOR_IA_CYCLE_TIMEOUT_MS"), true);
    assert.equal(serverSrc.includes("DIRECTOR_IA_ARR_STATEMENT_TIMEOUT_MS"), true);
    assert.equal(serverSrc.includes("dashboardAuthMiddleware"), true);
    assert.equal(serverSrc.includes("assertDashboardPlantaAccessForActionRegister"), true);
    assert.equal(serverSrc.includes("dashboardBlockGAFinancialKpis"), true);
    assert.equal(serverSrc.includes('app.post("/api/director-ia/chat", dashboardAuthMiddleware, directorIaChat.handlePostChat)'), true);
    assert.equal(/iesBuilder\.build|reasoningEngine\.reason|channelProjection\.project/.test(serverSrc), false);
    assert.equal(chatSrc.includes("async function handlePostChat"), true);
    assert.equal(chatSrc.includes("askDirectorIa"), true);
  });
});
