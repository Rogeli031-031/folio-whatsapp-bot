"use strict";

/**
 * Capa B PRE-DEPLOY RUNTIME.
 * Entra por handlePostChat → askDirectorIa. No LIVE_DB. No prosa LLM como PASS.
 * openaiChat solo evita HTTP real a OpenAI; nunca es criterio de PASS.
 */

const { RUNTIME_CASES, NOW_ISO } = require("../fixtures/director-ia-golden-cases");
const parityFx = require("../fixtures/delta-ingreso-clientes-por-mes-parity");

const NOW = new Date(NOW_ISO);

const BOUNDARIES = Object.freeze([
  "HTTP_STATUS",
  "INTENT_ROUTE",
  "EVIDENCE_BUNDLE",
  "METRIC_PACK",
  "USER_VISIBLE_OUTCOME",
]);

const GENERIC_INTENT_RE = /no se pudo determinar una intenci[oó]n/i;

function mark(status, detail) {
  return { status, detail: detail == null ? null : String(detail) };
}

function captureRes() {
  const out = { statusCode: null, body: null };
  return {
    out,
    status(code) {
      out.statusCode = code;
      return this;
    },
    json(body) {
      out.body = body;
      return this;
    },
  };
}

function closedFinal(year, month, margenKg, empresa) {
  const vid = year * 100 + month;
  return {
    versions: [{ id: vid, version_number: 2, financial_state: "FINAL" }],
    lines: { [vid]: [{ empresa: empresa || "Acapulco", margen_kg: margenKg }] },
  };
}

function availableIgfMap() {
  return {
    "2026-1": closedFinal(2026, 1, 7.1),
    "2026-5": closedFinal(2026, 5, 7.11),
    "2026-8": closedFinal(2026, 8, 8.2),
  };
}

function closedForecastOnly(year, month, margenKg, empresa) {
  const latestId = year * 1000 + month;
  const olderId = latestId + 1;
  const plant = empresa || "Acapulco";
  return {
    versions: [
      { id: latestId, version_number: 8, financial_state: "FORECAST" },
      { id: olderId, version_number: 3, financial_state: "FORECAST" },
    ],
    lines: {
      [latestId]: [{ empresa: plant, margen_kg: margenKg }],
      [olderId]: [{ empresa: plant, margen_kg: margenKg - 0.4 }],
    },
  };
}

function closedFinalPlusLaterForecast(year, month, finalKg, forecastKg, empresa) {
  const finalId = year * 100 + month;
  const forecastId = year * 1000 + month;
  const plant = empresa || "Acapulco";
  return {
    versions: [
      { id: forecastId, version_number: 8, financial_state: "FORECAST" },
      { id: finalId, version_number: 2, financial_state: "FINAL" },
    ],
    lines: {
      [forecastId]: [{ empresa: plant, margen_kg: forecastKg }],
      [finalId]: [{ empresa: plant, margen_kg: finalKg }],
    },
  };
}

function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function pushDaily(rows, cliente, fecha, kg) {
  rows.push({ fecha, cliente, kg, canal: "Casa" });
}

