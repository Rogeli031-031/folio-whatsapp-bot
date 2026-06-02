"use strict";

const { pgCalendarDateToYmd } = require("./action-register-board");

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

/**
 * Resumen open/closed/overdue a partir del payload del board (ítems deduplicados por id).
 * @param {{ revisions: Array<{ id: number, revision_date: unknown }>, cells: Record<string, Record<string, Array<Record<string, unknown>>>> }} board
 */
function summarizeActionRegisterBoard(board) {
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

  const todayYmd = todayYmdMexicoCity();
  let open = 0;
  let closed = 0;
  let overdue = 0;

  for (const { item } of byId.values()) {
    if (item.closed) {
      closed += 1;
    } else {
      open += 1;
      if (isItemOverdue(item, todayYmd)) overdue += 1;
    }
  }

  return { open, closed, overdue };
}

module.exports = {
  summarizeActionRegisterBoard,
  todayYmdMexicoCity,
  isItemOverdue,
};
