"use strict";

/**
 * Fixture compartido: semántica IGF Forecast ARR → Clientes por mes → Delta Ingreso.
 * Nombres sintéticos. No hardcodea clientes LIVE.
 *
 * Oracle de ingreso = misma expresión que ArrClient.ingresoClienteMarginal
 * (se extrae a helper canónico en el FIX; este archivo no es producto).
 */

const { ingresoClienteMarginal } = require("../../lib/ingreso-cliente-marginal");

const PLANTA = "Acapulco";
const YEAR_A = 2026;
const MONTH_A = 8;
const YEAR_B = 2026;
const MONTH_B = 9;
const PERIODO_A = "2026-08";
const PERIODO_B = "2026-09";

const MARGEN_A = 8;
const MARGEN_B = 8;
const HG_PCT = 0.02;
const HG_KG = 0.16;
const DESC_KG_PERSISTIDO = 1;
const DESC_KG_REACT_SIM = 3;

const IGF_FORECAST_VERSION = {
  id: 9008,
  version_number: 8,
  financial_state: "FORECAST",
  venta_ton: 200,
};

const IGF_FINAL_DECOY_VERSION = {
  id: 9002,
  version_number: 2,
  financial_state: "FINAL",
  venta_ton: 80,
};

const TARGET_KG_B = Math.round(IGF_FORECAST_VERSION.venta_ton * 1000 * 100) / 100;
const TARGET_KG_FINAL_DECOY = Math.round(IGF_FINAL_DECOY_VERSION.venta_ton * 1000 * 100) / 100;

const HG_DISPLAY = HG_PCT * 100;
const HG_DINERO = Math.abs(HG_KG / HG_PCT);

function ingresoClienteMarginalOracle(kg, descKg, m) {
  return ingresoClienteMarginal(kg, descKg, m);
}

function ingresoOlsNoHg(kg, descKg, margen) {
  return kg * (margen - Math.abs(descKg || 0));
}

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
  ventaTon: IGF_FORECAST_VERSION.venta_ton,
});

const RAW_CLIENTS = Object.freeze([
  { cliente: "SCALE_UP", kgA: 80000, mtdB: 40000, olsKgB: 60000 },
  { cliente: "NEG_DEEP", kgA: 50000, mtdB: 8000, olsKgB: 10000 },
  { cliente: "NEG_MID", kgA: 30000, mtdB: 7000, olsKgB: 8500 },
  { cliente: "NEG_TINY", kgA: 18000, mtdB: 4000, olsKgB: 4800 },
  { cliente: "NEG_LOW", kgA: 20000, mtdB: 6000, olsKgB: 7200 },
  { cliente: "NEG_SMALL", kgA: 15000, mtdB: 5000, olsKgB: 6000 },
  { cliente: "POS_OTHER", kgA: 5000, mtdB: 10000, olsKgB: 12000 },
]);

const SUM_MTD_B = RAW_CLIENTS.reduce((s, c) => s + c.mtdB, 0);
const FACTOR_B = TARGET_KG_B / SUM_MTD_B;

function projectKgClientesPorMes(mtd, factor) {
  return Math.round(mtd * factor * 100) / 100;
}

function buildClient(raw) {
  const kgBCpm = projectKgClientesPorMes(raw.mtdB, FACTOR_B);
  const ingresoA = ingresoClienteMarginalOracle(raw.kgA, DESC_KG_PERSISTIDO, METRICS_A);
  const ingresoB = ingresoClienteMarginalOracle(kgBCpm, DESC_KG_PERSISTIDO, METRICS_B);
  const ingresoANoHg = ingresoClienteMarginalOracle(raw.kgA, DESC_KG_PERSISTIDO, {
    ...METRICS_A,
    hgDisplay: 0,
    hgDinero: HG_DINERO,
  });
  const ingresoBOls = ingresoOlsNoHg(raw.olsKgB, DESC_KG_PERSISTIDO, MARGEN_B);
  const ingresoAOls = ingresoOlsNoHg(raw.kgA, DESC_KG_PERSISTIDO, MARGEN_A);
  return {
    cliente: raw.cliente,
    kgA: raw.kgA,
    mtdB: raw.mtdB,
    kgB: kgBCpm,
    olsKgB: raw.olsKgB,
    descKgA: DESC_KG_PERSISTIDO,
    descKgB: DESC_KG_PERSISTIDO,
    descKgReactSim: DESC_KG_REACT_SIM,
    margenA: MARGEN_A,
    margenB: MARGEN_B,
    hgDisplay: HG_DISPLAY,
    hgDinero: HG_DINERO,
    ingresoA,
    ingresoB,
    delta: ingresoB - ingresoA,
    ingresoANoHg,
    hgChangesIngresoA: ingresoA !== ingresoANoHg,
    ingresoAOls,
    ingresoBOls,
    deltaOls: ingresoBOls - ingresoAOls,
  };
}