function spreadRange(rows, cliente, start, end, totalKg) {
  const dates = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (cursor.getTime() <= last.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (!dates.length) return;
  const each = Math.floor(totalKg / dates.length);
  let used = 0;
  for (let i = 0; i < dates.length; i++) {
    const kg = i === dates.length - 1 ? totalKg - used : each;
    used += kg;
    pushDaily(rows, cliente, dates[i], kg);
  }
}

function movementDailyRows() {
  const rows = [];
  spreadRange(rows, "CLIENTE_DELTA", "2026-07-01", "2026-07-02", 5724);
  spreadRange(rows, "CLIENTE_DELTA", "2026-07-03", "2026-07-31", 14256);
  pushDaily(rows, "CLIENTE_DELTA", "2026-08-01", 2862);
  spreadRange(rows, "CLIENTE_DELTA", "2026-08-02", "2026-08-31", 20790);

  spreadRange(rows, "CLIENTE_SIGNO", "2026-07-01", "2026-07-02", 5001);
  spreadRange(rows, "CLIENTE_SIGNO", "2026-07-03", "2026-07-31", 50472);
  pushDaily(rows, "CLIENTE_SIGNO", "2026-08-01", 6130);
  spreadRange(rows, "CLIENTE_SIGNO", "2026-08-02", "2026-08-31", 52698);

  spreadRange(rows, "CLIENTE_BAJA", "2026-07-01", "2026-07-31", 168890);
  spreadRange(rows, "CLIENTE_BAJA", "2026-08-01", "2026-08-31", 150199);

  spreadRange(rows, "CLIENTE_REMANENTE", "2026-07-01", "2026-07-31", 6370);
  pushDaily(rows, "CLIENTE_REMANENTE", "2026-08-01", 459);

  spreadRange(rows, "CLIENTE_CERO", "2026-07-01", "2026-07-31", 8000);

  for (let i = 1; i <= 7; i++) {
    const name = `CLIENTE_EXTRA_${i}`;
    spreadRange(rows, name, "2026-07-03", "2026-07-31", 2000);
    spreadRange(rows, name, "2026-08-02", "2026-08-31", 3000);
  }
  return rows;
}

const MOVEMENT_DAILY = movementDailyRows();

function rowsBetween(start, end) {
  return MOVEMENT_DAILY.filter((r) => r.fecha >= start && r.fecha <= end);
}

function aggregateClientTons(start, end) {
  const map = new Map();
  for (const r of rowsBetween(start, end)) {
    map.set(r.cliente, (map.get(r.cliente) || 0) + Number(r.kg || 0));
  }
  return [...map.entries()].map(([cliente, kg]) => ({
    cliente,
    venta_ton: Math.round((kg / 1000) * 1000) / 1000,
  }));
}

function aggregateClientKg(start, end) {
  const map = new Map();
  for (const r of rowsBetween(start, end)) {
    map.set(r.cliente, (map.get(r.cliente) || 0) + Number(r.kg || 0));
  }
  return [...map.entries()].map(([cliente, kg]) => ({ cliente, kg }));
}

function isMovementCase(runtimeCase) {
  return runtimeCase && String(runtimeCase.id || "").startsWith("R-MOVEMENT-");
}

function isDeltaIncomeCase(runtimeCase) {
  return runtimeCase && String(runtimeCase.id || "").startsWith("R-DELTA-INCOME-");
}

function isDeltaParityCase(runtimeCase) {
  return runtimeCase && String(runtimeCase.id || "").startsWith("R-DELTA-PARITY-");
}

function forecastNegativeRows() {
  return [
    { cliente: "CLIENTE_N1", ingresoA: 400000, ingresoB: 150000, deltaIngreso: -250000, kgA: 10000, kgB: 4000 },
    { cliente: "CLIENTE_N2", ingresoA: 300000, ingresoB: 120000, deltaIngreso: -180000, kgA: 8000, kgB: 3500 },
    { cliente: "CLIENTE_N3", ingresoA: 220000, ingresoB: 100000, deltaIngreso: -120000, kgA: 7000, kgB: 3200 },
    { cliente: "CLIENTE_N4", ingresoA: 160000, ingresoB: 70000, deltaIngreso: -90000, kgA: 5000, kgB: 2200 },
    { cliente: "CLIENTE_N5", ingresoA: 110000, ingresoB: 60000, deltaIngreso: -50000, kgA: 4000, kgB: 2100 },
    { cliente: "CLIENTE_N6", ingresoA: 80000, ingresoB: 50000, deltaIngreso: -30000, kgA: 3000, kgB: 1800 },
    { cliente: "CLIENTE_N7", ingresoA: 40000, ingresoB: 30000, deltaIngreso: -10000, kgA: 2000, kgB: 1500 },
    { cliente: "CLIENTE_POS", ingresoA: 20000, ingresoB: 100000, deltaIngreso: 80000, kgA: 1000, kgB: 4000 },
  ];
}

function forecastCommentsByName() {
  return new Map([
    [
      "cliente_n1",
      [{ body: "ocupación baja del condominio", author_name: "ZP", created_at: "2026-08-31T10:00:00-06:00" }],
    ],
    [
      "cliente_n3",
      [{ body: "comentario por nombre no por key", author_name: "ZP", created_at: "2026-08-30T09:00:00-06:00" }],
    ],
  ]);
}

function deltaIncomeForecastDeps() {
  const rows = forecastNegativeRows();
  return {
    resolveDeltaIngresoForecastPlanta: async () => ({ id: 1, nombre: "Acapulco", clave: "E3" }),
    getPlantCodeArrFromPlantaNombre: async () => "Acapulco",
    computeDeltaIngresoForecast: async (_c, _plant, yearA, monthA, yearB, monthB) => ({
      planta: "Acapulco",
      periodoA: `${yearA}-${String(monthA).padStart(2, "0")}`,
      periodoB: `${yearB}-${String(monthB).padStart(2, "0")}`,
      margenA: 8,
      margenB: 7.5,
      rows,
      source_helper: "computeDeltaIngresoForecast",
    }),
    computeDeltaIngresoClientesPorMes: async (_c, _plant, yearA, monthA, yearB, monthB) => ({
      planta: "Acapulco",
      periodoA: `${yearA}-${String(monthA).padStart(2, "0")}`,
      periodoB: `${yearB}-${String(monthB).padStart(2, "0")}`,
      margenA: 8,
      margenB: 7.5,
      rows,
      source_helper: "computeDeltaIngresoClientesPorMes",
      physical_source: "dashboard-arr-forecast.computeClientesDescuentoMes",
    }),
    loadRecentCommentsByClienteNombres: async (_c, opts = {}) => {
      const all = forecastCommentsByName();
      const out = new Map();
      const names = (opts.nombres || []).map((n) => String(n || "").trim().toLowerCase());
      for (const n of names) {
        if (all.has(n)) out.set(n, all.get(n));
      }
      return out;
    },
  };
}

function deltaParityDeps() {
  return {
    resolveDeltaIngresoForecastPlanta: async () => ({ id: 1, nombre: parityFx.PLANTA, clave: "E3" }),
    getPlantCodeArrFromPlantaNombre: async () => parityFx.PLANTA,
    computeDeltaIngresoClientesPorMes: undefined,
    loadIgfPlantMetrics: async (_c, _plant, year, month) => {
      if (year === parityFx.YEAR_B && month === parityFx.MONTH_B) {
        return {
          ...parityFx.METRICS_B,
          version_id: parityFx.IGF_FORECAST_VERSION.id,
          version_number: parityFx.IGF_FORECAST_VERSION.version_number,
          financial_state: parityFx.IGF_FORECAST_VERSION.financial_state,
          ventaTon: parityFx.IGF_FORECAST_VERSION.venta_ton,
          targetKg: parityFx.TARGET_KG_B,
          decoy_final_venta_ton: parityFx.IGF_FINAL_DECOY_VERSION.venta_ton,
        };
      }
      return {
        ...parityFx.METRICS_A,
        version_number: 2,
        financial_state: "FINAL",
        ventaTon: parityFx.METRICS_A.ventaTon,
      };
    },
    computeClientesDescuentoMes: async (_c, year, month) => ({
      historico: month === parityFx.MONTH_A,
      ty: year,
      tm: month,
      rows: parityFx.clientesDescuentoMesRows(month === parityFx.MONTH_B ? "B" : "A"),
    }),
    computeDeltaIngresoForecast: async (_c, _plant, yearA, monthA, yearB, monthB) => ({
      planta: parityFx.PLANTA,
      periodoA: `${yearA}-${String(monthA).padStart(2, "0")}`,
      periodoB: `${yearB}-${String(monthB).padStart(2, "0")}`,
      margenA: parityFx.MARGEN_A,
      margenB: parityFx.MARGEN_B,
      rows: parityFx.olsForecastRows(),
      source_helper: "computeDeltaIngresoForecast",
    }),
    loadRecentCommentsByClienteNombres: async () => new Map(),
  };
}

function incomeForecastPack(body) {
  return (body && body.delta_ingreso_forecast) || {};
}

function incomeForecastRows(body, opts = {}) {
  const pack = incomeForecastPack(body);
  if (opts.all && Array.isArray(pack.rows_all) && pack.rows_all.length) {
    return pack.rows_all;
  }
  const rows = pack.top_negatives || pack.rows || pack.clientes || [];
  return Array.isArray(rows) ? rows : [];
}

function findIncomeRow(body, name) {
  const want = String(name || "").trim().toUpperCase();
  const match = (list) =>
    list.find((r) => String((r && (r.cliente || r.cliente_norm)) || "").trim().toUpperCase() === want) || null;
  return match(incomeForecastRows(body, { all: true })) || match(incomeForecastRows(body));
}

function incomeDelta(row) {
  if (!row) return null;
  if (row.delta_ingreso != null) return Number(row.delta_ingreso);
  if (row.deltaIngreso != null) return Number(row.deltaIngreso);
  return null;
}

function incomeCommentBlob(row, answer) {
  const c = row && (row.comment || row.comentario || row.registered_comment);
  const bits = [
    c && c.body,
    c && c.text,
    c && c.created_at,
    row && row.comment_body,
    answer,
  ];
  return bits.filter(Boolean).join(" ");
}

function looksLikeCausalComment(answer, commentText) {
  const blob = normalizeBlob(answer);
  const snippet = normalizeBlob(commentText).slice(0, 24);
  if (!snippet || !blob.includes(snippet)) return false;
  return /la ca[ií]da (ocurri[oó]|fue)|la causa (de la ca[ií]da )?fue|disminuy[oó] porque|ca[ií]da por\b/.test(blob);
}

function looksLikeRentabilidadCaera(answer) {
  return /la rentabilidad caer/i.test(String(answer || ""));
}

function movementTrendDeps() {
  return {
    resolveCommercialTrendPlanta: async () => ({ id: 1, nombre: "Acapulco", clave: "E3" }),
    resolveCommercialTrendPlantCodes: async () => ({ not_found: false, uniqueCodes: ["E3"], plantCode: "E3" }),
    queryCommercialTrendBounds: async () => ({ rows: [{ min_f: "2026-07-01", max_f: "2026-08-31" }] }),
    queryCommercialTrendClients: async (_c, _codes, start, end) => ({
      rows: aggregateClientTons(start, end),
    }),
    queryCommercialTrendSales: async (_c, _codes, start, end) => ({
      rows: aggregateClientTons(start, end).map((r) => ({
        fecha: start,
        venta_ton: r.venta_ton,
      })),
    }),
    queryCommercialTrendDiscount: async () => ({ rows: [] }),
    queryCommercialTrendCalendarKg: async (_c, _codes, start, end) => ({
      rows: aggregateClientKg(start, end),
    }),
  };
}

function igfMapForCase(runtimeCase) {
  const base = availableIgfMap();
  if (runtimeCase && runtimeCase.id === "R-RUNTIME-006") {
    return { ...base, "2026-8": closedForecastOnly(2026, 8, 6.4) };
  }
  if (runtimeCase && runtimeCase.id === "R-RUNTIME-007") {
    return { ...base, "2026-8": closedFinalPlusLaterForecast(2026, 8, 8.2, 6.4) };
  }
  return base;
}

function catalogClientSales() {
  return [
    { month: "2026-01", cliente_norm: "TORTILLERIA ERICK", canal: "Casa", subcanal: "", kg: 10 },
    { month: "2026-08", cliente_norm: "TORTILLERIA ERICK", canal: "Casa", subcanal: "", kg: 40 },
    { month: "2026-08", cliente_norm: "TORTILLERIA", canal: "Casa", subcanal: "", kg: 15 },
  ];
}

function catalogClientDiscount() {
  return [
    { month: "2026-01", cliente_norm: "TORTILLERIA ERICK", canal: "Casa", subcanal: "", monto: 12, kg: 10 },
    { month: "2026-08", cliente_norm: "TORTILLERIA ERICK", canal: "Casa", subcanal: "", monto: 48, kg: 40 },
  ];
}

function igfQueryFns(map) {
  return {
    queryHistoricalMarginVersions: async (_c, y, m) => (map[`${y}-${m}`] || {}).versions || [],
    queryHistoricalMarginLatestVersion: async (_c, y, m) => {
      const list = (map[`${y}-${m}`] || {}).versions || [];
      if (!list.length) return null;
      return [...list].sort((a, b) => Number(b.version_number) - Number(a.version_number))[0];
    },
    queryHistoricalMarginLines: async (_c, versionId) => {
      for (const pack of Object.values(map)) {
        if (pack.lines && pack.lines[versionId]) return pack.lines[versionId];
      }
      return [];
    },
  };
}

function metaOf(body) {
  return (body && body.context_meta) || {};
}

function packKind(body) {
  const meta = metaOf(body);
  const mode = String(meta.mode || "");
  const prompt = String(meta.prompt_mode || "");
  const parent = meta.conversation_state && meta.conversation_state.parent_intent;
  const bundle = meta.conversation_state && meta.conversation_state.last_evidence_bundle_type;
  const blob = [mode, prompt, parent, bundle].filter(Boolean).join(" ");
  if (mode === "historical_margin" || parent === "historical_margin" || bundle === "historical_margin") {
    return "historical_margin";
  }
  if (mode === "daily_executive_brief" || parent === "daily_executive_brief") return "daily_executive_brief";
  if (mode === "plant_diagnosis" || prompt === "executive_status" || prompt === "plant_diagnosis" || parent === "plant_diagnosis") {
    return "plant_diagnosis";
  }
  if (/discount|descuento/.test(blob)) return "descuento";
  if (mode === "conversation_clarification") return "clarification";
  if (mode === "client_profile") return "client_profile";
  if (
    mode === "delta_income_forecast" ||
    parent === "delta_income_forecast" ||
    bundle === "delta_income_forecast" ||
    (body && body.delta_ingreso_forecast)
  ) {
    return "delta_income_forecast";
  }
  if (mode === "delta_income" || parent === "delta_income" || (body && body.delta_ingreso && !body.delta_ingreso_forecast)) {
    return "delta_income";
  }
  if (mode === "commercial_trend" || parent === "commercial_trend" || bundle === "commercial_trend") {
    return "commercial_trend";
  }
  return mode || parent || "unknown";
}

function isClientDiscountFamilyPack(body) {
  const pack = packKind(body);
  return pack === "descuento" || pack === "client_profile";
}

function normalizeBlob(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function entityParticipates(runtimeCase, body) {
  const expected = runtimeCase.expected_entity;
  if (!expected) return true;
  const meta = metaOf(body);
  const state = (meta && meta.conversation_state) || {};
  const entities = Array.isArray(state.active_entities) ? state.active_entities : [];
  const profile = body && body.client_profile;
  const identity = profile && profile.identity;
  const blob = [
    body && body.answer,
    identity && identity.display_name,
    identity && identity.cliente_norm,
    ...entities.map((e) => e && (e.display || e.cliente_norm || e.cliente_key)),
  ]
    .filter(Boolean)
    .join(" ");
  return normalizeBlob(blob).includes(normalizeBlob(expected));
}

function isSpecificDiscountClarification(body) {
  const meta = metaOf(body);
  if (!meta.requires_clarification) return false;
  const answer = String((body && body.answer) || "");
  if (GENERIC_INTENT_RE.test(answer)) return false;
  return /descuento|cliente|agosto|alcance/i.test(answer);
}

function looksLikePlantMarginAnswer(body) {
  const answer = String((body && body.answer) || "");
  return /\$\/kg/.test(answer) && /enero|agosto|mayo|variaci[oó]n/i.test(answer);
}

function looksLikeFinalClosedCopy(answer) {
  return /fuente:\s*cierre financiero final/i.test(String(answer || ""));
}

function looksLikeForecastLabel(answer) {
  return /forecast|proyecci[oó]n|vista vigente/i.test(String(answer || ""));
}

function looksLikeOnlyFinalUnavailable(answer) {
  const text = String(answer || "").trim();
  return /no hay un margen hist[oó]rico final defendible/i.test(text) && !/\$\/kg/.test(text) && !looksLikeForecastLabel(text);
}

function mentionsFinalAbsence(answer) {
  return /no hay un margen hist[oó]rico final defendible|sin margen final defendible|no (hay|existe) (un )?cierre/i.test(
    String(answer || "")
  );
}

function movementPack(body) {
  return (body && body.commercial_trend) || {};
}

function movementRows(body) {
  const pack = movementPack(body);
  const rows = pack.calendar_movers || pack.movers || pack.top_movers || body.customer_contributors || [];
  return Array.isArray(rows) ? rows : [];
}

function findMover(body, name) {
  const want = String(name || "").trim().toUpperCase();
  return movementRows(body).find((m) => String((m && (m.cliente || m.cliente_norm)) || "").trim().toUpperCase() === want) || null;
}

function moverKgPair(mover) {
  if (!mover) return null;
  if (mover.kg_a != null || mover.kg_b != null) {
    const a = Number(mover.kg_a);
    const b = Number(mover.kg_b);
    const delta = mover.delta_kg != null ? Number(mover.delta_kg) : b - a;
    return { a, b, delta };
  }
  if (mover.venta_ton_prev != null || mover.venta_ton_actual != null) {
    const a = Math.round(Number(mover.venta_ton_prev || 0) * 1000);
    const b = Math.round(Number(mover.venta_ton_actual || 0) * 1000);
    const delta = mover.delta_ton != null ? Math.round(Number(mover.delta_ton) * 1000) : b - a;
    return { a, b, delta };
  }
  return null;
}

function moverClass(mover, answer) {
  const tipo = String((mover && mover.tipo) || (mover && mover.class) || "").toLowerCase();
  if (tipo === "aumento" || tipo === "aumento" || /aument/i.test(tipo)) return "AUMENTÓ";
  if (tipo === "disminucion" || tipo === "disminuyó" || tipo === "disminuyo") return "DISMINUYÓ";
  if (tipo === "perdido" || tipo === "stopped" || /dej[oó] de comprar/.test(tipo)) return "DEJÓ DE COMPRAR";
  const blob = `${String((mover && mover.tipo_label) || "")} ${String(answer || "")}`;
  if (/dej[oó] de comprar/i.test(blob)) return "DEJÓ DE COMPRAR";
  if (/disminuy/i.test(blob)) return "DISMINUYÓ";
  if (/aument/i.test(blob)) return "AUMENTÓ";
  return tipo || "";
}

function isCalendarCompare(body) {
  const pack = movementPack(body);
  const meta = metaOf(body);
  const kind = String(pack.period_kind || meta.period_kind || "");
  return kind === "calendar_compare" || kind === "calendar_month";
}

function looksLikeTonLabeledAsKg(answer, deltaKg) {
  const text = String(answer || "");
  const tonsDot = (Number(deltaKg) / 1000).toFixed(3);
  return new RegExp(`${tonsDot.replace(".", "\\.")}\\s*kg`, "i").test(text);
}

function looksLikeValidDeltaUnit(answer, deltaKg) {
  const text = String(answer || "");
  const kgEs = Math.abs(Number(deltaKg)).toLocaleString("es-MX");
  const ton = (Math.abs(Number(deltaKg)) / 1000).toFixed(3);
  if (new RegExp(`${kgEs.replace(".", "\\.")}\\s*kg`, "i").test(text)) return true;
  if (new RegExp(`${ton.replace(".", "[.,]")}\\s*t\\b`, "i").test(text)) return true;
  return false;
}

function mentionsErick(body) {
  return /tortilleria erick/i.test(String((body && body.answer) || ""));
}

function firstBadBoundary(boundaries) {
  for (const name of BOUNDARIES) {
    if (boundaries[name] && boundaries[name].status === "FAIL") return name;
  }
  return null;
}

async function postChat(handlePostChat, question, conversationState, history) {
  const res = captureRes();
  let threw = null;
  try {
    await handlePostChat(
      {
        body: {
          planta_id: 1,
          question,
          conversation_state: conversationState || undefined,
          history: Array.isArray(history) ? history : [],
        },
        dashboardAuth: { role: "ZP", actor_id: 1 },
      },
      res
    );
  } catch (err) {
    threw = err;
  }
  return { http: res.out.statusCode, body: res.out.body, threw };
}

function installRuntimeDeps(chat, map, runtimeCase) {
  chat.configureDirectorIaChat({
    now: NOW,
    pool: {
      connect: async () => ({
        query: async () => ({ rows: [] }),
        release() {},
      }),
    },
    resolveHistoricalMarginPlanta: async () => ({ id: 1, nombre: "Acapulco", clave: "AC" }),
    resolveHistoricalMarginPlantByNombre: async () => null,
    resolveClientProfilePlanta: async () => ({ id: 1, nombre: "Acapulco", clave: "E3" }),
    resolveClientProfilePlantCodes: async () => ({ not_found: false, uniqueCodes: ["E3"], plantCode: "E3" }),
    queryClientProfileSales: async () => ({ rows: catalogClientSales() }),
    queryClientProfileDiscount: async () => ({ rows: catalogClientDiscount() }),
    queryClientProfileComments: async () => [],
    queryClientProfileActions: async () => [],
    queryClientProfileHistorial: async () => new Map(),
    ...igfQueryFns(map),
    computeDeltaIngresoForecast: undefined,
    computeDeltaIngresoClientesPorMes: undefined,
    computeClientesDescuentoMes: undefined,
    loadIgfPlantMetrics: undefined,
    ...(isMovementCase(runtimeCase) ? movementTrendDeps() : {}),
    ...(isDeltaParityCase(runtimeCase) ? deltaParityDeps() : isDeltaIncomeCase(runtimeCase) ? deltaIncomeForecastDeps() : {}),
    openaiChat: async () => "STUB_OPENAI_TRANSPORT",
  });
}

function clearRuntimeDeps(chat) {
  chat.configureDirectorIaChat({
    now: undefined,
    pool: null,
    resolveHistoricalMarginPlanta: undefined,
    resolveHistoricalMarginPlantByNombre: undefined,
    resolveClientProfilePlanta: undefined,
    resolveClientProfilePlantCodes: undefined,
    queryClientProfileSales: undefined,
    queryClientProfileDiscount: undefined,
    queryClientProfileComments: undefined,
    queryClientProfileActions: undefined,
    queryClientProfileHistorial: undefined,
    queryHistoricalMarginVersions: undefined,
    queryHistoricalMarginLatestVersion: undefined,
    queryHistoricalMarginLines: undefined,
    resolveCommercialTrendPlanta: undefined,
    resolveCommercialTrendPlantCodes: undefined,
    queryCommercialTrendBounds: undefined,
    queryCommercialTrendClients: undefined,
    queryCommercialTrendSales: undefined,
    queryCommercialTrendDiscount: undefined,
    queryCommercialTrendCalendarKg: undefined,
    resolveDeltaIngresoForecastPlanta: undefined,
    getPlantCodeArrFromPlantaNombre: undefined,
    computeDeltaIngresoForecast: undefined,
    computeDeltaIngresoClientesPorMes: undefined,
    computeClientesDescuentoMes: undefined,
    loadIgfPlantMetrics: undefined,
    loadRecentCommentsByClienteNombres: undefined,
    openaiChat: undefined,
  });
}

function evaluateLastTurn(runtimeCase, last) {
  const boundaries = {};
  for (const name of BOUNDARIES) boundaries[name] = mark("NOT_REACHED");

  if (last.threw) {
    boundaries.HTTP_STATUS = mark("FAIL", `throw: ${last.threw.message || last.threw}`);
    return { boundaries, http: null, pack: null };
  }

  const http = last.http;
  if (http == null) {
    boundaries.HTTP_STATUS = mark("FAIL", "handlePostChat no asignó status");
    return { boundaries, http, pack: null };
  }
  if (http >= 500) {
    boundaries.HTTP_STATUS = mark("FAIL", `http=${http} error=${last.body && last.body.error}`);
    return { boundaries, http, pack: packKind(last.body) };
  }
  boundaries.HTTP_STATUS = mark("PASS", `http=${http}`);

  const body = last.body || {};
  const meta = metaOf(body);
  const pack = packKind(body);
  boundaries.INTENT_ROUTE = mark("PASS", `mode=${meta.mode || "none"} pack=${pack}`);
  boundaries.EVIDENCE_BUNDLE = mark(
    "PASS",
    `bundle=${(meta.conversation_state && meta.conversation_state.last_evidence_bundle_type) || meta.mode || "none"}`
  );

  const forbidden = runtimeCase.forbidden_packs || [];
  if (forbidden.includes(pack) || (forbidden.includes("materialidad") && pack === "plant_diagnosis")) {
    boundaries.METRIC_PACK = mark("FAIL", `pack=${pack} forbidden`);
    return { boundaries, http, pack };
  }
  if (runtimeCase.expected_pack && pack !== runtimeCase.expected_pack) {
    boundaries.METRIC_PACK = mark("FAIL", `expected_pack=${runtimeCase.expected_pack} pack=${pack}`);
    return { boundaries, http, pack };
  }
  if (runtimeCase.must_return_client_historical_discount) {
    if (
      !isClientDiscountFamilyPack(body) ||
      meta.requires_clarification ||
      !entityParticipates(runtimeCase, body) ||
      looksLikePlantMarginAnswer(body)
    ) {
      boundaries.METRIC_PACK = mark(
        "FAIL",
        `expected client historical discount; pack=${pack} clarify=${Boolean(meta.requires_clarification)} entity=${entityParticipates(runtimeCase, body)} plant_margin=${looksLikePlantMarginAnswer(body)}`
      );
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.must_return_client_margin) {
    if (!mentionsErick(body) || looksLikePlantMarginAnswer(body)) {
      boundaries.METRIC_PACK = mark(
        "FAIL",
        `operation=${meta.operation || "none"} pack=${pack} erick=${mentionsErick(body)} plant_margin=${looksLikePlantMarginAnswer(body)}`
      );
      return { boundaries, http, pack };
    }
  }
  if (
    (runtimeCase.expected_metrics || []).includes("descuento") &&
    !isClientDiscountFamilyPack(body) &&
    !isSpecificDiscountClarification(body)
  ) {
    boundaries.METRIC_PACK = mark("FAIL", `expected descuento; pack=${pack} http=${http} error=${body.error || ""}`);
    return { boundaries, http, pack };
  }
  boundaries.METRIC_PACK = mark("PASS", pack);

  const answer = String(body.answer || "");
  if (runtimeCase.forbid_generic_intent && GENERIC_INTENT_RE.test(answer)) {
    boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", "generic_intent_clarification");
    return { boundaries, http, pack };
  }
  if (
    (runtimeCase.expected_metrics || []).includes("descuento") &&
    !isClientDiscountFamilyPack(body) &&
    !isSpecificDiscountClarification(body)
  ) {
    boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", `not_discount answer=${answer.slice(0, 120)}`);
    return { boundaries, http, pack };
  }
  if (runtimeCase.must_return_client_historical_discount && (meta.requires_clarification || !isClientDiscountFamilyPack(body))) {
    boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", `not_client_historical_discount pack=${pack}`);
    return { boundaries, http, pack };
  }
  if (runtimeCase.expected_pack === "historical_margin" && pack !== "historical_margin") {
    boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", `expected plant historical_margin pack=${pack}`);
    return { boundaries, http, pack };
  }
  if (runtimeCase.require_labeled_forecast_context) {
    const asActual =
      looksLikeFinalClosedCopy(answer) ||
      Boolean(meta.presented_as_closed_actual) ||
      meta.truth_class === "ACTUAL_FINANCIAL";
    if (
      !mentionsFinalAbsence(answer) ||
      !looksLikeForecastLabel(answer) ||
      !/\$\/kg/.test(answer) ||
      asActual ||
      looksLikeOnlyFinalUnavailable(answer)
    ) {
      boundaries.USER_VISIBLE_OUTCOME = mark(
        "FAIL",
        `expected labeled FORECAST context; final_absent=${mentionsFinalAbsence(answer)} labeled=${looksLikeForecastLabel(answer)} kg=${/\$\/kg/.test(answer)} as_actual=${asActual} only_missing=${looksLikeOnlyFinalUnavailable(answer)}`
      );
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.require_final_not_latest_forecast) {
    const hasFinal = looksLikeFinalClosedCopy(answer) && /8[.,]20/.test(answer);
    const substituted = /6[.,]40/.test(answer);
    if (!hasFinal || substituted) {
      boundaries.USER_VISIBLE_OUTCOME = mark(
        "FAIL",
        `expected unique FINAL to win; has_final=${hasFinal} substituted_latest=${substituted}`
      );
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.require_calendar_compare) {
    const packCt = movementPack(body);
    const trailing = Number(packCt.range_days) === 30 && !isCalendarCompare(body);
    if (!isCalendarCompare(body) || trailing) {
      boundaries.USER_VISIBLE_OUTCOME = mark(
        "FAIL",
        `expected calendar_compare; period_kind=${packCt.period_kind || meta.period_kind || "none"} range_days=${packCt.range_days}`
      );
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.movement_focus || runtimeCase.require_calendar_kg_parity || runtimeCase.require_stopped || runtimeCase.forbid_stopped) {
    const mover = findMover(body, runtimeCase.movement_focus);
    const pair = moverKgPair(mover);
    const klass = moverClass(mover, answer);
    if (runtimeCase.require_calendar_kg_parity) {
      if (!pair || pair.a !== runtimeCase.expected_kg_a || pair.b !== runtimeCase.expected_kg_b || pair.delta !== runtimeCase.expected_delta_kg) {
        boundaries.USER_VISIBLE_OUTCOME = mark(
          "FAIL",
          `kg parity focus=${runtimeCase.movement_focus} got=${pair ? `${pair.a}→${pair.b} Δ${pair.delta}` : "missing"} expected=${runtimeCase.expected_kg_a}→${runtimeCase.expected_kg_b} Δ${runtimeCase.expected_delta_kg}`
        );
        return { boundaries, http, pack };
      }
    }
    if (runtimeCase.expected_class && klass !== runtimeCase.expected_class) {
      boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", `class=${klass || "none"} expected=${runtimeCase.expected_class}`);
      return { boundaries, http, pack };
    }
    if (runtimeCase.forbid_stopped && (klass === "DEJÓ DE COMPRAR" || String((mover && mover.tipo) || "") === "perdido")) {
      boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", "classified STOPPED with remaining purchase");
      return { boundaries, http, pack };
    }
    if (runtimeCase.require_stopped && klass !== "DEJÓ DE COMPRAR") {
      boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", `expected STOPPED class=${klass || "none"}`);
      return { boundaries, http, pack };
    }
    if (runtimeCase.forbid_sign_flip && pair && Math.sign(pair.delta) !== Math.sign(runtimeCase.expected_delta_kg)) {
      boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", `sign flip delta=${pair.delta} expected=${runtimeCase.expected_delta_kg}`);
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.require_unambiguous_units) {
    if (looksLikeTonLabeledAsKg(answer, runtimeCase.expected_delta_kg) || !looksLikeValidDeltaUnit(answer, runtimeCase.expected_delta_kg)) {
      boundaries.USER_VISIBLE_OUTCOME = mark(
        "FAIL",
        `ambiguous units answer=${answer.slice(0, 160)}`
      );
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.require_list_completeness) {
    const ups = movementRows(body).filter((m) => moverClass(m, "") === "AUMENTÓ");
    const packCt = movementPack(body);
    const declared =
      Boolean(packCt.list_truncated) ||
      packCt.list_scope === "top_n" ||
      /top\s*\d+|recorte|principales|de \d+\s+clientes/i.test(answer);
    const fakeFull = /estos son los clientes/i.test(answer) && ups.length < Number(runtimeCase.expected_up_count || 0);
    if (ups.length < Number(runtimeCase.expected_up_count || 0) && (!declared || fakeFull)) {
      boundaries.USER_VISIBLE_OUTCOME = mark(
        "FAIL",
        `list completeness ups=${ups.length} expected=${runtimeCase.expected_up_count} declared=${declared}`
      );
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.require_forecast_period_b) {
    const packFi = incomeForecastPack(body);
    const b = String(packFi.periodo_b || packFi.periodoB || meta.periodo_b || "");
    const maxFecha = String(packFi.anchored_to_max_fecha || packFi.max_fecha || "");
    if (b !== runtimeCase.require_forecast_period_b) {
      boundaries.USER_VISIBLE_OUTCOME = mark(
        "FAIL",
        `expected periodoB=${runtimeCase.require_forecast_period_b} got=${b || "none"}`
      );
      return { boundaries, http, pack };
    }
    if (runtimeCase.forbid_max_fecha_august && /2026-08/.test(maxFecha) && b === "2026-09") {
      boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", "septiembre etiquetado sobre MAX(fecha)=agosto");
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.require_mxn_primary) {
    const row = findIncomeRow(body, runtimeCase.movement_focus);
    const delta = incomeDelta(row);
    if (delta !== runtimeCase.expected_delta_mxn) {
      boundaries.USER_VISIBLE_OUTCOME = mark(
        "FAIL",
        `mxn focus=${runtimeCase.movement_focus} delta=${delta} expected=${runtimeCase.expected_delta_mxn}`
      );
      return { boundaries, http, pack };
    }
    if (/\bdelta\b/i.test(answer) && /\bkg\b/i.test(answer) && !/MXN|\$/.test(answer)) {
      boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", "kg presented as primary ranking metric");
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.require_top_n) {
    const rows = incomeForecastRows(body);
    const names = rows.map((r) => String((r && (r.cliente || r.cliente_norm)) || "").trim().toUpperCase());
    const deltas = rows.map((r) => incomeDelta(r));
    const expectedNames = (runtimeCase.expected_top_names || []).map((n) => String(n).toUpperCase());
    const positives = rows.filter((r) => incomeDelta(r) > 0);
    if (rows.length !== runtimeCase.require_top_n || names.join("|") !== expectedNames.join("|")) {
      boundaries.USER_VISIBLE_OUTCOME = mark(
        "FAIL",
        `top n names=${names.join(",")} expected=${expectedNames.join(",")}`
      );
      return { boundaries, http, pack };
    }
    if ((runtimeCase.expected_top_deltas || []).some((d, i) => deltas[i] !== d) || positives.length) {
      boundaries.USER_VISIBLE_OUTCOME = mark(
        "FAIL",
        `top n deltas=${deltas.join(",")} positives=${positives.length}`
      );
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.require_comment_text) {
    const row = findIncomeRow(body, runtimeCase.movement_focus);
    const blob = incomeCommentBlob(row, answer);
    if (!normalizeBlob(blob).includes(normalizeBlob(runtimeCase.require_comment_text))) {
      boundaries.USER_VISIBLE_OUTCOME = mark(
        "FAIL",
        `missing comment focus=${runtimeCase.movement_focus}`
      );
      return { boundaries, http, pack };
    }
    if (runtimeCase.require_comment_date && !String(blob).includes(runtimeCase.require_comment_date)) {
      boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", `missing comment date=${runtimeCase.require_comment_date}`);
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.require_missing_comment) {
    const row = findIncomeRow(body, runtimeCase.movement_focus);
    const c = row && (row.comment || row.comentario);
    const explicit =
      (row && (row.comment_missing || row.sin_comentario)) ||
      /sin comentario registrado/i.test(answer);
    if ((c && (c.body || c.text)) || !explicit) {
      boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", "expected explicit missing comment");
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.forbid_causal_comment && looksLikeCausalComment(answer, runtimeCase.require_comment_text)) {
    boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", "comment converted to cause");
    return { boundaries, http, pack };
  }
  if (runtimeCase.expected_impacto_top_n != null) {
    const packFi = incomeForecastPack(body);
    const shown = incomeForecastRows(body).reduce((s, r) => s + (incomeDelta(r) || 0), 0);
    const declared = packFi.impacto_top_n != null ? Number(packFi.impacto_top_n) : shown;
    if (declared !== runtimeCase.expected_impacto_top_n || shown !== runtimeCase.expected_impacto_top_n) {
      boundaries.USER_VISIBLE_OUTCOME = mark(
        "FAIL",
        `impacto_top_n declared=${declared} shown=${shown} expected=${runtimeCase.expected_impacto_top_n}`
      );
      return { boundaries, http, pack };
    }
    if (looksLikeRentabilidadCaera(answer)) {
      boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", "impacto presented as rentabilidad final");
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.require_forecast_source || runtimeCase.require_clientes_por_mes_source) {
    const packFi = incomeForecastPack(body);
    const src = String(packFi.source_helper || packFi.source || meta.source_helper || "");
    const kind = String(packFi.period_kind || meta.period_kind || "");
    const executive =
      /computeDeltaIngresoClientesPorMes|computeClientesDescuentoMes|clientes por mes|ingresoClienteMarginal/i.test(
        src
      );
    const ols = /computeDeltaIngresoForecast/i.test(src);
    if (runtimeCase.require_clientes_por_mes_source && (!executive || ols)) {
      boundaries.USER_VISIBLE_OUTCOME = mark(
        "FAIL",
        `expected Clientes por mes source; source=${src || "none"} period_kind=${kind || "none"}`
      );
      return { boundaries, http, pack };
    }
    if (
      runtimeCase.require_forecast_source &&
      !runtimeCase.require_clientes_por_mes_source &&
      (!/computeDeltaIngresoForecast|computeDeltaIngresoClientesPorMes|computeClientesDescuentoMes/i.test(src) ||
        /m9|period_compare/i.test(kind))
    ) {
      boundaries.USER_VISIBLE_OUTCOME = mark(
        "FAIL",
        `expected forecast source; source=${src || "none"} period_kind=${kind || "none"}`
      );
      return { boundaries, http, pack };
    }
    if (runtimeCase.forbid_ols_forecast_source && ols) {
      boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", `OLS computeDeltaIngresoForecast still used; source=${src}`);
      return { boundaries, http, pack };
    }
    if (/m9|period_compare/i.test(kind)) {
      boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", `period_kind=${kind}`);
      return { boundaries, http, pack };
    }
  }
  if (runtimeCase.forbid_m9_historical && (pack === "delta_income" || meta.semantic_class === "delta_ingreso_period_compare")) {
    boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", "M9 historical used for forecast question");
    return { boundaries, http, pack };
  }
  if (runtimeCase.require_parity_fixture) {
    const packFi = incomeForecastPack(body);
    const focusName = runtimeCase.movement_focus;
    const expected = focusName ? parityFx.BY_NAME[focusName] : null;
    const row = focusName ? findIncomeRow(body, focusName) : null;
    const kgA = row && (row.kg_a != null ? Number(row.kg_a) : row.kgA != null ? Number(row.kgA) : null);
    const kgB = row && (row.kg_b != null ? Number(row.kg_b) : row.kgB != null ? Number(row.kgB) : null);
    const ingA = row && (row.ingreso_a != null ? Number(row.ingreso_a) : row.ingresoA != null ? Number(row.ingresoA) : null);
    const ingB = row && (row.ingreso_b != null ? Number(row.ingreso_b) : row.ingresoB != null ? Number(row.ingresoB) : null);
    const delta = incomeDelta(row);
    const descB = row && (row.desc_kg_b != null ? Number(row.desc_kg_b) : row.descKgB != null ? Number(row.descKgB) : null);
    const targetKg = packFi.target_kg != null ? Number(packFi.target_kg) : packFi.targetKg != null ? Number(packFi.targetKg) : null;
    const versionState = String(packFi.igf_financial_state || packFi.version_financial_state || "");
    const ventaTon = packFi.igf_venta_ton != null ? Number(packFi.igf_venta_ton) : null;

    if (runtimeCase.require_kg_a_parity) {
      if (!expected || kgA !== expected.kgA) {
        boundaries.USER_VISIBLE_OUTCOME = mark(
          "FAIL",
          `kg A parity focus=${focusName} got=${kgA} expected=${expected && expected.kgA}`
        );
        return { boundaries, http, pack };
      }
    }
    if (runtimeCase.require_kg_b_forecast_parity) {
      if (!expected || kgB !== expected.kgB) {
        boundaries.USER_VISIBLE_OUTCOME = mark(
          "FAIL",
          `kg B forecast parity focus=${focusName} got=${kgB} expected_cpm=${expected && expected.kgB} ols=${expected && expected.olsKgB}`
        );
        return { boundaries, http, pack };
      }
    }
    if (runtimeCase.require_ingreso_a_parity) {
      if (!expected || ingA !== expected.ingresoA) {
        boundaries.USER_VISIBLE_OUTCOME = mark(
          "FAIL",
          `ingreso A parity focus=${focusName} got=${ingA} expected=${expected && expected.ingresoA}`
        );
        return { boundaries, http, pack };
      }
    }
    if (runtimeCase.require_ingreso_b_parity) {
      if (!expected || ingB !== expected.ingresoB) {
        boundaries.USER_VISIBLE_OUTCOME = mark(
          "FAIL",
          `ingreso B parity focus=${focusName} got=${ingB} expected=${expected && expected.ingresoB} ols=${expected && expected.ingresoBOls}`
        );
        return { boundaries, http, pack };
      }
    }
    if (runtimeCase.require_delta_parity) {
      if (!expected || delta !== expected.delta) {
        boundaries.USER_VISIBLE_OUTCOME = mark(
          "FAIL",
          `delta parity focus=${focusName} got=${delta} expected=${expected && expected.delta} ols=${expected && expected.deltaOls}`
        );
        return { boundaries, http, pack };
      }
    }
    if (runtimeCase.require_sign_parity) {
      const cpmSign = expected ? Math.sign(expected.delta) : 0;
      const gotSign = delta == null ? 0 : Math.sign(delta);
      if (!expected || gotSign !== cpmSign || cpmSign <= 0 || Math.sign(expected.deltaOls) >= 0) {
        boundaries.USER_VISIBLE_OUTCOME = mark(
          "FAIL",
          `sign parity focus=${focusName} got=${delta} cpm=${expected && expected.delta} ols=${expected && expected.deltaOls}`
        );
        return { boundaries, http, pack };
      }
    }
    if (runtimeCase.require_hg_parity) {
      if (!expected || !expected.hgChangesIngresoA || ingA !== expected.ingresoA || ingB !== expected.ingresoB) {
        boundaries.USER_VISIBLE_OUTCOME = mark(
          "FAIL",
          `HG parity focus=${focusName} ingresoA=${ingA} expected=${expected && expected.ingresoA} noHg=${expected && expected.ingresoANoHg}`
        );
        return { boundaries, http, pack };
      }
    }
    if (runtimeCase.require_discount_parity) {
      const usedReactSim =
        descB === parityFx.DESC_KG_REACT_SIM ||
        (ingB != null &&
          expected &&
          ingB ===
            parityFx.ingresoClienteMarginalOracle(expected.kgB, parityFx.DESC_KG_REACT_SIM, parityFx.METRICS_B));
      if (
        !expected ||
        !row ||
        usedReactSim ||
        (descB != null && descB !== parityFx.DESC_KG_PERSISTIDO) ||
        ingB !== expected.ingresoB
      ) {
        boundaries.USER_VISIBLE_OUTCOME = mark(
          "FAIL",
          `discount parity focus=${focusName} descB=${descB} ingresoB=${ingB} persistido=${parityFx.DESC_KG_PERSISTIDO} reactSim=${parityFx.DESC_KG_REACT_SIM}`
        );
        return { boundaries, http, pack };
      }
    }
    if (runtimeCase.require_target_version_parity) {
      const decoyKgB =
        expected && parityFx.SUM_MTD_B > 0
          ? Math.round(expected.mtdB * (parityFx.TARGET_KG_FINAL_DECOY / parityFx.SUM_MTD_B) * 100) / 100
          : null;
      const usedFinalDecoy = kgB === decoyKgB || ventaTon === parityFx.IGF_FINAL_DECOY_VERSION.venta_ton;
      if (
        !expected ||
        kgB !== expected.kgB ||
        usedFinalDecoy ||
        /final/i.test(versionState) ||
        (targetKg != null && targetKg !== parityFx.TARGET_KG_B)
      ) {
        boundaries.USER_VISIBLE_OUTCOME = mark(
          "FAIL",
          `target/version parity kgB=${kgB} expected=${expected && expected.kgB} targetKg=${targetKg} ventaTon=${ventaTon} state=${versionState || "none"}`
        );
        return { boundaries, http, pack };
      }
    }
    if (runtimeCase.require_top_n_after_parity) {
      const shown = incomeForecastRows(body);
      const names = shown.map((r) => String((r && (r.cliente || r.cliente_norm)) || "").trim().toUpperCase());
      const deltas = shown.map((r) => incomeDelta(r));
      const expectedNames = parityFx.TOP5_CPM.map((c) => c.cliente);
      const expectedDeltas = parityFx.TOP5_CPM.map((c) => c.delta);
      const olsNames = parityFx.TOP5_OLS.map((c) => c.cliente);
      const positives = shown.filter((r) => incomeDelta(r) > 0);
      const rankedOls = names.join("|") === olsNames.join("|");
      if (
        names.join("|") !== expectedNames.join("|") ||
        expectedDeltas.some((d, i) => deltas[i] !== d) ||
        positives.length ||
        rankedOls
      ) {
        boundaries.USER_VISIBLE_OUTCOME = mark(
          "FAIL",
          `top n after parity names=${names.join(",")} expected=${expectedNames.join(",")} ols=${olsNames.join(",")} deltas=${deltas.join(",")}`
        );
        return { boundaries, http, pack };
      }
      const declared = packFi.impacto_top_n != null ? Number(packFi.impacto_top_n) : null;
      if (declared !== parityFx.IMPACTO_TOP5_CPM) {
        boundaries.USER_VISIBLE_OUTCOME = mark(
          "FAIL",
          `impacto_top_n=${declared} expected=${parityFx.IMPACTO_TOP5_CPM} ols=${parityFx.IMPACTO_TOP5_OLS}`
        );
        return { boundaries, http, pack };
      }
    }
  }
  boundaries.USER_VISIBLE_OUTCOME = mark(
    "PASS",
    meta.requires_clarification ? "specific_or_allowed_clarification" : `mode=${meta.mode || "none"}`
  );
  return { boundaries, http, pack };
}

async function evaluateRuntimeCase(runtimeCase, chat) {
  installRuntimeDeps(chat, igfMapForCase(runtimeCase), runtimeCase);
  const history = [];
  let state = null;
  let last = null;
  const turnTrace = [];

  for (const turn of runtimeCase.turns) {
    last = await postChat(chat.handlePostChat, turn.question, state, history);
    history.push({ role: "user", content: turn.question });
    const meta = metaOf(last.body);
    if (meta.conversation_state) state = meta.conversation_state;
    turnTrace.push({
      question: turn.question,
      http: last.http,
      threw: last.threw ? String(last.threw.message || last.threw) : null,
      mode: meta.mode || null,
      operation: meta.operation || null,
      pack: packKind(last.body),
      error: (last.body && last.body.error) || null,
      executed: "handlePostChat → askDirectorIa",
    });
    if (last.threw) break;
  }

  const evaluated = evaluateLastTurn(runtimeCase, last || { threw: new Error("sin turnos"), http: null, body: null });
  const first = firstBadBoundary(evaluated.boundaries);
  const official5xx = evaluated.http >= 500 ? 1 : 0;

  let emptyIgf = null;
  if (runtimeCase.id === "R-RUNTIME-001") {
    installRuntimeDeps(chat, {});
    const emptyLast = await postChat(chat.handlePostChat, runtimeCase.turns[0].question, null, []);
    emptyIgf = {
      http: emptyLast.http,
      threw: emptyLast.threw ? String(emptyLast.threw.message || emptyLast.threw) : null,
      ok: emptyLast.body && emptyLast.body.ok,
      veracity: metaOf(emptyLast.body).veracity || null,
      operation: metaOf(emptyLast.body).operation || null,
      note: "Misma pregunta y loader real; IGF sin FILAS FINAL. handlePostChat mapea ok:false sin status a 500.",
    };
    installRuntimeDeps(chat, availableIgfMap());
  }

  return {
    id: runtimeCase.id,
    label: runtimeCase.label,
    category: runtimeCase.category,
    question: (runtimeCase.turns[runtimeCase.turns.length - 1] || {}).question,
    result: first ? "FAIL" : "PASS",
    failure_class: first ? "PRODUCT_GOLDEN_FAILURE" : null,
    first_bad_boundary: first,
    boundaries: evaluated.boundaries,
    http: evaluated.http,
    pack: evaluated.pack,
    official_http_5xx: official5xx,
    http_500_with_available_igf: runtimeCase.id === "R-RUNTIME-001" ? (evaluated.http >= 500 ? "REPRODUCED" : "NOT_REPRODUCED") : null,
    http_500_empty_igf: emptyIgf,
    turn_trace: turnTrace,
    notes: runtimeCase.notes || "",
  };
}

async function runRuntimeSet(cases) {
  const list = cases || RUNTIME_CASES;
  process.env.ENABLE_DIRECTOR_IA = "true";
  process.env.AI_ENABLED = "true";
  if (!process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = "runtime-golden-not-live";

  const chat = require("../../lib/director-ia-chat");
  installRuntimeDeps(chat, availableIgfMap());

  const rows = [];
  try {
    for (const c of list) {
      try {
        rows.push(await evaluateRuntimeCase(c, chat));
      } catch (err) {
        const boundaries = {};
        for (const name of BOUNDARIES) boundaries[name] = mark("NOT_REACHED");
        boundaries.HTTP_STATUS = mark("FAIL", `HARNESS: ${err && err.message}`);
        rows.push({
          id: c.id,
          label: c.label,
          category: c.category,
          question: (c.turns[c.turns.length - 1] || {}).question,
          result: "FAIL",
          failure_class: "HARNESS_FAILURE",
          first_bad_boundary: "HTTP_STATUS",
          boundaries,
          http: null,
          pack: null,
          official_http_5xx: 0,
          http_500_with_available_igf: null,
          http_500_empty_igf: null,
          turn_trace: [],
          notes: String(err && err.stack ? err.stack.split("\n")[0] : err),
        });
      }
    }
  } finally {
    clearRuntimeDeps(chat);
  }

  const pass = rows.filter((r) => r.result === "PASS").length;
  const fail = rows.filter((r) => r.result === "FAIL").length;
  const harnessFail = rows.filter((r) => r.failure_class === "HARNESS_FAILURE").length;
  const productFail = rows.filter((r) => r.failure_class === "PRODUCT_GOLDEN_FAILURE").length;
  const http5xx = rows.reduce((n, r) => n + (r.official_http_5xx || 0), 0);
  return { rows, pass, fail, harnessFail, productFail, http5xx, total: rows.length };
}

function formatRuntimeReport(summary) {
  const lines = [];
  lines.push("RUNTIME");
  for (const row of summary.rows) {
    const pad = row.label || row.id;
    const bound = row.first_bad_boundary ? `  FIRST_BAD_BOUNDARY=${row.first_bad_boundary}` : "";
    lines.push(`${row.id}  ${pad}  ${row.result}${bound}`);
  }
  lines.push(`HTTP 5xx ...................................... ${summary.http5xx}`);
  return lines.join("\n");
}

module.exports = {
  BOUNDARIES,
  RUNTIME_CASES,
  NOW,
  runRuntimeSet,
  formatRuntimeReport,
  firstBadBoundary,
  evaluateRuntimeCase,
};
