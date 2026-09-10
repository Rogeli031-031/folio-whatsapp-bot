"use strict";

const {
  computePromMesByDow,
  buildPronosticoVentaDescMaps,
  loadPronosticoDiasSeleccionMap,
  resolveCanonicalPlantCode,
} = require("./dashboard-arr-forecast");

const YEAR_2027 = 2027;

const MONTH_LABELS = Object.freeze([
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
]);

const PAIRS = Object.freeze([
  Object.freeze({ canal: "CASA", subcanal: "AUTOTANQUE" }),
  Object.freeze({ canal: "CASA", subcanal: "PORTATIL" }),
  Object.freeze({ canal: "CASA", subcanal: "CARBURACION" }),
  Object.freeze({ canal: "COMISIONISTA", subcanal: "AUTOTANQUE" }),
  Object.freeze({ canal: "COMISIONISTA", subcanal: "PORTATIL" }),
  Object.freeze({ canal: "COMISIONISTA", subcanal: "CARBURACION" }),
]);

const PAIR_KEYS = Object.freeze(PAIRS.map(pairKey));

const WEEKDAYS_LUN_DOM = Object.freeze([
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
  "DOMINGO",
]);

const PROM_RECONCILIATION_TOLERANCE = 0.06;

const SQL_PM_ONE = `
  SELECT DISTINCT p.nombre AS prov_name,
         UPPER(TRIM(p.nombre)) AS key_nombre,
         UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
    FROM public.plantas p
    JOIN arr.provincia_plants ap
      ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
      OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
   WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
     AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
     AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM($1::text))
`;

function pairKey(p) {
  return `${p.canal}|${p.subcanal}`;
}

function foldLabel(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function classifyCanal(raw) {
  const n = foldLabel(raw);
  if (!n) return null;
  if (n.includes("comisionista")) return "COMISIONISTA";
  if (n.includes("casa")) return "CASA";
  return null;
}

function classifySubcanal(raw) {
  const n = foldLabel(raw);
  if (!n) return null;
  if (n.includes("autotanque") || n === "ats") return "AUTOTANQUE";
  if (n.includes("portatil")) return "PORTATIL";
  if (n.includes("carburacion")) return "CARBURACION";
  return null;
}

function classifyPair(canal, subcanal) {
  const c = classifyCanal(canal);
  const s = classifySubcanal(subcanal);
  if (!c || !s) return null;
  return { canal: c, subcanal: s };
}

function isoDowFromDate(d) {
  return d.getDay() === 0 ? 7 : d.getDay();
}

function weekdayCountsForMonth(year, month) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const last = new Date(year, month, 0).getDate();
  for (let day = 1; day <= last; day += 1) {
    const d = new Date(year, month - 1, day);
    counts[isoDowFromDate(d) - 1] += 1;
  }
  return counts;
}

function weekdayCounts2027() {
  return MONTH_LABELS.map((_, i) => weekdayCountsForMonth(YEAR_2027, i + 1));
}

