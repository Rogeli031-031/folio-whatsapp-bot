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

/**
 * @typedef {object} ExpenseSaveOperation
 * @property {number} opId
 * @property {number} requestId
 * @property {string} plant
 * @property {string=} group
 * @property {number} year
 * @property {number} month
 * @property {string=} concepto
 */

/**
 * @typedef {object} GuardedSaveSpec
 * @property {object} identity
 * @property {(operation: ExpenseSaveOperation) => Promise<any>} execute
 * @property {() => any} readVisible
 * @property {(() => any)=} readDashboard
 * @property {(operation: ExpenseSaveOperation, visible: any) => boolean} matches
 * @property {(() => void)=} onLock
 * @property {((saved: any, operation: ExpenseSaveOperation, dashboard: any) => void)=} onCache
 * @property {((saved: any, operation: ExpenseSaveOperation) => void)=} onSuccess
 * @property {((error: unknown, operation: ExpenseSaveOperation) => void)=} onError
 * @property {(() => void)=} onUnlock
 */

function createExpenseSaveController() {
  let inflight = null;
  let nextOp = 0;
  return {
    isSaving() {
      return inflight != null;
    },
    begin(identity) {
      if (inflight || !identity) return null;
      nextOp += 1;
      inflight = {
        opId: nextOp,
        requestId: Number(identity.requestId),
        plant: String(identity.plant || ""),
        group: identity.group,
        year: Number(identity.year),
        month: Number(identity.month),
        concepto: identity.concepto == null ? undefined : String(identity.concepto),
      };
      return inflight;
    },
    finish(opId) {
      if (!inflight || inflight.opId !== opId) return false;
      inflight = null;
      return true;
    },
    matchesDesglose(operation, modal) {
      if (!operation || !modal) return false;
      return Number(modal.requestId) === Number(operation.requestId)
        && String(modal.plant || "") === String(operation.plant || "")
        && modal.group === operation.group
        && samePeriod(modal.year, modal.month, operation.year, operation.month);
    },
    matchesDistribution(operation, modal) {
      if (!operation || !modal) return false;
      return Number(modal.requestId) === Number(operation.requestId)
        && String(modal.plant || "") === String(operation.plant || "")
        && String(modal.concepto || "") === String(operation.concepto || "")
        && samePeriod(modal.year, modal.month, operation.year, operation.month);
    },
  };
}

function canLeaveExpenseModal(controller, dirty, confirmDiscard) {
  if (!controller || controller.isSaving()) return false;
  if (dirty) return Boolean(confirmDiscard());
  return true;
}

/**
 * @param {ReturnType<typeof createExpenseSaveController>} controller
 * @param {GuardedSaveSpec} spec
 */
async function performGuardedSave(controller, spec) {
  const operation = controller.begin(spec.identity);
  if (!operation) return { status: "duplicate" };
  if (typeof spec.onLock === "function") spec.onLock();
  try {
    const saved = await spec.execute(operation);
    const visible = spec.readVisible();
    if (!spec.matches(operation, visible)) return { status: "stale" };
    if (typeof spec.readDashboard === "function" && typeof spec.onCache === "function") {
      const dashboard = spec.readDashboard();
      if (dashboard && samePeriod(operation.year, operation.month, dashboard.year, dashboard.month)) {
        spec.onCache(saved, operation, dashboard);
      }
    }
    if (typeof spec.onSuccess === "function") spec.onSuccess(saved, operation);
    return { status: "saved" };
  } catch (error) {
    const visible = spec.readVisible();
    if (spec.matches(operation, visible) && typeof spec.onError === "function") spec.onError(error, operation);
    return { status: "error" };
  } finally {
    if (controller.finish(operation.opId) && typeof spec.onUnlock === "function") spec.onUnlock();
  }
}

module.exports = {
  shiftMonth,
  monthLabel,
  draftsForGroup,
  draftsDirty,
  acceptPeriodLoad,
  canSaveDesglose,
  samePeriod,
  createExpenseSaveController,
  canLeaveExpenseModal,
  performGuardedSave,
};
