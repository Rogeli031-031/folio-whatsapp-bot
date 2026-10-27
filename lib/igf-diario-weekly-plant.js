"use strict";

const grafica = require("./igf-diario-grafica");
const { monthBusinessDays } = require("./igf-diario-puebla");
const { usesDetailedExpenseLayout } = require("./igf-diario-expense-layout");
const gastos = require("./igf-diario-gastos-distribucion");
const { CONCEPTS, CORP_KEYS, OPER_KEYS, buildExpenseDailySchedule } = gastos;
const desglose = require("./igf-diario-gastos-desglose");
const margenManual = require("./igf-diario-margen-manual");

const EXPENSE_KEYS = CONCEPTS.slice();

const METRICS = [
  ["venta_kg", "kg"],
  ["precio_kg", "per_kg"],
  ["ingreso_mxn", "mxn"],
  ["costo_kg", "per_kg"],
  ["flete_kg", "per_kg"],
  ["margen_kg", "per_kg"],
  ["gasto_corporativo_kg", "per_kg"],
  ["inversiones_kg", "per_kg"],
  ["impuestos_federales_kg", "per_kg"],
  ["margen_neto_kg", "per_kg"],
  ["presupuesto_nomina_gastos_kg", "per_kg"],
  ["presupuesto_imss_sua_kg", "per_kg"],
  ["extraordinarios_kg", "per_kg"],
  ["provisiones_planta_kg", "per_kg"],
  ["sobrante_antes_hg_kg", "per_kg"],
  ["hg_mxn", "mxn"],
  ["hg_kg", "per_kg"],
  ["sobrante_con_hg_kg", "per_kg"],
  ["com_desc_kg", "per_kg"],
  ["resultado_kg", "per_kg"],
  ["resultado_mxn", "mxn"],
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseYmd(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function formatYmd(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function addDays(value, days) {
  const date = parseYmd(value);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return formatYmd(date);
}

const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

function sundayOfWeekContainingDate(value) {
  const date = parseYmd(value);
  if (!date) return null;
  return addDays(String(value).slice(0, 10), -date.getUTCDay());
}

function saturdayOfWeekContainingDate(value) {
  const sunday = sundayOfWeekContainingDate(value);
  return sunday ? addDays(sunday, 6) : null;
}

function addWeeks(value, weeks) {
  return addDays(value, Number(weeks || 0) * 7);
}

function weekYear(value) {
  const sunday = sundayOfWeekContainingDate(value);
  const saturday = saturdayOfWeekContainingDate(value);
  if (!sunday || !saturday) return null;
  const startYear = Number(sunday.slice(0, 4));
  const endYear = Number(saturday.slice(0, 4));
  return startYear === endYear ? startYear : endYear;
}

function weekNumber(value) {
  const year = weekYear(value);
  if (year == null) return null;
  const first = sundayOfWeekContainingDate(`${year}-01-01`);
  const current = sundayOfWeekContainingDate(value);
  const start = parseYmd(first);
  const cursor = parseYmd(current);
  return Math.round((cursor - start) / 86400000 / 7) + 1;
}

function monthEnd(year, month) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad2(month)}-${pad2(last)}`;
}

function weekIntersectsMonth(weekStart, year, month) {
  const weekEnd = addDays(weekStart, 6);
  const start = `${year}-${pad2(month)}-01`;
  const end = monthEnd(year, month);
  return Boolean(weekStart && weekEnd && weekStart <= end && weekEnd >= start);
}

function weekOf(anchor) {
  const sunday = sundayOfWeekContainingDate(anchor);
  if (!sunday) return null;
  return {
    week_year: weekYear(sunday),
    week_number: weekNumber(sunday),
    fecha_desde: sunday,
    fecha_hasta: saturdayOfWeekContainingDate(sunday),
  };
}

function navigationFor(anchor, year, month) {
  const current = weekOf(anchor);
  if (!current) return null;
  const prev = addWeeks(current.fecha_desde, -1);
  const next = addWeeks(current.fecha_desde, 1);
  return {
    prev_anchor: prev,
    next_anchor: next,
    prev_enabled: weekIntersectsMonth(prev, year, month),
    next_enabled: weekIntersectsMonth(next, year, month),
  };
}

function finite(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function datesOfWeek(weekStart) {
  const out = [];
  for (let i = 0; i < 7; i += 1) out.push(addDays(weekStart, i));
  return out;
}

function buildConceptSchedules(calendarDays, amounts, overridesByConcept) {
  const out = {};
  for (const key of EXPENSE_KEYS) {
    const monthly = amounts ? finite(amounts[key]) : null;
    if (monthly == null) {
      out[key] = null;
      continue;
    }
    const built = buildExpenseDailySchedule({
      monthlyAmount: monthly,
      days: calendarDays,
      overrides: (overridesByConcept && overridesByConcept[key]) || {},
    });
    out[key] = built.ok ? built.byFecha : null;
  }
  return out;
}

function expenseMoney(day) {
  if (!day || !day.expenses) return null;
  const money = {};
  for (const key of EXPENSE_KEYS) {
    const value = finite(day.expenses[key]);
    if (value == null) return null;
    money[key] = value;
  }
  return money;
}

function dayIngreso(day) {
  const venta = finite(day && day.ventaKg);
  const precio = finite(day && day.precio);
  if (venta == null || precio == null) return null;
  return precio * venta;
}

function dayResultMxn(day) {
  const venta = finite(day && day.ventaKg);
  const precio = finite(day && day.precio);
  const costo = finite(day && day.costoKg);
  const flete = finite(day && day.fleteKg);
  const hg = finite(day && day.hgImporte);
  const cd = finite(day && day.cdKg);
  const money = expenseMoney(day);
  if (venta != null && precio != null && costo != null && flete != null && hg != null && cd != null && money) {
    const margen = precio - costo - flete;
    const gastos = EXPENSE_KEYS.reduce((sum, key) => sum + money[key], 0);
    return margen * venta - gastos - hg + cd * venta;
  }
  if (!day || day.expenses != null) return null;
  return finite(day.legacyResultadoMxn);
}

function positiveSale(day) {
  const venta = finite(day && day.ventaKg);
  return venta != null && venta > 0;
}

function sumKnown(days, read) {
  let total = 0;
  let any = false;
  for (const day of days) {
    const value = read(day);
    if (value == null) continue;
    any = true;
    total += value;
  }
  return any ? total : null;
}

function sumCovered(days, include, read) {
  let total = 0;
  let any = false;
  for (const day of days) {
    if (!include(day)) continue;
    const value = read(day);
    if (value == null) return null;
    any = true;
    total += value;
  }
  return any ? total : null;
}

function weighted(days, read) {
  let numerator = 0;
  let denominator = 0;
  let any = false;
  for (const day of days) {
    if (!positiveSale(day)) continue;
    const venta = finite(day.ventaKg);
    const value = read(day);
    if (value == null) return null;
    any = true;
    numerator += value * venta;
    denominator += venta;
  }
  if (!any || denominator === 0) return null;
  return numerator / denominator;
}

function expenseTotal(days, key) {
  if (!(days || []).every((day) => day && day.expenses != null)) return null;
  let total = 0;
  let any = false;
  for (const day of days) {
    const value = finite(day.expenses[key]);
    if (value == null) {
      if (positiveSale(day)) return null;
      continue;
    }
    any = true;
    total += value;
  }
  return any ? total : null;
}

function perKg(money, venta) {
  if (money == null || venta == null || venta === 0) return null;
  return money / venta;
}

function projectedDay(day, corteYmd) {
  const corte = String(corteYmd || "").slice(0, 10);
  const fecha = String(day && day.fecha || "").slice(0, 10);
  return Boolean(corte) && Boolean(fecha) && fecha >= corte;
}

function aggregateCovered(days, corteYmd, read, mode) {
  let total = 0;
  let anyTotal = false;
  let daysWithSales = 0;
  let coveredDays = 0;
  let coveredKg = 0;
  let coveredRealKg = 0;
  let coveredProjectedKg = 0;
  let weightedNumerator = 0;
  let coveredSum = 0;
  for (const day of days || []) {
    const venta = finite(day && day.ventaKg);
    if (venta != null) {
      total += venta;
      anyTotal = true;
    }
    if (!(venta != null && venta > 0)) continue;
    daysWithSales += 1;
    const metric = read(day);
    if (metric == null) continue;
    coveredDays += 1;
    coveredKg += venta;
    if (projectedDay(day, corteYmd)) coveredProjectedKg += venta;
    else coveredRealKg += venta;
    if (mode === "sum") coveredSum += metric;
    else weightedNumerator += metric * venta;
  }
  const kgTotal = anyTotal ? total : null;
  let value = null;
  if (mode === "sum") value = coveredDays > 0 ? coveredSum : null;
  else if (coveredKg > 0) value = weightedNumerator / coveredKg;
  const coverageKgPct = kgTotal != null && kgTotal > 0
    ? (coveredKg / kgTotal) * 100
    : (daysWithSales > 0 ? 0 : null);
  return {
    value,
    kg_total: kgTotal,
    kg_covered: coveredKg,
    coverage_kg_pct: coverageKgPct,
    days_with_sales: daysWithSales,
    days_covered: coveredDays,
    coverage_days_pct: daysWithSales > 0 ? (coveredDays / daysWithSales) * 100 : null,
    covered_real_kg: coveredRealKg,
    covered_projected_kg: coveredProjectedKg,
  };
}

function formatGroupedKg(value) {
  const rounded = Math.round(Number(value) || 0);
  const sign = rounded < 0 ? "-" : "";
  const body = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${body}`;
}

function coverageIsPartial(block) {
  return Boolean(block) && block.days_with_sales > 0 && block.days_covered < block.days_with_sales;
}

function coverageCaption(block) {
  if (!coverageIsPartial(block)) return null;
  const pct = block.coverage_kg_pct == null || !Number.isFinite(Number(block.coverage_kg_pct))
    ? ""
    : `${Number(block.coverage_kg_pct).toFixed(2)}%`;
  const total = block.kg_total == null ? "—" : formatGroupedKg(block.kg_total);
  return `Cobertura financiera ${pct} · ${formatGroupedKg(block.kg_covered)} / ${total} kg · ${block.days_covered}/${block.days_with_sales} días · Real ${formatGroupedKg(block.covered_real_kg)} kg · Proyectado ${formatGroupedKg(block.covered_projected_kg)} kg`;
}

function publishCoverage(raw) {
  return {
    kg_total: raw.kg_total,
    kg_covered: raw.kg_covered,
    coverage_kg_pct: raw.coverage_kg_pct,
    days_with_sales: raw.days_with_sales,
    days_covered: raw.days_covered,
    coverage_days_pct: raw.coverage_days_pct,
    covered_real_kg: raw.covered_real_kg,
    covered_projected_kg: raw.covered_projected_kg,
  };
}

function financialMissing(metrics) {
  const venta = finite(metrics && metrics.venta_kg);
  if (!(venta != null && venta > 0)) return [];
  return ["com_desc_kg", "resultado_kg", "resultado_mxn"].filter((key) => finite(metrics[key]) == null);
}

function aggregateWeek(days, corteYmd) {
  const list = days || [];
  const venta = sumKnown(list, (day) => finite(day.ventaKg));
  const ingreso = sumCovered(list, positiveSale, (day) => dayIngreso(day));
  const precio = venta != null && venta !== 0 && ingreso != null ? ingreso / venta : null;
  const costo = weighted(list, (day) => finite(day.costoKg));
  const flete = weighted(list, (day) => finite(day.fleteKg));
  const margen = precio != null && costo != null && flete != null ? precio - costo - flete : null;
  const expenseTotals = {};
  for (const key of EXPENSE_KEYS) {
    expenseTotals[key] = expenseTotal(list, key);
  }
  const gasto = perKg(expenseTotals.gasto_corporativo, venta);
  const inversiones = perKg(expenseTotals.inversiones, venta);
  const impuestos = perKg(expenseTotals.impuestos_federales, venta);
  const nomina = perKg(expenseTotals.presupuesto_nomina_gastos, venta);
  const imss = perKg(expenseTotals.presupuesto_imss_sua, venta);
  const extra = perKg(expenseTotals.extraordinarios, venta);
  const provisiones = perKg(expenseTotals.provisiones_planta, venta);
  const margenNeto = margen != null && gasto != null && inversiones != null && impuestos != null
    ? margen - gasto - inversiones - impuestos
    : null;
  const sobranteAntes = margenNeto != null && nomina != null && imss != null && extra != null && provisiones != null
    ? margenNeto - nomina - imss - extra - provisiones
    : null;
  const hgMxn = sumKnown(list, (day) => finite(day.hgImporte));
  const hgKg = perKg(hgMxn, venta);
  const sobranteCon = sobranteAntes != null && hgKg != null ? sobranteAntes - hgKg : null;
  const comCovered = aggregateCovered(list, corteYmd, (day) => finite(day.cdKg), "weighted");
  const resultCovered = aggregateCovered(list, corteYmd, (day) => dayResultMxn(day), "sum");
  const comDesc = comCovered.value;
  const resultadoMxn = resultCovered.value;
  let resultadoKg = null;
  if (resultCovered.kg_covered > 0 && resultadoMxn != null) {
    resultadoKg = resultadoMxn / resultCovered.kg_covered;
  } else if (
    comCovered.days_with_sales > 0
    && comCovered.days_covered === comCovered.days_with_sales
    && sobranteCon != null
    && comDesc != null
  ) {
    resultadoKg = sobranteCon + comDesc;
  } else if (resultadoKg == null && list.length === 1 && list[0] && list[0].expenses == null) {
    resultadoKg = finite(list[0].legacyResultadoKg);
  }
  const metrics = {
    venta_kg: venta,
    precio_kg: precio,
    ingreso_mxn: ingreso,
    costo_kg: costo,
    flete_kg: flete,
    margen_kg: margen,
    gasto_corporativo_kg: gasto,
    inversiones_kg: inversiones,
    impuestos_federales_kg: impuestos,
    margen_neto_kg: margenNeto,
    presupuesto_nomina_gastos_kg: nomina,
    presupuesto_imss_sua_kg: imss,
    extraordinarios_kg: extra,
    provisiones_planta_kg: provisiones,
    sobrante_antes_hg_kg: sobranteAntes,
    hg_mxn: hgMxn,
    hg_kg: hgKg,
    sobrante_con_hg_kg: sobranteCon,
    com_desc_kg: comDesc,
    resultado_kg: resultadoKg,
    resultado_mxn: resultadoMxn,
  };
  const corte = String(corteYmd || "").slice(0, 10);
  let hasReal = false;
  let hasProy = false;
  for (const day of list) {
    const projected = Boolean(corte) && day.fecha >= corte;
    if (projected) hasProy = true;
    else hasReal = true;
  }
  const estado = hasReal && hasProy ? "parcial" : hasProy ? "proyectada" : "real";
  const missing = Object.entries(metrics).filter((entry) => entry[1] == null).map((entry) => entry[0]);
  const coverage = {
    com_desc_kg: publishCoverage(comCovered),
    resultado: publishCoverage(resultCovered),
  };
  return { metrics, estado, complete: missing.length === 0, missing_components: missing, coverage };
}

function expenseKg(day, key, venta) {
  if (!(venta > 0) || !day || !day.expenses) return null;
  const money = finite(day.expenses[key]);
  if (money == null) return null;
  return money / venta;
}

function groupMoney(expenses, keys) {
  if (!expenses) return null;
  let sum = 0;
  for (const key of keys) {
    const value = finite(expenses[key]);
    if (value == null) return null;
    sum += value;
  }
  return sum;
}

function dayMetrics(day) {
  const venta = finite(day && day.ventaKg);
  const precio = finite(day && day.precio);
  const costo = finite(day && day.costoKg);
  const flete = finite(day && day.fleteKg);
  const margen = precio != null && costo != null && flete != null ? precio - costo - flete : null;
  const sold = venta != null && venta > 0;
  const ingreso = sold ? (precio == null ? null : precio * venta) : null;
  const gasto = expenseKg(day, "gasto_corporativo", venta);
  const inversiones = expenseKg(day, "inversiones", venta);
  const impuestos = expenseKg(day, "impuestos_federales", venta);
  const nomina = expenseKg(day, "presupuesto_nomina_gastos", venta);
  const imss = expenseKg(day, "presupuesto_imss_sua", venta);
  const extra = expenseKg(day, "extraordinarios", venta);
  const provisiones = expenseKg(day, "provisiones_planta", venta);
  const margenNeto = sold && margen != null && gasto != null && inversiones != null && impuestos != null
    ? margen - gasto - inversiones - impuestos
    : null;
  const sobranteAntes = margenNeto != null && nomina != null && imss != null && extra != null && provisiones != null
    ? margenNeto - nomina - imss - extra - provisiones
    : null;
  const hgMxn = finite(day && day.hgImporte);
  const hgKg = sold && hgMxn != null ? hgMxn / venta : null;
  const sobranteCon = sobranteAntes != null && hgKg != null ? sobranteAntes - hgKg : null;
  const comDesc = sold ? finite(day && day.cdKg) : null;
  let resultadoMxn = sold ? dayResultMxn(day) : null;
  let resultadoKg = resultadoMxn != null && sold ? resultadoMxn / venta : null;
  if (resultadoKg == null && sold && day && day.expenses == null) {
    resultadoKg = finite(day.legacyResultadoKg);
  }
  if (resultadoMxn != null && sold) resultadoKg = resultadoMxn / venta;
  return {
    metrics: {
      venta_kg: venta,
      precio_kg: precio,
      ingreso_mxn: ingreso,
      costo_kg: costo,
      flete_kg: flete,
      margen_kg: margen,
      gasto_corporativo_kg: gasto,
      inversiones_kg: inversiones,
      impuestos_federales_kg: impuestos,
      margen_neto_kg: margenNeto,
      presupuesto_nomina_gastos_kg: nomina,
      presupuesto_imss_sua_kg: imss,
      extraordinarios_kg: extra,
      provisiones_planta_kg: provisiones,
      sobrante_antes_hg_kg: sobranteAntes,
      hg_mxn: hgMxn,
      hg_kg: hgKg,
      sobrante_con_hg_kg: sobranteCon,
      com_desc_kg: comDesc,
      resultado_kg: resultadoKg,
      resultado_mxn: resultadoMxn,
    },
  };
}

function dailyMetric(day, key) {
  return dayMetrics(day).metrics[key];
}

function weekDayRecords(days, corteYmd) {
  const corte = String(corteYmd || "").slice(0, 10);
  return (days || []).map((day) => {
    const date = parseYmd(day && day.fecha);
    const projected = Boolean(corte) && day.fecha >= corte;
    const metrics = dayMetrics(day).metrics;
    return {
      fecha: day.fecha,
      weekday: date ? WEEKDAY_NAMES[date.getUTCDay()] : null,
      estado: projected ? "proyectada" : "real",
      metrics,
      missing_components: financialMissing(metrics),
      venta_casa_kg: finite(day && day.casaKg),
      venta_comisionista_kg: finite(day && day.comKg),
      gasto_corporativo_mxn: groupMoney(day && day.expenses, CORP_KEYS),
      gasto_operativo_mxn: groupMoney(day && day.expenses, OPER_KEYS),
      hg_kilos: finite(day && day.hgKilos),
      com_desc_source: day.cdSource || null,
      com_desc_source_date: day.cdSourceDate || null,
    };
  });
}

function fiveDayWindow(anchor) {
  const week = weekOf(anchor);
  if (!week) return null;
  return {
    desde: week.fecha_desde,
    hasta: addDays(week.fecha_desde, 4),
    range: "5d",
  };
}

function seriesPoints(days, metric, corteYmd) {
  const corte = String(corteYmd || "").slice(0, 10);
  return (days || []).map((day) => {
    const value = dailyMetric(day, metric);
    const projected = Boolean(corte) && day.fecha >= corte;
    return {
      fecha: day.fecha,
      value,
      resultado_mxn: value,
      resultado_per_kg: value,
      venta_kg: finite(day.ventaKg),
      estado: projected ? "proyectado" : "real",
      complete: value != null,
      missing_components: value == null ? [metric] : [],
      missing_plants: [],
    };
  });
}

function plantLabels(plant) {
  if (!plant) return [];
  if (typeof plant === "string") return [plant];
  return [plant.canon, plant.nombre, plant.provinciaPlantCode, plant.clave, plant.igfLabel]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function countingClient(client, bucket) {
  return {
    query(sql, params) {
      bucket.n += 1;
      return client.query(sql, params);
    },
  };
}

function weeklyProjectionPack(projection, plant) {
  const forecast = require("./dashboard-arr-forecast");
  for (const label of plantLabels(plant)) {
    const pack = forecast.projectionForPlant(projection, label);
    if (pack) return pack;
  }
  return null;
}

function promVentaTotalTon(pack, fecha) {
  if (!pack) return null;
  const parsed = parseYmd(fecha);
  if (!parsed) return null;
  const local = new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  return require("./dashboard-arr-forecast").weekdayPromAt(pack.promVentaTotal, local);
}

function applyWeeklyProjectedTotalSale(days, projection, plant, corteYmd) {
  if (!days || typeof days.forEach !== "function") return days;
  const corte = String(corteYmd || "").slice(0, 10);
  if (!corte) return days;
  const pack = weeklyProjectionPack(projection, plant);
  days.forEach((day, fecha) => {
    const key = String((day && day.fecha) || fecha || "").slice(0, 10);
    if (!day || key < corte) return;
    const promTon = promVentaTotalTon(pack, key);
    day.ventaKg = promTon == null ? null : promTon * 1000;
  });
  return days;
}

async function loadMonthBundle(client, plant, part, opts, bucket) {
  const year = part.year;
  const month = part.month;
  const counted = countingClient(client, bucket);
  const corte = String(opts.corteYmd || "").slice(0, 10);
  const open = year === Number(opts.year) && month === Number(opts.month);
  const cdIndex = await grafica.loadCdMonthIndex(counted, year, month);
  const priorYear = month === 1 ? year - 1 : year;
  const priorMonth = month === 1 ? 12 : month - 1;
  const priorIndex = await grafica.loadCdMonthIndex(counted, priorYear, priorMonth);
  const facts = await grafica.loadPlantFacts(counted, {
    plantaNombre: plant.nombre,
    plantaId: plant.plantaId,
    plant: plant.nombre,
    start: `${year}-${pad2(month)}-01`,
    end: monthEnd(year, month),
  });
  const comprasByFecha = plant.plantaId == null
    ? new Map()
    : await grafica.loadComprasDayMap(counted, plant.plantaId, [part], corte, opts.comprasCache);
  const canals = grafica.canalTonMaps(facts.salesRows);
  let precioRows = [];
  if (typeof opts.loadPrecio === "function") {
    precioRows = await opts.loadPrecio(grafica.precioPlantKey(plant), year, month) || [];
  }
  const marginRows = await margenManual.listMonthOverrides(counted, year, month);
  const marginOverrides = margenManual.overridesForPlant(marginRows, plantLabels(plant));
  const built = grafica.materializePlantMonth({
    year,
    month,
    plant: plant.nombre,
    corteYmd: corte,
    project: open,
    projection: open ? opts.projection : null,
    precioRows,
    casaTon: canals.casa,
    comTon: canals.com,
    cdByFecha: grafica.cdMapForPlant(cdIndex, plant),
    priorCdByFecha: grafica.cdMapForPlant(priorIndex, plant),
    comprasByFecha,
    skipDay1Fallback: true,
    marginOverrides,
  });
  let schedules = null;
  if (usesDetailedExpenseLayout(year, month)) {
    const rows = await desglose.listMonth(counted, year, month);
    const row = desglose.findRow(rows, plantLabels(plant));
    const amounts = row ? desglose.publicRow(row, year, month).componentes : null;
    const overrideMaps = await gastos.overridesForPlant(counted, year, month, plant.canon || plant.nombre);
    schedules = buildConceptSchedules(monthBusinessDays(year, month).days, amounts, overrideMaps);
  }
  if (open) built.weeklyProjectedTotalSale = { projection: opts.projection, plant, corte };
  return daysFromBuilt(built, schedules);
}

function daysFromBuilt(built, schedules) {
  const points = new Map((built && built.points || []).map((point) => [String(point.fecha).slice(0, 10), point]));
  const resolved = new Map(((built && built.resolved) || []).map((item) => [String(item.fecha).slice(0, 10), item]));
  const byFecha = new Map();
  for (const day of (built && built.financial_days) || []) {
    const fecha = String(day.fecha).slice(0, 10);
    const point = points.get(fecha) || null;
    const canal = resolved.get(fecha) || null;
    const expenses = schedules
      ? Object.fromEntries(EXPENSE_KEYS.map((key) => [key, schedules[key] ? finite(schedules[key][fecha]) : null]))
      : null;
    byFecha.set(fecha, {
      fecha,
      ventaKg: day.ventaKg,
      casaKg: canal ? finite(canal.casaKg) : null,
      comKg: canal ? finite(canal.comKg) : null,
      precio: day.precio,
      costoKg: day.costoKg,
      fleteKg: day.fleteKg,
      hgImporte: day.hgImporte,
      hgKilos: day.hgKilos,
      cdKg: day.cdKg,
      cdSource: day.cdSource || null,
      cdSourceDate: day.cdSourceDate || null,
      expenses,
      legacyResultadoMxn: expenses == null && point ? finite(point.resultado_mxn) : null,
      legacyResultadoKg: expenses == null && point ? finite(point.resultado_per_kg) : null,
    });
  }
  const spec = built && built.weeklyProjectedTotalSale;
  if (spec) applyWeeklyProjectedTotalSale(byFecha, spec.projection, spec.plant, spec.corte);
  return byFecha;
}

function stitchWeek(bundles, weekStart) {
  const days = [];
  for (const fecha of datesOfWeek(weekStart)) {
    let found = null;
    for (const bundle of bundles) {
      if (bundle.has(fecha)) found = bundle.get(fecha);
    }
    days.push(found || {
      fecha,
      ventaKg: null,
      casaKg: null,
      comKg: null,
      precio: null,
      costoKg: null,
      fleteKg: null,
      hgImporte: null,
      hgKilos: null,
      cdKg: null,
      expenses: usesDetailedExpenseLayout(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7))) ? blankExpenses() : null,
      legacyResultadoMxn: null,
      legacyResultadoKg: null,
    });
  }
  return days;
}

