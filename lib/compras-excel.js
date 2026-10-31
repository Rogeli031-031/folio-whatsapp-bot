"use strict";

const { isNotaCargoProvider } = require("./compras-dashboard");

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
const INHERITED_YELLOW = "FFFFFF00";

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

function controlComprasLayout(physicalCount) {
  const n = Number.isFinite(physicalCount) && physicalCount > 0 ? Math.floor(physicalCount) : 0;
  const providerStarts = [];
  let col = 2;
  for (let i = 0; i < n; i += 1) {
    providerStarts.push(col);
    col += 4;
  }
  const notaCol = col;
  col += 1;
  const consStart = col;
  col += 3;
  const gapBeforeHg = col;
  col += 1;
  const hgCostoCol = col;
  const hgCol = col + 1;
  const hgImpCol = col + 2;
  col += 3;
  const gapBeforeFlete = col;
  col += 1;
  const fleteStarts = [];
  for (let i = 0; i < n; i += 1) {
    fleteStarts.push(col);
    col += 4;
  }
  const fleteConsStart = col;
  return {
    providerStarts,
    notaCol,
    consStart,
    consCostoCol: consStart + 1,
    consImpCol: consStart + 2,
    gapBeforeHg,
    hgCostoCol,
    hgCol,
    hgImpCol,
    gapBeforeFlete,
    fleteStarts,
    fleteConsStart,
    fleteTarifaCol: fleteConsStart + 1,
    gapBeforeOrigin: fleteConsStart + 3,
    tuxpanCol: fleteConsStart + 4,
    tepejiCol: fleteConsStart + 5,
    lastCol: fleteConsStart + 5,
  };
}

function withNotaImporte(cons, notaImporte) {
  const kg = finiteNumber(cons && cons.kg) || 0;
  const importe = (finiteNumber(cons && cons.importe) || 0) + (finiteNumber(notaImporte) || 0);
  return { kg, importe, costo_kg: kg > 0 ? importe / kg : null };
}

