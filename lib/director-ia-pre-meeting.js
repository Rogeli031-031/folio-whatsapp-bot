"use strict";

/**
 * Chat legado: pre_meeting_brief (first slice B — core ejecutivo).
 * Compone loaders existentes. No phrasebook. No IES. No N5. No Plaud.
 * No Taller Mayor / mejora continua en el pack. No snapshot. No writes.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { currentYearMonthCdmx } = require("./director-ia-mejora-continua");
const {
  loadDailyExecutiveBriefForChat,
  formatDailyExecutiveBriefContext,
  isDailyExecutiveBriefQuestion,
} = require("./director-ia-daily-executive-brief");
const {
  loadCommercialTrendForChat,
  formatCommercialTrendContext,
  isCommercialTrendQuestion,
} = require("./director-ia-commercial-trend");
const { loadClientProfileForChat, formatClientProfileContext } = require("./director-ia-client-profile");
const { loadIgfArrSourceBlocksForChat, formatIgfCompositionBlock } = require("./director-ia-igf-arr");
const {
  loadIgfReviewableSupportsForChat,
  buildIgfReviewableSupportsAnswer,
  isIgfReviewableSupportsQuestion,
} = require("./director-ia-igf-reviewable-supports");
const { buildActionRegisterBoardPayload } = require("./action-register-board");
const {
  summarizeActionRegisterBoard,
  summarizeTopOverdueActions,
  collectResponsableUsuarioIds,
  loadUsuarioRolesByIds,
  todayYmdMexicoCity,
} = require("./director-ia-action-register");
const { assertActionRegisterAccess } = require("./director-ia-m12-revision-notes");
const { isTallerMayorQuestion } = require("./director-ia-taller-mayor");
const { isMonthCloseQuestion } = require("./director-ia-month-close-result");

const SEMANTIC_CLASS = "pre_meeting_brief";
const MEETING_TYPE = "monthly_close";
const PROFILE_MOVER_CAP = 3;

const MESES_ES = Object.freeze([
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
]);

const SYSTEM_ADDENDUM = [
  "EVIDENCIA DE PREPARACIÓN DE JUNTA (chat legado; first slice B: comercial + IGF abierto + acciones + apoyos reviewable + huecos).",
  "No es IES. No es Reasoning Engine N5. No es Plaud. No es Taller Mayor. No es Mejora Continua.",
  "El runtime ya cargó fuentes por separado, same plant, grano nativo de cada una, provenance y limitations separados.",
  "Tú sintetizas: qué destacar, orden, tensiones y qué conviene aclarar antes de la junta.",
  "No inventes causa, responsable, resultado, ahorro ni agenda del Consejo.",
  "Permitido: 'Conviene estar preparado para explicar…' / 'Falta evidencia para responder con seguridad a…' / 'Conviene obtener contexto antes de la junta.'",
  "Prohibido: 'El Consejo te va a preguntar…' / 'Sé que preguntarán…'.",
  "IGF de este pack es proyección/versión vigente del mes ABIERTO. No es cierre real. No lo presentes como actual de un mes cerrado.",
  "reviewable != cancelar != ahorro != reversión. Comentario != causa. Mover != causa. missing != 0. unsupported != 0. error de fuente != hallazgo de negocio.",
  "Si un bloque falta, declara la limitation y usa los demás. No inventes el bloque ausente.",
].join(" ");

function normalizeQuestion(raw) {
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYyyyMm(year, month) {
  return `${Number(year)}-${pad2(Number(month))}`;
}

function openYearMonth(now) {
  return currentYearMonthCdmx(now);
}

/**
 * Tokens de preparación de junta. No copiar frases de producto.
 */
