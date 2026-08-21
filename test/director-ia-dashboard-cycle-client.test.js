"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  CYCLE_PATH,
  CHAT_PATH,
  TRANSPORT,
  EMPTY_FORBIDDEN_PHRASES,
  buildDirectorIaCycleRequestBody,
  interpretDirectorIaCycleResponse,
  executeDirectorIaCycleRequest,
  createDirectorIaCycleUiSession,
  outcomeHeadline,
} = require("../frontend-dashboard/modules/director-ia/lib/cycle-client-core.js");

const CORE_PATH = path.join(
  __dirname,
  "..",
  "frontend-dashboard",
  "modules",
  "director-ia",
  "lib",
  "cycle-client-core.js"
);
const API_PATH = path.join(
  __dirname,
  "..",
  "frontend-dashboard",
  "modules",
  "director-ia",
  "lib",
  "api.ts"
);
const PANEL_PATH = path.join(
  __dirname,
  "..",
  "frontend-dashboard",
  "modules",
  "director-ia",
  "components",
  "DirectorIaCyclePanel.tsx"
);
const SHELL_PATH = path.join(
  __dirname,
  "..",
  "frontend-dashboard",
  "modules",
  "director-ia",
  "components",
  "DirectorIaShell.tsx"
);
const CHAT_PANEL = path.join(
  __dirname,
  "..",
  "frontend-dashboard",
  "modules",
  "director-ia",
  "components",
  "DirectorIaChatPanel.tsx"
);
const CHAT_LIB = path.join(__dirname, "..", "lib", "director-ia-chat.js");
const TRANSPORT_LIB = path.join(__dirname, "..", "lib", "director-ia-dashboard-cycle-transport.js");

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function dashboardOutput(statement) {
  return {
    channel: "DASHBOARD",
    content_blocks: [
      {
        sequence: 0,
        block_kind: "panel",
        semantic_type: "FACT",
        content_class: "OBLIGATORIO_RESUMIBLE",
        statement_or_reference: statement,
      },
    ],
  };
}

function cycleBody(overrides) {
  return {
    ok: true,
    enabled: true,
    trace_id: "trace_ui_1",
    acquisition_status: "ACQUIRED_OK",
    ies_status: "VALIDATED",
    reasoning_status: "ABSTAIN",
    channel_output: dashboardOutput("ilustrativo CP"),
    ...overrides,
  };
}

describe("Director IA dashboard cycle client — request integrity", () => {
  it("construye POST body solo con planta_id y year/month opcionales", () => {
    const body = buildDirectorIaCycleRequestBody({
      planta_id: 9001,
      year: 2026,
      month: 7,
      plant_code: "EVIL-CODE",
      trace_id: "client_trace",
      query_context_metadata: { intent: "tamper" },
      source: { system: "tamper" },
      raw_payload_reference: "raw://secret",
      ies: { status: "VALIDATED" },
      reasoning_result: { hypotheses: [] },
    });
    assert.deepEqual(body, { planta_id: 9001, year: 2026, month: 7 });
    assert.equal(Object.prototype.hasOwnProperty.call(body, "plant_code"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(body, "trace_id"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(body, "query_context_metadata"), false);
  });

  it("omite year/month si no aplican", () => {
    const body = buildDirectorIaCycleRequestBody({ planta_id: "12" });
    assert.deepEqual(body, { planta_id: 12 });
  });

  it("execute usa POST /api/director-ia/cycle con JWT existente y una sola llamada", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init: clone({ ...init, body: init.body }) });
      return {
        status: 200,
        async json() {
          return cycleBody();
        },
      };
    };
    const out = await executeDirectorIaCycleRequest({
      token: "jwt-ilustrativo",
      input: { planta_id: 9001, year: 2026, month: 7, plant_code: "NOPE" },
      fetchImpl,
      apiUrl: CYCLE_PATH,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/director-ia/cycle");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, "Bearer jwt-ilustrativo");
    const sent = JSON.parse(calls[0].init.body);
    assert.deepEqual(sent, { planta_id: 9001, year: 2026, month: 7 });
    assert.equal(out.transportState, TRANSPORT.completed);
    assert.equal(out.trace_id, "trace_ui_1");
    assert.equal(out.channel_output.channel, "DASHBOARD");
  });

  it("no llama chat ni reintenta en 502", async () => {
    let n = 0;
    const fetchImpl = async (url) => {
      n += 1;
      assert.equal(url.includes(CHAT_PATH), false);
      return {
        status: 502,
        async json() {
          return cycleBody({
            ok: false,
            code: "TOOL_ERROR",
            acquisition_status: "TOOL_ERROR",
            ies_status: "PARTIAL",
          });
        },
      };
    };
    const out = await executeDirectorIaCycleRequest({
      token: "t",
      input: { planta_id: 1 },
      fetchImpl,
    });
    assert.equal(n, 1);
    assert.equal(out.transportState, TRANSPORT.transport_error);
    assert.equal(out.outcomeKind, "TOOL_ERROR");
    assert.equal(out.httpStatus, 502);
  });
});

