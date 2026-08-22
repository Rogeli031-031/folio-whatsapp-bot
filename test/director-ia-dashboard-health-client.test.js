"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const healthCore = require("../frontend-dashboard/modules/director-ia/lib/health-client-core.js");

const {
  HEALTH_PATH,
  HEALTH_UI,
  HEALTH_COPY,
  directorIaHealthApiUrl,
  interpretDirectorIaHealthResponse,
  fetchDirectorIaHealth,
} = healthCore;

const API_PATH = path.join(
  __dirname,
  "..",
  "frontend-dashboard",
  "modules",
  "director-ia",
  "lib",
  "api.ts"
);
const CORE_PATH = path.join(
  __dirname,
  "..",
  "frontend-dashboard",
  "modules",
  "director-ia",
  "lib",
  "health-client-core.js"
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
const PANEL_PATH = path.join(
  __dirname,
  "..",
  "frontend-dashboard",
  "modules",
  "director-ia",
  "components",
  "DirectorIaCyclePanel.tsx"
);
const CYCLE_CORE_PATH = path.join(
  __dirname,
  "..",
  "frontend-dashboard",
  "modules",
  "director-ia",
  "lib",
  "cycle-client-core.js"
);
const SERVER_PATH = path.join(__dirname, "..", "server.js");
const TRANSPORT_PATH = path.join(__dirname, "..", "lib", "director-ia-dashboard-cycle-transport.js");

const FORBIDDEN_COPY = ["Todo está bien", "Datos disponibles", "Operación saludable"];

function jsonResponse(status, body) {
  return {
    status,
    async json() {
      return body;
    },
  };
}

describe("Director IA M1 health — HTTP mapping", () => {
  it("HTTP 200 enabled=true ready=true => ready", async () => {
    const result = await fetchDirectorIaHealth(async () =>
      jsonResponse(200, { ok: true, service: "director-ia", enabled: true, ready: true })
    );
    assert.equal(result.state, HEALTH_UI.ready);
    assert.equal(result.copy, HEALTH_COPY.ready);
  });

  it("HTTP 200 enabled=false => disabled", async () => {
    const result = await fetchDirectorIaHealth(async () =>
      jsonResponse(200, { ok: true, service: "director-ia", enabled: false, ready: false })
    );
    assert.equal(result.state, HEALTH_UI.disabled);
    assert.equal(result.copy, HEALTH_COPY.disabled);
  });

  it("HTTP 503 enabled=true ready=false => unavailable", async () => {
    const result = await fetchDirectorIaHealth(async () =>
      jsonResponse(503, { ok: false, service: "director-ia", enabled: true, ready: false })
    );
    assert.equal(result.state, HEALTH_UI.unavailable);
    assert.equal(result.copy, HEALTH_COPY.unavailable);
    assert.equal(interpretDirectorIaHealthResponse(503, { enabled: true, ready: false }).state, "unavailable");
  });

  it("network error => transport_error", async () => {
    const result = await fetchDirectorIaHealth(async () => {
      throw new Error("network down");
    });
    assert.equal(result.state, HEALTH_UI.transport_error);
    assert.equal(result.copy, HEALTH_COPY.transport_error);
  });

  it("HTTP 500 / status inesperado / body inválido => transport_error", async () => {
    const five = await fetchDirectorIaHealth(async () => jsonResponse(500, { ok: false }));
    assert.equal(five.state, HEALTH_UI.transport_error);
    const unexpected = await fetchDirectorIaHealth(async () => jsonResponse(404, { enabled: true, ready: true }));
    assert.equal(unexpected.state, HEALTH_UI.transport_error);
    const invalid = await fetchDirectorIaHealth(async () => ({
      status: 200,
      async json() {
        throw new Error("not json");
      },
    }));
    assert.equal(invalid.state, HEALTH_UI.transport_error);
  });

  it("no retry automático: un fetchImpl se invoca una sola vez", async () => {
    let n = 0;
    await fetchDirectorIaHealth(async () => {
      n += 1;
      throw new Error("fail once");
    });
    assert.equal(n, 1);
  });
});

describe("Director IA M1 health — URL y Authorization", () => {
  it("URL usa la misma resolución que el ciclo y el path /health-director-ia", () => {
    const prev = process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    assert.equal(directorIaHealthApiUrl(), `/api-backend${HEALTH_PATH}`);
    assert.equal(HEALTH_PATH, "/health-director-ia");
    process.env.NEXT_PUBLIC_API_URL = "https://example.test/";
    assert.equal(directorIaHealthApiUrl(), "https://example.test/health-director-ia");
    if (prev === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = prev;
  });

  it("GET no envía Authorization", async () => {
    let init;
    await fetchDirectorIaHealth(async (url, options) => {
      assert.match(String(url), /health-director-ia/);
      init = options || {};
      return jsonResponse(200, { enabled: true, ready: true });
    });
    const headers = init.headers || {};
    const serialized = JSON.stringify(init);
    assert.equal(init.method, "GET");
    assert.equal(Object.prototype.hasOwnProperty.call(headers, "Authorization"), false);
    assert.equal(/Authorization/i.test(serialized), false);
  });
});

describe("Director IA M1 health — shell, loading, refresh, aislamiento", () => {
  const api = fs.readFileSync(API_PATH, "utf8");
  const core = fs.readFileSync(CORE_PATH, "utf8");
  const shell = fs.readFileSync(SHELL_PATH, "utf8");
  const panel = fs.readFileSync(PANEL_PATH, "utf8");
  const cycleCore = fs.readFileSync(CYCLE_CORE_PATH, "utf8");

  it("loading es el estado inicial y el copy está en el shell", () => {
    assert.match(shell, /useState<DirectorIaHealthUiState>\("loading"\)/);
    assert.match(shell, /setHealthState\("loading"\)/);
    assert.equal(HEALTH_COPY.loading, "Comprobando disponibilidad técnica…");
    assert.match(shell, /HEALTH_COPY\[healthState\]/);
  });

  it("un GET automático al montar cuando hay token; segundo GET solo por refresh manual", () => {
    assert.match(shell, /void consultarHealth\(\)/);
    assert.match(shell, /useEffect\(\(\) => \{[\s\S]*if \(!token\) return;[\s\S]*void consultarHealth\(\);/);
    assert.match(shell, /onClick=\{\(\) => void consultarHealth\(\)\}/);
    assert.equal(shell.includes("setInterval"), false);
    assert.equal(/setInterval|polling|retry/i.test(core), false);
    assert.equal(/setInterval/.test(shell), false);
  });

  it("health no interfiere con cycle panel", () => {
    assert.match(shell, /<DirectorIaCyclePanel/);
    assert.equal(/DirectorIaCyclePanel[\s\S]{0,200}healthState/.test(shell), false);
    assert.equal(shell.includes("disabled={health"), false);
    assert.equal(panel.includes("fetchDirectorIaHealth"), false);
    assert.equal(panel.includes("HEALTH_COPY"), false);
    assert.equal(cycleCore.includes("health-director-ia"), false);
  });

  it("separación semántica: copy health no usa ciclo ni frases prohibidas", () => {
    const copies = Object.values(HEALTH_COPY).join("\n");
    assert.equal(copies.includes("ACQUIRED_OK"), false);
    assert.equal(copies.includes("ACQUIRED_EMPTY"), false);
    assert.equal(copies.includes("TOOL_ERROR"), false);
    assert.equal(copies.includes("ABSTAIN"), false);
    for (const phrase of FORBIDDEN_COPY) {
      assert.equal(copies.includes(phrase), false, phrase);
      assert.equal(shell.includes(phrase), false, phrase);
    }
    assert.equal(HEALTH_COPY.ready, "Servicio Director IA: listo (técnico)");
    assert.equal(HEALTH_COPY.disabled, "Director IA deshabilitado en el servidor");
    assert.equal(HEALTH_COPY.unavailable, "Servicio Director IA no disponible (técnico)");
    assert.equal(HEALTH_COPY.transport_error, "No se pudo consultar la disponibilidad técnica");
  });

  it("api.ts expone fetchDirectorIaHealth y no usa apiFetch para health", () => {
    assert.match(api, /export function fetchDirectorIaHealth/);
    const healthSlice = api.slice(api.indexOf("fetchDirectorIaHealth"));
    const fn = healthSlice.slice(0, healthSlice.indexOf("export type DirectorIaMejoraContinuaEstatus"));
    assert.equal(fn.includes("apiFetch"), false);
    assert.match(api, /from "\.\/health-client-core"/);
  });

  it("este slice no modifica backend ni cycle-client-core", () => {
    const server = fs.readFileSync(SERVER_PATH, "utf8");
    const transport = fs.readFileSync(TRANSPORT_PATH, "utf8");
    assert.match(server, /app\.get\("\/health-director-ia"/);
    assert.match(transport, /function handleGetDirectorIaReadiness/);
    assert.equal(cycleCore.includes("HEALTH_PATH"), false);
  });
});