function blankExpenses() {
  return Object.fromEntries(EXPENSE_KEYS.map((key) => [key, null]));
}

async function loadBundles(client, plant, desde, hasta, opts) {
  const bucket = { n: 0 };
  const months = grafica.monthsTouched(desde, hasta);
  const bundles = [];
  for (const part of months) {
    bundles.push(await loadMonthBundle(client, plant, part, opts, bucket));
  }
  return { bundles, queryCount: bucket.n };
}

async function loadWeeklyPlant(client, opts) {
  const anchor = String(opts.weekAnchor || opts.corteYmd || "").slice(0, 10);
  const week = weekOf(anchor);
  if (!week) {
    const error = new Error("week_anchor inválido");
    error.status = 400;
    throw error;
  }
  const loaded = await loadBundles(client, opts.plant, week.fecha_desde, week.fecha_hasta, opts);
  const days = stitchWeek(loaded.bundles, week.fecha_desde);
  const summary = aggregateWeek(days, opts.corteYmd);
  return {
    ok: true,
    scope: "plant",
    year: Number(opts.year),
    month: Number(opts.month),
    plant_code: opts.plant.canon || opts.plant.nombre,
    empresa: opts.plant.nombre || opts.plant.canon,
    corte_ymd: String(opts.corteYmd || "").slice(0, 10) || null,
    version_as_of_corte: Boolean(opts.versionAsOfCorte),
    week: {
      ...week,
      estado: summary.estado,
      complete: summary.complete,
      missing_components: summary.missing_components,
      coverage: summary.coverage,
    },
    metrics: summary.metrics,
    coverage: summary.coverage,
    days: weekDayRecords(days, opts.corteYmd),
    nav: navigationFor(anchor, Number(opts.year), Number(opts.month)),
    query_count: loaded.queryCount,
  };
}

