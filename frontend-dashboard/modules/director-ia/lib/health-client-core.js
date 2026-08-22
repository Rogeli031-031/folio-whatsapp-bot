/**
 * Cliente dashboard de readiness técnica Director IA (M1).
 * No es ciclo, chat, OP/EB/EKS/IES/RE/CP. No reintenta. No envía Authorization.
 */
"use strict";

const HEALTH_PATH = "/health-director-ia";

const HEALTH_UI = Object.freeze({
  loading: "loading",
  ready: "ready",
  disabled: "disabled",
  unavailable: "unavailable",
  transport_error: "transport_error",
});

const HEALTH_COPY = Object.freeze({
  loading: "Comprobando disponibilidad técnica…",
  ready: "Servicio Director IA: listo (técnico)",
  disabled: "Director IA deshabilitado en el servidor",
  unavailable: "Servicio Director IA no disponible (técnico)",
  transport_error: "No se pudo consultar la disponibilidad técnica",
});

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function directorIaHealthApiUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  if (base) return `${base.replace(/\/$/, "")}${HEALTH_PATH}`;
  return `/api-backend${HEALTH_PATH}`;
}

function transportErrorResult() {
  return {
    state: HEALTH_UI.transport_error,
    copy: HEALTH_COPY.transport_error,
    enabled: null,
    ready: null,
    httpStatus: null,
  };
}

function interpretDirectorIaHealthResponse(status, body) {
  if (status === 200 && isPlainObject(body)) {
    if (body.enabled === false) {
      return {
        state: HEALTH_UI.disabled,
        copy: HEALTH_COPY.disabled,
        enabled: false,
        ready: body.ready === true,
        httpStatus: 200,
      };
    }
    if (body.enabled === true && body.ready === true) {
      return {
        state: HEALTH_UI.ready,
        copy: HEALTH_COPY.ready,
        enabled: true,
        ready: true,
        httpStatus: 200,
      };
    }
  }
  if (status === 503 && isPlainObject(body) && body.enabled === true && body.ready === false) {
    return {
      state: HEALTH_UI.unavailable,
      copy: HEALTH_COPY.unavailable,
      enabled: true,
      ready: false,
      httpStatus: 503,
    };
  }
  return {
    state: HEALTH_UI.transport_error,
    copy: HEALTH_COPY.transport_error,
    enabled: null,
    ready: null,
    httpStatus: Number.isFinite(status) ? status : null,
  };
}

async function fetchDirectorIaHealth(fetchImpl) {
  const fetcher = fetchImpl || fetch;
  let res;
  try {
    res = await fetcher(directorIaHealthApiUrl(), {
      method: "GET",
      cache: "no-store",
    });
  } catch (_err) {
    return transportErrorResult();
  }
  if (!res || typeof res.status !== "number") {
    return transportErrorResult();
  }
  let body = null;
  try {
    if (typeof res.json === "function") {
      body = await res.json();
    }
  } catch (_err) {
    return {
      state: HEALTH_UI.transport_error,
      copy: HEALTH_COPY.transport_error,
      enabled: null,
      ready: null,
      httpStatus: res.status,
    };
  }
  return interpretDirectorIaHealthResponse(res.status, body);
}

module.exports = {
  HEALTH_PATH,
  HEALTH_UI,
  HEALTH_COPY,
  directorIaHealthApiUrl,
  interpretDirectorIaHealthResponse,
  fetchDirectorIaHealth,
};
module.exports.default = module.exports;