function isPreMeetingQuestion(raw) {
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (/\bayer\b/.test(q) && !/\bjunta\b/.test(q) && !/\breunion\b/.test(q)) return false;
  if (/\bplaud\b/.test(q) || /\bmejora\s+continua\b/.test(q)) return false;
  if (typeof isTallerMayorQuestion === "function" && isTallerMayorQuestion(raw)) return false;
  if (typeof isCommercialTrendQuestion === "function" && isCommercialTrendQuestion(raw)) return false;
  if (typeof isIgfReviewableSupportsQuestion === "function" && isIgfReviewableSupportsQuestion(raw)) {
    return false;
  }
  if (typeof isDailyExecutiveBriefQuestion === "function" && isDailyExecutiveBriefQuestion(raw)) {
    return false;
  }
  if (/\bcomo\s+va\s+(la\s+)?planta\b/.test(q)) return false;
  if (/\bacciones?\b/.test(q) && /\bvencid/.test(q)) return false;

  const meeting =
    /\bjunta\b/.test(q) ||
    /\breunion\b/.test(q) ||
    /\bpre-?cierre\b/.test(q) ||
    /\bprecierre\b/.test(q);
  const prep =
    /\bprepar/.test(q) ||
    /\bllevar\b/.test(q) ||
    /\bantes de entrar\b/.test(q) ||
    /\bantes de (la\s+)?(junta|reunion)\b/.test(q) ||
    /\bhuecos?\b/.test(q) ||
    /\brevisar antes\b/.test(q) ||
    /\bdebo (llevar|revisar|saber)\b/.test(q) ||
    /\bbriefing\b/.test(q) ||
    /\barmar\b/.test(q) ||
    /\barmame\b/.test(q) ||
    /\bpanorama\b/.test(q);

  if (/\bpre-?cierre\b/.test(q) || /\bprecierre\b/.test(q)) return true;
  if (meeting && (prep || /\bcierre\b/.test(q) || /\bejecutiv/.test(q) || /\bcuestion/.test(q) || /\bpuntos?\b/.test(q))) {
    return true;
  }
  if (prep && meeting) return true;
  if (/\bantes de entrar\b/.test(q) && (/\brevis/.test(q) || /\bdebo\b/.test(q) || /\bprepar/.test(q))) {
    return true;
  }
  if (/\bhuecos?\b/.test(q) && (/\bjunta\b/.test(q) || /\breunion\b/.test(q) || /\bantes\b/.test(q))) {
    return true;
  }
  return false;
}

function isPreMeetingFollowUp(raw, kind) {
  if (typeof isMonthCloseQuestion === "function" && isMonthCloseQuestion(raw)) return false;
  if (
    kind === "attention" ||
    kind === "gap_what" ||
    kind === "gap_who" ||
    kind === "gap_why_need" ||
    kind === "confirm" ||
    kind === "why"
  ) {
    return true;
  }
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (typeof isTallerMayorQuestion === "function" && isTallerMayorQuestion(raw)) return false;
  if (typeof isCommercialTrendQuestion === "function" && isCommercialTrendQuestion(raw)) return false;
  if (typeof isIgfReviewableSupportsQuestion === "function" && isIgfReviewableSupportsQuestion(raw)) {
    return false;
  }
  if (/\bacciones?\b/.test(q) && /\bvencid/.test(q)) return false;
  if (/\bhablame\b/.test(q) && /\bcliente\b/.test(q)) return false;
  if (/\bpreocup/.test(q)) return true;
  if (/\bfalta explicar\b/.test(q) || /\bhuecos?\b/.test(q)) return true;
  if (/\bconviene\b/.test(q) && (/\bprepar/.test(q) || /\bexplic/.test(q) || /\baclara/.test(q))) return true;
  if (isPreMeetingQuestion(raw)) return true;
  return false;
}

/**
 * Mes nombrado distinto del abierto, o señal de mes cerrado/pasado.
 * "cierre" de junta de cierre NO cuenta.
 */
function detectClosedMonthRequest(raw, openYm) {
  const q = normalizeQuestion(raw);
  const open = openYm || openYearMonth();
  const named = [];
  const ym = q.match(/\b(20\d{2})[-\/](0?[1-9]|1[0-2])\b/);
  if (ym) {
    const year = parseInt(ym[1], 10);
    const month = parseInt(ym[2], 10);
    if (year !== open.year || month !== open.month) {
      named.push(toYyyyMm(year, month));
    }
  }
  for (let i = 0; i < MESES_ES.length; i++) {
    const re = new RegExp(`\\b${MESES_ES[i]}\\b`);
    if (re.test(q)) {
      const month = MESES_ES[i] === "setiembre" ? 9 : i + 1;
      if (month !== open.month) named.push(toYyyyMm(open.year, month));
    }
  }
  const pastCue = /\bmes pasado\b/.test(q) || /\bmes cerrado\b/.test(q) || /\bcerro\b/.test(q);
  return {
    requested: named.length > 0 || pastCue,
    named_periods: [...new Set(named)],
  };
}