describe("Director IA dashboard cycle client — mapping UI vs interno", () => {
  it("happy path 200 completed renderizable con CP y trace", () => {
    const out = interpretDirectorIaCycleResponse(200, cycleBody());
    assert.equal(out.transportState, TRANSPORT.completed);
    assert.equal(out.httpStatus, 200);
    assert.equal(out.acquisition_status, "ACQUIRED_OK");
    assert.equal(out.reasoning_status, "ABSTAIN");
    assert.equal(out.channel_output.content_blocks[0].statement_or_reference, "ilustrativo CP");
    assert.equal(out.trace_id, "trace_ui_1");
    assert.equal(out.transportState === TRANSPORT.transport_error, false);
  });

  it("ACQUIRED_EMPTY es completed neutral, no cero ni ausencia", () => {
    const out = interpretDirectorIaCycleResponse(
      200,
      cycleBody({
        acquisition_status: "ACQUIRED_EMPTY",
        ies_status: "PARTIAL",
        source_health: [{ execution_status: "DATA_NOT_FOUND", tool_id: "get_arr_snapshot" }],
        knowledge_coverage: { partial_domains: ["arr"] },
        channel_output: dashboardOutput("cobertura parcial ilustrativa"),
      })
    );
    assert.equal(out.transportState, TRANSPORT.completed);
    assert.equal(out.outcomeKind, "ACQUIRED_EMPTY");
    const dump = JSON.stringify(out) + outcomeHeadline("ACQUIRED_EMPTY") + (out.detail || "");
    for (const phrase of EMPTY_FORBIDDEN_PHRASES) {
      assert.equal(dump.includes(phrase), false, phrase);
    }
    assert.equal(out.headline.includes("0"), false);
  });

  it("ENTITY_UNRESOLVED es completed, no 404 conceptual", () => {
    const out = interpretDirectorIaCycleResponse(
      200,
      cycleBody({
        acquisition_status: "ENTITY_UNRESOLVED",
        ies_status: "PARTIAL",
        knowledge_coverage: { unresolved_entities: ["arr", "9001"] },
      })
    );
    assert.equal(out.transportState, TRANSPORT.completed);
    assert.equal(out.httpStatus, 200);
    assert.equal(out.outcomeKind, "ENTITY_UNRESOLVED");
    assert.notEqual(out.httpStatus, 404);
    assert.equal((out.detail || "").toLowerCase().includes("no se resolv"), true);
  });

  it("QUERY_SCOPE_INCOMPLETE es completed parcial", () => {
    const out = interpretDirectorIaCycleResponse(
      200,
      cycleBody({
        acquisition_status: "QUERY_SCOPE_INCOMPLETE",
        ies_status: "PARTIAL",
        knowledge_coverage: { incomplete_scopes: ["arr"] },
      })
    );
    assert.equal(out.transportState, TRANSPORT.completed);
    assert.equal(out.outcomeKind, "QUERY_SCOPE_INCOMPLETE");
  });

  it("ABSTAIN/NO_KNOWLEDGE es completed válido, no error de transporte", () => {
    const abstain = interpretDirectorIaCycleResponse(200, cycleBody({ reasoning_status: "ABSTAIN" }));
    assert.equal(abstain.transportState, TRANSPORT.completed);
    assert.equal(abstain.outcomeKind, "ABSTAIN");
    const noKnow = interpretDirectorIaCycleResponse(
      200,
      cycleBody({ ies_status: "NO_KNOWLEDGE", acquisition_status: null, reasoning_status: "ABSTAIN" })
    );
    assert.equal(noKnow.transportState, TRANSPORT.completed);
    assert.notEqual(noKnow.transportState, TRANSPORT.transport_error);
  });

  it("400/401/403/502/500 se mapean a transport_error sin internals", () => {
    const invalid = interpretDirectorIaCycleResponse(400, {
      ok: false,
      code: "INVALID_INPUT",
      error: "planta_id requerido",
    });
    assert.equal(invalid.transportState, TRANSPORT.transport_error);
    assert.equal(invalid.outcomeKind, "INVALID_INPUT");
    assert.equal(invalid.detail, "planta_id requerido");

    const unauth = interpretDirectorIaCycleResponse(401, { error: "Token inválido o expirado" });
    assert.equal(unauth.authFailure, true);
    assert.equal(unauth.transportState, TRANSPORT.transport_error);

    const forbidden = interpretDirectorIaCycleResponse(403, { error: "Sin acceso a esta planta" });
    assert.equal(forbidden.authorizationFailure, true);
    assert.equal(forbidden.detail, "Sin acceso a esta planta");

    const tool = interpretDirectorIaCycleResponse(502, {
      ok: false,
      code: "TOOL_ERROR",
      acquisition_status: "TOOL_ERROR",
      arr_cycle: { envelopes: [{ payload: { value: 95 } }] },
      stack: "Error: boom",
    });
    assert.equal(tool.outcomeKind, "TOOL_ERROR");
    assert.equal(Object.prototype.hasOwnProperty.call(tool, "arr_cycle"), false);
    assert.equal(JSON.stringify(tool).includes("boom"), false);
    assert.equal(JSON.stringify(tool).includes('"value":95'), false);

    const intern = interpretDirectorIaCycleResponse(500, {
      ok: false,
      error: "Error interno",
      trace_id: "trace_safe",
    });
    assert.equal(intern.outcomeKind, "INTERNAL_ERROR");
    assert.equal(intern.trace_id, "trace_safe");
    assert.equal(intern.detail.includes("Error interno"), true);
  });

  it("no filtra JWT, raw ARR ni IES/RE completos al resultado UI", () => {
    const out = interpretDirectorIaCycleResponse(200, {
      ...cycleBody(),
      jwt: "header.payload.sig",
      arr_cycle: { envelopes: [{ payload: { metric_or_event: "venta_ton", value: 95 } }] },
      raw_payload_reference: "raw://secret",
      ies: { facts: [{ fact_id: "f1" }], evidence: [], diagnoses: [] },
      reasoning_result: { hypotheses: [{ hypothesis_id: "h1" }] },
    });
    const dump = JSON.stringify(out);
    assert.equal(dump.includes("header.payload.sig"), false);
    assert.equal(dump.includes("raw://secret"), false);
    assert.equal(dump.includes("fact_id"), false);
    assert.equal(dump.includes("hypothesis_id"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out, "arr_cycle"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out, "ies"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out, "reasoning_result"), false);
  });
});