function plantLabel(plant, opts) {
  if (opts && typeof opts.labelPlant === "function") {
    const label = opts.labelPlant(plant);
    if (label) return String(label).trim();
  }
  return String((plant && (plant.nombre || plant.canon)) || "").trim();
}

function finiteMetric(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function addCoverage(total, piece) {
  if (!piece) return;
  if (piece.kg_total != null) {
    total.kg_total = (total.kg_total == null ? 0 : total.kg_total) + piece.kg_total;
    total.any_total = true;
  }
  total.kg_covered += piece.kg_covered;
  total.days_with_sales += piece.days_with_sales;
  total.days_covered += piece.days_covered;
  total.covered_real_kg += piece.covered_real_kg;
  total.covered_projected_kg += piece.covered_projected_kg;
}

function blankRoll() {
  return {
    kg_total: null,
    any_total: false,
    kg_covered: 0,
    days_with_sales: 0,
    days_covered: 0,
    covered_real_kg: 0,
    covered_projected_kg: 0,
    numerator: 0,
    covered_for_value: 0,
    any_value: false,
  };
}

function publishRoll(roll, mode) {
  const kgTotal = roll.any_total ? roll.kg_total : null;
  const value = roll.covered_for_value > 0
    ? (mode === "sum" ? roll.numerator : roll.numerator / roll.covered_for_value)
    : null;
  const coverageKgPct = kgTotal != null && kgTotal > 0
    ? (roll.kg_covered / kgTotal) * 100
    : (roll.days_with_sales > 0 ? 0 : null);
  return {
    value: mode === "sum" ? (roll.any_value ? roll.numerator : null) : value,
    coverage: {
      kg_total: kgTotal,
      kg_covered: roll.kg_covered,
      coverage_kg_pct: coverageKgPct,
      days_with_sales: roll.days_with_sales,
      days_covered: roll.days_covered,
      coverage_days_pct: roll.days_with_sales > 0 ? (roll.days_covered / roll.days_with_sales) * 100 : null,
      covered_real_kg: roll.covered_real_kg,
      covered_projected_kg: roll.covered_projected_kg,
    },
  };
}

function rollCoverage(plants, key, mode) {
  const roll = blankRoll();
  for (const plant of plants || []) {
    const piece = plant && plant.coverage && plant.coverage[key];
    addCoverage(roll, piece);
    const metricKey = key === "resultado" ? "resultado_mxn" : key;
    const metric = finiteMetric(plant && plant.metrics && plant.metrics[metricKey]);
    const covered = piece ? piece.kg_covered : 0;
    if (metric == null || !(covered > 0)) continue;
    roll.any_value = true;
    roll.covered_for_value += covered;
    roll.numerator += mode === "sum" ? metric : metric * covered;
  }
  return publishRoll(roll, mode);
}

function consolidateCovered(plants) {
  const metrics = consolidateMetrics((plants || []).map((plant) => plant.metrics));
  const com = rollCoverage(plants, "com_desc_kg", "weighted");
  const result = rollCoverage(plants, "resultado", "sum");
  metrics.com_desc_kg = com.value;
  metrics.resultado_mxn = result.value;
  metrics.resultado_kg = result.coverage.kg_covered > 0 && result.value != null
    ? result.value / result.coverage.kg_covered
    : null;
  return {
    metrics,
    coverage: {
      com_desc_kg: com.coverage,
      resultado: result.coverage,
    },
  };
}

function sumSibling(rows, key) {
  let sum = 0;
  let any = false;
  for (const row of rows || []) {
    const value = finiteMetric(row && row[key]);
    if (value == null) continue;
    sum += value;
    any = true;
  }
  return any ? sum : null;
}

function consolidateMetrics(rows) {
  const out = {};
  for (const [key, unit] of METRICS) {
    if (unit === "kg" || unit === "mxn") {
      let sum = 0;
      let any = false;
      for (const row of rows || []) {
        const value = finiteMetric(row && row[key]);
        if (value == null) continue;
        sum += value;
        any = true;
      }
      out[key] = any ? sum : null;
      continue;
    }
    let numerator = 0;
    let denominator = 0;
    for (const row of rows || []) {
      const venta = finiteMetric(row && row.venta_kg);
      const value = finiteMetric(row && row[key]);
      if (venta == null || venta <= 0 || value == null) continue;
      numerator += value * venta;
      denominator += venta;
    }
    out[key] = denominator > 0 ? numerator / denominator : null;
  }
  return out;
}

async function loadWeeklyAll(client, opts) {
  const anchor = String(opts.weekAnchor || opts.corteYmd || "").slice(0, 10);
  const week = weekOf(anchor);
  if (!week) {
    const error = new Error("week_anchor inválido");
    error.status = 400;
    throw error;
  }
  const cache = opts.comprasCache || new Map();
  const plants = [];
  let queryCount = 0;
  for (const plant of opts.plants || []) {
    const loaded = await loadBundles(client, plant, week.fecha_desde, week.fecha_hasta, { ...opts, comprasCache: cache });
    queryCount += loaded.queryCount;
    const days = stitchWeek(loaded.bundles, week.fecha_desde);
    const summary = aggregateWeek(days, opts.corteYmd);
    const label = plantLabel(plant, opts);
    plants.push({
      plant_code: label,
      empresa: label,
      metrics: summary.metrics,
      coverage: summary.coverage,
      days: weekDayRecords(days, opts.corteYmd),
      complete: summary.complete,
      missing_components: summary.missing_components,
    });
  }
  const calendar = weekDayRecords(datesOfWeek(week.fecha_desde).map((fecha) => ({ fecha })), opts.corteYmd);
  const estado = calendar.some((day) => day.estado === "real") && calendar.some((day) => day.estado === "proyectada")
    ? "parcial"
    : calendar.some((day) => day.estado === "proyectada")
      ? "proyectada"
      : "real";
  const consolidated = consolidateCovered(plants);
  return {
    ok: true,
    scope: "all",
    year: Number(opts.year),
    month: Number(opts.month),
    corte_ymd: String(opts.corteYmd || "").slice(0, 10) || null,
    version_as_of_corte: Boolean(opts.versionAsOfCorte),
    week: { ...week, estado, coverage: consolidated.coverage },
    plants,
    resumen: {
      plant_code: "TODAS",
      empresa: "TODAS CONSOLIDADO",
      metrics: consolidated.metrics,
      coverage: consolidated.coverage,
      days: calendar.map((day, index) => ({
        fecha: day.fecha,
        weekday: day.weekday,
        estado: day.estado,
        metrics: consolidateMetrics(plants.map((plant) => (plant.days[index] && plant.days[index].metrics) || {})),
        venta_casa_kg: sumSibling(plants.map((plant) => plant.days[index]), "venta_casa_kg"),
        venta_comisionista_kg: sumSibling(plants.map((plant) => plant.days[index]), "venta_comisionista_kg"),
        gasto_corporativo_mxn: sumSibling(plants.map((plant) => plant.days[index]), "gasto_corporativo_mxn"),
        gasto_operativo_mxn: sumSibling(plants.map((plant) => plant.days[index]), "gasto_operativo_mxn"),
        hg_kilos: sumSibling(plants.map((plant) => plant.days[index]), "hg_kilos"),
      })),
      week: { ...week, estado },
    },
    nav: navigationFor(anchor, Number(opts.year), Number(opts.month)),
    query_count: queryCount,
  };
}

async function loadWeeklySeries(client, opts) {
  const rangeId = grafica.normalizeRange(opts.range);
  let window;
  if (rangeId === "5d") {
    window = fiveDayWindow(String(opts.weekAnchor || opts.corteYmd || "").slice(0, 10));
    if (!window) {
      const error = new Error("week_anchor inválido");
      error.status = 400;
      throw error;
    }
  } else {
    const end = monthEnd(Number(opts.year), Number(opts.month));
    let first = `${opts.year}-${pad2(opts.month)}-01`;
    if (rangeId === "todo") {
      const found = await client.query(`SELECT MIN(fecha)::text AS fecha FROM arr.ventas_diarias_cliente`, []);
      const fecha = found.rows && found.rows[0] && String(found.rows[0].fecha || "").slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) first = fecha;
    }
    window = grafica.rangeWindow(end, opts.range, first);
  }
  const loaded = await loadBundles(client, opts.plant, window.desde, window.hasta, opts);
  const unique = [];
  for (let cursor = window.desde; cursor && cursor <= window.hasta; cursor = addDays(cursor, 1)) {
    unique.push(stitchWeek(loaded.bundles, sundayOfWeekContainingDate(cursor)).find((day) => day.fecha === cursor));
  }
  return {
    ok: true,
    range: window.range,
    corte_ymd: String(opts.corteYmd || "").slice(0, 10) || null,
    metric: opts.metric,
    points: seriesPoints(unique, opts.metric, opts.corteYmd),
    query_count: loaded.queryCount,
  };
}

