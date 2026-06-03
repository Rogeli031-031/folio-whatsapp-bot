"use strict";

const { pgCalendarDateToYmd } = require("./action-register-board");

const SIN_RESPONSABLE = "Sin responsable";
const SIN_TEMA = "Sin tema";
const DEFAULT_RESPONSABLES_LIMIT = 10;
const DEFAULT_TOP_OVERDUE_LIMIT = 10;
const DEFAULT_FINDINGS_LIMIT = 5;
const DEFAULT_INVALID_OVERDUE_EXAMPLES_LIMIT = 10;
const DEFAULT_TEMA_DETAILS_TEMAS_LIMIT = 5;
const DEFAULT_TEMA_DETAILS_ACTIONS_LIMIT = 10;
/** ~10 años; due_date sentinelas (1900/1970/0001) quedan fuera de métricas ejecutivas. */
const MAX_DIAS_VENCIDO_VALID = 3650;

const PRIORIDAD_RANK = { CRITICA: 4, ALTA: 3, MEDIA: 2, BAJA: 1 };

function todayYmdMexicoCity() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isItemOverdue(item, todayYmd) {
  if (item.closed) return false;
  if (item.dicf) {
    const estado = String(item.dicf_estado || "").toLowerCase();
    return estado === "vencido" || estado === "compromiso_atrasado";
  }
  const due = pgCalendarDateToYmd(item.due_date);
  return !!due && due < todayYmd;
}

/** Clave de agrupación: minúsculas, sin acentos, espacios colapsados. */
function normalizePersonNameKey(raw) {
  const s = String(raw || "").trim();
  if (!s) return SIN_RESPONSABLE.toLowerCase();
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getResponsableGrouping(item) {
  const raw = String(item.responsable || "").trim();
  if (!raw) {
    return { key: SIN_RESPONSABLE.toLowerCase(), display: SIN_RESPONSABLE };
  }
  return { key: normalizePersonNameKey(raw), display: raw };
}

function getTemaName(item) {
  const s = String(item.tema || "").trim();
  return s || SIN_TEMA;
}

function calcProgressPercent(openCount, closedCount) {
  const total = openCount + closedCount;
  if (total <= 0) return 0;
  return Math.round((closedCount / total) * 1000) / 10;
}

function ymdToUtcMs(ymd) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function daysBetweenYmd(fromYmd, toYmd) {
  const fromMs = ymdToUtcMs(fromYmd);
  const toMs = ymdToUtcMs(toYmd);
  if (fromMs == null || toMs == null) return null;
  return Math.floor((toMs - fromMs) / 86400000);
}

function isDiasVencidoValid(diasVencido) {
  const d = Number(diasVencido);
  if (!Number.isFinite(d) || d < 1) return false;
  return d <= MAX_DIAS_VENCIDO_VALID;
}

function isDueDateYmdPlausible(ymd) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const year = Number(ymd.slice(0, 4));
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return false;
  return true;
}

function classifyPrioridad(diasVencido) {
  const d = Number(diasVencido) || 0;
  if (d > 30) return "CRITICA";
  if (d >= 15) return "ALTA";
  if (d >= 7) return "MEDIA";
  return "BAJA";
}

function computeDiasVencido(item, todayYmd) {
  if (!isItemOverdue(item, todayYmd)) return 0;
  const due = pgCalendarDateToYmd(item.due_date);
  if (!due) {
    // DICF vencido sin fecha_compromiso: no inferir miles de días.
    return 1;
  }
  const rawDays = daysBetweenYmd(due, todayYmd);
  if (rawDays == null) return 0;
  return Math.max(1, rawDays);
}

/**
 * Registro con due_date implausible o dias_vencido fuera de rango operativo.
 * @returns {{ invalid: boolean, reason: string | null, due_date_ymd: string, dias_vencido: number }}
 */
function assessOverdueItemValidity(item, todayYmd) {
  const dueYmd = pgCalendarDateToYmd(item.due_date);
  const dias_vencido = computeDiasVencido(item, todayYmd);
  if (item.dicf && !dueYmd) {
    return { invalid: false, reason: null, due_date_ymd: "", dias_vencido };
  }
  if (dueYmd && !isDueDateYmdPlausible(dueYmd)) {
    return { invalid: true, reason: "due_date_fuera_de_rango", due_date_ymd: dueYmd, dias_vencido };
  }
  if (!isDiasVencidoValid(dias_vencido)) {
    return { invalid: true, reason: "dias_vencido_excesivo", due_date_ymd: dueYmd, dias_vencido };
  }
  return { invalid: false, reason: null, due_date_ymd: dueYmd, dias_vencido };
}

