"use strict";

/**
 * Fixture R-DELTA-CUT: TARGET_PROY_SOURCE.
 * Nombres sintéticos. No hardcodea clientes ni importes LIVE.
 *
 * Misma latest version. Distinta venta_ton efectiva:
 *   raw compromiso  !=  PROY overlay
 */

const {
  ingresoClienteMarginal,
  targetKgDesdeIgfVentaTon,
} = require("../../lib/ingreso-cliente-marginal");

const PLANTA = "Acapulco";
const YEAR_A = 2026;
const MONTH_A = 8;
const YEAR_B = 2026;
const MONTH_B = 9;

const RAW_COMPROMISO_VENTA_TON = 250;
const EFFECTIVE_PROY_VENTA_TON = 200;
const EFFECTIVE_PROY_VENTA_TON_UPLOAD_B = 180;
const UPLOAD_DAY_A = "2026-09-04";
const UPLOAD_DAY_B = "2026-09-02";

const TARGET_KG_RAW = targetKgDesdeIgfVentaTon(RAW_COMPROMISO_VENTA_TON);
const TARGET_KG_PROY = targetKgDesdeIgfVentaTon(EFFECTIVE_PROY_VENTA_TON);
const TARGET_KG_UPLOAD_B = targetKgDesdeIgfVentaTon(EFFECTIVE_PROY_VENTA_TON_UPLOAD_B);

const MARGEN_A = 8;
const MARGEN_B = 8;
const HG_PCT = 0.02;
const HG_KG = 0.16;
const DESC_KG_PERSISTIDO = 1;
const DESC_KG_REACT_SIM = 3;

const IGF_VERSION = Object.freeze({
  id: 9108,
  version_number: 8,
  financial_state: "FORECAST",
});

const HG_DISPLAY = HG_PCT * 100;
const HG_DINERO = Math.abs(HG_KG / HG_PCT);

const METRICS_A = Object.freeze({
  margenKg: MARGEN_A,
  hgDisplay: HG_DISPLAY,
  hgDinero: HG_DINERO,
  hgPct: HG_PCT,
  hgKg: HG_KG,
  ventaTon: 80,
});

const METRICS_B = Object.freeze({
  margenKg: MARGEN_B,
  hgDisplay: HG_DISPLAY,
  hgDinero: HG_DINERO,
  hgPct: HG_PCT,
  hgKg: HG_KG,
  ventaTon: RAW_COMPROMISO_VENTA_TON,
});

const RAW_CLIENTS = Object.freeze([
  { cliente: "DEEP_ONE", kgA: 41900, mtdB: 0 },
  { cliente: "DEEP_TWO", kgA: 35000, mtdB: 0 },
  { cliente: "DEEP_THREE", kgA: 31000, mtdB: 0 },
  { cliente: "RANK_SHIFT", kgA: 70000, mtdB: 20000 },
  { cliente: "ZERO_KEEP", kgA: 25140, mtdB: 0 },
  { cliente: "MID_STABLE", kgA: 22350, mtdB: 0 },
  { cliente: "SIGN_FLIP", kgA: 45000, mtdB: 20000 },
  { cliente: "VOL_SMALL", kgA: 18000, mtdB: 20000 },
  { cliente: "VOL_POS", kgA: 5000, mtdB: 40000 },
]);

const SUM_MTD_B = RAW_CLIENTS.reduce((s, c) => s + c.mtdB, 0);

function projectKg(mtd, targetKg) {
  if (!(mtd > 0) || !(targetKg > 0) || !(SUM_MTD_B > 0)) return 0;
  return Math.round(mtd * (targetKg / SUM_MTD_B) * 100) / 100;
}

function buildAtTarget(targetKg) {
  return RAW_CLIENTS.map((raw) => {
    const kgB = projectKg(raw.mtdB, targetKg);
    const ingresoA = ingresoClienteMarginal(raw.kgA, DESC_KG_PERSISTIDO, METRICS_A);
    const ingresoB = ingresoClienteMarginal(kgB, DESC_KG_PERSISTIDO, METRICS_B);
    const aVal = ingresoA == null ? 0 : ingresoA;
    const bVal = ingresoB == null ? 0 : ingresoB;
    return {
      cliente: raw.cliente,
      kgA: raw.kgA,
      mtdB: raw.mtdB,
      kgB,
      descKgA: DESC_KG_PERSISTIDO,
      descKgB: DESC_KG_PERSISTIDO,
      ingresoA: aVal,
      ingresoB: bVal,
      delta: bVal - aVal,
    };
  });
}

const CLIENTS_PROY = Object.freeze(buildAtTarget(TARGET_KG_PROY));
const CLIENTS_RAW = Object.freeze(buildAtTarget(TARGET_KG_RAW));
const CLIENTS_UPLOAD_B = Object.freeze(buildAtTarget(TARGET_KG_UPLOAD_B));

const BY_NAME_PROY = Object.freeze(Object.fromEntries(CLIENTS_PROY.map((c) => [c.cliente, c])));
const BY_NAME_RAW = Object.freeze(Object.fromEntries(CLIENTS_RAW.map((c) => [c.cliente, c])));

const RANK_SHIFT_PROY = BY_NAME_PROY.RANK_SHIFT;
const RANK_SHIFT_RAW = BY_NAME_RAW.RANK_SHIFT;
const SIGN_FLIP_PROY = BY_NAME_PROY.SIGN_FLIP;
const SIGN_FLIP_RAW = BY_NAME_RAW.SIGN_FLIP;
const ZERO_KEEP_PROY = BY_NAME_PROY.ZERO_KEEP;