function periodWindows(year, month, mode, firstMonth) {
  const y = Number(year), m = Number(month);
  if (!Number.isInteger(y) || y < 2000 || y > 2100 || !Number.isInteger(m) || m < 1 || m > 12 || !["weeks", "months"].includes(mode)) {
    const error = new Error("Marco de tiempo inválido"); error.status = 400; throw error;
  }
  const out = [];
  if (mode === "weeks") {
    for (let start = sundayOfWeekContainingDate(`${y}-${pad2(m)}-01`); start <= monthEnd(y,m); start = addDays(start,7)) {
      const week = weekOf(start);
      out.push({ key:start, label:`Semana ${week.week_number}`, fecha_desde:start, fecha_hasta:week.fecha_hasta });
    }
  } else {
    const first = firstMonth == null ? Math.max(1,m-3) : Number(firstMonth);
    if (!Number.isInteger(first) || first < 1 || first > m) { const error=new Error("Mes inicial inválido"); error.status=400; throw error; }
    const names=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    for(let n=first;n<=m;n++) out.push({key:`${y}-${pad2(n)}`,label:`${names[n-1]} ${y}`,fecha_desde:`${y}-${pad2(n)}-01`,fecha_hasta:monthEnd(y,n)});
  }
  return out;
}

async function loadPeriodColumns(client, opts) {
  const historical=require("./igf-period-forecast-fallback"), forecastCache=new Map();
  const periods=periodWindows(opts.year,opts.month,opts.periodMode,opts.firstMonth);
  const plants=opts.plants || [opts.plant], columns=periods.map(period=>({...period, summaries:[]}));
  let queryCount=0;
  for(const plant of plants){
    const loaded=await loadBundles(client,plant,periods[0].fecha_desde,periods[periods.length-1].fecha_hasta,opts);
    queryCount+=loaded.queryCount;
    for(const column of columns){
      const days=[];
      for(let date=column.fecha_desde;date<=column.fecha_hasta;date=addDays(date,1))
        days.push(stitchWeek(loaded.bundles,sundayOfWeekContainingDate(date)).find(day=>day.fecha===date));
      let summary=aggregateWeek(days,opts.corteYmd);
      if(historical.emptyHistoricalMonth(summary,column,opts)){
        const key=column.fecha_desde.slice(0,7);
        if(!forecastCache.has(key))forecastCache.set(key,await historical.loadHistoricalForecast(client,Number(key.slice(0,4)),Number(key.slice(5,7)),opts));
        summary=historical.fillFromForecast(summary,forecastCache.get(key),plant);
      }
      column.summaries.push(summary);
    }
  }
  return {ok:true,mode:opts.periodMode,corte_ymd:opts.corteYmd||null,columns:columns.map(({summaries,...period})=>{
    const summary=opts.plants ? consolidateCovered(summaries) : summaries[0];
    const states=new Set(summaries.map(s=>s.estado));
    const forecast_sources=summaries.map(s=>s.forecast_source).filter(Boolean);
    if(opts.plants)for(const key of ["gasto_operativo_forecast_kg","bancos_planta_forecast_kg","util_oper_forecast_kg"]){
      const available=summaries.filter(s=>s.metrics[key]!=null && s.metrics.venta_kg>0);
      const kg=available.reduce((sum,s)=>sum+s.metrics.venta_kg,0);
      summary.metrics[key]=kg>0?available.reduce((sum,s)=>sum+s.metrics[key]*s.metrics.venta_kg,0)/kg:null;
    }
    return {...period,metrics:summary.metrics,coverage:summary.coverage,forecast_sources,complete:summaries.every(s=>s.complete),
      estado:states.size===1?summaries[0].estado:"parcial"};
  }),query_count:queryCount};
}

module.exports = {
  periodWindows,
  loadPeriodColumns,
  METRICS,
  EXPENSE_KEYS,
  addDays,
  addWeeks,
  sundayOfWeekContainingDate,
  saturdayOfWeekContainingDate,
  weekNumber,
  weekYear,
  weekOf,
  weekIntersectsMonth,
  navigationFor,
  buildConceptSchedules,
  aggregateWeek,
  aggregateCovered,
  publishCoverage,
  coverageCaption,
  coverageIsPartial,
  consolidateCovered,
  daysFromBuilt,
  applyWeeklyProjectedTotalSale,
  dailyMetric,
  dayMetrics,
  weekDayRecords,
  fiveDayWindow,
  seriesPoints,
  dayResultMxn,
  consolidateMetrics,
  loadWeeklyPlant,
  loadWeeklyAll,
  loadWeeklySeries,
};