/** Abierta, vencida por reglas de negocio y con due_date/días en rango operativo. */
function isValidOverdueItem(item, todayYmd) {
  if (!isItemOverdue(item, todayYmd)) return false;
  return !assessOverdueItemValidity(item, todayYmd).invalid;
}

function buildInvalidOverdueExample(item, validity) {
  const dueYmd = validity.due_date_ymd || pgCalendarDateToYmd(item.due_date) || null;
  return {
    id: Number(item.id),
    titulo: String(item.title || "").trim() || "(sin título)",
    tema: getTemaName(item),
    responsable: formatResponsableLabel(item),
    due_date: dueYmd || null,
    reason: validity.reason || "fecha_invalida",
  };
}

function resolveRoleForItem(item, roleMap) {
  const uid = item.responsable_usuario_id;
  if (uid == null || !Number.isFinite(Number(uid))) {
    return { role_key: null, role_name: null };
  }
  const r = roleMap.get(Number(uid));
  if (!r) return { role_key: null, role_name: null };
  return { role_key: r.role_key || null, role_name: r.role_name || null };
}

function formatResponsableLabel(item) {
  const raw = String(item.responsable || "").trim();
  if (!raw) return null;
  return raw;
}

function computeRiskLevel(overdueCount) {
  const n = Number(overdueCount) || 0;
  if (n > 50) return "ALTO";
  if (n >= 20) return "MEDIO";
  return "BAJO";
}

function formatRoleTag(roleKey, roleName) {
  if (roleKey) return String(roleKey);
  if (roleName) return String(roleName);
  return "";
}

function pluralAccion(count) {
  const n = Number(count) || 0;
  return n === 1 ? "1 acción" : `${n} acciones`;
}

function pluralVencida(count) {
  const n = Number(count) || 0;
  return n === 1 ? "1 vencida" : `${n} vencidas`;
}

function pluralAbierta(count) {
  const n = Number(count) || 0;
  return n === 1 ? "1 acción abierta" : `${n} acciones abiertas`;
}

function formatOpenOverduePhrase(openCount, overdueCount) {
  return `${pluralAbierta(openCount)} y ${pluralVencida(overdueCount)}`;
}

/**
 * Hallazgos ejecutivos a partir de summary, responsables y temas ya calculados.
 */
function buildExecutiveSummary(summary, responsables, temas, opts = {}) {
  const limit =
    opts.limit != null && Number.isFinite(opts.limit) && opts.limit > 0
      ? Math.floor(opts.limit)
      : DEFAULT_FINDINGS_LIMIT;
  const findings = [];
  const overdue = Number(summary?.overdue) || 0;
  const risk_level = computeRiskLevel(overdue);

  const temasSorted = [...(temas || [])];
  const topTema = temasSorted[0];
  if (topTema && (topTema.open_count > 0 || topTema.overdue_count > 0)) {
    findings.push(
      `${topTema.name} concentra ${formatOpenOverduePhrase(topTema.open_count, topTema.overdue_count)}.`
    );
  }

  const topResp = (responsables || []).find((r) => r.name !== SIN_RESPONSABLE && r.open_count > 0);
  if (topResp) {
    const tag = formatRoleTag(topResp.role_key, topResp.role_name);
    const rolePart = tag ? ` (${tag})` : "";
    findings.push(
      `${topResp.name}${rolePart} concentra ${formatOpenOverduePhrase(topResp.open_count, topResp.overdue_count)}.`
    );
  }

  const secondTema = temasSorted.find(
    (t, idx) => idx > 0 && t.overdue_count > 0 && t.name !== topTema?.name
  );
  if (secondTema) {
    findings.push(
      `${secondTema.name} mantiene ${formatOpenOverduePhrase(secondTema.open_count, secondTema.overdue_count)}.`
    );
  }

  const temasConTotal = temasSorted.filter((t) => t.open_count + t.closed_count > 0);
  const bestProgress = [...temasConTotal].sort((a, b) => b.progress_percent - a.progress_percent)[0];
  if (bestProgress && bestProgress.progress_percent > 0) {
    findings.push(
      `${bestProgress.name} presenta el mejor desempeño con ${bestProgress.progress_percent}% de avance.`
    );
  }

  const progressCandidate = temasConTotal.find(
    (t) =>
      t.name !== bestProgress?.name &&
      t.progress_percent > 0 &&
      t.open_count + t.closed_count >= 2
  );
  if (progressCandidate) {
    findings.push(`${progressCandidate.name} registra ${progressCandidate.progress_percent}% de avance.`);
  }

  if (findings.length === 0 && overdue === 0) {
    findings.push("No hay acciones vencidas registradas en este momento.");
  } else if (findings.length === 0) {
    findings.push(`Se registran ${pluralAccion(overdue)} vencidas abiertas en la planta.`);
  }

  return {
    risk_level,
    findings: findings.slice(0, limit),
  };
}