function emptyPlant(plantaId) {
  return { planta_id: Number(plantaId) || null, planta_nombre: null, plant_code: null };
}

function inspectSourceResult(result) {
  if (!result) {
    return {
      available: false,
      missing: true,
      abort: false,
      assembled: null,
      error: "no_result",
      status: 500,
      code: null,
      limitations: ["source_missing"],
      provenance: null,
    };
  }
  if (result.abort) {
    return {
      available: false,
      missing: true,
      abort: true,
      assembled: null,
      error: result.error || "SOURCE_RESTRICTED",
      status: result.status || 403,
      code: result.code || DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      limitations: [result.code || "SOURCE_RESTRICTED"],
      provenance: null,
    };
  }
  if (result.ok === false) {
    return {
      available: false,
      missing: true,
      abort: false,
      assembled: null,
      error: result.error || "load_failed",
      status: result.status || 500,
      code: result.code || null,
      limitations: [result.error || "load_failed"],
      provenance: null,
    };
  }
  return {
    available: true,
    missing: false,
    abort: false,
    assembled: result,
    error: null,
    status: 200,
    code: null,
    limitations: Array.isArray(result.limitations) ? result.limitations : [],
    provenance: result.provenance || null,
  };
}

async function safeLoad(fn, ...args) {
  try {
    return await fn(...args);
  } catch (e) {
    return {
      ok: false,
      abort: false,
      status: 500,
      error: (e && e.message) || "TOOL_ERROR",
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    };
  }
}

async function defaultLoadActions(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const authz = assertActionRegisterAccess(auth, plantaId);
  if (!authz.ok) {
    return {
      ok: false,
      abort: true,
      status: authz.status || 403,
      code: authz.code || DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      error: authz.error || "Sin acceso a Action Register",
    };
  }
  if (opts.board) {
    const board = opts.board;
    const asOf = opts.asOf || todayYmdMexicoCity();
    return {
      ok: true,
      period: { kind: "board_snapshot", as_of: asOf },
      summary: summarizeActionRegisterBoard(board),
      top_overdue: summarizeTopOverdueActions(board, { limit: 5 }),
      provenance: { source: "arr.action_register_items", requery: true },
      limitations: [],
    };
  }
  if (!pool || typeof pool.connect !== "function") {
    return { ok: false, abort: false, status: 500, error: "Pool no configurado para acciones" };
  }
  const client = await pool.connect();
  try {
    const board = await buildActionRegisterBoardPayload(client, Number(plantaId), {
      ensureActionRegisterTables: opts.ensureActionRegisterTables,
      includeDicf: false,
      includeNotes: false,
    });
    const asOf = todayYmdMexicoCity();
    const roleMap = await loadUsuarioRolesByIds(client, collectResponsableUsuarioIds(board));
    return {
      ok: true,
      period: { kind: "board_snapshot", as_of: asOf },
      summary: summarizeActionRegisterBoard(board),
      top_overdue: summarizeTopOverdueActions(board, { roleMap, limit: 5 }),
      provenance: { source: "arr.action_register_items", requery: true },
      limitations: [],
    };
  } catch (e) {
    return {
      ok: false,
      abort: false,
      status: 500,
      error: (e && e.message) || "Error Action Register",
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    };
  } finally {
    client.release();
  }
}

function pickMoverIdentities(trendAssembled) {
  const movers = [];
  const seen = new Set();
  const push = (m) => {
    if (!m) return;
    const key = String(m.cliente_key || "").trim();
    const display = String(m.cliente || m.cliente_norm || m.display || "").trim();
    const id = key || display;
    if (!id || seen.has(id)) return;
    seen.add(id);
    movers.push({
      cliente_key: key || null,
      cliente_keys: Array.isArray(m.cliente_keys) ? m.cliente_keys : key ? [key] : [],
      display: display || key,
    });
  };
  push(trendAssembled && trendAssembled.first_mover);
  for (const m of (trendAssembled && trendAssembled.top_movers) || []) {
    if (movers.length >= PROFILE_MOVER_CAP) break;
    push(m);
  }
  return movers;
}