describe("Director IA dashboard cycle client — concurrencia y UI session", () => {
  it("double-submit: beginRequest bloquea mientras inFlight", () => {
    const s = createDirectorIaCycleUiSession();
    assert.equal(s.beginRequest(), true);
    assert.equal(s.getSnapshot().transportState, TRANSPORT.loading);
    assert.equal(s.beginRequest(), false);
    s.finishRequest(interpretDirectorIaCycleResponse(200, cycleBody({ trace_id: "t1" })));
    assert.equal(s.getSnapshot().inFlight, false);
    assert.equal(s.beginRequest(), true);
  });

  it("dos sesiones independientes no comparten result/trace", () => {
    const a = createDirectorIaCycleUiSession();
    const b = createDirectorIaCycleUiSession();
    a.beginRequest();
    b.beginRequest();
    a.finishRequest(interpretDirectorIaCycleResponse(200, cycleBody({ trace_id: "trace_a" })));
    b.finishRequest(interpretDirectorIaCycleResponse(200, cycleBody({ trace_id: "trace_b" })));
    assert.equal(a.getSnapshot().interpreted.trace_id, "trace_a");
    assert.equal(b.getSnapshot().interpreted.trace_id, "trace_b");
    assert.notEqual(a.getSnapshot().interpreted, b.getSnapshot().interpreted);
  });
});

