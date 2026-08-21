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
  handleGetDirectorIaReadiness,
  resetDirectorIaDashboardCycleForTests,
  parseDirectorIaTimeoutMs,
  isDirectorIaTimeoutError,
  applyDirectorIaArrStatementTimeout,
  resetDirectorIaArrStatementTimeout,
  ROUTE_PATH,
  READINESS_PATH,
  DEFAULT_CYCLE_TIMEOUT_MS,
  DEFAULT_ARR_STATEMENT_TIMEOUT_MS,
} = require("../lib/director-ia-dashboard-cycle-transport");
const { dashboardAuthMiddleware, createDashboardToken } = require("../lib/dashboard-auth");
const {
  TRANSPORT,
  interpretDirectorIaCycleResponse,
  executeDirectorIaCycleRequest,
  createDirectorIaCycleUiSession,
} = require("../frontend-dashboard/modules/director-ia/lib/cycle-client-core.js");

const TRANSPORT_PATH = path.join(__dirname, "..", "lib", "director-ia-dashboard-cycle-transport.js");
const ARR_PATH = path.join(__dirname, "..", "lib", "director-ia-real-input-arr.js");
const SERVER_PATH = path.join(__dirname, "..", "server.js");
const PANEL_PATH = path.join(
  __dirname,
  "..",
  "frontend-dashboard",
  "modules",
  "director-ia",
  "components",
  "DirectorIaCyclePanel.tsx"
);
const CORE_PATH = path.join(
  __dirname,
  "..",
  "frontend-dashboard",
  "modules",
  "director-ia",
  "lib",
  "cycle-client-core.js"
);
const SMOKE_PATH = path.join(__dirname, "..", "scripts", "smoke-director-ia-operational.js");
const CLOCK = () => "2026-08-21T12:50:19.000Z";

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

function cycleResult(status, extras) {
  const extra = extras || {};
  return {
    trace_id: extra.trace_id || "trace_hard_1",
    arr_cycle: {
      envelopes: [{ status, payload: extra.payload !== undefined ? extra.payload : {} }],
    },
    ies: {
      status: extra.ies_status || "PARTIAL",
      source_health: extra.source_health || [{ execution_status: "DATA_AVAILABLE", tool_id: "get_arr_snapshot" }],
    },
    reasoning_run: { status: extra.reasoning_status || "ABSTAIN" },
    channel_output: { channel: "DASHBOARD", content_blocks: [] },
  };
}

function fakeCycle(resultOrFn) {
  const calls = [];
  return {
    calls,
    async run(input) {
      calls.push(clone({ ...input, client: input && input.client ? { kind: "present" } : undefined }));
      if (typeof resultOrFn === "function") return resultOrFn(input, calls.length);
      return clone(resultOrFn);
    },
  };
}