function deriveInformationGaps(pack) {
  const gaps = [];
  const suggested = [];

  const pushGap = (row) => {
    gaps.push(row);
    if (row.suggest_request) {
      suggested.push({
        entity: row.entity || null,
        missing_field: row.missing_field,
        why: row.statement,
        read_only: true,
        sends_message: false,
        writes: false,
      });
    }
  };

  const daily = pack.commercial && pack.commercial.daily;
  if (daily && daily.available && daily.assembled && daily.assembled.information_gaps) {
    const salesGaps = daily.assembled.information_gaps.sales || [];
    const discGaps = daily.assembled.information_gaps.discount || [];
    for (const g of [...salesGaps, ...discGaps]) {
      if (g && g.explanation_gap) {
        pushGap({
          kind: "commercial_movement_unexplained",
          entity: g.cliente_norm || null,
          missing_field: "comentario_o_dicf",
          statement: "No encuentro evidencia cargada que explique este movimiento.",
          suggest_request: true,
          source: "daily_executive_brief",
        });
      }
    }
  }
  if (daily && daily.missing) {
    pushGap({
      kind: "source_unavailable",
      missing_field: "daily_executive_brief",
      statement: "El brief diario no pudo establecerse. missing != 0.",
      suggest_request: false,
      source: "daily_executive_brief",
    });
  }

  const trend = pack.commercial && pack.commercial.trend;
  if (trend && trend.available && trend.assembled) {
    const movers = pickMoverIdentities(trend.assembled);
    const profiles = (pack.commercial && pack.commercial.profiles) || [];
    for (const mover of movers) {
      const prof = profiles.find(
        (p) =>
          p &&
          p.available &&
          p.assembled &&
          p.assembled.identity &&
          ((mover.cliente_key && p.assembled.identity.cliente_key === mover.cliente_key) ||
            (mover.display && p.assembled.identity.display_name === mover.display))
      );
      const comments = prof && prof.assembled && prof.assembled.comments;
      const dicf = prof && prof.assembled && prof.assembled.actions;
      const hasContext = (Array.isArray(comments) && comments.length > 0) || (Array.isArray(dicf) && dicf.length > 0);
      if (prof && prof.available && !hasContext) {
        pushGap({
          kind: "mover_without_recorded_context",
          entity: mover.display || mover.cliente_key,
          missing_field: "comentario_o_dicf",
          statement: "No encuentro evidencia cargada que explique este movimiento.",
          suggest_request: true,
          source: "commercial_trend+client_profile",
        });
      }
    }
  }
  if (trend && trend.missing) {
    pushGap({
      kind: "source_unavailable",
      missing_field: "commercial_trend",
      statement: "La tendencia comercial no pudo establecerse. missing != 0.",
      suggest_request: false,
      source: "commercial_trend",
    });
  }

  const igf = pack.financial && pack.financial.igf;
  if (igf && igf.available && igf.assembled && igf.assembled.igf && igf.assembled.igf.row) {
    pushGap({
      kind: "igf_no_causal_driver",
      missing_field: "causal_explanation",
      statement:
        "El snapshot IGF abierto está cargado como proyección/versión vigente; no hay driver causal establecido en la evidencia cargada.",
      suggest_request: false,
      source: "igf",
    });
  }
  if (igf && igf.missing) {
    pushGap({
      kind: "source_unavailable",
      missing_field: "igf_open_month",
      statement: "IGF del mes abierto no pudo establecerse. No se inventa un cierre.",
      suggest_request: false,
      source: "igf",
    });
  }

  const actions = pack.actions;
  if (actions && actions.available && actions.assembled) {
    for (const row of actions.assembled.top_overdue || []) {
      pushGap({
        kind: "overdue_without_recorded_result",
        entity: row.titulo || String(row.id),
        missing_field: "resultado_cierre",
        statement: "No hay resultado registrado para esta acción vencida en la evidencia disponible.",
        suggest_request: true,
        source: "action_register",
      });
    }
  }
  if (actions && actions.missing) {
    pushGap({
      kind: "source_unavailable",
      missing_field: "action_register",
      statement: "Action Register no pudo establecerse. missing != 0.",
      suggest_request: false,
      source: "action_register",
    });
  }

  const supports = pack.supports;
  if (supports && supports.available && supports.assembled && Number(supports.assembled.reviewable_count) > 0) {
    pushGap({
      kind: "reviewable_without_commercial_link",
      missing_field: "folio_cliente_commercial_evidence",
      statement:
        "Hay Folios reviewable; no hay evidencia física folio→cliente→venta/comentarios en la evidencia cargada.",
      suggest_request: false,
      source: "igf_reviewable_supports",
    });
  }
  if (supports && supports.missing) {
    pushGap({
      kind: "source_unavailable",
      missing_field: "igf_reviewable_supports",
      statement: "Apoyos reviewable no pudieron establecerse. missing != 0.",
      suggest_request: false,
      source: "igf_reviewable_supports",
    });
  }

  if (pack.closed_month_named) {
    pushGap({
      kind: "closed_month_out_of_scope",
      missing_field: "closed_month_igf_actual",
      statement:
        "Se nombró un mes distinto del abierto. Este first slice no responde ese mes como si fuera el abierto.",
      suggest_request: false,
      source: "pre_meeting_brief",
    });
  }

  return { gaps, suggested_requests: suggested };
}