describe("Director IA dashboard cycle client — source guards", () => {
  it("el helper y el panel no usan chat ni persistencia ni plant_code", () => {
    const core = fs.readFileSync(CORE_PATH, "utf8");
    const api = fs.readFileSync(API_PATH, "utf8");
    const panel = fs.readFileSync(PANEL_PATH, "utf8");
    const shell = fs.readFileSync(SHELL_PATH, "utf8");
    assert.equal(core.includes(CYCLE_PATH), true);
    assert.equal(api.includes("fetchDirectorIaCycle"), true);
    assert.equal(api.includes("/api/director-ia/cycle"), true);
    assert.equal(panel.includes("fetchDirectorIaCycle"), true);
    assert.equal(panel.includes("DirectorIaChatPanel"), false);
    assert.equal(panel.includes("/api/director-ia/chat"), false);
    assert.equal(panel.includes("localStorage"), false);
    assert.equal(panel.includes("sessionStorage"), false);
    assert.equal(panel.includes("plant_code"), false);
    assert.equal(panel.includes("query_context_metadata"), false);
    assert.equal(/console\.(log|debug|info)\(/.test(panel), false);
    assert.equal(shell.includes("DirectorIaCyclePanel"), true);
    assert.equal(core.includes("retry"), false);
    assert.equal(panel.includes("<input") && panel.includes("trace"), false);
  });

  it("chat legado permanece intacto y el transporte backend no se modifica en este slice", () => {
    const chatPanel = fs.readFileSync(CHAT_PANEL, "utf8");
    const chatLib = fs.readFileSync(CHAT_LIB, "utf8");
    const api = fs.readFileSync(API_PATH, "utf8");
    assert.equal(chatPanel.includes("fetchDirectorIaChat"), true);
    assert.equal(chatLib.includes("async function handlePostChat"), true);
    assert.equal(api.includes("fetchDirectorIaChat"), true);
    assert.equal(api.includes("/api/director-ia/chat"), true);
    const transport = fs.readFileSync(TRANSPORT_LIB, "utf8");
    assert.equal(transport.includes("createDirectorIaDashboardCycleTransport"), true);
  });

  it("401 reutiliza el flujo unauthorized del shell existente", () => {
    const shell = fs.readFileSync(SHELL_PATH, "utf8");
    const panel = fs.readFileSync(PANEL_PATH, "utf8");
    assert.equal(panel.includes("onUnauthorized"), true);
    assert.equal(panel.includes("result.authFailure"), true);
    assert.equal(shell.includes("onUnauthorized={() => setUnauthorized(true)}"), true);
    assert.equal(shell.includes("Token inválido") || shell.includes("unauthorized"), true);
  });
});
