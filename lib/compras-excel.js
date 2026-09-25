"use strict";

const ExcelJS = require("exceljs");
const { hgCosto, hgImporte } = require("./compras-dashboard");

const MESES = [
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
];

const BLACK = "FF000000";
const HEADER = "FF2F2F2F";
const CAPTURE = "FFD9D9D9";
const DATE_CAP = "FFB8CCE4";
const WHITE = "FFFFFFFF";
const ESTIMATED_BLUE = "FF5B9BD5";

function border() {
  const t = { style: "thin", color: { argb: "FF000000" } };
  return { top: t, left: t, bottom: t, right: t };
}

function paint(cell, fill, font) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  cell.font = Object.assign({ name: "Calibri", size: 9, color: { argb: "FF000000" } }, font || {});
  cell.border = border();
}

function paintTitle(cell) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
  cell.font = { bold: true, name: "Calibri", size: 11, color: { argb: BLACK } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = { bottom: { style: "thin", color: { argb: BLACK } } };
}

function paintMetric(cell) {
  paint(cell, HEADER, { bold: true, color: { argb: WHITE }, size: 8 });
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

function setNum(cell, value, fmt, fill, bold, blankIfZero) {
  paint(cell, fill, { bold: Boolean(bold) });
  cell.alignment = { horizontal: "right", vertical: "middle" };
  const n = Number(value);
  if (!Number.isFinite(n) || (blankIfZero && n === 0)) {
    cell.value = null;
    return;
  }
  cell.value = n;
  cell.numFmt = fmt;
}

function blockStarts(providerCount) {
  const starts = [];
  let col = 2;
  for (let i = 0; i < providerCount + 1; i += 1) {
    starts.push(col);
    col += 4;
  }
  return starts;
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function positivePurchase(value) {
  const n = finiteNumber(value);
  return n != null && n > 0 ? n : null;
}

function arithmeticMean(values) {
  if (!values || !values.length) return null;
  let sum = 0;
  for (const n of values) sum += n;
  return sum / values.length;
}

function dayPurchase(day, providerId) {
  if (!day || !day.cells) return {};
  return day.cells[providerId] || day.cells[String(providerId)] || {};
}

function hgField(src, suffix) {
  if (!src) return undefined;
  const key = "hg_" + suffix;
  return Object.prototype.hasOwnProperty.call(src, key) ? src[key] : undefined;
}

function realCapturedHgImporte(day) {
  if (!day || day.hg_kilos == null) return null;
  const kilos = finiteNumber(day.hg_kilos);
  if (kilos == null) return null;
  const carried = hgField(day, "importe_efectivo");
  if (carried !== undefined) return finiteNumber(carried);
  const carriedCost = hgField(day, "costo_efectivo");
  const cost = carriedCost !== undefined
    ? carriedCost
    : hgCosto(
      day.consolidado && day.consolidado.costo_kg,
      day.flete && day.flete.consolidado && day.flete.consolidado.tarifa
    );
  return finiteNumber(hgImporte(cost, kilos));
}

function mexicoTodayYmd(now) {
  const date = now instanceof Date ? now : new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function resolveCorteYmd(opts, payload) {
  const raw = opts && opts.corteYmd != null
    ? String(opts.corteYmd).trim().slice(0, 10)
    : (payload && payload.corteYmd != null ? String(payload.corteYmd).trim().slice(0, 10) : "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return mexicoTodayYmd(opts && opts.now);
}

function elapsedCalendarDays(year, month, corteYmd) {
  if (!corteYmd) return 0;
  const [cy, cm, cd] = String(corteYmd).split("-").map(Number);
  const last = new Date(year, month, 0).getDate();
  if (cy === year && cm === month) return Math.max(0, Math.min(cd, last + 1) - 1);
  if (cy > year || (cy === year && cm > month)) return last;
  return 0;
}

function calendarProviderAverages(payload, providers, days, corte) {
  const year = Number(payload && payload.year);
  const month = Number(payload && payload.month);
  const elapsed = elapsedCalendarDays(year, month, corte);
  const byProvider = new Map();
  for (const p of providers) byProvider.set(p.id, { kg: 0, importe: 0, sawKg: false, sawImp: false });
  if (!elapsed || !corte) return { elapsed: 0, byProvider };
  for (const day of days) {
    if (String(day.ymd) >= corte) continue;
    for (const p of providers) {
      const cell = dayPurchase(day, p.id);
      const kgReal = positivePurchase(cell.kg);
      const impReal = positivePurchase(cell.importe);
      const acc = byProvider.get(p.id);
      if (kgReal != null) {
        acc.kg += kgReal;
        acc.sawKg = true;
      }
      if (impReal != null) {
        acc.importe += impReal;
        acc.sawImp = true;
      }
    }
  }
  return { elapsed, byProvider };
}

function ventaKgOn(ventaKgByYmd, ymd) {
  if (!ventaKgByYmd) return null;
  const raw = ventaKgByYmd instanceof Map ? ventaKgByYmd.get(ymd) : ventaKgByYmd[ymd];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildComprasDailyEstimateContext(payload, corteYmd, ventaKgByYmd) {
  const providers = (payload && payload.providers) || [];
  const days = [...((payload && payload.grid && payload.grid.days) || [])].sort((a, b) => String(a.ymd).localeCompare(String(b.ymd)));
  const corte = /^\d{4}-\d{2}-\d{2}$/.test(String(corteYmd || "")) ? String(corteYmd) : null;
  const providerAvg = calendarProviderAverages(payload, providers, days, corte);
  const history = new Map();
  const lastUnit = new Map();
  const byYmd = new Map();
  const remember = (key, value) => {
    if (!history.has(key)) history.set(key, []);
    history.get(key).push(value);
  };
  const priorMean = (key) => arithmeticMean(history.get(key) || []);
  for (const day of days) {
    const project = corte != null && String(day.ymd) >= corte;
    const providersOut = {};
    for (const p of providers) {
      const cell = dayPurchase(day, p.id);
      const kgReal = positivePurchase(cell.kg);
      const impReal = positivePurchase(cell.importe);
      const acc = providerAvg.byProvider.get(p.id);
      const kgAvg = project && acc && acc.sawKg ? acc.kg / providerAvg.elapsed : null;
      const kg = kgReal != null ? kgReal : kgAvg;
      const unit = lastUnit.get(p.id);
      const ventaKg = ventaKgOn(ventaKgByYmd, day.ymd);
      const importe = impReal != null ? impReal : (project && unit != null && ventaKg != null ? unit * ventaKg : null);
      if (kgReal != null && impReal != null) lastUnit.set(p.id, impReal / kgReal);
      providersOut[p.id] = {
        kg,
        importe,
        costo_kg: importe != null && impReal == null ? unit : null,
        kg_estimated: kgReal == null && kg != null,
        importe_estimated: impReal == null && importe != null,
      };
    }
    const kilosReal = day && day.hg_kilos != null ? finiteNumber(day.hg_kilos) : null;
    const kilos = kilosReal != null ? kilosReal : (project ? priorMean("kilos") : null);
    if (kilosReal != null) remember("kilos", kilosReal);
    const importeReal = realCapturedHgImporte(day);
    const hgImporteValue = importeReal != null ? importeReal : (project ? priorMean("captured-imp") : null);
    if (importeReal != null) remember("captured-imp", importeReal);
    byYmd.set(day.ymd, {
      ymd: day.ymd,
      providers: providersOut,
      hg: {
        kilos,
        importe: hgImporteValue,
        kilos_estimated: kilosReal == null && kilos != null,
        importe_estimated: importeReal == null && hgImporteValue != null,
        importe_real: importeReal != null,
      },
    });
  }
  return { byYmd };
}

function sumFinite(values) {
  let sum = 0;
  let any = false;
  for (const value of values) {
    const n = finiteNumber(value);
    if (n == null) continue;
    sum += n;
    any = true;
  }
  return any ? sum : null;
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function providerTarifa(day, providerId, tarifas) {
  const flete = day && day.flete && day.flete.providers;
  const cell = flete && (flete[providerId] || flete[String(providerId)]);
  const own = cell ? finiteNumber(cell.tarifa) : null;
  if (own != null) return own;
  if (tarifas && tarifas.has(Number(providerId))) return tarifas.get(Number(providerId));
  return null;
}

function dailyRowHasHgCostInputs(est, day, providers, tarifas) {
  if (!est || !providers || !providers.length) return false;
  let kg = 0;
  let saw = false;
  for (const p of providers) {
    const slot = est.providers && est.providers[p.id];
    const pkg = slot ? finiteNumber(slot.kg) : null;
    const imp = slot ? finiteNumber(slot.importe) : null;
    if (pkg == null || pkg <= 0 || imp == null) continue;
    const tarifa = providerTarifa(day, p.id, tarifas);
    if (tarifa == null) return false;
    kg += pkg;
    saw = true;
  }
  return saw && kg > 0;
}

function estimatesFor(ctx, ymds) {
  return (ymds || []).map((ymd) => ctx.byYmd.get(ymd)).filter(Boolean);
}

function aggregateEstimatedProviders(providers, estimates) {
  const perProv = {};
  let kg = 0;
  let importe = 0;
  for (const p of providers || []) {
    let pkg = 0;
    let pimp = 0;
    for (const est of estimates) {
      const slot = est.providers && est.providers[p.id];
      if (!slot) continue;
      if (finiteNumber(slot.kg) != null) pkg += Number(slot.kg);
      if (finiteNumber(slot.importe) != null) pimp += Number(slot.importe);
    }
    perProv[p.id] = { kg: pkg, importe: pimp, costo_kg: pkg > 0 ? pimp / pkg : null };
    kg += pkg;
    importe += pimp;
  }
  return { providers: perProv, consolidado: { kg, importe, costo_kg: kg > 0 ? importe / kg : null } };
}

function aggregateEstimatedHg(estimates) {
  const kilos = sumFinite(estimates.map((est) => est.hg && est.hg.kilos));
  const imported = sumFinite(estimates.map((est) => {
    if (!est.hg) return null;
    if (est.hg.importe_real || est.hg.importe_estimated) return est.hg.importe;
    return null;
  }));
  return { kilos, importe: imported == null ? null : roundMoney(imported) };
}

function aggregateEstimatedFlete(providers, estimates, tarifas, fallbackFlete) {
  const perProv = {};
  const cells = [];
  for (const p of providers || []) {
    let kg = 0;
    for (const est of estimates) {
      const slot = est.providers && est.providers[p.id];
      if (slot && finiteNumber(slot.kg) != null) kg += Number(slot.kg);
    }
    const prior = fallbackFlete && fallbackFlete.providers && (fallbackFlete.providers[p.id] || fallbackFlete.providers[String(p.id)]);
    let tarifa = prior ? finiteNumber(prior.tarifa) : null;
    if (tarifa == null && tarifas && tarifas.has(Number(p.id))) tarifa = tarifas.get(Number(p.id));
    const importe = tarifa == null ? (kg === 0 ? 0 : null) : roundMoney(kg * tarifa);
    const cell = { kg, tarifa, importe };
    perProv[p.id] = cell;
    cells.push(cell);
  }
  let consKg = 0;
  let consImp = 0;
  const incomplete = cells.some((cell) => (finiteNumber(cell.kg) || 0) > 0 && finiteNumber(cell.tarifa) == null);
  for (const cell of cells) {
    consKg += finiteNumber(cell.kg) || 0;
    if (!incomplete) consImp += finiteNumber(cell.importe) || 0;
  }
  const consolidado = incomplete
    ? { kg: consKg, importe: null, tarifa: null }
    : { kg: consKg, importe: roundMoney(consImp), tarifa: consKg > 0 ? roundMoney(consImp) / consKg : null };
  return { providers: perProv, consolidado };
}

async function appendComprasWorksheet(wb, payload, opts = {}) {
  const plantName = String((opts && opts.plantName) || "").trim();
  const year = Number(payload.year);
  const month = Number(payload.month);
  const providers = payload.providers || [];
  const dayByYmd = new Map((payload.grid && payload.grid.days ? payload.grid.days : []).map((d) => [d.ymd, d]));
  const corteYmd = resolveCorteYmd(opts, payload);
  const ventaKgByYmd = (opts && opts.ventaKgByYmd) || (payload && payload.ventaKgByYmd) || null;
  const estimateCtx = buildComprasDailyEstimateContext(payload, corteYmd, ventaKgByYmd);
  const weekByNum = new Map((payload.grid && payload.grid.weeks ? payload.grid.weeks : []).map((w) => [w.week, w]));
  const starts = blockStarts(providers.length);
  const consStart = starts[starts.length - 1];
  const hgCostoCol = consStart + 4;
  const hgCol = hgCostoCol + 1;
  const hgImpCol = hgCol + 1;
  const fleteStarts = blockStarts(providers.length).map((c) => c + hgImpCol + 1);
  const fleteConsStart = fleteStarts[fleteStarts.length - 1];
  const lastCol = fleteConsStart + 2;
  const consCostoCol = consStart + 1;
  const fleteTarifaCol = fleteConsStart + 1;

  const ws = wb.addWorksheet("CONTROL DE COMPRAS", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 5 }],
  });

  ws.getColumn(1).width = 12;
  for (let c = 2; c <= lastCol + 1; c += 1) {
    const inFlete = c >= hgImpCol + 2;
    const rel = inFlete ? c - (hgImpCol + 2) : c - 2;
    const isGap = (!inFlete && c < hgCostoCol && rel % 4 === 3) || c === hgCostoCol - 1 || c === hgImpCol + 1;
    ws.getColumn(c).width = c === hgCol ? 9 : isGap ? 2.2 : 12;
  }

  ws.mergeCells(1, 1, 1, 4);
  ws.getCell(1, 1).value = "CONTROL DE COMPRAS";
  ws.getCell(1, 1).font = { bold: true, name: "Calibri", size: 20, color: { argb: BLACK } };

  ws.getCell(1, lastCol).value = year;
  ws.getCell(1, lastCol).font = { bold: true, name: "Calibri", size: 18 };
  ws.getCell(1, lastCol).alignment = { horizontal: "center" };

  ws.getCell(2, 1).value = plantName ? `PLANTA ${plantName.toUpperCase()}` : "PLANTA";
  ws.getCell(2, 1).font = { name: "Calibri", size: 10 };
  ws.getCell(2, lastCol - 1).value = "MES";
  ws.getCell(2, lastCol - 1).alignment = { horizontal: "right" };
  ws.getCell(2, lastCol).value = MESES[month - 1] || "";
  ws.getCell(2, lastCol).font = { bold: true };
  ws.getCell(2, lastCol).alignment = { horizontal: "center" };

  const titleRow = 4;
  const metricRow = 5;
  const fecha = ws.getCell(titleRow, 1);
  fecha.value = "FECHA";
  paint(fecha, HEADER, { bold: true, color: { argb: WHITE } });
  ws.mergeCells(titleRow, 1, metricRow, 1);
  paint(ws.getCell(metricRow, 1), HEADER, { bold: true, color: { argb: WHITE } });
  ws.getCell(titleRow, 1).alignment = { horizontal: "center", vertical: "middle" };

  const titles = providers.map((p) => String(p.nombre || "").toUpperCase()).concat(["CONSOLIDADO"]);
  titles.forEach((name, i) => {
    const start = starts[i];
    ws.mergeCells(titleRow, start, titleRow, start + 2);
    const t = ws.getCell(titleRow, start);
    t.value = name;
    paintTitle(t);
    paintTitle(ws.getCell(titleRow, start + 1));
    paintTitle(ws.getCell(titleRow, start + 2));
    ["COMPRA KG", "COSTO KG", "IMPORTE"].forEach((label, j) => {
      const h = ws.getCell(metricRow, start + j);
      h.value = label;
      paintMetric(h);
    });
  });

  const tarifaByProv = new Map(
    ((payload.tarifas_flete || []).map((t) => [Number(t.proveedor_id), Number(t.tarifa)])).filter((p) => Number.isFinite(p[1]))
  );
  providers.forEach((p, i) => {
    const start = starts[i];
    const t = tarifaByProv.has(Number(p.id)) ? tarifaByProv.get(Number(p.id)) : null;
    ws.mergeCells(3, start, 3, start + 2);
    const box = ws.getCell(3, start);
    box.value = t == null ? "TARIFA" : `TARIFA ${t}`;
    paintTitle(box);
    box.font = { name: "Calibri", size: 8, bold: true };
  });

  ws.mergeCells(titleRow, hgCostoCol, titleRow, hgImpCol);
  const hgTitle = ws.getCell(titleRow, hgCostoCol);
  hgTitle.value = "HG EN KILOS";
  paintTitle(hgTitle);
  paintTitle(ws.getCell(titleRow, hgCol));
  paintTitle(ws.getCell(titleRow, hgImpCol));
  ["COSTO", "HG EN KILOS", "IMPORTE"].forEach((label, j) => {
    const h = ws.getCell(metricRow, hgCostoCol + j);
    h.value = label;
    paintMetric(h);
  });
  hgTitle.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  ws.mergeCells(3, fleteStarts[0], 3, fleteConsStart + 2);
  const fleteBanner = ws.getCell(3, fleteStarts[0]);
  fleteBanner.value = "VALOR DEL FLETE SEGÚN ORIGEN";
  paintTitle(fleteBanner);
  fleteBanner.font = { bold: true, name: "Calibri", size: 11 };

  const fleteTitles = providers.map((p) => String(p.nombre || "").toUpperCase()).concat(["CONSOLIDADO"]);
  fleteTitles.forEach((name, i) => {
    const start = fleteStarts[i];
    ws.mergeCells(titleRow, start, titleRow, start + 2);
    const t = ws.getCell(titleRow, start);
    t.value = name;
    paintTitle(t);
    paintTitle(ws.getCell(titleRow, start + 1));
    paintTitle(ws.getCell(titleRow, start + 2));
    ["COMPRA KG", "TARIFA", "IMPORTE"].forEach((label, j) => {
      const h = ws.getCell(metricRow, start + j);
      h.value = label;
      paintMetric(h);
    });
  });

  function colLetter(n) {
    let s = "";
    let x = Number(n);
    while (x > 0) {
      const m = (x - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  }

  function setHg(cell, value, daily) {
    paint(cell, daily ? CAPTURE : WHITE, { bold: !daily });
    cell.alignment = { horizontal: "right", vertical: "middle" };
    if (value == null || !Number.isFinite(Number(value))) {
      cell.value = null;
      return;
    }
    cell.value = Number(value);
    cell.numFmt = "#,##0";
  }

  function carriedField(src, suffix) {
    if (!src) return undefined;
    const key = "hg_" + suffix;
    return Object.prototype.hasOwnProperty.call(src, key) ? src[key] : undefined;
  }

  function writeHgBlock(row, src, opts) {
    const daily = Boolean(opts && opts.daily);
    const sumImporte = opts && Object.prototype.hasOwnProperty.call(opts, "sumImporte") ? opts.sumImporte : undefined;
    const carried = carriedField(src, "costo_efectivo");
    const carriedImporte = carriedField(src, "importe_efectivo");
    const aggregated = hgCosto(
      src && src.consolidado && src.consolidado.costo_kg,
      src && src.flete && src.flete.consolidado && src.flete.consolidado.tarifa
    );
    const costo = daily ? (carried === undefined ? aggregated : carried) : aggregated;
    const hg = src ? src.hg_kilos : null;
    const importe = sumImporte !== undefined
      ? sumImporte
      : (carriedImporte !== undefined ? carriedImporte : hgImporte(costo, hg));
    const costoCell = ws.getCell(row, hgCostoCol);
    const impCell = ws.getCell(row, hgImpCol);
    paint(costoCell, WHITE, { bold: !daily });
    costoCell.alignment = { horizontal: "right", vertical: "middle" };
    if (daily && opts && opts.formulaReady) {
      const consRef = `${colLetter(consCostoCol)}${row}`;
      const tarifaRef = `${colLetter(fleteTarifaCol)}${row}`;
      costoCell.value = { formula: `IF(AND(ISNUMBER(${consRef}),ISNUMBER(${tarifaRef})),${consRef}+${tarifaRef},"")` };
    } else if (daily) {
      const carriedCost = carried != null && Number.isFinite(Number(carried)) ? Number(carried) : null;
      costoCell.value = carriedCost;
    } else if (aggregated == null) {
      costoCell.value = null;
    } else {
      costoCell.value = aggregated;
    }
    costoCell.numFmt = "0.000";
    setHg(ws.getCell(row, hgCol), hg, daily);
    paint(impCell, WHITE, { bold: !daily });
    impCell.alignment = { horizontal: "right", vertical: "middle" };
    if (daily) {
      const costoRef = `${colLetter(hgCostoCol)}${row}`;
      const hgRef = `${colLetter(hgCol)}${row}`;
      impCell.value = { formula: `IF(AND(ISNUMBER(${costoRef}),ISNUMBER(${hgRef})),${costoRef}*${hgRef}*-1,"")` };
    } else if (importe == null) {
      impCell.value = null;
    } else {
      impCell.value = importe;
    }
    impCell.numFmt = "#,##0.00";
  }

  function writeEmptyNum(cell) {
    paint(cell, WHITE);
    cell.alignment = { horizontal: "right", vertical: "middle" };
    cell.value = null;
  }

  function writeFormula(cell, formula, fmt) {
    paint(cell, WHITE);
    cell.alignment = { horizontal: "right", vertical: "middle" };
    cell.value = { formula };
    cell.numFmt = fmt;
  }

  function writeEstimatedNumber(cell, value, fmt) {
    paint(cell, ESTIMATED_BLUE);
    cell.alignment = { horizontal: "right", vertical: "middle" };
    cell.value = Number(value);
    cell.numFmt = fmt;
  }

  function writeDailyDerived(excelRow, day) {
    if (!providers.length) return;
    const kgRefs = providers.map((_, i) => `${colLetter(starts[i])}${excelRow}`);
    const impRefs = providers.map((_, i) => `${colLetter(starts[i] + 2)}${excelRow}`);
    writeFormula(ws.getCell(excelRow, consStart), `IF(COUNT(${kgRefs.join(",")})=0,"",SUM(${kgRefs.join(",")}))`, "#,##0.0");
    writeFormula(ws.getCell(excelRow, consStart + 2), `IF(COUNT(${impRefs.join(",")})=0,"",SUM(${impRefs.join(",")}))`, "#,##0.00");
    const kgRef = `${colLetter(consStart)}${excelRow}`;
    const impRef = `${colLetter(consStart + 2)}${excelRow}`;
    writeFormula(ws.getCell(excelRow, consCostoCol), `IF(AND(ISNUMBER(${kgRef}),${kgRef}<>0,ISNUMBER(${impRef})),${impRef}/${kgRef},"")`, "0.000");
    providers.forEach((p, i) => {
      const startCol = fleteStarts[i];
      const purchaseRef = `${colLetter(starts[i])}${excelRow}`;
      writeFormula(ws.getCell(excelRow, startCol), `IF(ISNUMBER(${purchaseRef}),${purchaseRef},"")`, "#,##0.0");
      const fleteCell = (day && day.flete && day.flete.providers && (day.flete.providers[p.id] || day.flete.providers[String(p.id)])) || {};
      let tarifa = finiteNumber(fleteCell.tarifa);
      if (tarifa == null && tarifaByProv.has(Number(p.id))) tarifa = tarifaByProv.get(Number(p.id));
      if (tarifa == null) writeEmptyNum(ws.getCell(excelRow, startCol + 1));
      else setNum(ws.getCell(excelRow, startCol + 1), tarifa, "0.00", WHITE, false, false);
      const kgCellRef = `${colLetter(startCol)}${excelRow}`;
      const tarifaRef = `${colLetter(startCol + 1)}${excelRow}`;
      writeFormula(ws.getCell(excelRow, startCol + 2), `IF(AND(ISNUMBER(${kgCellRef}),ISNUMBER(${tarifaRef})),${kgCellRef}*${tarifaRef},"")`, "#,##0.00");
    });
    const fleteKgRefs = providers.map((_, i) => `${colLetter(fleteStarts[i])}${excelRow}`);
    const fleteImpRefs = providers.map((_, i) => `${colLetter(fleteStarts[i] + 2)}${excelRow}`);
    const incomplete = providers.map((_, i) => `AND(${colLetter(fleteStarts[i])}${excelRow}<>"",${colLetter(fleteStarts[i] + 1)}${excelRow}="")`);
    const aiRef = `${colLetter(fleteConsStart)}${excelRow}`;
    const akRef = `${colLetter(fleteConsStart + 2)}${excelRow}`;
    writeFormula(ws.getCell(excelRow, fleteConsStart), `IF(COUNT(${fleteKgRefs.join(",")})=0,"",SUM(${fleteKgRefs.join(",")}))`, "#,##0.0");
    writeFormula(
      ws.getCell(excelRow, fleteConsStart + 2),
      `IF(OR(${incomplete.join(",")}),"",IF(COUNT(${fleteImpRefs.join(",")})=0,"",SUM(${fleteImpRefs.join(",")})))`,
      "#,##0.00"
    );
    writeFormula(ws.getCell(excelRow, fleteConsStart + 1), `IF(AND(ISNUMBER(${aiRef}),${aiRef}<>0,ISNUMBER(${akRef})),${akRef}/${aiRef},"")`, "0.00");
  }

  function writeFleteTriple(row, startCol, cell, blankKgIfZero) {
    setNum(ws.getCell(row, startCol), cell && cell.kg, "#,##0.0", WHITE, false, blankKgIfZero);
    const tarifa = cell && cell.tarifa;
    if (tarifa == null || !Number.isFinite(Number(tarifa))) {
      writeEmptyNum(ws.getCell(row, startCol + 1));
    } else {
      setNum(ws.getCell(row, startCol + 1), tarifa, "0.00", WHITE, false, false);
    }
    const importe = cell && cell.importe;
    if (importe == null || !Number.isFinite(Number(importe))) {
      writeEmptyNum(ws.getCell(row, startCol + 2));
    } else {
      setNum(ws.getCell(row, startCol + 2), importe, "#,##0.00", WHITE, Boolean(blankKgIfZero === false), false);
    }
  }

  function writeFleteRow(excelRow, flete, blankKgIfZero) {
    providers.forEach((p, i) => {
      const cell = (flete && (flete.providers[p.id] || flete.providers[String(p.id)])) || { kg: 0, tarifa: null, importe: 0 };
      writeFleteTriple(excelRow, fleteStarts[i], cell, blankKgIfZero);
    });
    writeFleteTriple(excelRow, fleteConsStart, (flete && flete.consolidado) || { kg: 0, tarifa: null, importe: null }, blankKgIfZero);
  }

  function writeProviderTriple(row, startCol, cell, blankIfZero, consolidado) {
    const kgFill = consolidado ? WHITE : CAPTURE;
    const impFill = consolidado ? WHITE : CAPTURE;
    setNum(ws.getCell(row, startCol), cell && cell.kg, "#,##0.0", kgFill, false, blankIfZero);
    setNum(ws.getCell(row, startCol + 1), cell && cell.costo_kg, "0.000", WHITE, Boolean(cell && cell.costo_kg), blankIfZero);
    setNum(ws.getCell(row, startCol + 2), cell && cell.importe, "#,##0.00", impFill, false, blankIfZero);
  }

  let r = 6;
  for (const row of payload.grid.rows || []) {
    if (row.type === "day") {
      const day = dayByYmd.get(row.ymd);
      const dateCell = ws.getCell(r, 1);
      const [yy, mm, dd] = row.ymd.split("-");
      dateCell.value = `${dd}/${mm}/${yy}`;
      paint(dateCell, day && day.captured ? DATE_CAP : WHITE, { bold: false });
      dateCell.alignment = { horizontal: "left", vertical: "middle" };
      const est = estimateCtx.byYmd.get(row.ymd);
      providers.forEach((p, i) => {
        const slot = (est && est.providers[p.id]) || { kg: null, importe: null, kg_estimated: false, importe_estimated: false };
        const start = starts[i];
        if (slot.kg_estimated) writeEstimatedNumber(ws.getCell(r, start), slot.kg, "#,##0.0");
        else setNum(ws.getCell(r, start), slot.kg, "#,##0.0", CAPTURE, false, true);
        const kgRef = `${colLetter(start)}${r}`;
        const impRef = `${colLetter(start + 2)}${r}`;
        if (slot.importe_estimated && slot.costo_kg != null) {
          writeEstimatedNumber(ws.getCell(r, start + 1), slot.costo_kg, "0.000");
        } else {
          writeFormula(ws.getCell(r, start + 1), `IF(AND(ISNUMBER(${kgRef}),${kgRef}<>0,ISNUMBER(${impRef})),${impRef}/${kgRef},"")`, "0.000");
        }
        if (slot.importe_estimated) writeEstimatedNumber(ws.getCell(r, start + 2), slot.importe, "#,##0.00");
        else setNum(ws.getCell(r, start + 2), slot.importe, "#,##0.00", CAPTURE, false, true);
      });
      writeDailyDerived(r, day);
      writeHgBlock(r, day, {
        daily: true,
        formulaReady: dailyRowHasHgCostInputs(est, day, providers, tarifaByProv),
      });
      if (est && est.hg.kilos_estimated) writeEstimatedNumber(ws.getCell(r, hgCol), est.hg.kilos, "#,##0");
      if (est && !est.hg.importe_real && est.hg.importe_estimated) {
        writeEstimatedNumber(ws.getCell(r, hgImpCol), est.hg.importe, "#,##0.00");
      }
      r += 1;
    } else {
      const week = weekByNum.get(row.week);
      const label = ws.getCell(r, 1);
      label.value = `Semana ${row.week}`;
      paint(label, BLACK, { bold: true, color: { argb: WHITE } });
      label.alignment = { horizontal: "left", vertical: "middle" };
      const weekYmds = (week && week.ymds) || row.ymds || [];
      const weekEstimates = estimatesFor(estimateCtx, weekYmds);
      const weekProviders = aggregateEstimatedProviders(providers, weekEstimates);
      const weekHg = aggregateEstimatedHg(weekEstimates);
      const weekFlete = aggregateEstimatedFlete(providers, weekEstimates, tarifaByProv, week && week.flete);
      providers.forEach((p, i) => {
        const cell = weekProviders.providers[p.id] || { kg: 0, importe: 0, costo_kg: null };
        writeProviderTriple(r, starts[i], cell, false, false);
        for (let j = 0; j < 3; j += 1) {
          const c = ws.getCell(r, starts[i] + j);
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
          c.font = { bold: true, name: "Calibri", size: 9 };
        }
      });
      writeProviderTriple(r, starts[providers.length], weekProviders.consolidado, false, true);
      for (let j = 0; j < 3; j += 1) {
        const c = ws.getCell(r, starts[providers.length] + j);
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
        c.font = { bold: true, name: "Calibri", size: 9 };
      }
      const weekTarifa = weekFlete.consolidado.tarifa != null
        ? weekFlete.consolidado.tarifa
        : (week && week.flete && week.flete.consolidado && week.flete.consolidado.tarifa);
      writeHgBlock(r, {
        consolidado: weekProviders.consolidado,
        flete: { consolidado: { tarifa: weekTarifa } },
        hg_kilos: weekHg.kilos,
      }, { daily: false, sumImporte: weekHg.importe });
      writeFleteRow(r, weekFlete, false);
      r += 1;
      r += 1;
    }
  }

  const monthRow = payload.grid && payload.grid.month;
  const monthYmds = ((payload.grid && payload.grid.days) || []).map((d) => d.ymd);
  const monthEstimates = estimatesFor(estimateCtx, monthYmds);
  const monthProviders = aggregateEstimatedProviders(providers, monthEstimates);
  const monthHg = aggregateEstimatedHg(monthEstimates);
  const monthFlete = aggregateEstimatedFlete(providers, monthEstimates, tarifaByProv, monthRow && monthRow.flete);
  const tot = ws.getCell(r, 1);
  tot.value = "TOTAL MES";
  paint(tot, BLACK, { bold: true, color: { argb: WHITE } });
  tot.alignment = { horizontal: "left" };
  providers.forEach((p, i) => {
    const cell = monthProviders.providers[p.id] || { kg: 0, importe: 0, costo_kg: null };
    writeProviderTriple(r, starts[i], cell, false, false);
    for (let j = 0; j < 3; j += 1) {
      const c = ws.getCell(r, starts[i] + j);
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
      c.font = { bold: true, name: "Calibri", size: 9 };
    }
  });
  writeProviderTriple(r, starts[providers.length], monthProviders.consolidado, false, true);
  for (let j = 0; j < 3; j += 1) {
    const c = ws.getCell(r, starts[providers.length] + j);
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
    c.font = { bold: true, name: "Calibri", size: 9 };
  }
  const monthTarifa = monthFlete.consolidado.tarifa != null
    ? monthFlete.consolidado.tarifa
    : (monthRow && monthRow.flete && monthRow.flete.consolidado && monthRow.flete.consolidado.tarifa);
  writeHgBlock(r, {
    consolidado: monthProviders.consolidado,
    flete: { consolidado: { tarifa: monthTarifa } },
    hg_kilos: monthHg.kilos,
  }, { daily: false, sumImporte: monthHg.importe });
  writeFleteRow(r, monthFlete, false);

  return ws;
}

async function buildComprasWorkbook(payload, opts = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "folio-whatsapp-bot";
  await appendComprasWorksheet(wb, payload, opts);
  return wb;
}

module.exports = {
  buildComprasWorkbook,
  appendComprasWorksheet,
  buildComprasDailyEstimateContext,
  mexicoTodayYmd,
  ESTIMATED_BLUE,
  MESES,
  blockStarts,
};