function derivePendingInformationGap(pack) {
  const listed = ((pack && pack.information_gaps) || []).map((g) => g.missing_field || g.kind).filter(Boolean);
  return {
    missing_fields: [...new Set(listed)].slice(0, 16),
    why_blocks:
      "Un hueco dice que falta evidencia cargada. No afirma la causa ni inventa el dato ausente.",
    physical_source: null,
    physical_person: null,
  };
}

function formatActionsBlock(actions) {
  if (!actions || !actions.available || !actions.assembled) {
    return `acciones no establecidas | missing=true | error=${(actions && actions.error) || "—"}`;
  }
  const s = actions.assembled.summary || {};
  const lines = [
    `ACTIONS | period_kind=board_snapshot as_of=${(actions.assembled.period && actions.assembled.period.as_of) || "—"}`,
    `open=${s.open != null ? s.open : "—"} closed=${s.closed != null ? s.closed : "—"} overdue=${
      s.overdue != null ? s.overdue : "—"
    }`,
    "vencida != culpa. responsable registrado != responsable del problema.",
  ];
  const top = actions.assembled.top_overdue || [];
  if (!top.length) lines.push("(sin vencidas válidas en este snapshot)");
  for (const a of top) {
    lines.push(
      `- ${a.titulo || "(sin título)"} | tema=${a.tema || "—"} | días=${a.dias_vencido ?? "—"} | resp=${
        a.responsable || "—"
      } | resultado_cierre=no_en_este_resumen`
    );
  }
  return lines.join("\n");
}

function formatIgfBlock(igf) {
  if (!igf || !igf.available || !igf.assembled) {
    return `IGF no establecido | missing=true | error=${(igf && igf.error) || "—"} | no inventar cierre`;
  }
  const block = igf.assembled;
  const snap = block.igf || {};
  const lines = [
    `IGF | period_kind=open_month ${block.year}-${pad2(block.month)} | label=forecast_or_latest_version_not_closed_actual`,
    `planta=${(block.plant && block.plant.planta_nombre) || "—"}`,
    `version=${snap.version_number != null ? `v${snap.version_number}` : "—"} id=${snap.version_id != null ? snap.version_id : "—"}`,
    "No es actual de mes cerrado. No reconstruyas forecast histórico.",
  ];
  if (snap.load_error) lines.push(`igf_load_error=${snap.load_error}`);
  if (snap.composition) {
    lines.push(...formatIgfCompositionBlock(snap.composition));
  } else if (!snap.row) {
    lines.push("Sin fila IGF coincidente para esta planta. missing != 0.");
  }
  return lines.join("\n");
}

