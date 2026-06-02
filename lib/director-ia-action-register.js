"use strict";

const { pgCalendarDateToYmd } = require("./action-register-board");

const SIN_RESPONSABLE = "Sin responsable";
const SIN_TEMA = "Sin tema";
const DEFAULT_RESPONSABLES_LIMIT = 10;

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
      if (isItemOverdue(item, todayYmd)) overdue += 1;
    }
  }

  return { open, closed, overdue };
}

/**
 * Top responsables con acciones abiertas (deduplicadas; nombres normalizados para agrupar).
 * @param {Parameters<typeof summarizeActionRegisterBoard>[0]} board
 * @param {{ limit?: number }} [opts]
 * @returns {Array<{ name: string, open_count: number, overdue_count: number }>}
 */
function summarizeActionRegisterResponsables(board, opts = {}) {
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
      byKey.set(key, { name: display, open_count: 0, overdue_count: 0 });
    }
    const agg = byKey.get(key);
    agg.open_count += 1;
    if (isItemOverdue(item, todayYmd)) agg.overdue_count += 1;
  }

  const list = Array.from(byKey.values());

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
      if (isItemOverdue(item, todayYmd)) agg.overdue_count += 1;
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

module.exports = {
  summarizeActionRegisterBoard,
  summarizeActionRegisterResponsables,
  summarizeActionRegisterTemas,
  getDedupedBoardItems,
  normalizePersonNameKey,
  todayYmdMexicoCity,
  isItemOverdue,
  SIN_RESPONSABLE,
  DEFAULT_RESPONSABLES_LIMIT,
};
