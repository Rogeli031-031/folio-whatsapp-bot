"use strict";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function shiftMonth(year, month, delta) {
  const shifted = new Date(Date.UTC(Number(year), Number(month) - 1 + Number(delta), 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

function monthLabel(year, month) {
  const name = MONTHS[Number(month) - 1] || "";
  return `${name} ${Number(year)}`;
}

function draftsForGroup(row, group, fields) {
  const active = Boolean(
    row && (group === "corporativos" ? row.corporativos_desglosados : row.operativos_desglosados)
  );
  const drafts = {};
  for (const field of fields || []) {
    const value = row && row.componentes ? row.componentes[field.key] : null;
    drafts[field.key] = active && value != null && value !== "" ? String(value) : "";
  }
  return { drafts, hasBreakdown: active };
}

function draftsDirty(drafts, baseline) {
  const left = drafts || {};
  const right = baseline || {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (String(left[key] == null ? "" : left[key]) !== String(right[key] == null ? "" : right[key])) return true;
  }
  return false;
}

function acceptPeriodLoad(current, incoming) {
  if (!current || !incoming) return false;
  if (current.requestId !== incoming.requestId) return false;
  if (String(current.plant || "") !== String(incoming.plant || "")) return false;
  if (current.group !== incoming.group) return false;
  if (Number(current.year) !== Number(incoming.year) || Number(current.month) !== Number(incoming.month)) return false;
  return true;
}

function canSaveDesglose(modal, saving) {
  if (!modal || saving) return false;
  if (modal.loading || modal.loadError || !modal.contractOk) return false;
  return true;
}

function samePeriod(leftYear, leftMonth, rightYear, rightMonth) {
  return Number(leftYear) === Number(rightYear) && Number(leftMonth) === Number(rightMonth);
}

module.exports = {
  shiftMonth,
  monthLabel,
  draftsForGroup,
  draftsDirty,
  acceptPeriodLoad,
  canSaveDesglose,
  samePeriod,
};