/**
 * Top acciones vencidas abiertas (deduplicadas).
 * @param {Parameters<typeof summarizeActionRegisterBoard>[0]} board
 * @param {{ limit?: number, roleMap?: Map<number, { role_key: string | null, role_name: string | null }> }} [opts]
 */
function summarizeTopOverdueActions(board, opts = {}) {
  const roleMap = opts.roleMap || new Map();
  const limit =
    opts.limit != null && Number.isFinite(opts.limit) && opts.limit > 0
      ? Math.floor(opts.limit)
      : DEFAULT_TOP_OVERDUE_LIMIT;
  const todayYmd = todayYmdMexicoCity();
  const rows = [];

  for (const item of getDedupedBoardItems(board)) {
    if (item.closed) continue;
    if (!isValidOverdueItem(item, todayYmd)) continue;
    const validity = assessOverdueItemValidity(item, todayYmd);
    const dias_vencido = validity.dias_vencido;
    const prioridad = classifyPrioridad(dias_vencido);
    const { role_key, role_name } = resolveRoleForItem(item, roleMap);
    rows.push({
      id: Number(item.id),
      titulo: String(item.title || "").trim() || "(sin título)",
      tema: getTemaName(item),
      responsable: formatResponsableLabel(item),
      role_key,
      role_name,
      dias_vencido,
      prioridad,
    });
  }

  rows.sort((a, b) => {
    if (b.dias_vencido !== a.dias_vencido) return b.dias_vencido - a.dias_vencido;
    const pr =
      (PRIORIDAD_RANK[b.prioridad] || 0) - (PRIORIDAD_RANK[a.prioridad] || 0);
    if (pr !== 0) return pr;
    return a.titulo.localeCompare(b.titulo, "es");
  });

  return rows.slice(0, limit);
}

/**
 * Ítems del board deduplicados por id (revisión más reciente gana).
 * @param {{ revisions: Array<{ id: number }>, cells: Record<string, Record<string, Array<Record<string, unknown>>>> }} board
 * @returns {Array<Record<string, unknown>>}
 */
function getDedupedBoardItems(board) {
  const revisionRank = new Map();
  const revisions = board.revisions || [];
  for (let i = 0; i < revisions.length; i++) {
    revisionRank.set(String(revisions[i].id), i);
  }

  const byId = new Map();
  const cells = board.cells || {};
  for (const [revisionId, temas] of Object.entries(cells)) {
    const rank = revisionRank.has(revisionId) ? revisionRank.get(revisionId) : 9999;
    for (const items of Object.values(temas || {})) {
      for (const item of items || []) {
        const id = item.id;
        if (id == null) continue;
        const key = String(id);
        const prev = byId.get(key);
        if (!prev || rank < prev.rank) {
          byId.set(key, { item, rank });
        }
      }
    }
  }

  return Array.from(byId.values(), ({ item }) => item);
}

/**
 * Resumen open/closed/overdue a partir del payload del board (ítems deduplicados por id).
 * @param {{ revisions: Array<{ id: number, revision_date: unknown }>, cells: Record<string, Record<string, Array<Record<string, unknown>>>> }} board
 */
