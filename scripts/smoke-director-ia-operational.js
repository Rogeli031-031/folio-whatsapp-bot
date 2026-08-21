#!/usr/bin/env node
/**
 * Smoke post-deploy de Director IA (operacional).
 *
 * No guarda credenciales. No imprime el token.
 *
 * Obligatorio:
 *   DIRECTOR_IA_SMOKE_BASE_URL  (ej. https://folio-bot.onrender.com)
 *
 * Opcional (ciclo autenticado; captura trace_id):
 *   DIRECTOR_IA_SMOKE_TOKEN
 *   DIRECTOR_IA_SMOKE_PLANTA_ID
 *   DIRECTOR_IA_SMOKE_YEAR
 *   DIRECTOR_IA_SMOKE_MONTH
 *
 * Exit 0: readiness alcanzable y, si se pidió ciclo, respuesta con finito HTTP.
 * Exit 1: indisponibilidad, timeout de smoke, o ciclo sin terminar.
 *
 * No llama process.exit: en Windows eso puede abortar con UV_HANDLE_CLOSING
 * mientras fetch/undici cierra handles. Fallo = process.exitCode = 1 + return.
 */
"use strict";

function readConfig() {
  const timeoutRaw = parseInt(process.env.DIRECTOR_IA_SMOKE_TIMEOUT_MS || "20000", 10);
  return {
    base: String(process.env.DIRECTOR_IA_SMOKE_BASE_URL || "").replace(/\/$/, ""),
    token: process.env.DIRECTOR_IA_SMOKE_TOKEN ? String(process.env.DIRECTOR_IA_SMOKE_TOKEN) : "",
    plantaId: process.env.DIRECTOR_IA_SMOKE_PLANTA_ID
      ? parseInt(String(process.env.DIRECTOR_IA_SMOKE_PLANTA_ID), 10)
      : null,
    year: process.env.DIRECTOR_IA_SMOKE_YEAR
      ? parseInt(String(process.env.DIRECTOR_IA_SMOKE_YEAR), 10)
      : null,
    month: process.env.DIRECTOR_IA_SMOKE_MONTH
      ? parseInt(String(process.env.DIRECTOR_IA_SMOKE_MONTH), 10)
      : null,
    timeoutMs: Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 20000,
  };
}

function fail(message, extra) {
  if (extra !== undefined) console.error(message, extra);
  else console.error(message);
  process.exitCode = 1;
}

async function fetchJson(url, init, timeoutMs) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ac.signal });
    let json = null;
    try {
      json = await res.json();
    } catch (_err) {
      json = null;
    }
    return { status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  process.exitCode = 0;
  const cfg = readConfig();
  if (!cfg.base) {
    fail("smoke: falta DIRECTOR_IA_SMOKE_BASE_URL");
    return;
  }

  let readiness;
  try {
    readiness = await fetchJson(`${cfg.base}/health-director-ia`, {}, cfg.timeoutMs);
  } catch (_err) {
    fail("smoke: readiness inalcanzable");
    return;
  }

  if (!readiness || (readiness.status !== 200 && readiness.status !== 503)) {
    fail("smoke: readiness HTTP inesperado", readiness && readiness.status);
    return;
  }

  const body = readiness.json && typeof readiness.json === "object" ? readiness.json : {};
  console.log(
    JSON.stringify({
      step: "readiness",
      status: readiness.status,
      enabled: body.enabled,
      ready: body.ready,
    })
  );

  if (body.enabled === true && body.ready === false) {
    fail("smoke: Director IA enabled pero no ready");
    return;
  }

  if (!cfg.token || !Number.isFinite(cfg.plantaId) || cfg.plantaId <= 0) {
    if (readiness.status === 200) return;
    fail("smoke: readiness no satisfactoria");
    return;
  }

  const cycleBody = { planta_id: cfg.plantaId };
  if (Number.isFinite(cfg.year) && cfg.year > 0) cycleBody.year = cfg.year;
  if (Number.isFinite(cfg.month) && cfg.month >= 1 && cfg.month <= 12) cycleBody.month = cfg.month;

  let cycle;
  try {
    cycle = await fetchJson(
      `${cfg.base}/api/director-ia/cycle`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + cfg.token,
        },
        body: JSON.stringify(cycleBody),
      },
      cfg.timeoutMs
    );
  } catch (_err) {
    fail("smoke: ciclo inalcanzable o abortado");
    return;
  }

  const cycleJson = cycle.json && typeof cycle.json === "object" ? cycle.json : {};
  const traceId = typeof cycleJson.trace_id === "string" ? cycleJson.trace_id : null;
  console.log(
    JSON.stringify({
      step: "cycle",
      status: cycle.status,
      code: cycleJson.code || null,
      acquisition_status: cycleJson.acquisition_status || null,
      trace_id: traceId,
    })
  );

  if (cycle.status === 401 || cycle.status === 403) {
    fail("smoke: auth/authz rechazó el ciclo");
    return;
  }
  if (!(cycle.status >= 200 && cycle.status < 600)) {
    fail("smoke: ciclo sin HTTP finito");
    return;
  }
}

if (require.main === module) {
  main().catch(() => {
    fail("smoke: fallo inesperado");
  });
}

module.exports = { main };