function formatPreMeetingContext(assembled) {
  const plant = (assembled && assembled.plant) || emptyPlant(null);
  const commercial = (assembled && assembled.commercial) || {};
  const lines = [
    `PRE-MEETING BRIEF | source_class=${SEMANTIC_CLASS}`,
    `planta=${plant.planta_nombre || "—"} id=${plant.planta_id != null ? plant.planta_id : "—"}`,
    `meeting_period=${assembled.meeting_period} meeting_type=${assembled.meeting_type}`,
    `generated_at=${assembled.generated_at}`,
    `partial=${Boolean(assembled.partial)} assembly_status=${assembled.assembly_status}`,
    "Cada bloque conserva grano, provenance y limitations. No reconciliar en silencio.",
    "Taller Mayor y Mejora Continua NO están en este pack. Plaud NO está.",
    "",
    "=== BLOQUE COMERCIAL / BRIEF DIARIO (ayer) ===",
  ];
  if (commercial.daily && commercial.daily.available && commercial.daily.assembled) {
    lines.push(formatDailyExecutiveBriefContext(commercial.daily.assembled));
  } else {
    lines.push(
      `brief diario no establecido | missing=true | error=${
        (commercial.daily && commercial.daily.error) || "—"
      }`
    );
  }
  lines.push("");
  lines.push("=== BLOQUE COMERCIAL / TENDENCIA (90d nativo) ===");
  if (commercial.trend && commercial.trend.available && commercial.trend.assembled) {
    lines.push(formatCommercialTrendContext(commercial.trend.assembled));
  } else {
    lines.push(
      `tendencia no establecida | missing=true | error=${(commercial.trend && commercial.trend.error) || "—"}`
    );
  }
  lines.push("");
  lines.push("=== BLOQUE COMERCIAL / PERFILES DE MOVERS YA RANKEADOS ===");
  const profiles = commercial.profiles || [];
  if (!profiles.length) lines.push("(sin perfiles; no se inventa cliente)");
  for (const p of profiles) {
    if (p.available && p.assembled) lines.push(formatClientProfileContext(p.assembled));
    else lines.push(`perfil no establecido | missing=true | error=${p.error || "—"}`);
  }
  lines.push("");
  lines.push("=== BLOQUE IGF MES ABIERTO ===");
  lines.push(formatIgfBlock(assembled.financial && assembled.financial.igf));
  lines.push("");
  lines.push("=== BLOQUE ACCIONES ===");
  lines.push(formatActionsBlock(assembled.actions));
  lines.push("");
  lines.push("=== BLOQUE APOYOS REVIEWABLE ===");
  if (assembled.supports && assembled.supports.available && assembled.supports.assembled) {
    lines.push(buildIgfReviewableSupportsAnswer(assembled.supports.assembled, "apoyos reviewable"));
  } else {
    lines.push(
      `reviewable no establecido | missing=true | error=${
        (assembled.supports && assembled.supports.error) || "—"
      }`
    );
  }
  lines.push("");
  lines.push("=== INFORMATION GAPS (crítico; ausencia de evidencia cargada, no causa) ===");
  const gaps = assembled.information_gaps || [];
  if (!gaps.length) lines.push("(sin huecos derivados; eso no prueba que no falte algo fuera de estas fuentes)");
  for (const g of gaps) {
    lines.push(`- ${g.kind} | entity=${g.entity || "—"} | ${g.statement}`);
  }
  lines.push("");
  lines.push("=== SUGGESTED REQUESTS (read-only; no enviar; no escribir) ===");
  const reqs = assembled.suggested_requests || [];
  if (!reqs.length) lines.push("(ninguna)");
  for (const r of reqs) {
    lines.push(`- ${r.entity || "—"} | ${r.missing_field} | ${r.why} | writes=false`);
  }
  lines.push("");
  lines.push("=== LIMITATIONS ===");
  lines.push((assembled.limitations || []).join(" | ") || "—");
  return lines.join("\n");
}

function buildPreMeetingPrompt(assembled, question) {
  return {
    systemPrompt: `${SYSTEM_ADDENDUM} Responde en español. Una sola respuesta.`,
    userContent: [`Pregunta del usuario: ${String(question || "").trim()}`, "", formatPreMeetingContext(assembled)].join(
      "\n"
    ),
  };
}