function summarizeActionRegisterBoard(board) {
  const todayYmd = todayYmdMexicoCity();
  let open = 0;
  let closed = 0;
  let overdue = 0;

  for (const item of getDedupedBoardItems(board)) {
    if (item.closed) {
      closed += 1;
    } else {
      open += 1;
      if (isValidOverdueItem(item, todayYmd)) overdue += 1;
    }
  }

  return { open, closed, overdue };
}

/**
 * Acciones abiertas vencidas con fecha/días fuera de rango operativo (no cuentan en métricas ejecutivas).
 * @param {Parameters<typeof summarizeActionRegisterBoard>[0]} board
 * @param {{ limit?: number }} [opts]
 */
function summarizeInvalidOverdue(board, opts = {}) {
  const limit =
    opts.limit != null && Number.isFinite(opts.limit) && opts.limit > 0
      ? Math.floor(opts.limit)
      : DEFAULT_INVALID_OVERDUE_EXAMPLES_LIMIT;
  const todayYmd = todayYmdMexicoCity();
  const rows = [];

  for (const item of getDedupedBoardItems(board)) {
    if (item.closed) continue;
    if (!isItemOverdue(item, todayYmd)) continue;
    const validity = assessOverdueItemValidity(item, todayYmd);
    if (!validity.invalid) continue;
    rows.push({ item, validity });
  }

  rows.sort((a, b) => {
    if (b.validity.dias_vencido !== a.validity.dias_vencido) {
      return b.validity.dias_vencido - a.validity.dias_vencido;
    }
    return Number(a.item.id) - Number(b.item.id);
  });

  return {
    count: rows.length,
    examples: rows.slice(0, limit).map(({ item, validity }) => buildInvalidOverdueExample(item, validity)),
  };
}

function resolveRoleForGroup(usuarioIds, roleMap) {
  if (!usuarioIds || usuarioIds.size === 0) {
    return { role_key: null, role_name: null };
  }
  const roles = [];
  for (const id of usuarioIds) {
    const r = roleMap.get(id);
    if (r && (r.role_key || r.role_name)) roles.push(r);
  }
  if (roles.length === 0) return { role_key: null, role_name: null };
  const firstKey = roles[0].role_key;
  const firstName = roles[0].role_name;
  const allSameKey = roles.every((r) => (r.role_key || null) === (firstKey || null));
  if (allSameKey) {
    return { role_key: firstKey || null, role_name: firstName || null };
  }
  return { role_key: firstKey || null, role_name: firstName || null };
}

/**
 * IDs de usuario responsables en acciones abiertas (deduplicadas).
 * @param {Parameters<typeof summarizeActionRegisterBoard>[0]} board
 * @returns {number[]}
 */
function collectResponsableUsuarioIds(board) {
  const ids = new Set();
  for (const item of getDedupedBoardItems(board)) {
    if (item.closed) continue;
    const uid = item.responsable_usuario_id;
    if (uid != null && Number.isFinite(Number(uid))) ids.add(Number(uid));
  }
  return [...ids];
}

/**
 * Carga rol por usuario (solo lectura).
 * @param {import("pg").PoolClient} client
 * @param {number[]} usuarioIds
 * @returns {Promise<Map<number, { role_key: string | null, role_name: string | null }>>}
 */
async function loadUsuarioRolesByIds(client, usuarioIds) {
  const ids = [...new Set((usuarioIds || []).map((x) => Number(x)).filter(Number.isFinite))];
  const map = new Map();
  if (ids.length === 0) return map;
  const r = await client.query(
    `SELECT u.id,
            NULLIF(TRIM(COALESCE(r.clave, '')), '') AS role_key,
            NULLIF(TRIM(COALESCE(r.nombre, '')), '') AS role_name
     FROM public.usuarios u
     LEFT JOIN public.roles r ON r.id = u.rol_id
     WHERE u.id = ANY($1::int[])`,
    [ids]
  );
  for (const row of r.rows || []) {
    map.set(Number(row.id), {
      role_key: row.role_key != null ? String(row.role_key) : null,
      role_name: row.role_name != null ? String(row.role_name) : null,
    });
  }
  return map;
}

/**
 * Top responsables con acciones abiertas (deduplicadas; nombres normalizados para agrupar).
 * @param {Parameters<typeof summarizeActionRegisterBoard>[0]} board
 * @param {{ limit?: number, roleMap?: Map<number, { role_key: string | null, role_name: string | null }> }} [opts]
 * @returns {Array<{ name: string, role_key: string | null, role_name: string | null, open_count: number, overdue_count: number }>}
 */