function notaImporteForDays(days, nota, ymds) {
  if (!nota) return 0;
  const wanted = new Set(ymds || []);
  let sum = 0;
  for (const day of days || []) {
    if (!wanted.has(day.ymd)) continue;
    const n = finiteNumber(dayPurchase(day, nota.id).importe);
    if (n != null) sum += n;
  }
  return sum;
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

function buildComprasDailyEstimateContext(payload, corteYmd) {
  const providers = (payload && payload.providers) || [];
  const days = [...((payload && payload.grid && payload.grid.days) || [])].sort((a, b) => String(a.ymd).localeCompare(String(b.ymd)));
  const corte = /^\d{4}-\d{2}-\d{2}$/.test(String(corteYmd || "")) ? String(corteYmd) : null;
  const providerAvg = calendarProviderAverages(
    payload,
    providers.filter((provider) => !isNotaCargoProvider(provider)),
    days,
    corte
  );
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
      if (isNotaCargoProvider(p)) {
        const note = dayPurchase(day, p.id);
        const noteImporte = finiteNumber(note.importe);
        providersOut[p.id] = {
          kg: null,
          importe: noteImporte != null && noteImporte !== 0 ? noteImporte : null,
          costo_kg: null,
          kg_estimated: false,
          importe_estimated: false,
        };
        continue;
      }
      const cell = dayPurchase(day, p.id);
      const kgReal = positivePurchase(cell.kg);
      const impReal = positivePurchase(cell.importe);
      const acc = providerAvg.byProvider.get(p.id);
      const kgAvg = project && acc && acc.sawKg ? acc.kg / providerAvg.elapsed : null;
      const kg = kgReal != null ? kgReal : kgAvg;
      const unit = lastUnit.get(p.id);
      const costoKg = project && impReal == null && unit != null ? unit : null;
      const importe = impReal != null ? impReal : (project && unit != null && kg != null ? unit * kg : null);
      if (kgReal != null && impReal != null) lastUnit.set(p.id, impReal / kgReal);
      providersOut[p.id] = {
        kg,
        importe,
        costo_kg: costoKg,
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

function isCalendarDayOne(ymd) {
  return /^\d{4}-\d{2}-01$/.test(String(ymd || ""));
}

function dayTwoYmd(ymd) {
  return isCalendarDayOne(ymd) ? `${String(ymd).slice(0, 8)}02` : "";
}

function dayOwnsConsolidatedCost(day) {
  const cons = day && day.consolidado;
  if (!cons) return false;
  const kg = finiteNumber(cons.kg);
  if (kg == null || kg <= 0 || cons.importe == null || cons.importe === "") return false;
  return finiteNumber(cons.importe) != null;
}

function dayOwnsConsolidatedTarifa(day) {
  const cons = day && day.flete && day.flete.consolidado;
  if (!cons || cons.incomplete) return false;
  const kg = finiteNumber(cons.kg);
  const tarifa = finiteNumber(cons.tarifa);
  return kg != null && kg > 0 && tarifa != null && tarifa >= 0;
}

function positiveInheritedCost(value) {
  if (value == null || value === "") return null;
  const n = finiteNumber(value);
  return n != null && n > 0 ? n : null;
}

function inheritedTarifa(value) {
  const n = finiteNumber(value);
  return n != null && n >= 0 ? n : null;
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

function aggregateEstimatedFlete(providers, estimates, tarifas, fallbackFlete, dayByYmd) {
  const perProv = {};
  const cells = [];
  for (const p of providers || []) {
    let kg = 0;
    let dailyImporte = 0;
    let missing = false;
    for (const est of estimates) {
      const slot = est.providers && est.providers[p.id];
      if (slot && finiteNumber(slot.kg) != null) kg += Number(slot.kg);
      const rate = providerTarifa(dayByYmd && dayByYmd.get(est.ymd), p.id, tarifas);
      if (slot && Number(slot.kg) > 0 && rate == null) missing = true;
      if (slot && finiteNumber(slot.kg) != null && rate != null) dailyImporte += roundMoney(Number(slot.kg) * rate);
    }
    const prior = fallbackFlete && fallbackFlete.providers && (fallbackFlete.providers[p.id] || fallbackFlete.providers[String(p.id)]);
    let tarifa = prior ? finiteNumber(prior.tarifa) : null;
    if (tarifa == null && tarifas && tarifas.has(Number(p.id))) tarifa = tarifas.get(Number(p.id));
    const importe = missing ? null : (dayByYmd ? roundMoney(dailyImporte) : (tarifa == null ? (kg === 0 ? 0 : null) : roundMoney(kg * tarifa)));
    if (dayByYmd && kg > 0) tarifa = importe == null ? null : importe / kg;
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
  const allProviders = payload.providers || [];
  const providers = allProviders.filter((provider) => !isNotaCargoProvider(provider));
  const notaProvider = allProviders.find((provider) => isNotaCargoProvider(provider)) || null;
  const dayByYmd = new Map((payload.grid && payload.grid.days ? payload.grid.days : []).map((d) => [d.ymd, d]));
  const corteYmd = resolveCorteYmd(opts, payload);
  const estimateCtx = buildComprasDailyEstimateContext(payload, corteYmd);
  const weekByNum = new Map((payload.grid && payload.grid.weeks ? payload.grid.weeks : []).map((w) => [w.week, w]));
  const layout = controlComprasLayout(providers.length);
  const starts = layout.providerStarts;
  const consStart = layout.consStart;
  const hgCostoCol = layout.hgCostoCol;
  const hgCol = layout.hgCol;
  const hgImpCol = layout.hgImpCol;
  const fleteStarts = layout.fleteStarts;
  const fleteConsStart = layout.fleteConsStart;
  const lastCol = layout.lastCol;
  const consCostoCol = layout.consCostoCol;
  const fleteTarifaCol = layout.fleteTarifaCol;

  const ws = wb.addWorksheet((opts && opts.sheetName) || "CONTROL DE COMPRAS", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 5 }],
  });

  ws.getColumn(1).width = 12;
  for (let c = 2; c <= lastCol; c += 1) ws.getColumn(c).width = 12;
  for (const start of starts) ws.getColumn(start + 3).width = 2.2;
  for (const start of fleteStarts) ws.getColumn(start + 3).width = 2.2;
  ws.getColumn(layout.gapBeforeHg).width = 2.2;
  ws.getColumn(layout.gapBeforeFlete).width = 2.2;
  ws.getColumn(hgCol).width = 9;
  ws.getColumn(layout.notaCol).width = 14;
  ws.getColumn(layout.gapBeforeOrigin).width = 2.2;
  ws.getColumn(layout.tuxpanCol).width = 20;
  ws.getColumn(layout.tepejiCol).width = 20;

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
  for (const [col, title] of [[layout.tuxpanCol, "TUXPAN"], [layout.tepejiCol, "TEPEJI"]]) {
    ws.mergeCells(titleRow, col, metricRow, col);
    const cell = ws.getCell(titleRow, col);
    cell.value = title;
    paintTitle(cell);
    cell.font = { name: "Calibri", size: 12, bold: true, color: { argb: BLACK } };
  }
  const fecha = ws.getCell(titleRow, 1);
  fecha.value = "FECHA";
  paint(fecha, HEADER, { bold: true, color: { argb: WHITE } });
  ws.mergeCells(titleRow, 1, metricRow, 1);
  paint(ws.getCell(metricRow, 1), HEADER, { bold: true, color: { argb: WHITE } });
  ws.getCell(titleRow, 1).alignment = { horizontal: "center", vertical: "middle" };

  providers.forEach((provider, i) => {
    const start = starts[i];
    const name = String(provider.nombre || "").toUpperCase();
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
  const notaTitle = ws.getCell(titleRow, layout.notaCol);
  notaTitle.value = "NOTA DE CARGO";
  paintTitle(notaTitle);
  const notaMetric = ws.getCell(metricRow, layout.notaCol);
  notaMetric.value = "IMPORTE";
  paintMetric(notaMetric);
  ws.mergeCells(titleRow, consStart, titleRow, consStart + 2);
  const consTitle = ws.getCell(titleRow, consStart);
  consTitle.value = "CONSOLIDADO";
  paintTitle(consTitle);
  paintTitle(ws.getCell(titleRow, consStart + 1));
  paintTitle(ws.getCell(titleRow, consStart + 2));
  ["COMPRA KG", "COSTO KG", "IMPORTE"].forEach((label, j) => {
    const h = ws.getCell(metricRow, consStart + j);
    h.value = label;
    paintMetric(h);
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

  const fleteBannerCol = fleteStarts[0] || fleteConsStart;
  ws.mergeCells(3, fleteBannerCol, 3, fleteConsStart + 2);
  const fleteBanner = ws.getCell(3, fleteBannerCol);
  fleteBanner.value = "VALOR DEL FLETE SEGÚN ORIGEN";
  paintTitle(fleteBanner);
  fleteBanner.font = { bold: true, name: "Calibri", size: 11 };

  providers.forEach((provider, i) => {
    const start = fleteStarts[i];
    const name = String(provider.nombre || "").toUpperCase();
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
  ws.mergeCells(titleRow, fleteConsStart, titleRow, fleteConsStart + 2);
  const fleteConsTitle = ws.getCell(titleRow, fleteConsStart);
  fleteConsTitle.value = "CONSOLIDADO";
  paintTitle(fleteConsTitle);
  paintTitle(ws.getCell(titleRow, fleteConsStart + 1));
  paintTitle(ws.getCell(titleRow, fleteConsStart + 2));
  ["COMPRA KG", "TARIFA", "IMPORTE"].forEach((label, j) => {
    const h = ws.getCell(metricRow, fleteConsStart + j);
    h.value = label;
    paintMetric(h);
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

  function writeInheritedNumber(cell, value, fmt) {
    paint(cell, INHERITED_YELLOW);
    cell.alignment = { horizontal: "right", vertical: "middle" };
    cell.value = Number(value);
    cell.numFmt = fmt;
  }

  function writeInheritedRef(cell, ref, fmt) {
    paint(cell, INHERITED_YELLOW);
    cell.alignment = { horizontal: "right", vertical: "middle" };
    cell.value = { formula: `IF(ISNUMBER(${ref}),${ref},"")` };
    cell.numFmt = fmt;
  }

  function writeEstimatedNumber(cell, value, fmt) {
    paint(cell, ESTIMATED_BLUE);
    cell.alignment = { horizontal: "right", vertical: "middle" };
    cell.value = Number(value);
    cell.numFmt = fmt;
  }

  function writeEstimatedFormula(cell, formula, fmt) {
    paint(cell, ESTIMATED_BLUE);
    cell.alignment = { horizontal: "right", vertical: "middle" };
    cell.value = { formula };
    cell.numFmt = fmt;
  }

  function writeDailyDerived(excelRow, day) {
    if (!providers.length) return;
    const kgRefs = providers.map((_, i) => `${colLetter(starts[i])}${excelRow}`);
    const impRefs = providers.map((_, i) => `${colLetter(starts[i] + 2)}${excelRow}`);
    impRefs.push(`${colLetter(layout.notaCol)}${excelRow}`);
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

  const excelRowByYmd = new Map();
  {
    let cursor = 6;
    for (const layoutRow of payload.grid.rows || []) {
      if (layoutRow.type === "day") {
        excelRowByYmd.set(layoutRow.ymd, cursor);
        cursor += 1;
      } else {
        cursor += 2;
      }
    }
  }

  function writeOriginShare(firstRow, lastRow, summaryRow, totals) {
    const split = Math.floor((firstRow + lastRow) / 2);
    const totalKg = Number(totals.consolidado.kg) || 0;
    for (const [col, names] of [
      [layout.tuxpanCol, ["PEMEX TUXPAN", "TOMZA TUXPAN"]],
      [layout.tepejiCol, ["TOMZA TEPEJI"]],
    ]) {
      const indexes = providers.flatMap((provider, index) => {
        const name = String(provider.nombre || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toUpperCase();
        return names.includes(name) ? [index] : [];
      });
      const kg = indexes.reduce((sum, index) => sum + (Number(totals.providers[providers[index].id]?.kg) || 0), 0);
      const refs = indexes.map((index) => `${colLetter(starts[index])}${summaryRow}`);
      if (split > firstRow) ws.mergeCells(firstRow, col, split, col);
      if (lastRow > split + 1) ws.mergeCells(split + 1, col, lastRow, col);
      const pctCell = ws.getCell(firstRow, col);
      const kgCell = ws.getCell(split + 1, col);
      const totalRef = `${colLetter(consStart)}${summaryRow}`;
      const kgRef = `${colLetter(col)}${split + 1}`;
      pctCell.value = { formula: `IF(${totalRef}>0,${kgRef}/${totalRef},"—")`, result: totalKg > 0 ? kg / totalKg : "—" };
      pctCell.numFmt = '0.00%';
      pctCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: BLACK } };
      pctCell.alignment = { horizontal: "center", vertical: "bottom" };
      kgCell.value = { formula: refs.length ? `SUM(${refs.join(",")})` : "0", result: kg };
      kgCell.numFmt = Number.isInteger(kg) ? '#,##0" kg"' : '#,##0.000" kg"';
      kgCell.font = { name: "Calibri", size: 10, color: { argb: "FF475569" } };
      kgCell.alignment = { horizontal: "center", vertical: "top" };
    }
  }

  function applyDayOneCostFallback(excelRow, ymd, day) {
    if (!isCalendarDayOne(ymd) || dayOwnsConsolidatedCost(day)) return;
    const day2Row = excelRowByYmd.get(dayTwoYmd(ymd));
    const priorO = positiveInheritedCost(payload && payload.costo_kg_anterior);
    const priorR = positiveInheritedCost(carriedField(day, "costo_efectivo"));
    const oCell = ws.getCell(excelRow, consCostoCol);
    const rCell = ws.getCell(excelRow, hgCostoCol);
    if (priorO != null) writeInheritedNumber(oCell, priorO, "0.000");
    else if (day2Row) writeInheritedRef(oCell, `${colLetter(consCostoCol)}${day2Row}`, "0.000");
    if (priorR != null) writeInheritedNumber(rCell, priorR, "0.000");
    else if (day2Row) writeInheritedRef(rCell, `${colLetter(hgCostoCol)}${day2Row}`, "0.000");
  }

  function applyDayOneTarifaFallback(excelRow, ymd, day) {
    if (!isCalendarDayOne(ymd) || dayOwnsConsolidatedTarifa(day)) return;
    const priorT = inheritedTarifa(payload && payload.tarifa_consolidada_anterior);
    if (priorT == null) return;
    writeInheritedNumber(ws.getCell(excelRow, fleteTarifaCol), priorT, "0.00");
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
        if (slot.costo_kg != null) {
          writeEstimatedNumber(ws.getCell(r, start + 1), slot.costo_kg, "0.000");
        } else {
          writeFormula(ws.getCell(r, start + 1), `IF(AND(ISNUMBER(${kgRef}),${kgRef}<>0,ISNUMBER(${impRef})),${impRef}/${kgRef},"")`, "0.000");
        }
        if (slot.importe_estimated) {
          const costoRef = `${colLetter(start + 1)}${r}`;
          writeEstimatedFormula(
            ws.getCell(r, start + 2),
            `IF(AND(ISNUMBER(${kgRef}),ISNUMBER(${costoRef})),${kgRef}*${costoRef},"")`,
            "#,##0.00"
          );
        }         else setNum(ws.getCell(r, start + 2), slot.importe, "#,##0.00", CAPTURE, false, true);
      });
      const notaRaw = notaProvider ? finiteNumber(dayPurchase(day, notaProvider.id).importe) : null;
      setNum(ws.getCell(r, layout.notaCol), notaRaw, "#,##0.00", CAPTURE, false, true);
      writeDailyDerived(r, day);
      writeHgBlock(r, day, {
        daily: true,
        formulaReady: dailyRowHasHgCostInputs(est, day, providers, tarifaByProv),
      });
      if (est && est.hg.kilos_estimated) writeEstimatedNumber(ws.getCell(r, hgCol), est.hg.kilos, "#,##0");
      if (est && !est.hg.importe_real && est.hg.importe_estimated) {
        writeEstimatedNumber(ws.getCell(r, hgImpCol), est.hg.importe, "#,##0.00");
      }
      applyDayOneCostFallback(r, row.ymd, day);
      applyDayOneTarifaFallback(r, row.ymd, day);
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
      const weekFlete = aggregateEstimatedFlete(providers, weekEstimates, tarifaByProv, week && week.flete, dayByYmd);
      const weekNota = notaImporteForDays(payload.grid && payload.grid.days, notaProvider, weekYmds);
      const weekCons = withNotaImporte(weekProviders.consolidado, weekNota);
      providers.forEach((p, i) => {
        const cell = weekProviders.providers[p.id] || { kg: 0, importe: 0, costo_kg: null };
        writeProviderTriple(r, starts[i], cell, false, false);
        for (let j = 0; j < 3; j += 1) {
          const c = ws.getCell(r, starts[i] + j);
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
          c.font = { bold: true, name: "Calibri", size: 9 };
        }
      });
      setNum(ws.getCell(r, layout.notaCol), weekNota, "#,##0.00", WHITE, true, false);
      writeProviderTriple(r, consStart, weekCons, false, true);
      for (let j = 0; j < 3; j += 1) {
        const c = ws.getCell(r, consStart + j);
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
        c.font = { bold: true, name: "Calibri", size: 9 };
      }
      const weekTarifa = weekFlete.consolidado.tarifa != null
        ? weekFlete.consolidado.tarifa
        : (week && week.flete && week.flete.consolidado && week.flete.consolidado.tarifa);
      writeHgBlock(r, {
        consolidado: weekCons,
        flete: { consolidado: { tarifa: weekTarifa } },
        hg_kilos: weekHg.kilos,
      }, { daily: false, sumImporte: weekHg.importe });
      writeFleteRow(r, weekFlete, false);
      const firstWeekRow = excelRowByYmd.get(weekYmds[0]);
      if (firstWeekRow != null) writeOriginShare(firstWeekRow, r, r, weekProviders);
      r += 1;
      r += 1;
    }
  }

  const monthRow = payload.grid && payload.grid.month;
  const monthYmds = ((payload.grid && payload.grid.days) || []).map((d) => d.ymd);
  const monthEstimates = estimatesFor(estimateCtx, monthYmds);
  const monthProviders = aggregateEstimatedProviders(providers, monthEstimates);
  const monthHg = aggregateEstimatedHg(monthEstimates);
  const monthFlete = aggregateEstimatedFlete(providers, monthEstimates, tarifaByProv, monthRow && monthRow.flete, dayByYmd);
  const monthNota = notaImporteForDays(payload.grid && payload.grid.days, notaProvider, monthYmds);
  const monthCons = withNotaImporte(monthProviders.consolidado, monthNota);
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
  setNum(ws.getCell(r, layout.notaCol), monthNota, "#,##0.00", WHITE, true, false);
  writeProviderTriple(r, consStart, monthCons, false, true);
  for (let j = 0; j < 3; j += 1) {
    const c = ws.getCell(r, consStart + j);
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
    c.font = { bold: true, name: "Calibri", size: 9 };
  }
  const monthTarifa = monthFlete.consolidado.tarifa != null
    ? monthFlete.consolidado.tarifa
    : (monthRow && monthRow.flete && monthRow.flete.consolidado && monthRow.flete.consolidado.tarifa);
  writeHgBlock(r, {
    consolidado: monthCons,
    flete: { consolidado: { tarifa: monthTarifa } },
    hg_kilos: monthHg.kilos,
  }, { daily: false, sumImporte: monthHg.importe });
  writeFleteRow(r, monthFlete, false);
  ws.getRow(r).height = 28;
  ws.getRow(r + 1).height = 18;
  writeOriginShare(r, r + 1, r, monthProviders);

  return ws;
}

async function buildComprasWorkbook(payload, opts = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "folio-whatsapp-bot";
  await appendComprasWorksheet(wb, payload, opts);
  return wb;
}

function blankIfZero(value) {
  const n = finiteNumber(value);
  if (n == null || n === 0) return null;
  return n;
}

function capturedNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolveControlComprasDays(payload, corteYmd) {
  const allProviders = (payload && payload.providers) || [];
  const providers = allProviders.filter((provider) => !isNotaCargoProvider(provider));
  const notaProvider = allProviders.find((provider) => isNotaCargoProvider(provider)) || null;
  const days = [...((payload && payload.grid && payload.grid.days) || [])].sort((a, b) => String(a.ymd).localeCompare(String(b.ymd)));
  const corte = /^\d{4}-\d{2}-\d{2}$/.test(String(corteYmd || "")) ? String(corteYmd) : null;
  const estimateCtx = buildComprasDailyEstimateContext(payload, corte);
  const tarifas = new Map(
    ((payload && payload.tarifas_flete) || []).map((row) => [Number(row.proveedor_id), finiteNumber(row.tarifa)]).filter((pair) => pair[1] != null)
  );
  const resolved = [];
  for (const day of days) {
    const est = estimateCtx.byYmd.get(day.ymd);
    const kgCells = [];
    const impCells = [];
    for (const provider of providers) {
      const slot = (est && est.providers && est.providers[provider.id]) || {};
      const kg = slot.kg_estimated ? finiteNumber(slot.kg) : blankIfZero(slot.kg);
      let importe;
      if (slot.importe_estimated) {
        const costo = finiteNumber(slot.costo_kg);
        importe = kg != null && costo != null ? kg * costo : null;
      } else {
        importe = blankIfZero(slot.importe);
      }
      kgCells.push(kg);
      impCells.push(importe);
    }
    if (notaProvider) {
      const noteSlot = (est && est.providers && est.providers[notaProvider.id]) || {};
      if (!noteSlot.importe_estimated) {
        const noteImporte = blankIfZero(noteSlot.importe);
        if (noteImporte != null) impCells.push(noteImporte);
      }
    }
    const kgNums = kgCells.filter((value) => value != null);
    const impNums = impCells.filter((value) => value != null);
    const consKg = kgNums.length ? kgNums.reduce((sum, value) => sum + value, 0) : null;
    const consImp = impNums.length ? impNums.reduce((sum, value) => sum + value, 0) : null;
    let costoKg = consKg != null && consKg !== 0 && consImp != null ? consImp / consKg : null;
    let incomplete = false;
    const fleteKgCells = [];
    const fleteImpCells = [];
    providers.forEach((provider, index) => {
      const fleteCell = day && day.flete && day.flete.providers && (day.flete.providers[provider.id] || day.flete.providers[String(provider.id)]);
      let tarifa = fleteCell ? finiteNumber(fleteCell.tarifa) : null;
      if (tarifa == null && tarifas.has(Number(provider.id))) tarifa = tarifas.get(Number(provider.id));
      const kg = kgCells[index];
      if (kg != null && tarifa == null) incomplete = true;
      fleteKgCells.push(kg);
      fleteImpCells.push(kg != null && tarifa != null ? kg * tarifa : null);
    });
    const fleteKgNums = fleteKgCells.filter((value) => value != null);
    const fleteKg = fleteKgNums.length ? fleteKgNums.reduce((sum, value) => sum + value, 0) : null;
    const fleteImpNums = incomplete ? [] : fleteImpCells.filter((value) => value != null);
    const fleteImp = !incomplete && fleteImpNums.length ? fleteImpNums.reduce((sum, value) => sum + value, 0) : null;
    let fleteTarifa = fleteKg != null && fleteKg !== 0 && fleteImp != null ? fleteImp / fleteKg : null;
    const formulaReady = dailyRowHasHgCostInputs(est, day, providers, tarifas);
    const carriedCost = hgField(day, "costo_efectivo");
    let hgCosto = formulaReady
      ? (costoKg != null && fleteTarifa != null ? costoKg + fleteTarifa : null)
      : (carriedCost != null && Number.isFinite(Number(carriedCost)) ? Number(carriedCost) : null);
    const kilosEstimated = Boolean(est && est.hg && est.hg.kilos_estimated);
    const hgKilos = kilosEstimated
      ? capturedNumber(est.hg.kilos)
      : capturedNumber(day && day.hg_kilos);
    const importeEstimated = Boolean(est && est.hg && !est.hg.importe_real && est.hg.importe_estimated);
    let hgImporteValue = importeEstimated
      ? capturedNumber(est.hg.importe)
      : (hgCosto != null && hgKilos != null ? hgCosto * hgKilos * -1 : null);
    resolved.push({
      fecha: day.ymd,
      costoKg,
      fleteKg: fleteTarifa,
      hgImporte: hgImporteValue,
      hgCosto,
      hgKilos,
      importeEstimated,
    });
  }
  const byFecha = new Map(resolved.map((row) => [row.fecha, row]));
  const first = resolved.find((row) => isCalendarDayOne(row.fecha));
  const firstDay = days.find((row) => isCalendarDayOne(row.ymd));
  if (first && firstDay && !dayOwnsConsolidatedCost(firstDay)) {
    const day2 = byFecha.get(dayTwoYmd(first.fecha));
    const priorO = positiveInheritedCost(payload && payload.costo_kg_anterior);
    const priorR = positiveInheritedCost(hgField(firstDay, "costo_efectivo"));
    if (priorO != null) first.costoKg = priorO;
    else if (day2) first.costoKg = day2.costoKg;
    if (priorR != null) first.hgCosto = priorR;
    else if (day2) first.hgCosto = day2.hgCosto;
    if (!first.importeEstimated) {
      first.hgImporte = first.hgCosto != null && first.hgKilos != null ? first.hgCosto * first.hgKilos * -1 : null;
    }
  }
  if (first && firstDay && !dayOwnsConsolidatedTarifa(firstDay)) {
    const priorT = inheritedTarifa(payload && payload.tarifa_consolidada_anterior);
    if (priorT != null) {
      first.fleteKg = priorT;
      if (first.hgCosto == null && first.costoKg != null) {
        first.hgCosto = first.costoKg + priorT;
        if (!first.importeEstimated) {
          first.hgImporte = first.hgKilos != null ? first.hgCosto * first.hgKilos * -1 : null;
        }
      }
    }
  }
  return resolved.map((row) => ({
    fecha: row.fecha,
    costoKg: row.costoKg != null && row.costoKg !== 0 ? row.costoKg : null,
    fleteKg: row.fleteKg != null ? row.fleteKg : null,
    hgImporte: row.hgImporte,
    hgKilos: row.hgKilos,
  }));
}

module.exports = {
  buildComprasWorkbook,
  appendComprasWorksheet,
  buildComprasDailyEstimateContext,
  resolveControlComprasDays,
  mexicoTodayYmd,
  ESTIMATED_BLUE,
  MESES,
  blockStarts,
  controlComprasLayout,
};
