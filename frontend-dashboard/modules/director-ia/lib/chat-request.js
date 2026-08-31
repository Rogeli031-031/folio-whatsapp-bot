"use strict";

function parseUploadDayYmd(raw) {
  const s = String(raw || "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function searchStringToParams(search) {
  const raw = String(search || "").trim();
  if (!raw) return new URLSearchParams();
  const qIdx = raw.indexOf("?");
  const query = qIdx >= 0 ? raw.slice(qIdx + 1) : raw.startsWith("/") ? "" : raw;
  return new URLSearchParams(query);
}

function resolveDirectorIaUploadDayFromSearch(search) {
  if (search == null) return null;
  let params = search;
  if (typeof search === "string") {
    params = searchStringToParams(search);
  } else if (typeof URLSearchParams !== "undefined" && search instanceof URLSearchParams) {
    params = search;
  } else if (search && typeof search.get === "function") {
    params = search;
  } else {
    return parseUploadDayYmd(search.upload_day || search.uploadDay);
  }
  return parseUploadDayYmd(params.get("upload_day"));
}

function buildDirectorIaChatBody(input) {
  const plantaId = input && input.planta_id;
  const question = input && input.question != null ? String(input.question) : "";
  const explicit = parseUploadDayYmd(input && (input.upload_day || input.uploadDay));
  const fromSearch = resolveDirectorIaUploadDayFromSearch(input && input.search);
  const uploadDay = explicit || fromSearch;
  const history = Array.isArray(input && input.history) ? input.history.slice(-8) : [];
  const body = {
    planta_id: plantaId,
    question,
  };
  if (input && input.planta_nombre) body.planta_nombre = input.planta_nombre;
  if (uploadDay) body.upload_day = uploadDay;
  if (history.length) body.history = history;
  if (input && input.conversation_state && typeof input.conversation_state === "object") {
    body.conversation_state = input.conversation_state;
  }
  return body;
}

module.exports = {
  parseUploadDayYmd,
  resolveDirectorIaUploadDayFromSearch,
  buildDirectorIaChatBody,
};