function summarizeActionRegisterResponsables(board, opts = {}) {
  const roleMap = opts.roleMap || new Map();
  const limit =
    opts.limit != null && Number.isFinite(opts.limit) && opts.limit > 0
      ? Math.floor(opts.limit)
      : DEFAULT_RESPONSABLES_LIMIT;
  const todayYmd = todayYmdMexicoCity();
  const byKey = new Map();

  for (const item of getDedupedBoardItems(board)) {
    if (item.closed) continue;
    const { key, display } = getResponsableGrouping(item);
    if (!byKey.has(key)) {
      byKey.set(key, {
        name: display,
        open_count: 0,
        overdue_count: 0,
        usuario_ids: new Set(),
      });
    }
    const agg = byKey.get(key);
    agg.open_count += 1;
    if (isValidOverdueItem(item, todayYmd)) agg.overdue_count += 1;
    const uid = item.responsable_usuario_id;
    if (uid != null && Number.isFinite(Number(uid))) agg.usuario_ids.add(Number(uid));
  }

  const list = Array.from(byKey.values(), (agg) => {
    const { role_key, role_name } = resolveRoleForGroup(agg.usuario_ids, roleMap);
    return {
      name: agg.name,
      role_key,
      role_name,
      open_count: agg.open_count,
      overdue_count: agg.overdue_count,
    };
  });

  list.sort((a, b) => {
    if (b.overdue_count !== a.overdue_count) return b.overdue_count - a.overdue_count;
    if (b.open_count !== a.open_count) return b.open_count - a.open_count;
    return a.name.localeCompare(b.name, "es");
  });

  return list.slice(0, limit);
}

/**
 * Resumen por tema (ítems deduplicados).
 * @param {Parameters<typeof summarizeActionRegisterBoard>[0]} board
 * @returns {Array<{ name: string, open_count: number, closed_count: number, overdue_count: number, progress_percent: number }>}
 */
function summarizeActionRegisterTemas(board) {
  const todayYmd = todayYmdMexicoCity();
  const byTema = new Map();

  for (const item of getDedupedBoardItems(board)) {
    const name = getTemaName(item);
    if (!byTema.has(name)) {
      byTema.set(name, { open_count: 0, closed_count: 0, overdue_count: 0 });
    }
    const agg = byTema.get(name);
    if (item.closed) {
      agg.closed_count += 1;
    } else {
      agg.open_count += 1;
      if (isValidOverdueItem(item, todayYmd)) agg.overdue_count += 1;
    }
  }

  const list = Array.from(byTema.entries(), ([name, counts]) => ({
    name,
    open_count: counts.open_count,
    closed_count: counts.closed_count,
    overdue_count: counts.overdue_count,
    progress_percent: calcProgressPercent(counts.open_count, counts.closed_count),
  }));

  list.sort((a, b) => {
    if (b.overdue_count !== a.overdue_count) return b.overdue_count - a.overdue_count;
    if (b.open_count !== a.open_count) return b.open_count - a.open_count;
    return a.name.localeCompare(b.name, "es");
  });

  return list;
}

function resolveItemCreatedAtYmd(item) {
  const raw = item.created_at ?? item.creada_ymd ?? item.dicf_creada_ymd;
  const ymd = pgCalendarDateToYmd(raw);
  return ymd || null;
}

/**
 * Detalle narrativo por tema (solo abiertas; máx. 5 temas × 10 acciones).
 * @param {Parameters<typeof summarizeActionRegisterBoard>[0]} board
 * @param {{ roleMap?: Map<number, { role_key: string | null, role_name: string | null }>, temasLimit?: number, actionsLimit?: number }} [opts]
 */