const NEG_PROY = Object.freeze(CLIENTS_PROY.filter((c) => c.delta < 0).sort((a, b) => a.delta - b.delta));
const NEG_RAW = Object.freeze(CLIENTS_RAW.filter((c) => c.delta < 0).sort((a, b) => a.delta - b.delta));
const TOP5_PROY = Object.freeze(NEG_PROY.slice(0, 5));
const TOP5_RAW = Object.freeze(NEG_RAW.slice(0, 5));
const IMPACTO_TOP5_PROY = TOP5_PROY.reduce((s, c) => s + c.delta, 0);
const IMPACTO_TOP5_RAW = TOP5_RAW.reduce((s, c) => s + c.delta, 0);

function assertCutBoundary() {
  if (RAW_COMPROMISO_VENTA_TON === EFFECTIVE_PROY_VENTA_TON) {
    throw new Error("cut fixture: raw compromiso must differ from PROY");
  }
  if (TARGET_KG_RAW === TARGET_KG_PROY) {
    throw new Error("cut fixture: targetKg raw must differ from PROY");
  }
  if (RANK_SHIFT_PROY.kgB === RANK_SHIFT_RAW.kgB) {
    throw new Error("cut fixture: kg B must differ under raw vs PROY");
  }
  if (RANK_SHIFT_PROY.ingresoB === RANK_SHIFT_RAW.ingresoB) {
    throw new Error("cut fixture: ingreso B must differ under raw vs PROY");
  }
  if (RANK_SHIFT_PROY.delta === RANK_SHIFT_RAW.delta) {
    throw new Error("cut fixture: delta must differ under raw vs PROY");
  }
  if (SIGN_FLIP_PROY.delta >= 0 || SIGN_FLIP_RAW.delta <= 0) {
    throw new Error("cut fixture: SIGN_FLIP must change sign between PROY and raw");
  }
  const proyNames = TOP5_PROY.map((c) => c.cliente);
  const rawNames = TOP5_RAW.map((c) => c.cliente);
  if (!proyNames.includes("RANK_SHIFT")) {
    throw new Error("cut fixture: RANK_SHIFT must be in PROY Top 5");
  }
  if (rawNames.includes("RANK_SHIFT")) {
    throw new Error("cut fixture: RANK_SHIFT must fall out of raw Top 5");
  }
  if (proyNames.join("|") === rawNames.join("|")) {
    throw new Error("cut fixture: ranking must differ");
  }
  if (CLIENTS_PROY.some((c) => c.kgA !== BY_NAME_RAW[c.cliente].kgA)) {
    throw new Error("cut fixture: kg A must be stable across B targets");
  }
}

assertCutBoundary();

function cdmRowsA() {
  return RAW_CLIENTS.map((c) => ({
    planta: PLANTA,
    cliente: c.cliente,
    categoria: "Casa",
    subcategoria: "",
    kg: c.kgA,
    monto: c.kgA * DESC_KG_PERSISTIDO,
    descKg: DESC_KG_PERSISTIDO,
    prevKg: 0,
    factor: 0,
    kgProy: 0,
    estatus: "",
  }));
}

function cdmRowsB(targetKg) {
  const tg =
    targetKg != null && Number.isFinite(Number(targetKg)) && Number(targetKg) > 0
      ? Number(targetKg)
      : TARGET_KG_RAW;
  const rows = buildAtTarget(tg);
  const factor = SUM_MTD_B > 0 && tg > 0 ? tg / SUM_MTD_B : 0;
  return rows.map((c) => ({
    planta: PLANTA,
    cliente: c.cliente,
    categoria: "Casa",
    subcategoria: "",
    kg: c.mtdB,
    monto: c.mtdB * DESC_KG_PERSISTIDO,
    descKg: DESC_KG_PERSISTIDO,
    prevKg: c.kgA,
    factor,
    kgProy: c.kgB,
    estatus: "",
  }));
}

function effectiveForUploadDay(uploadDay) {
  const day = String(uploadDay || "").trim().slice(0, 10);
  if (day === UPLOAD_DAY_B) {
    return {
      ventaTon: EFFECTIVE_PROY_VENTA_TON_UPLOAD_B,
      targetKg: TARGET_KG_UPLOAD_B,
    };
  }
  return {
    ventaTon: EFFECTIVE_PROY_VENTA_TON,
    targetKg: TARGET_KG_PROY,
  };
}

module.exports = {
  PLANTA,
  YEAR_A,
  MONTH_A,
  YEAR_B,
  MONTH_B,
  RAW_COMPROMISO_VENTA_TON,
  EFFECTIVE_PROY_VENTA_TON,
  EFFECTIVE_PROY_VENTA_TON_UPLOAD_B,
  UPLOAD_DAY_A,
  UPLOAD_DAY_B,
  TARGET_KG_RAW,
  TARGET_KG_PROY,
  TARGET_KG_UPLOAD_B,
  DESC_KG_PERSISTIDO,
  DESC_KG_REACT_SIM,
  IGF_VERSION,
  METRICS_A,
  METRICS_B,
  SUM_MTD_B,
  CLIENTS_PROY,
  CLIENTS_RAW,
  CLIENTS_UPLOAD_B,
  BY_NAME_PROY,
  BY_NAME_RAW,
  RANK_SHIFT_PROY,
  RANK_SHIFT_RAW,
  SIGN_FLIP_PROY,
  SIGN_FLIP_RAW,
  ZERO_KEEP_PROY,
  NEG_PROY,
  NEG_RAW,
  TOP5_PROY,
  TOP5_RAW,
  IMPACTO_TOP5_PROY,
  IMPACTO_TOP5_RAW,
  projectKg,
  buildAtTarget,
  cdmRowsA,
  cdmRowsB,
  effectiveForUploadDay,
};