function promNumber(v) {
  if (v === "" || v == null || !Number.isFinite(Number(v))) return 0;
  return Number(v);
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

function projectVentaMonth(promV, nDow) {
  let s = 0;
  for (let d = 0; d < 7; d += 1) s += promNumber(promV[d]) * Number(nDow[d] || 0);
  return s;
}

function projectDiscountMonth(promR, promV, nDow) {
  let num = 0;
  let den = 0;
  for (let d = 0; d < 7; d += 1) {
    const vol = promNumber(promV[d]) * Number(nDow[d] || 0);
    den += vol;
    num += promNumber(promR[d]) * vol;
  }
  if (den === 0) return null;
  return num / den;
}

function emptyProm() {
  return ["", "", "", "", "", "", ""];
}

function emptyPairMaps() {
  const venta = {};
  const ratio = {};
  for (const key of PAIR_KEYS) {
    venta[key] = new Map();
    ratio[key] = new Map();
  }
  return { venta, ratio };
}

function reconcilePlantVsPairs(plantProm, pairProms) {
  const residual = [0, 0, 0, 0, 0, 0, 0];
  for (let d = 0; d < 7; d += 1) {
    const sumPairs = pairProms.reduce((acc, p) => acc + promNumber(p[d]), 0);
    residual[d] = round2(promNumber(plantProm[d]) - sumPairs);
  }
  const within = residual.every((r) => Math.abs(r) <= PROM_RECONCILIATION_TOLERANCE);
  return { residual, within, tolerance: PROM_RECONCILIATION_TOLERANCE };
}

function buildPromOpts(ctx, selectedByYmd) {
  return {
    enableLookback: Boolean(ctx && ctx.enableLookback),
    lookbackStartYmd: ctx && ctx.lookbackStartYmd,
    lookbackEndYmd: ctx && ctx.lookbackEndYmd,
    lookbackQueryFromYmd: ctx && ctx.lookbackQueryFromYmd,
    lookbackVisualStartYmd: ctx && ctx.lookbackVisualStartYmd,
    selectedByYmd: selectedByYmd || new Map(),
  };
}

function computeSixPairProms(pairMaps, ctx, selectedByYmd) {
  const opts = buildPromOpts(ctx, selectedByYmd);
  const venta = [];
  const ratio = [];
  for (const key of PAIR_KEYS) {
    const vMap = (pairMaps && pairMaps.venta && pairMaps.venta[key]) || new Map();
    const rMap = (pairMaps && pairMaps.ratio && pairMaps.ratio[key]) || new Map();
    venta.push(computePromMesByDow(vMap, opts));
    ratio.push(computePromMesByDow(rMap, opts));
  }
  return { venta, ratio };
}

function projectYearFromProms(promVentaList, promRatioList) {
  const counts = weekdayCounts2027();
  const months = [];
  const ventaAnnual = [0, 0, 0, 0, 0, 0];
  const descWeightedNum = [0, 0, 0, 0, 0, 0];
  for (let m = 0; m < 12; m += 1) {
    const nDow = counts[m];
    const venta = [];
    const desc = [];
    for (let p = 0; p < 6; p += 1) {
      const v = projectVentaMonth(promVentaList[p] || emptyProm(), nDow);
      const d = projectDiscountMonth(promRatioList[p] || emptyProm(), promVentaList[p] || emptyProm(), nDow);
      venta.push(v);
      desc.push(d);
      ventaAnnual[p] += v;
      if (d != null) descWeightedNum[p] += d * v;
    }
    const total = venta.reduce((a, b) => a + b, 0);
    const pct = venta.map((v) => (total > 0 ? v / total : 0));
    months.push({
      label: MONTH_LABELS[m],
      month: m + 1,
      weekdayCounts: nDow,
      venta,
      pct,
      desc,
    });
  }
  const ventaAnnualTotal = ventaAnnual.reduce((a, b) => a + b, 0);
  const pctAnnual = ventaAnnual.map((v) => (ventaAnnualTotal > 0 ? v / ventaAnnualTotal : 0));
  const descAnnual = ventaAnnual.map((v, i) => (v > 0 ? descWeightedNum[i] / v : null));
  return {
    months,
    totals: {
      venta: ventaAnnual,
      pct: pctAnnual,
      desc: descAnnual,
    },
    weekdayCounts: counts,
  };
}

function formatVentaCell(v) {
  return Number.isFinite(Number(v)) ? round2(v) : "";
}

function formatPctCell(v) {
  return Number.isFinite(Number(v)) ? Number(v) : 0;
}

function formatDescCell(v) {
  if (v == null || !Number.isFinite(Number(v))) return "";
  return round4(v);
}

function buildSheet2027Aoa(projected, opts = {}) {
  const canalRow = ["MES"];
  const subRow = [""];
  const blocks = [
    { title: "VENTA PROYECTADA 2027 (TON)", start: 1 },
    { title: "% PARTICIPACION", start: 7 },
    { title: "DESCUENTO PROYECTADO (MXN/KG)", start: 13 },
  ];
  const titleRow = ["MES"];
  for (const block of blocks) {
    titleRow.push(block.title);
    for (let i = 1; i < 6; i += 1) titleRow.push("");
    for (const canal of ["CASA", "CASA", "CASA", "COMISIONISTA", "COMISIONISTA", "COMISIONISTA"]) {
      canalRow.push(canal);
    }
    for (const sub of ["AUTOTANQUE", "PORTATIL", "CARBURACION", "AUTOTANQUE", "PORTATIL", "CARBURACION"]) {
      subRow.push(sub);
    }
  }
  const aoa = [titleRow, canalRow, subRow];
  for (const month of projected.months) {
    aoa.push([
      month.label,
      ...month.venta.map(formatVentaCell),
      ...month.pct.map(formatPctCell),
      ...month.desc.map(formatDescCell),
    ]);
  }
  aoa.push([
    "TOTAL",
    ...projected.totals.venta.map(formatVentaCell),
    ...projected.totals.pct.map(formatPctCell),
    ...projected.totals.desc.map(formatDescCell),
  ]);
  if (opts.residualNote) aoa.push([opts.residualNote]);
  return aoa;
}

function applySheet2027Formats(ws) {
  const pctCols = [7, 8, 9, 10, 11, 12];
  const descCols = [13, 14, 15, 16, 17, 18];
  for (let r = 4; r <= 16; r += 1) {
    for (const c of pctCols) {
      const cell = ws[XlsxCell(c, r)];
      if (cell && typeof cell.v === "number") cell.z = "0.00%";
    }
    for (const c of descCols) {
      const cell = ws[XlsxCell(c, r)];
      if (cell && typeof cell.v === "number") cell.z = "0.0000";
    }
  }
}

function XlsxCell(c0, r1) {
  const col = c0 + 1;
  let s = "";
  let n = col;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return `${s}${r1}`;
}

function ymdFromRow(fecha) {
  if (!fecha) return null;
  if (typeof fecha === "string") return fecha.slice(0, 10);
  if (fecha.toISOString) return fecha.toISOString().slice(0, 10);
  return String(fecha).slice(0, 10);
}

async function loadPairDailyMaps(client, plantCode, fromYmd, toYmd, catYear, catMonth) {
  const maps = emptyPairMaps();
  const residual = { ventaTon: 0, rowsSkipped: 0 };
  if (!client || !plantCode || !fromYmd || !toYmd) return { ...maps, residual };
  const ventaQ = await client.query(
    `WITH pm AS (${SQL_PM_ONE})
     SELECT v.fecha::date AS fecha, v.canal, COALESCE(v.subcanal, '') AS subcanal, SUM(v.kg) AS kg
       FROM arr.ventas_diarias_cliente v
       JOIN pm ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
              OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
      WHERE v.fecha >= $2::date AND v.fecha <= $3::date
      GROUP BY v.fecha::date, v.canal, COALESCE(v.subcanal, '')`,
    [plantCode, fromYmd, toYmd]
  );
  const kgByFechaPair = new Map();
  for (const row of ventaQ.rows || []) {
    const fecha = ymdFromRow(row.fecha);
    const pair = classifyPair(row.canal, row.subcanal);
    const kg = Number(row.kg || 0);
    if (!fecha || !Number.isFinite(kg)) continue;
    if (!pair) {
      residual.ventaTon += kg / 1000;
      residual.rowsSkipped += 1;
      continue;
    }
    const key = pairKey(pair);
    const ton = kg / 1000;
    const prev = maps.venta[key].get(fecha) || 0;
    maps.venta[key].set(fecha, prev + ton);
    kgByFechaPair.set(`${fecha}|${key}`, (kgByFechaPair.get(`${fecha}|${key}`) || 0) + kg);
  }

  const descQ = await client.query(
    `WITH pm AS (${SQL_PM_ONE})
     SELECT d.fecha::date AS fecha,
            COALESCE(c.canal, '') AS canal,
            COALESCE(c.subcanal, '') AS subcanal,
            SUM(d.monto) AS monto
       FROM arr.descuentos_diarios_cliente d
       JOIN pm ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
              OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
       LEFT JOIN arr.cliente_categoria_mes c
         ON c.cliente_norm = d.cliente_norm AND c.year = $4 AND c.month = $5
        AND (
              c.plant_code = d.plant_code
           OR UPPER(TRIM(c.plant_code)) = UPPER(TRIM(pm.prov_name))
           OR (pm.key_clave <> '' AND UPPER(TRIM(c.plant_code)) = UPPER(TRIM(pm.key_clave)))
            )
      WHERE d.fecha >= $2::date AND d.fecha <= $3::date
      GROUP BY d.fecha::date, COALESCE(c.canal, ''), COALESCE(c.subcanal, '')`,
    [plantCode, fromYmd, toYmd, catYear, catMonth]
  );
  const montoByFechaPair = new Map();
  for (const row of descQ.rows || []) {
    const fecha = ymdFromRow(row.fecha);
    const pair = classifyPair(row.canal, row.subcanal);
    const monto = Number(row.monto || 0);
    if (!fecha || !pair || !Number.isFinite(monto)) continue;
    const key = pairKey(pair);
    montoByFechaPair.set(`${fecha}|${key}`, (montoByFechaPair.get(`${fecha}|${key}`) || 0) + monto);
  }
  for (const [fk, kg] of kgByFechaPair.entries()) {
    if (!(kg > 0)) continue;
    const monto = montoByFechaPair.get(fk);
    if (monto == null || !Number.isFinite(Number(monto))) continue;
    const sep = fk.indexOf("|");
    const fecha = fk.slice(0, sep);
    const key = fk.slice(sep + 1);
    maps.ratio[key].set(fecha, Number(monto) / kg);
  }
  return { ...maps, residual };
}

function resolvePlantMapKey(plantCode, plants) {
  const raw = String(plantCode || "").trim();
  if (!raw) return raw;
  if (typeof resolveCanonicalPlantCode === "function") {
    return resolveCanonicalPlantCode(raw, plants || []) || raw;
  }
  return raw;
}

async function buildDicfExcel2027Model(input) {
  const ctx = input.ctx;
  const selectedByYmd = input.selectedByYmd || new Map();
  const plantKey = resolvePlantMapKey(input.plantCode, ctx && ctx.plants);
  const plantVentaMap =
    (ctx && ctx.ventaMapByPlant && (ctx.ventaMapByPlant.get(plantKey) || ctx.ventaMapByPlant.get(input.plantCode))) ||
    new Map();
  const plantProm = computePromMesByDow(plantVentaMap, buildPromOpts(ctx, selectedByYmd));
  const pairProms = computeSixPairProms(input.pairMaps, ctx, selectedByYmd);
  const recon = reconcilePlantVsPairs(plantProm, pairProms.venta);
  const projected = projectYearFromProms(pairProms.venta, pairProms.ratio);
  return {
    plantProm,
    pairProms,
    recon,
    projected,
    pairs: PAIRS,
    weekdays: WEEKDAYS_LUN_DOM,
  };
}

async function assembleDicfExcel2027(client, opts = {}) {
  const year = Number(opts.year);
  const month = Number(opts.month);
  const fechaCorte = String(opts.fechaCorte || "").trim().slice(0, 10);
  const plantCode = String(opts.plantCode || "").trim();
  const ctx =
    opts.prebuiltVentaDescCtx ||
    (client ? await buildPronosticoVentaDescMaps(client, year, month, fechaCorte) : null);
  if (!ctx) {
    throw new Error("PROM context unavailable");
  }
  const selectedAll =
    opts.selectedAll ||
    (client ? await loadPronosticoDiasSeleccionMap(client, year, month, ctx.corteYmdStr) : new Map());
  const plantKey = resolvePlantMapKey(plantCode, ctx.plants);
  const selectedByYmd = selectedAll.get(plantKey) || selectedAll.get(plantCode) || new Map();
  const fromYmd = ctx.lookbackQueryFromYmd || ctx.lookbackVisualStartYmd || ctx.lookbackStartYmd;
  const toYmd = ctx.lookbackEndYmd;
  const pairMaps =
    opts.pairMaps ||
    (client ? await loadPairDailyMaps(client, plantCode, fromYmd, toYmd, year, month) : emptyPairMaps());
  const model = await buildDicfExcel2027Model({
    ctx,
    plantCode,
    selectedByYmd,
    pairMaps,
  });
  let residualNote = null;
  if (!model.recon.within) {
    residualNote =
      "PROM residual vs planta no repartido. Volumen fuera de los 6 pares o redondeo. residual=" +
      model.recon.residual.join(",");
  }
  const aoa = buildSheet2027Aoa(model.projected, { residualNote });
  return { ...model, aoa, ctx, pairMaps };
}

module.exports = {
  YEAR_2027,
  MONTH_LABELS,
  PAIRS,
  PAIR_KEYS,
  WEEKDAYS_LUN_DOM,
  PROM_RECONCILIATION_TOLERANCE,
  pairKey,
  classifyCanal,
  classifySubcanal,
  classifyPair,
  weekdayCountsForMonth,
  weekdayCounts2027,
  projectVentaMonth,
  projectDiscountMonth,
  computeSixPairProms,
  projectYearFromProms,
  reconcilePlantVsPairs,
  buildSheet2027Aoa,
  applySheet2027Formats,
  loadPairDailyMaps,
  buildDicfExcel2027Model,
  assembleDicfExcel2027,
  emptyPairMaps,
  promNumber,
};