function buildPreMeetingChatResult(assembled, opts = {}) {
  const planta_id =
    opts.planta_id != null ? Number(opts.planta_id) : assembled.plant && assembled.plant.planta_id;
  const openaiCalled = opts.openai_called !== false;
  return {
    ok: true,
    answer: opts.answer || "",
    sources: [
      "arr.ventas_diarias_cliente",
      "arr.descuentos_diarios_cliente",
      "igf.compromiso_lines",
      "arr.action_register_items",
      "public.folios",
    ],
    context_meta: {
      mode: SEMANTIC_CLASS,
      requested_domain: SEMANTIC_CLASS,
      openai_called: openaiCalled,
      openai_call_count: openaiCalled ? 1 : 0,
      semantic_class: SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      assembly_status: assembled.assembly_status,
      meeting_period: assembled.meeting_period,
      meeting_type: assembled.meeting_type,
      limitations: assembled.limitations || [],
      prompt_mode: SEMANTIC_CLASS,
      focus_type: SEMANTIC_CLASS,
      ies_runtime: false,
      reasoning_engine: false,
      plaud: false,
      taller_mayor_included: false,
      mejora_continua_included: false,
      writes: false,
      partial: Boolean(assembled.partial),
    },
    pre_meeting_brief: {
      semantic_class: SEMANTIC_CLASS,
      plant: assembled.plant,
      meeting_period: assembled.meeting_period,
      meeting_type: assembled.meeting_type,
      information_gaps: assembled.information_gaps,
      suggested_requests: assembled.suggested_requests,
      limitations: assembled.limitations,
      partial: Boolean(assembled.partial),
      assembly_status: assembled.assembly_status,
      provenance: assembled.provenance,
    },
  };
}