function trackingClient() {
  const queries = [];
  let released = false;
  return {
    queries,
    get released() {
      return released;
    },
    processID: 4242,
    async query(sql) {
      queries.push(String(sql));
      return { rows: [] };
    },
    release() {
      released = true;
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

function mount(app) {
  app.post(ROUTE_PATH, dashboardAuthMiddleware, handlePostDashboardCycle);
  app.get(READINESS_PATH, handleGetDirectorIaReadiness);
  app.post("/api/director-ia/chat", dashboardAuthMiddleware, (req, res) => {
    res.status(200).json({ ok: true, legacy: true, question: req.body && req.body.question });
  });
}

function snapshotSmokeEnv() {
  return {
    base: process.env.DIRECTOR_IA_SMOKE_BASE_URL,
    token: process.env.DIRECTOR_IA_SMOKE_TOKEN,
    planta: process.env.DIRECTOR_IA_SMOKE_PLANTA_ID,
    year: process.env.DIRECTOR_IA_SMOKE_YEAR,
    month: process.env.DIRECTOR_IA_SMOKE_MONTH,
    timeout: process.env.DIRECTOR_IA_SMOKE_TIMEOUT_MS,
  };
}

function restoreSmokeEnv(prev) {
  if (prev.base === undefined) delete process.env.DIRECTOR_IA_SMOKE_BASE_URL;
  else process.env.DIRECTOR_IA_SMOKE_BASE_URL = prev.base;
  if (prev.token === undefined) delete process.env.DIRECTOR_IA_SMOKE_TOKEN;
  else process.env.DIRECTOR_IA_SMOKE_TOKEN = prev.token;
  if (prev.planta === undefined) delete process.env.DIRECTOR_IA_SMOKE_PLANTA_ID;
  else process.env.DIRECTOR_IA_SMOKE_PLANTA_ID = prev.planta;
  if (prev.year === undefined) delete process.env.DIRECTOR_IA_SMOKE_YEAR;
  else process.env.DIRECTOR_IA_SMOKE_YEAR = prev.year;
  if (prev.month === undefined) delete process.env.DIRECTOR_IA_SMOKE_MONTH;
  else process.env.DIRECTOR_IA_SMOKE_MONTH = prev.month;
  if (prev.timeout === undefined) delete process.env.DIRECTOR_IA_SMOKE_TIMEOUT_MS;
  else process.env.DIRECTOR_IA_SMOKE_TIMEOUT_MS = prev.timeout;
}

function captureSmokeLogs() {
  const logs = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args) => {
    logs.push(args.map(String).join(" "));
  };
  console.error = (...args) => {
    logs.push(args.map(String).join(" "));
  };
  return {
    logs,
    restore() {
      console.log = origLog;
      console.error = origErr;
    },
  };
}

describe("Director IA operational hardening — timeout config", () => {
  it("parseDirectorIaTimeoutMs usa default finito si el valor es inválido", () => {
    assert.equal(parseDirectorIaTimeoutMs(undefined, 60000), 60000);
    assert.equal(parseDirectorIaTimeoutMs("nope", 60000), 60000);
    assert.equal(parseDirectorIaTimeoutMs(-1, 60000), 60000);
    assert.equal(parseDirectorIaTimeoutMs(0, 60000), 60000);
    assert.equal(parseDirectorIaTimeoutMs("45000", 60000), 45000);
    assert.equal(DEFAULT_CYCLE_TIMEOUT_MS > 0, true);
    assert.equal(DEFAULT_ARR_STATEMENT_TIMEOUT_MS > 0, true);
    assert.equal(DEFAULT_ARR_STATEMENT_TIMEOUT_MS < DEFAULT_CYCLE_TIMEOUT_MS, true);
  });

  it("isDirectorIaTimeoutError reconoce 57014 y no el TIMEOUT epistémico legado", () => {
    assert.equal(isDirectorIaTimeoutError({ code: "57014" }), true);
    assert.equal(isDirectorIaTimeoutError({ code: "ARR_TIMEOUT" }), true);
    assert.equal(isDirectorIaTimeoutError({ code: "CYCLE_TIMEOUT" }), true);
    assert.equal(isDirectorIaTimeoutError({ code: "TIMEOUT" }), false);
    assert.equal(isDirectorIaTimeoutError({ code: "TOOL_ERROR" }), false);
  });
});

describe("Director IA operational hardening — ARR/source timeout", () => {
  it("statement timeout 57014 es 504 ARR_TIMEOUT, nunca empty/ausencia, y no fabrica N1-N5", async () => {
    const arrCalls = [];
    const arrSource = async () => {
      arrCalls.push(1);
      const err = new Error("canceling statement due to statement timeout");
      err.code = "57014";
      throw err;
    };
    const realCycle = composeDirectorIaDashboardRealCycle({
      arrSource,
      clock: CLOCK,
      idFactory: (() => {
        let n = 0;
        return (prefix) => `${prefix}_${++n}`;
      })(),
    });
    const t = createDirectorIaDashboardCycleTransport({ realCycle, clock: CLOCK, cycleTimeoutMs: 5000 });
    const out = await t.handle({
      planta_id: 9001,
      year: 2026,
      month: 7,
      plant_code: "SYN-NTE",
      client: { kind: "synthetic" },
    });
    assert.equal(arrCalls.length, 1);
    assert.equal(out.httpStatus, 504);
    assert.equal(out.body.code, "ARR_TIMEOUT");
    assert.equal(out.body.ok, false);
    assert.equal(Object.prototype.hasOwnProperty.call(out.body, "acquisition_status"), false);
    assert.equal(serialized(out.body).includes("ACQUIRED_EMPTY"), false);
    assert.equal(serialized(out.body).includes("DATA_NOT_FOUND"), false);
    assert.equal(serialized(out.body).includes("ABSENCE_CONFIRMED"), false);
    assert.equal(serialized(out.body).includes('"venta_ton":0'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out.body, "channel_output"), false);
  });

  it("throw TIMEOUT legado sigue siendo TOOL_ERROR 502, no 504", async () => {
    const arrSource = async () => {
      const err = new Error("upstream");
      err.code = "TIMEOUT";
      throw err;
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
    const out = await t.handle({
      planta_id: 9001,
      year: 2026,
      month: 7,
      plant_code: "SYN-NTE",
      client: { kind: "synthetic" },
    });
    assert.equal(out.httpStatus, 502);
    assert.equal(out.body.code, "TOOL_ERROR");
  });
});

describe("Director IA operational hardening — cycle deadline", () => {
  it("deadline del ciclo completo devuelve 504 CYCLE_TIMEOUT sin retry", async () => {
    let runs = 0;
    const cycle = {
      async run() {
        runs += 1;
        await new Promise((resolve) => setTimeout(resolve, 400));
        return cycleResult("ACQUIRED_OK");
      },
    };
    const logger = capturingLogger();
    const t = createDirectorIaDashboardCycleTransport({
      realCycle: cycle,
      clock: CLOCK,
      logger,
      cycleTimeoutMs: 40,
    });
    const out = await t.handle({ planta_id: 9001, year: 2026, month: 7, plant_code: "SYN-NTE" });
    assert.equal(out.httpStatus, 504);
    assert.equal(out.body.code, "CYCLE_TIMEOUT");
    assert.equal(runs, 1);
    const failed = logger.events.filter((e) => e.event === "cycle_request_failed");
    assert.equal(failed.length >= 1, true);
    assert.equal(failed[0].http_status, 504);
    assert.equal(typeof failed[0].duration_ms, "number");
  });
});

describe("Director IA operational hardening — cleanup + HTTP harness", () => {
  beforeEach(() => {
    resetDirectorIaDashboardCycleForTests();
  });
  afterEach(() => {
    resetDirectorIaDashboardCycleForTests();
  });

  it("SET statement_timeout se aplica y el cliente se libera tras timeout", async () => {
    const client = trackingClient();
    let runs = 0;
    const cycle = {
      async run() {
        runs += 1;
        await new Promise((resolve) => setTimeout(resolve, 400));
        return cycleResult("ACQUIRED_OK");
      },
    };
    configureDirectorIaDashboardCycle({
      realCycle: cycle,
      isEnabled: () => true,
      assertPlantaAccess: () => true,
      pool: {
        async connect() {
          return client;
        },
      },
      resolvePlant: async () => ({ plant_code: "SYN-NTE", plant_label: "Norte" }),
      clock: CLOCK,
      cycleTimeoutMs: 40,
      arrStatementTimeoutMs: 25,
    });
    const token = tokenFor({ role: "ZP", actor_id: 1, plantas_permitidas: [] });
    await withServer(mount, async (base) => {
      const res = await fetch(`${base}${ROUTE_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ planta_id: 9001, year: 2026, month: 7 }),
      });
      const json = await res.json();
      assert.equal(res.status, 504);
      assert.equal(json.code === "CYCLE_TIMEOUT" || json.code === "ARR_TIMEOUT", true);
    });
    assert.equal(runs, 1);
    assert.equal(client.released, true);
    assert.equal(client.queries.some((q) => q.includes("SET statement_timeout")), true);
    assert.equal(client.queries.some((q) => q.includes("RESET statement_timeout")), true);
  });

  it("apply/reset statement_timeout no usa grid ARR", async () => {
    const client = trackingClient();
    const applied = await applyDirectorIaArrStatementTimeout(client, 15000);
    const reset = await resetDirectorIaArrStatementTimeout(client);
    assert.equal(applied.applied, true);
    assert.equal(applied.timeout_ms, 15000);
    assert.equal(reset.reset, true);
    assert.equal(client.queries.join(" ").includes("venta_toneladas"), false);
    assert.equal(client.queries.join(" ").includes("computePronostico"), false);
  });
});

describe("Director IA operational hardening — logger", () => {
  it("started/completed/failed y sin leakage; throw del logger no cambia el resultado", async () => {
    const logger = capturingLogger();
    const t = createDirectorIaDashboardCycleTransport({
      realCycle: fakeCycle(cycleResult("ACQUIRED_OK", { trace_id: "trace_log_1" })),
      logger,
      clock: CLOCK,
    });
    const out = await t.handle({
      planta_id: 9001,
      year: 2026,
      month: 7,
      plant_code: "SYN-NTE",
      jwt: "secret.jwt.token",
    });
    assert.equal(out.httpStatus, 200);
    const names = logger.events.map((e) => e.event);
    assert.equal(names.includes("cycle_request_started"), true);
    assert.equal(names.includes("cycle_request_completed"), true);
    const completed = logger.events.find((e) => e.event === "cycle_request_completed");
    assert.equal(completed.trace_id, "trace_log_1");
    assert.equal(typeof completed.duration_ms, "number");
    const dump = serialized(logger.events);
    assert.equal(dump.includes("secret.jwt.token"), false);
    assert.equal(dump.includes("raw_payload_reference"), false);
    assert.equal(dump.includes("Bearer "), false);

    const t2 = createDirectorIaDashboardCycleTransport({
      realCycle: fakeCycle(cycleResult("ACQUIRED_OK")),
      logger: {
        info() {
          throw new Error("logger down");
        },
      },
      clock: CLOCK,
    });
    const ok = await t2.handle({ planta_id: 9001, year: 2026, month: 7, plant_code: "SYN-NTE" });
    assert.equal(ok.httpStatus, 200);
    assert.equal(ok.body.acquisition_status, "ACQUIRED_OK");
  });

  it("server.js inyecta logger productivo stdout", () => {
    const src = fs.readFileSync(SERVER_PATH, "utf8");
    assert.equal(src.includes("logger: function directorIaCycleStdoutLogger"), true);
    assert.equal(src.includes("JSON.stringify(payload)"), true);
  });
});

describe("Director IA operational hardening — readiness", () => {
  beforeEach(() => {
    resetDirectorIaDashboardCycleForTests();
  });
  afterEach(() => {
    resetDirectorIaDashboardCycleForTests();
  });

  it("disabled se reporta seguro y no ejecuta ARR/OP/EB/EKS/IES/RE/CP", async () => {
    configureDirectorIaDashboardCycle({
      realCycle: fakeCycle(cycleResult("ACQUIRED_OK")),
      isEnabled: () => false,
      pool: { async connect() { return trackingClient(); } },
    });
    await withServer(mount, async (base) => {
      const res = await fetch(`${base}${READINESS_PATH}`);
      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.enabled, false);
      assert.equal(json.ready, false);
      assert.equal(json.ok, true);
    });
    const src = fs.readFileSync(TRANSPORT_PATH, "utf8");
    const fn = src.slice(src.indexOf("function handleGetDirectorIaReadiness"));
    const body = fn.slice(0, fn.indexOf("async function handlePostDashboardCycle"));
    assert.equal(body.includes("computePronostico"), false);
    assert.equal(body.includes("realCycle.run"), false);
    assert.equal(body.includes("observationPipeline"), false);
    assert.equal(body.includes("append_snapshot"), false);
    assert.equal(body.includes("iesBuilder"), false);
    assert.equal(body.includes("reasoningEngine"), false);
    assert.equal(body.includes("channelProjection"), false);
  });

  it("enabled sin pool/transporte es 503 ready false sin secretos", async () => {
    configureDirectorIaDashboardCycle({
      realCycle: fakeCycle(cycleResult("ACQUIRED_OK")),
      isEnabled: () => true,
    });
    await withServer(mount, async (base) => {
      const res = await fetch(`${base}${READINESS_PATH}`);
      const json = await res.json();
      assert.equal(res.status, 503);
      assert.equal(json.enabled, true);
      assert.equal(json.ready, false);
      assert.equal(serialized(json).includes("DATABASE_URL"), false);
      assert.equal(serialized(json).includes("password"), false);
    });
  });

  it("healthy mínimo cuando flag+pool+transporte existen", async () => {
    configureDirectorIaDashboardCycle({
      realCycle: fakeCycle(cycleResult("ACQUIRED_OK")),
      isEnabled: () => true,
      pool: { async connect() { return trackingClient(); } },
    });
    await withServer(mount, async (base) => {
      const res = await fetch(`${base}${READINESS_PATH}`);
      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.enabled, true);
      assert.equal(json.ready, true);
    });
  });
});

describe("Director IA operational hardening — frontend abort/stale", () => {
  it("AbortController cancela sin retry y sin conclusión de negocio", async () => {
    const ac = new AbortController();
    let n = 0;
    const fetchImpl = async (_url, init) => {
      n += 1;
      assert.equal(Boolean(init.signal), true);
      if (init.signal.aborted) {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }
      await new Promise((_, reject) => {
        init.signal.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
      return { status: 200, async json() { return { ok: true, acquisition_status: "ACQUIRED_OK" }; } };
    };
    const pending = executeDirectorIaCycleRequest({
      token: "t",
      input: { planta_id: 1 },
      fetchImpl,
      timeoutMs: null,
      signal: ac.signal,
    });
    ac.abort();
    const out = await pending;
    assert.equal(n, 1);
    assert.equal(out.outcomeKind, "CLIENT_ABORT");
    assert.equal(out.transportState, TRANSPORT.transport_error);
    assert.equal(out.acquisition_status, null);
    assert.equal(out.code, "CLIENT_ABORT");
  });

  it("timeout de fetch cliente no se interpreta como empty", async () => {
    const fetchImpl = async (_url, init) => {
      await new Promise((_, reject) => {
        init.signal.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
      return { status: 200, async json() { return {}; } };
    };
    const out = await executeDirectorIaCycleRequest({
      token: "t",
      input: { planta_id: 1 },
      fetchImpl,
      timeoutMs: 20,
    });
    assert.equal(out.outcomeKind, "CYCLE_TIMEOUT");
    assert.equal(out.httpStatus, 504);
    assert.equal(out.acquisition_status, null);
  });

  it("504 backend no es empty; 200 empty sigue siendo completed", () => {
    const timed = interpretDirectorIaCycleResponse(504, { ok: false, code: "ARR_TIMEOUT", error: "Tiempo de espera agotado" });
    assert.equal(timed.transportState, TRANSPORT.transport_error);
    assert.equal(timed.outcomeKind, "ARR_TIMEOUT");
    assert.equal(timed.acquisition_status, null);
    const empty = interpretDirectorIaCycleResponse(200, {
      ok: true,
      acquisition_status: "ACQUIRED_EMPTY",
      source_health: [{ execution_status: "DATA_NOT_FOUND" }],
    });
    assert.equal(empty.transportState, TRANSPORT.completed);
    assert.equal(empty.outcomeKind, "ACQUIRED_EMPTY");
  });

  it("invalidate/stale no deja que un resultado viejo pise el estado nuevo", () => {
    const session = createDirectorIaCycleUiSession();
    assert.equal(session.beginRequest(), true);
    const gen1 = session.generation();
    session.invalidate();
    session.finishRequest(
      {
        transportState: TRANSPORT.completed,
        httpStatus: 200,
        outcomeKind: "ACQUIRED_OK",
        headline: "viejo",
        detail: null,
        trace_id: "stale",
        authFailure: false,
        authorizationFailure: false,
        acquisition_status: "ACQUIRED_OK",
        ies_status: null,
        reasoning_status: null,
        knowledge_coverage: null,
        source_health: null,
        code: null,
        channel_output: null,
      },
      gen1
    );
    assert.equal(session.getSnapshot().interpreted, null);
    assert.equal(session.beginRequest(), true);
    const gen2 = session.generation();
    session.finishRequest(
      {
        transportState: TRANSPORT.completed,
        httpStatus: 200,
        outcomeKind: "ACQUIRED_OK",
        headline: "nuevo",
        detail: null,
        trace_id: "fresh",
        authFailure: false,
        authorizationFailure: false,
        acquisition_status: "ACQUIRED_OK",
        ies_status: null,
        reasoning_status: null,
        knowledge_coverage: null,
        source_health: null,
        code: null,
        channel_output: null,
      },
      gen2
    );
    assert.equal(session.getSnapshot().interpreted.trace_id, "fresh");
  });

  it("sesiones independientes no comparten generation/resultado", () => {
    const a = createDirectorIaCycleUiSession();
    const b = createDirectorIaCycleUiSession();
    a.beginRequest();
    b.beginRequest();
    assert.equal(a.generation(), 1);
    assert.equal(b.generation(), 1);
    a.invalidate();
    assert.equal(a.isStale(1), true);
    assert.equal(b.isStale(1), false);
  });

  it("el panel aborta en unmount y el core no contiene retry", () => {
    const panel = fs.readFileSync(PANEL_PATH, "utf8");
    const core = fs.readFileSync(CORE_PATH, "utf8");
    const arr = fs.readFileSync(ARR_PATH, "utf8");
    assert.equal(panel.includes("AbortController"), true);
    assert.equal(panel.includes("invalidate()"), true);
    assert.equal(panel.includes("isStale"), true);
    assert.equal(core.includes("retry"), false);
    assert.equal(arr.includes("ACQUIRED_EMPTY") && arr.includes("ARR_TIMEOUT"), true);
  });
});

describe("Director IA operational hardening — regression guards", () => {
  beforeEach(() => {
    resetDirectorIaDashboardCycleForTests();
  });
  afterEach(() => {
    resetDirectorIaDashboardCycleForTests();
  });

  it("200 empty/unresolved/incomplete y 502 TOOL_ERROR se conservan", async () => {
    const t = createDirectorIaDashboardCycleTransport({
      realCycle: fakeCycle(cycleResult("ACQUIRED_EMPTY")),
      clock: CLOCK,
    });
    const empty = await t.handle({ planta_id: 1, year: 2026, month: 7, plant_code: "X" });
    assert.equal(empty.httpStatus, 200);
    assert.equal(empty.body.acquisition_status, "ACQUIRED_EMPTY");
    const t2 = createDirectorIaDashboardCycleTransport({
      realCycle: fakeCycle(cycleResult("TOOL_ERROR")),
      clock: CLOCK,
    });
    const tool = await t2.handle({ planta_id: 1, year: 2026, month: 7, plant_code: "X" });
    assert.equal(tool.httpStatus, 502);
  });

  it("authz 401/403 siguen antes del ciclo; chat legado intacto", async () => {
    const cycle = fakeCycle(cycleResult("ACQUIRED_OK"));
    configureDirectorIaDashboardCycle({
      realCycle: cycle,
      isEnabled: () => true,
      assertPlantaAccess: () => false,
      blockGAFinancialKpis: () => false,
      clock: CLOCK,
    });
    const token = tokenFor({ role: "GV", actor_id: 9, plantas_permitidas: [1] });
    await withServer(mount, async (base) => {
      const denied = await fetch(`${base}${ROUTE_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ planta_id: 9001, year: 2026, month: 7 }),
      });
      assert.equal(denied.status, 403);
      const zp = tokenFor({ role: "ZP", actor_id: 1, plantas_permitidas: [] });
      const chat = await fetch(`${base}/api/director-ia/chat`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${zp}` },
        body: JSON.stringify({ planta_id: 9001, question: "hola legado" }),
      });
      const chatJson = await chat.json();
      assert.equal(chat.status, 200);
      assert.equal(chatJson.legacy, true);
    });
    assert.equal(cycle.calls.length, 0);
  });
});

describe("Director IA operational hardening — smoke", () => {
  it("el script no usa process.exit y falla si el endpoint no responde; captura trace_id en ciclo", async () => {
    assert.equal(fs.existsSync(SMOKE_PATH), true);
    const src = fs.readFileSync(SMOKE_PATH, "utf8");
    const srcNoComments = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.equal(src.includes("DIRECTOR_IA_SMOKE_TOKEN"), true);
    assert.equal(src.includes("trace_id"), true);
    assert.equal(/\bprocess\.exit\s*\(/.test(srcNoComments), false);
    assert.equal(src.includes("process.exitCode"), true);

    await withServer(
      (app) => {
        app.get(READINESS_PATH, (_req, res) => {
          res.status(200).json({ ok: true, service: "director-ia", enabled: true, ready: true });
        });
        app.post(ROUTE_PATH, (_req, res) => {
          res.status(200).json({
            ok: true,
            enabled: true,
            trace_id: "trace_smoke_1",
            acquisition_status: "ACQUIRED_OK",
          });
        });
      },
      async (base) => {
        const smoke = require(SMOKE_PATH);
        const prev = snapshotSmokeEnv();
        const { logs, restore } = captureSmokeLogs();
        const prevExit = process.exitCode;
        try {
          process.env.DIRECTOR_IA_SMOKE_BASE_URL = base;
          process.env.DIRECTOR_IA_SMOKE_TOKEN = "dummy";
          process.env.DIRECTOR_IA_SMOKE_PLANTA_ID = "9001";
          process.env.DIRECTOR_IA_SMOKE_YEAR = "2026";
          process.env.DIRECTOR_IA_SMOKE_MONTH = "7";
          process.env.DIRECTOR_IA_SMOKE_TIMEOUT_MS = "3000";
          await smoke.main();
          assert.equal(process.exitCode === 0 || process.exitCode == null, true, logs.join("\n"));
          const joined = logs.join("\n");
          assert.equal(joined.includes("trace_smoke_1"), true);
          assert.equal(joined.includes("dummy"), false);

          logs.length = 0;
          process.env.DIRECTOR_IA_SMOKE_BASE_URL = "http://127.0.0.1:1";
          process.env.DIRECTOR_IA_SMOKE_TIMEOUT_MS = "250";
          delete process.env.DIRECTOR_IA_SMOKE_TOKEN;
          delete process.env.DIRECTOR_IA_SMOKE_PLANTA_ID;
          await smoke.main();
          assert.equal(process.exitCode !== 0, true);
        } finally {
          restore();
          restoreSmokeEnv(prev);
          process.exitCode = prevExit;
        }
      }
    );
  });
});

describe("Director IA smoke Windows exit — códigos de salida", () => {
  it("falta DIRECTOR_IA_SMOKE_BASE_URL → nonzero y no llama ciclo", async () => {
    const smoke = require(SMOKE_PATH);
    const prev = snapshotSmokeEnv();
    const { logs, restore } = captureSmokeLogs();
    const prevExit = process.exitCode;
    let cycleHits = 0;
    await withServer(
      (app) => {
        app.post(ROUTE_PATH, (_req, res) => {
          cycleHits += 1;
          res.status(200).json({ ok: true, trace_id: "should_not" });
        });
      },
      async () => {
        delete process.env.DIRECTOR_IA_SMOKE_BASE_URL;
        delete process.env.DIRECTOR_IA_SMOKE_TOKEN;
        delete process.env.DIRECTOR_IA_SMOKE_PLANTA_ID;
        await smoke.main();
        assert.equal(process.exitCode !== 0, true);
        assert.equal(logs.join("\n").includes("falta DIRECTOR_IA_SMOKE_BASE_URL"), true);
        assert.equal(cycleHits, 0);
      }
    ).finally(() => {
      restore();
      restoreSmokeEnv(prev);
      process.exitCode = prevExit;
    });
  });

  it("readiness fallida → nonzero y no POST del ciclo", async () => {
    const smoke = require(SMOKE_PATH);
    const prev = snapshotSmokeEnv();
    const { restore } = captureSmokeLogs();
    const prevExit = process.exitCode;
    let cycleHits = 0;
    await withServer(
      (app) => {
        app.get(READINESS_PATH, (_req, res) => {
          res.status(404).json({ error: "no" });
        });
        app.post(ROUTE_PATH, (_req, res) => {
          cycleHits += 1;
          res.status(200).json({ ok: true, trace_id: "should_not" });
        });
      },
      async (base) => {
        process.env.DIRECTOR_IA_SMOKE_BASE_URL = base;
        delete process.env.DIRECTOR_IA_SMOKE_TOKEN;
        delete process.env.DIRECTOR_IA_SMOKE_PLANTA_ID;
        process.env.DIRECTOR_IA_SMOKE_TIMEOUT_MS = "3000";
        await smoke.main();
        assert.equal(process.exitCode !== 0, true);
        assert.equal(cycleHits, 0);
      }
    ).finally(() => {
      restore();
      restoreSmokeEnv(prev);
      process.exitCode = prevExit;
    });
  });

  it("readiness-only satisfactoria → exit 0 y no bypassa el ciclo autenticado (no POST)", async () => {
    const smoke = require(SMOKE_PATH);
    const prev = snapshotSmokeEnv();
    const { logs, restore } = captureSmokeLogs();
    const prevExit = process.exitCode;
    let cycleHits = 0;
    await withServer(
      (app) => {
        app.get(READINESS_PATH, (_req, res) => {
          res.status(200).json({ ok: true, service: "director-ia", enabled: true, ready: true });
        });
        app.post(ROUTE_PATH, (_req, res) => {
          cycleHits += 1;
          res.status(200).json({ ok: true, trace_id: "should_not" });
        });
      },
      async (base) => {
        process.env.DIRECTOR_IA_SMOKE_BASE_URL = base;
        delete process.env.DIRECTOR_IA_SMOKE_TOKEN;
        delete process.env.DIRECTOR_IA_SMOKE_PLANTA_ID;
        process.env.DIRECTOR_IA_SMOKE_TIMEOUT_MS = "3000";
        await smoke.main();
        assert.equal(process.exitCode === 0 || process.exitCode == null, true, logs.join("\n"));
        assert.equal(logs.join("\n").includes('"enabled":true'), true);
        assert.equal(logs.join("\n").includes('"ready":true'), true);
        assert.equal(logs.join("\n").includes("step\":\"cycle"), false);
        assert.equal(cycleHits, 0);
      }
    ).finally(() => {
      restore();
      restoreSmokeEnv(prev);
      process.exitCode = prevExit;
    });
  });

  it("smoke autenticado satisfactorio POST una vez, captura trace_id y exit 0", async () => {
    const smoke = require(SMOKE_PATH);
    const prev = snapshotSmokeEnv();
    const { logs, restore } = captureSmokeLogs();
    const prevExit = process.exitCode;
    let cycleHits = 0;
    let sawAuth = false;
    await withServer(
      (app) => {
        app.get(READINESS_PATH, (_req, res) => {
          res.status(200).json({ ok: true, service: "director-ia", enabled: true, ready: true });
        });
        app.post(ROUTE_PATH, (req, res) => {
          cycleHits += 1;
          sawAuth = String(req.headers.authorization || "").startsWith("Bearer ");
          res.status(200).json({
            ok: true,
            enabled: true,
            trace_id: "trace_auth_ok",
            acquisition_status: "ACQUIRED_OK",
          });
        });
      },
      async (base) => {
        process.env.DIRECTOR_IA_SMOKE_BASE_URL = base;
        process.env.DIRECTOR_IA_SMOKE_TOKEN = "dummy-token";
        process.env.DIRECTOR_IA_SMOKE_PLANTA_ID = "9001";
        process.env.DIRECTOR_IA_SMOKE_YEAR = "2026";
        process.env.DIRECTOR_IA_SMOKE_MONTH = "7";
        process.env.DIRECTOR_IA_SMOKE_TIMEOUT_MS = "3000";
        await smoke.main();
        assert.equal(process.exitCode === 0 || process.exitCode == null, true, logs.join("\n"));
        assert.equal(cycleHits, 1);
        assert.equal(sawAuth, true);
        assert.equal(logs.join("\n").includes("trace_auth_ok"), true);
        assert.equal(logs.join("\n").includes("dummy-token"), false);
      }
    ).finally(() => {
      restore();
      restoreSmokeEnv(prev);
      process.exitCode = prevExit;
    });
  });

  it("smoke autenticado fallido (401) → nonzero y no se omite el POST", async () => {
    const smoke = require(SMOKE_PATH);
    const prev = snapshotSmokeEnv();
    const { restore } = captureSmokeLogs();
    const prevExit = process.exitCode;
    let cycleHits = 0;
    await withServer(
      (app) => {
        app.get(READINESS_PATH, (_req, res) => {
          res.status(200).json({ ok: true, service: "director-ia", enabled: true, ready: true });
        });
        app.post(ROUTE_PATH, (_req, res) => {
          cycleHits += 1;
          res.status(401).json({ error: "Token inválido o expirado" });
        });
      },
      async (base) => {
        process.env.DIRECTOR_IA_SMOKE_BASE_URL = base;
        process.env.DIRECTOR_IA_SMOKE_TOKEN = "dummy-token";
        process.env.DIRECTOR_IA_SMOKE_PLANTA_ID = "9001";
        process.env.DIRECTOR_IA_SMOKE_TIMEOUT_MS = "3000";
        await smoke.main();
        assert.equal(process.exitCode !== 0, true);
        assert.equal(cycleHits, 1);
      }
    ).finally(() => {
      restore();
      restoreSmokeEnv(prev);
      process.exitCode = prevExit;
    });
  });
});
