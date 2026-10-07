"use strict";

const etapa = require("./folio-etapa-visual");

const TZ = "America/Mexico_City";

function calendarDays(year, month) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  const days = [];
  for (let day = 1; day <= last; day += 1) {
    days.push(`${year}-${mm}-${String(day).padStart(2, "0")}`);
  }
  return days;
}

function readImporte(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function eventStamp(row) {
  const raw = row.evento_en == null ? row.fecha_cdmx : row.evento_en;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

function plantsFromResolver(empresaKeys, resolvePlantaIdsForRow) {
  return (empresaKeys || []).map((empresa) => ({
    empresa,
    plant_code: empresa,
    planta_ids: (resolvePlantaIdsForRow(empresa) || []).map(Number).filter((id) => Number.isFinite(id)),
  }));
}

function descriptionOf(folio) {
  const text = String(folio.descripcion || "").trim();
  return text || "Sin descripción";
}

function choosePrincipal(folios) {
  return folios.slice().sort((a, b) => {
    const aMissing = a.importe == null;
    const bMissing = b.importe == null;
    if (aMissing !== bMissing) return aMissing ? 1 : -1;
    if (a.importe !== b.importe) return b.importe - a.importe;
    return a.id - b.id;
  })[0];
}

function descriptionShort(folios) {
  const principal = choosePrincipal(folios);
  const text = descriptionOf(principal);
  if (folios.length <= 1) return text;
  return `${text} +${folios.length - 1}`;
}

function summarize(folios) {
  let amount = null;
  let missing = 0;
  for (const folio of folios) {
    if (folio.importe == null) missing += 1;
    else amount = (amount == null ? 0 : amount) + folio.importe;
  }
  return {
    amount_total: amount,
    folio_count: folios.length,
    missing_amount_count: missing,
  };
}

function compareDetail(a, b) {
  const aMissing = a.importe == null;
  const bMissing = b.importe == null;
  if (aMissing !== bMissing) return aMissing ? 1 : -1;
  if (a.importe !== b.importe) return b.importe - a.importe;
  const folioA = String(a.folio || "");
  const folioB = String(b.folio || "");
  if (folioA !== folioB) return folioA < folioB ? -1 : 1;
  return a.id - b.id;
}

function detailFolio(folio) {
  return {
    id: folio.id,
    folio: folio.folio,
    estado: folio.estado,
    importe: folio.importe,
    descripcion: descriptionOf(folio),
    threshold_date: folio.threshold_date,
  };
}

function eventsSql(visibilityWhere, corteParam, statusParam) {
  return `
    SELECT f.id, f.numero_folio, f.folio_codigo, f.planta_id, f.importe,
           COALESCE(f.descripcion, f.concepto) AS descripcion_display,
           h.estatus AS evento_estatus,
           h.id AS historial_id,
           h.creado_en AS evento_en,
           to_char((h.creado_en AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD') AS fecha_cdmx
    FROM public.folios f
    JOIN public.folio_historial h ON h.folio_id = f.id
    WHERE h.folio_id IN (
      SELECT h2.folio_id
      FROM public.folio_historial h2
      WHERE h2.creado_en IS NOT NULL
        AND NULLIF(TRIM(h2.estatus), '') IS NOT NULL
        AND (h2.creado_en AT TIME ZONE '${TZ}')::date <= $${corteParam}::date
        AND UPPER(TRIM(h2.estatus)) = ANY($${statusParam}::text[])
    )
      AND h.creado_en IS NOT NULL
      AND NULLIF(TRIM(h.estatus), '') IS NOT NULL
      AND (h.creado_en AT TIME ZONE '${TZ}')::date <= $${corteParam}::date
      ${visibilityWhere || ""}
  `;
}

function assemble(input) {
  const corte = String(input.corteYmd || "").slice(0, 10);
  const year = Number(corte.slice(0, 4));
  const month = Number(corte.slice(5, 7));
  const days = calendarDays(year, month);
  const daySet = new Set(days);
  const idToPlant = new Map();
  for (const plant of input.plants || []) {
    for (const id of plant.planta_ids || []) idToPlant.set(Number(id), plant);
  }
  const byFolio = new Map();
  let unclassified = 0;
  for (const row of input.rows || []) {
    const estatus = row.evento_estatus == null ? "" : String(row.evento_estatus).trim();
    if (!estatus) continue;
    const fecha = String(row.fecha_cdmx || "").slice(0, 10);
    if (!fecha) continue;
    if (fecha > corte) continue;
    const id = Number(row.id);
    if (!byFolio.has(id)) {
      byFolio.set(id, {
        id,
        folio: row.numero_folio || row.folio_codigo || String(id),
        planta_id: Number(row.planta_id),
        importe: readImporte(row.importe),
        descripcion: row.descripcion_display == null ? "" : String(row.descripcion_display),
        events: [],
      });
    }
    byFolio.get(id).events.push({
      estatus,
      fecha,
      stamp: eventStamp(row),
      historial_id: Number(row.historial_id) || 0,
    });
  }
  const accepted = [];
  for (const folio of byFolio.values()) {
    folio.events.sort((a, b) => a.stamp - b.stamp || a.historial_id - b.historial_id);
    const stages = folio.events.map((event) => ({
      ...event,
      visual: etapa.estatusToEtapaVisual(event.estatus),
    }));
    const last = stages[stages.length - 1];
    if (!last || !etapa.qualifiesForDepositoMatrix(last.visual)) continue;
    const first = stages.find((event) => etapa.qualifiesForDepositoMatrix(event.visual));
    if (!first) {
      unclassified += 1;
      continue;
    }
    if (!daySet.has(first.fecha)) continue;
    const plant = idToPlant.get(folio.planta_id);
    if (!plant) continue;
    accepted.push({
      id: folio.id,
      folio: folio.folio,
      estado: last.visual,
      importe: folio.importe,
      descripcion: folio.descripcion,
      threshold_date: first.fecha,
      empresa: plant.empresa,
    });
  }
  const byCell = new Map();
  for (const folio of accepted) {
    const key = `${folio.empresa}|${folio.threshold_date}`;
    if (!byCell.has(key)) byCell.set(key, []);
    byCell.get(key).push(folio);
  }
  const plants = (input.plants || []).map((plant) => {
    const plantFolios = accepted.filter((folio) => folio.empresa === plant.empresa);
    const dayMap = {};
    for (const fecha of days) {
      const list = byCell.get(`${plant.empresa}|${fecha}`) || [];
      if (!list.length) continue;
      const ordered = list.slice().sort(compareDetail);
      dayMap[fecha] = {
        ...summarize(ordered),
        description_short: descriptionShort(ordered),
        folios: ordered.map(detailFolio),
      };
    }
    return {
      plant_code: plant.plant_code,
      empresa: plant.empresa,
      days: dayMap,
      total_month: summarize(plantFolios),
    };
  });
  const dailyTotals = {};
  for (const fecha of days) {
    const list = accepted.filter((folio) => folio.threshold_date === fecha);
    dailyTotals[fecha] = summarize(list);
  }
  return {
    ok: true,
    year,
    month,
    corte_ymd: corte,
    days,
    plants,
    daily_totals: dailyTotals,
    grand_total: summarize(accepted),
    unclassified_count: unclassified,
  };
}

async function loadDepositoMatrix(client, opts) {
  const visibility = opts.visibility || { where: "", params: [] };
  const params = (visibility.params || []).slice();
  const corteParam = params.length + 1;
  const statusParam = params.length + 2;
  params.push(opts.corteYmd);
  params.push(opts.candidateStatuses || etapa.candidateHistorialStatuses());
  const result = await client.query(eventsSql(visibility.where, corteParam, statusParam), params);
  const payload = assemble({
    plants: opts.plants,
    corteYmd: opts.corteYmd,
    rows: result.rows || [],
  });
  payload.query_count = 1 + (opts.plantQueryCount || 0);
  payload.version_as_of_corte = Boolean(opts.versionAsOfCorte);
  return payload;
}

module.exports = {
  TZ,
  calendarDays,
  plantsFromResolver,
  descriptionShort,
  eventsSql,
  assemble,
  loadDepositoMatrix,
};