function summarizeTemaDetails(board, opts = {}) {
  const roleMap = opts.roleMap || new Map();
  const temasLimit =
    opts.temasLimit != null && Number.isFinite(opts.temasLimit) && opts.temasLimit > 0
      ? Math.floor(opts.temasLimit)
      : DEFAULT_TEMA_DETAILS_TEMAS_LIMIT;
  const actionsLimit =
    opts.actionsLimit != null && Number.isFinite(opts.actionsLimit) && opts.actionsLimit > 0
      ? Math.floor(opts.actionsLimit)
      : DEFAULT_TEMA_DETAILS_ACTIONS_LIMIT;
  const todayYmd = todayYmdMexicoCity();
  const byTema = new Map();

  for (const item of getDedupedBoardItems(board)) {
    if (item.closed) continue;
    const tema = getTemaName(item);
    if (!byTema.has(tema)) {
      byTema.set(tema, { open_count: 0, overdue_count: 0, items: [], respByKey: new Map() });
    }
    const agg = byTema.get(tema);
    agg.open_count += 1;
    if (isValidOverdueItem(item, todayYmd)) agg.overdue_count += 1;
    agg.items.push(item);

    const { key, display } = getResponsableGrouping(item);
    if (!agg.respByKey.has(key)) {
      const { role_key, role_name } = resolveRoleForItem(item, roleMap);
      agg.respByKey.set(key, {
        name: display,
        role_key,
        role_name,
      });
    }
  }

  const ranked = Array.from(byTema.entries(), ([tema, agg]) => ({
    tema,
    open_count: agg.open_count,
    overdue_count: agg.overdue_count,
    responsables: Array.from(agg.respByKey.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "es")
    ),
    items: agg.items,
  }));

  ranked.sort((a, b) => {
    if (b.overdue_count !== a.overdue_count) return b.overdue_count - a.overdue_count;
    if (b.open_count !== a.open_count) return b.open_count - a.open_count;
    return a.tema.localeCompare(b.tema, "es");
  });

  return ranked.slice(0, temasLimit).map((row) => {
    const open_actions = row.items
      .map((item) => {
        const validOverdue = isValidOverdueItem(item, todayYmd);
        const validity = assessOverdueItemValidity(item, todayYmd);
        const dias_vencido = validOverdue ? validity.dias_vencido : 0;
        const created_at = resolveItemCreatedAtYmd(item);
        const due_date = pgCalendarDateToYmd(item.due_date) || null;
        const rawDiasAbierta =
          created_at != null ? daysBetweenYmd(created_at, todayYmd) : null;
        const dias_abierta =
          rawDiasAbierta != null ? Math.max(0, rawDiasAbierta) : null;
        const { role_name } = resolveRoleForItem(item, roleMap);
        return {
          id: Number(item.id),
          title: String(item.title || "").trim() || "(sin título)",
          responsable: formatResponsableLabel(item),
          role_name,
          created_at,
          due_date,
          dias_abierta,
          dias_vencido,
          prioridad: validOverdue ? classifyPrioridad(dias_vencido) : "BAJA",
        };
      })
      .sort((a, b) => {
        if (b.dias_vencido !== a.dias_vencido) return b.dias_vencido - a.dias_vencido;
        const da = a.dias_abierta ?? -1;
        const db = b.dias_abierta ?? -1;
        if (db !== da) return db - da;
        return a.title.localeCompare(b.title, "es");
      })
      .slice(0, actionsLimit);

    return {
      tema: row.tema,
      open_count: row.open_count,
      overdue_count: row.overdue_count,
      responsables: row.responsables,
      open_actions,
    };
  });
}

module.exports = {
  summarizeActionRegisterBoard,
  summarizeActionRegisterResponsables,
  summarizeActionRegisterTemas,
  summarizeTopOverdueActions,
  summarizeInvalidOverdue,
  summarizeTemaDetails,
  buildExecutiveSummary,
  getDedupedBoardItems,
  collectResponsableUsuarioIds,
  loadUsuarioRolesByIds,
  assessOverdueItemValidity,
  isValidOverdueItem,
  normalizePersonNameKey,
  todayYmdMexicoCity,
  isItemOverdue,
  computeDiasVencido,
  isDiasVencidoValid,
  isDueDateYmdPlausible,
  classifyPrioridad,
  computeRiskLevel,
  MAX_DIAS_VENCIDO_VALID,
  SIN_RESPONSABLE,
  DEFAULT_RESPONSABLES_LIMIT,
  DEFAULT_TOP_OVERDUE_LIMIT,
  DEFAULT_INVALID_OVERDUE_EXAMPLES_LIMIT,
  DEFAULT_TEMA_DETAILS_TEMAS_LIMIT,
  DEFAULT_TEMA_DETAILS_ACTIONS_LIMIT,
};