async function loadPreMeetingBriefForChat(pool, plantaId, req, opts = {}) {
  const pid = Number(plantaId);
  if (!Number.isFinite(pid) || pid <= 0) {
    return {
      ok: false,
      abort: true,
      status: 400,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      error: "planta_id es obligatorio",
    };
  }

  const now = opts.now || new Date();
  const openYm = opts.openYearMonth || openYearMonth(now);
  const meeting_period = toYyyyMm(openYm.year, openYm.month);
  const userQuestion = opts.question != null ? String(opts.question) : "";
  const closed = detectClosedMonthRequest(userQuestion, openYm);

  const loadDaily = opts.loadDailyBrief || loadDailyExecutiveBriefForChat;
  const loadTrend = opts.loadTrend || loadCommercialTrendForChat;
  const loadProfile = opts.loadProfile || loadClientProfileForChat;
  const loadIgf = opts.loadIgf || loadIgfArrSourceBlocksForChat;
  const loadSupports = opts.loadSupports || loadIgfReviewableSupportsForChat;
  const loadActions = opts.loadActions || defaultLoadActions;

  const dailyRaw = await safeLoad(loadDaily, pool, pid, req, {
    question: userQuestion,
    now,
    todayYmd: opts.todayYmd,
    targetDate: opts.targetDate,
    auth: opts.auth,
    resolvePlanta: opts.resolveDailyPlanta || opts.resolvePlanta,
    loadSales: opts.loadSales,
    loadDiscount: opts.loadDiscount,
  });
  const trendRaw = await safeLoad(loadTrend, pool, pid, req, {
    question: "como vamos en casa y comisionistas los ultimos 3 meses",
    range_days: 90,
    channel: "both",
    compare: true,
    now,
    auth: opts.auth,
    resolvePlanta: opts.resolveTrendPlanta || opts.resolvePlanta,
    client: opts.trendClient,
    loadCommercialTrend: opts.loadCommercialTrendEngine,
    resolvePlantCodes: opts.resolvePlantCodes,
    queryBounds: opts.queryTrendBounds,
    querySalesSeries: opts.queryTrendSales,
    queryDiscountSeries: opts.queryTrendDiscount,
    queryClientTons: opts.queryTrendClients,
  });
  const igfRaw = await safeLoad(loadIgf, pool, pid, req, "igf");
  const supportsRaw = await safeLoad(loadSupports, pool, pid, req, {
    question: "apoyos reviewable",
    nowYearMonth: openYm,
    auth: opts.auth,
    resolvePlanta: opts.resolveSupportsPlanta || opts.resolvePlanta,
    queryFolios: opts.queryReviewableFolios,
    loadIgfBlocks: opts.loadIgfBlocks,
  });
  const actionsRaw = await safeLoad(loadActions, pool, pid, req, {
    auth: opts.auth,
    board: opts.actionBoard,
    asOf: opts.actionAsOf,
    ensureActionRegisterTables: opts.ensureActionRegisterTables,
  });

  const daily = inspectSourceResult(dailyRaw);
  const trend = inspectSourceResult(trendRaw);
  const igf = inspectSourceResult(igfRaw);
  const supports = inspectSourceResult(supportsRaw);
  const actions = inspectSourceResult(actionsRaw);

  const profiles = [];
  if (trend.available && trend.assembled && opts.skipProfiles !== true) {
    const movers = pickMoverIdentities(trend.assembled);
    for (const mover of movers) {
      if (!mover.cliente_key && !mover.display) continue;
      const profRaw = await safeLoad(loadProfile, pool, pid, req, {
        question: userQuestion,
        display_name: mover.display,
        cliente_key: mover.cliente_key,
        cliente_keys: mover.cliente_keys,
        now,
        auth: opts.auth,
        resolvePlanta: opts.resolveProfilePlanta || opts.resolvePlanta,
        resolvePlantCodes: opts.resolvePlantCodes,
        queryMonthlySales: opts.queryProfileSales,
        queryMonthlyDiscount: opts.queryProfileDiscount,
        queryCommentsByKeys: opts.queryProfileComments,
        queryActionsByKeys: opts.queryProfileActions,
        client: opts.profileClient,
      });
      profiles.push(inspectSourceResult(profRaw));
    }
  }

  const sections = [daily, trend, igf, supports, actions];
  if (sections.every((s) => s.abort)) {
    return {
      ok: false,
      abort: true,
      status: daily.status || 403,
      code: daily.code || DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      error: daily.error || "Sin acceso a preparación de junta",
    };
  }

  const plant =
    (daily.available && daily.assembled && daily.assembled.plant) ||
    (trend.available && trend.assembled && trend.assembled.plant) ||
    (igf.available && igf.assembled && igf.assembled.plant) ||
    emptyPlant(pid);

  const availableCount = sections.filter((s) => s.available).length;
  let assembly_status = "complete";
  if (availableCount === 0) assembly_status = "unavailable";
  else if (availableCount < sections.length || profiles.some((p) => p.missing) || closed.requested) {
    assembly_status = "partial";
  }

  const limitations = [];
  if (daily.missing) limitations.push("commercial:daily_unavailable");
  if (trend.missing) limitations.push("commercial:trend_unavailable");
  if (igf.missing) limitations.push("igf:unavailable");
  if (actions.missing) limitations.push("actions:unavailable");
  if (supports.missing) limitations.push("supports:unavailable");
  if (closed.requested) {
    limitations.push("closed_month_requested_out_of_first_slice");
    limitations.push("open_month_not_substituted_as_named_closed_month");
  }
  limitations.push("igf_open_month_is_forecast_or_latest_version_not_actual_close");
  limitations.push("taller_mayor_excluded_from_first_slice");
  limitations.push("mejora_continua_excluded_from_first_slice");
  limitations.push("plaud_excluded");
  limitations.push("read_only");

  const pack = {
    ok: true,
    abort: false,
    semantic_class: SEMANTIC_CLASS,
    plant,
    meeting_period,
    meeting_type: MEETING_TYPE,
    generated_at: new Date(now).toISOString(),
    closed_month_named: closed.requested,
    named_closed_periods: closed.named_periods,
    commercial: { daily, trend, profiles },
    financial: { igf },
    actions,
    supports,
    partial: assembly_status !== "complete",
    assembly_status,
    limitations,
    provenance: {
      daily: daily.provenance,
      trend: trend.provenance,
      igf: igf.available && igf.assembled ? { source: "igf.compromiso_lines", period: meeting_period } : null,
      actions: actions.provenance,
      supports: supports.available && supports.assembled ? supports.assembled.limitations || [] : null,
      requery: true,
    },
  };
  const derived = deriveInformationGaps(pack);
  pack.information_gaps = derived.gaps;
  pack.suggested_requests = derived.suggested_requests;
  pack.pending_information_gap = derivePendingInformationGap(pack);
  return pack;
}

module.exports = {
  SEMANTIC_CLASS,
  MEETING_TYPE,
  SYSTEM_ADDENDUM,
  isPreMeetingQuestion,
  isPreMeetingFollowUp,
  detectClosedMonthRequest,
  loadPreMeetingBriefForChat,
  formatPreMeetingContext,
  buildPreMeetingPrompt,
  buildPreMeetingChatResult,
  deriveInformationGaps,
  derivePendingInformationGap,
  pickMoverIdentities,
  defaultLoadActions,
};