const CLIENTS = Object.freeze(RAW_CLIENTS.map(buildClient));
const BY_NAME = Object.freeze(Object.fromEntries(CLIENTS.map((c) => [c.cliente, c])));

const SCALE_UP = BY_NAME.SCALE_UP;
if (SCALE_UP.delta <= 0) {
  throw new Error("parity fixture: SCALE_UP CPM delta must be positive");
}
if (SCALE_UP.deltaOls >= 0) {
  throw new Error("parity fixture: SCALE_UP OLS delta must be negative (sign flip)");
}
if (SCALE_UP.kgB === SCALE_UP.olsKgB) {
  throw new Error("parity fixture: kg B CPM must diverge from OLS");
}

const CPM_NEGATIVES = Object.freeze(
  CLIENTS.filter((c) => c.delta < 0).sort((a, b) => a.delta - b.delta)
);
const OLS_NEGATIVES = Object.freeze(
  CLIENTS.filter((c) => c.deltaOls < 0).sort((a, b) => a.deltaOls - b.deltaOls)
);
const TOP5_CPM = Object.freeze(CPM_NEGATIVES.slice(0, 5));
const TOP5_OLS = Object.freeze(OLS_NEGATIVES.slice(0, 5));
const IMPACTO_TOP5_CPM = TOP5_CPM.reduce((s, c) => s + c.delta, 0);
const IMPACTO_TOP5_OLS = TOP5_OLS.reduce((s, c) => s + c.deltaOls, 0);

if (TOP5_CPM.some((c) => c.cliente === "SCALE_UP")) {
  throw new Error("parity fixture: SCALE_UP must not enter CPM Top N negatives");
}
if (!TOP5_OLS.some((c) => c.cliente === "SCALE_UP")) {
  throw new Error("parity fixture: SCALE_UP must enter OLS Top N negatives");
}

function clientesDescuentoMesRows(period) {
  const isB = period === "B";
  return CLIENTS.map((c) => ({
    planta: PLANTA,
    cliente: c.cliente,
    categoria: "Casa",
    subcategoria: "",
    kg: isB ? c.mtdB : c.kgA,
    monto: (isB ? c.mtdB : c.kgA) * DESC_KG_PERSISTIDO,
    descKg: DESC_KG_PERSISTIDO,
    prevKg: isB ? c.kgA : 0,
    factor: isB ? FACTOR_B : 0,
    kgProy: isB ? c.kgB : 0,
    estatus: "",
  }));
}

function olsForecastRows() {
  return CLIENTS.map((c) => ({
    cliente: c.cliente,
    kgA: c.kgA,
    kgB: c.olsKgB,
    ingresoA: c.ingresoAOls,
    ingresoB: c.ingresoBOls,
    deltaIngreso: c.deltaOls,
    descKgA: DESC_KG_PERSISTIDO,
    descKgB: DESC_KG_PERSISTIDO,
  }));
}

function cpmForecastRows() {
  return CLIENTS.map((c) => ({
    cliente: c.cliente,
    kgA: c.kgA,
    kgB: c.kgB,
    ingresoA: c.ingresoA,
    ingresoB: c.ingresoB,
    deltaIngreso: c.delta,
    descKgA: DESC_KG_PERSISTIDO,
    descKgB: DESC_KG_PERSISTIDO,
    margenA: MARGEN_A,
    margenB: MARGEN_B,
    hgDisplay: HG_DISPLAY,
    hgDinero: HG_DINERO,
  }));
}

module.exports = {
  PLANTA,
  YEAR_A,
  MONTH_A,
  YEAR_B,
  MONTH_B,
  PERIODO_A,
  PERIODO_B,
  MARGEN_A,
  MARGEN_B,
  HG_PCT,
  HG_KG,
  HG_DISPLAY,
  HG_DINERO,
  DESC_KG_PERSISTIDO,
  DESC_KG_REACT_SIM,
  IGF_FORECAST_VERSION,
  IGF_FINAL_DECOY_VERSION,
  TARGET_KG_B,
  TARGET_KG_FINAL_DECOY,
  SUM_MTD_B,
  FACTOR_B,
  METRICS_A,
  METRICS_B,
  CLIENTS,
  BY_NAME,
  SCALE_UP,
  CPM_NEGATIVES,
  OLS_NEGATIVES,
  TOP5_CPM,
  TOP5_OLS,
  IMPACTO_TOP5_CPM,
  IMPACTO_TOP5_OLS,
  ingresoClienteMarginalOracle,
  clientesDescuentoMesRows,
  olsForecastRows,
  cpmForecastRows,
};
