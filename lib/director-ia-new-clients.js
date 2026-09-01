"use strict";

/**
 * Director IA — clientes nuevos de un mes calendario cerrado.
 * Compra real + descuento real. Sin forecast. Sin margen como descuento.
 * Read-only. Lista completa. Builder determinista.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { assertM9DeltasAccess, getMargenKgPorPeriodo } = require("./director-ia-m9-deltas");
const {
  cdmxTodayParts,
  parseExplicitPeriod,
  extractEmbeddedClientHintCandidates,
  normalizeQuestion,
} = require("./director-ia-client-profile");
const { PLANTS_PROVINCIA, resolvePlanta } = require("./delta-ingreso-commands");

const SEMANTIC_CLASS = "historical_new_clients_closed_month";
const MESES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const MONTH_NAME_TO_NUM = Object.freeze({
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
});

const SQL_PROV_MAP = `
       SELECT DISTINCT
              p.nombre AS prov_name,
              UPPER(TRIM(p.nombre)) AS key_nombre,
              UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
         FROM public.plantas p
         JOIN arr.provincia_plants ap
           ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
           OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
        WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
          AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
`;

function ymIndex(year, month) {
  return Number(year) * 12 + Number(month);
}

function previousCalendarMonth(year, month) {
  if (Number(month) === 1) return { year: Number(year) - 1, month: 12 };
  return { year: Number(year), month: Number(month) - 1 };
}

function formatYyyyMm(year, month) {
  return `${Number(year)}-${String(Number(month)).padStart(2, "0")}`;
}

function monthLabel(year, month) {
  const name = MESES_ES[Number(month) - 1] || String(month);
  return `${name} ${year}`;
}

function assignYearLocal(month, yearHint, today) {
  if (Number.isFinite(yearHint) && yearHint >= 2000 && yearHint <= 2100) {
    return { year: yearHint, month };
  }
  let year = today.year;
  if (month > today.month) year -= 1;
  return { year, month };
}

function resolveRequestedCalendarMonth(raw, now) {
  const parsed = parseExplicitPeriod(raw, now);
  if (parsed && Array.isArray(parsed.months) && parsed.months.length === 1) {
    const m = parsed.months[0];
    return { year: m.year, month: m.month, source: "explicit_period" };
  }

  const q = normalizeQuestion(raw);
  if (!q) return null;
  const today = cdmxTodayParts(now);

  const ym = q.match(/\b(20\d{2})-(\d{1,2})\b/);
  if (ym) {
    const month = Number(ym[2]);
    const year = Number(ym[1]);
    if (month >= 1 && month <= 12) return { year, month, source: "yyyy_mm" };
  }

  for (const [name, num] of Object.entries(MONTH_NAME_TO_NUM)) {
    const re = new RegExp(`\\b${name}\\b`);
    const hit = re.exec(q);
    if (!hit) continue;
    const before = q.slice(Math.max(0, hit.index - 28), hit.index);
    const after = q.slice(hit.index + name.length, hit.index + name.length + 18);
    const hasCue =
      /\b(en|de|del|durante|solo|sobre)\s+(el\s+)?(mes\s+de\s+)?$/.test(before) ||
      /\bmes de\s+$/.test(before);
    if (!hasCue && !/\b(20\d{2})\b/.test(after) && !/\b(20\d{2})\b/.test(before)) {
      continue;
    }
    const yearAfter = after.match(/^\s*(de\s+)?(20\d{2})\b/);
    const yearBefore = before.match(/\b(20\d{2})\s*(de\s+)?$/);
    const yearHint = yearAfter ? Number(yearAfter[2]) : yearBefore ? Number(yearBefore[1]) : null;
    const assigned = assignYearLocal(num, yearHint, today);
    return { ...assigned, source: yearHint ? "named_month_year" : "named_month" };
  }
  return null;
}

function extractNamedPlant(raw) {
  const q = normalizeQuestion(raw);
  if (!q) return null;
  const names = [...PLANTS_PROVINCIA].sort((a, b) => b.length - a.length);
  for (const name of names) {
    const key = normalizeQuestion(name);
    if (!key) continue;
    if (new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(q)) {
      return name;
    }
  }
  return null;
}

function isKnownPlantSpan(span) {
  return Boolean(resolvePlanta(span, PLANTS_PROVINCIA));
}

function hasNamedClientNotPlant(raw) {
  const parsed = extractEmbeddedClientHintCandidates(raw);
  if (!parsed || !parsed.longest) return false;
  return !isKnownPlantSpan(parsed.longest);
}

function namesNewClientsCue(q) {
  const hasClientNew = /\bclientes?\b/.test(q) && /\bnuev[oa]s?\b/.test(q);
  const hasLosNuevos = /\blos\s+nuevos\b/.test(q);
  return hasClientNew || hasLosNuevos;
}

function isHistoricalNewClientsQuestion(raw, now) {
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (/\b(aumentaron|disminuyeron)\b/.test(q)) return false;
  if (/\bdejaron\s+de\s+comprar\b/.test(q) || /\bdejo\s+de\s+comprar\b/.test(q)) return false;
  if (/\b(como\s+cambi|variacion|delta)\b/.test(q) && /\b(venta|descuento|ingreso)\b/.test(q) && !/\bnuev/.test(q)) {
    return false;
  }
  if (/\bmargen\b/.test(q) && !/\bnuev/.test(q)) return false;
  if (/\b(igf|folio|folios|bitacora|expediente|ayer)\b/.test(q)) return false;
  if (hasNamedClientNotPlant(raw)) return false;
  if (!namesNewClientsCue(q)) return false;
  return resolveRequestedCalendarMonth(raw, now) != null;
}

function discountForIncome(hasDiscountRow, monto, kg) {
  if (!hasDiscountRow || !(Number(kg) > 0) || monto == null || !Number.isFinite(Number(monto))) return 0;
  return Math.abs(Number(monto)) / Number(kg);
}

function computeIngreso(kg, margen, descKg) {
  const k = Number(kg) || 0;
  const m = Number.isFinite(Number(margen)) ? Number(margen) : 1;
  const d = Number.isFinite(Number(descKg)) ? Math.abs(Number(descKg)) : 0;
  return Math.max(0, k * (m - d));
}

function classifyClosedNewClient(row, margenA, margenB) {
  const kgA = Number(row.kgA) || 0;
  const kgB = Number(row.kgB) || 0;
  const descKgA = discountForIncome(row.hasDiscountA, row.montoA, kgA);
  const descKgB = discountForIncome(row.hasDiscountB, row.montoB, kgB);
  const ingresoA = computeIngreso(kgA, margenA, descKgA);
  const ingresoB = computeIngreso(kgB, margenB, descKgB);
  return {
    ...row,
    kgA,
    kgB,
    descKgA_for_income: descKgA,
    descKgB_for_income: descKgB,
    ingresoA,
    ingresoB,
    es_nuevo: ingresoA <= 0 && ingresoB > 0,
  };
}

function reportedDiscount(hasDiscountRow, monto, kg) {
  if (!hasDiscountRow) {
    return {
      monto: null,
      desc_kg: null,
      status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
    };
  }
  const raw = monto == null || !Number.isFinite(Number(monto)) ? null : Number(monto);
  if (raw == null) {
    return { monto: null, desc_kg: null, status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND };
  }
  const descKg = Number(kg) > 0 ? Math.abs(raw) / Number(kg) : null;
  return {
    monto: raw,
    desc_kg: descKg,
    status: raw === 0 ? "ZERO_OBSERVED" : DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE,
  };
}

function classifyHistoricalNewClients(rows, margenA, margenB) {
  const classified = (rows || []).map((r) => classifyClosedNewClient(r, margenA, margenB));
  const nuevos = classified.filter((r) => r.es_nuevo).map((r) => {
    const disc = reportedDiscount(r.hasDiscountB, r.montoB, r.kgB);
    return {
      cliente: r.cliente,
      canal: r.canal || null,
      subcanal: r.subcanal || null,
      kg: r.kgB,
      ton: r.kgB / 1000,
      discount_monto: disc.monto,
      discount_kg: disc.desc_kg,
      discount_status: disc.status,
      ingreso_a: r.ingresoA,
      ingreso_b: r.ingresoB,
    };
  });
  nuevos.sort((a, b) => b.kg - a.kg || String(a.cliente).localeCompare(String(b.cliente)));
  const totalKg = nuevos.reduce((s, c) => s + (Number(c.kg) || 0), 0);
  return {
    clients: nuevos,
    source_count: nuevos.length,
    transport_count: nuevos.length,
    total_kg: totalKg,
    total_ton: totalKg / 1000,
    classified_count: classified.length,
  };
}

function fmtTon(kg) {
  if (kg == null || !Number.isFinite(Number(kg))) return "n/d";
  return (Number(kg) / 1000).toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function fmtKg(kg) {
  if (kg == null || !Number.isFinite(Number(kg))) return "n/d";
  return Number(kg).toLocaleString("es-MX", { maximumFractionDigits: 1 });
}

function fmtDescKg(v) {
  if (v == null || !Number.isFinite(Number(v))) return "DATA_NOT_FOUND";
  return `${Number(v).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $/kg`;
}

function fmtMonto(v) {
  if (v == null || !Number.isFinite(Number(v))) return "DATA_NOT_FOUND";
  return Number(v).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });
}

async function defaultResolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [plantaId]);
  return r.rows[0] || null;
}

async function defaultResolvePlantByNombre(client, nombre) {
  const want = String(nombre || "").trim();
  if (!want) return null;
  const r = await client.query(
    `SELECT id, nombre, clave FROM public.plantas
      WHERE UPPER(TRIM(nombre)) = UPPER(TRIM($1))
         OR UPPER(TRIM(COALESCE(clave, ''))) = UPPER(TRIM($1))
      LIMIT 1`,
    [want]
  );
  return r.rows[0] || null;
}

async function queryMonthlyNewClientFacts(client, plantaNombre, yearA, monthA, yearB, monthB) {
  const r = await client.query(
    `WITH prov_map AS (${SQL_PROV_MAP}),
     ventas AS (
       SELECT pm.prov_name AS planta,
              DATE_PART('year', v.fecha)::INT AS year,
              DATE_PART('month', v.fecha)::INT AS month,
              v.cliente_norm,
              SUM(v.kg) AS kg,
              MAX(v.canal) AS canal,
              MAX(COALESCE(v.subcanal, '')) AS subcanal
         FROM arr.ventas_diarias_cliente v
         JOIN prov_map pm
           ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
           OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
        WHERE pm.prov_name = $1
          AND (
            (DATE_PART('year', v.fecha)::INT = $2 AND DATE_PART('month', v.fecha)::INT = $3)
            OR (DATE_PART('year', v.fecha)::INT = $4 AND DATE_PART('month', v.fecha)::INT = $5)
          )
        GROUP BY pm.prov_name, year, month, v.cliente_norm
     ),
     desc_mes AS (
       SELECT pm.prov_name AS planta,
              DATE_PART('year', d.fecha)::INT AS year,
              DATE_PART('month', d.fecha)::INT AS month,
              d.cliente_norm,
              SUM(d.monto) AS monto
         FROM arr.descuentos_diarios_cliente d
         JOIN prov_map pm
           ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
           OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
        WHERE pm.prov_name = $1
          AND (
            (DATE_PART('year', d.fecha)::INT = $2 AND DATE_PART('month', d.fecha)::INT = $3)
            OR (DATE_PART('year', d.fecha)::INT = $4 AND DATE_PART('month', d.fecha)::INT = $5)
          )
        GROUP BY pm.prov_name, year, month, d.cliente_norm
     ),
     va AS (SELECT * FROM ventas WHERE year = $2 AND month = $3),
     vb AS (SELECT * FROM ventas WHERE year = $4 AND month = $5),
     da AS (SELECT * FROM desc_mes WHERE year = $2 AND month = $3),
     db AS (SELECT * FROM desc_mes WHERE year = $4 AND month = $5)
     SELECT
       COALESCE(va.cliente_norm, vb.cliente_norm) AS cliente_norm,
       COALESCE(vb.canal, va.canal) AS canal,
       COALESCE(vb.subcanal, va.subcanal) AS subcanal,
       COALESCE(va.kg, 0) AS kg_a,
       COALESCE(vb.kg, 0) AS kg_b,
       da.monto AS monto_a,
       db.monto AS monto_b,
       (da.cliente_norm IS NOT NULL) AS has_discount_a,
       (db.cliente_norm IS NOT NULL) AS has_discount_b
       FROM va
       FULL OUTER JOIN vb ON va.cliente_norm = vb.cliente_norm
       LEFT JOIN da ON da.cliente_norm = COALESCE(va.cliente_norm, vb.cliente_norm)
       LEFT JOIN db ON db.cliente_norm = COALESCE(va.cliente_norm, vb.cliente_norm)
      WHERE COALESCE(va.kg, 0) > 0 OR COALESCE(vb.kg, 0) > 0`,
    [plantaNombre, yearA, monthA, yearB, monthB]
  );
  return (r.rows || []).map((row) => ({
    cliente: row.cliente_norm,
    canal: row.canal || null,
    subcanal: row.subcanal || null,
    kgA: row.kg_a != null ? Number(row.kg_a) : 0,
    kgB: row.kg_b != null ? Number(row.kg_b) : 0,
    montoA: row.monto_a != null ? Number(row.monto_a) : null,
    montoB: row.monto_b != null ? Number(row.monto_b) : null,
    hasDiscountA: Boolean(row.has_discount_a),
    hasDiscountB: Boolean(row.has_discount_b),
  }));
}

function sourceError(message) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status: 500,
    error: message || "Error de fuente",
  };
}

async function loadHistoricalNewClientsForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const question = opts.question != null ? opts.question : req && req.body && req.body.question;
  const now = opts.now || new Date();

  if (!Number.isFinite(Number(plantaId)) || Number(plantaId) <= 0) {
    return { ok: false, code: DIRECTOR_IA_VERACITY.SOURCE_ERROR, status: 400, error: "planta_id es obligatorio" };
  }

  const denied = assertM9DeltasAccess(auth, Number(plantaId));
  if (!denied.ok) return { ...denied, abort: true };

  const requested = resolveRequestedCalendarMonth(question, now);
  if (!requested) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      status: 400,
      error: "No pude resolver un mes calendario. No invento el periodo.",
    };
  }

  const today = cdmxTodayParts(now);
  const isFuture = ymIndex(requested.year, requested.month) > ymIndex(today.year, today.month);
  const isCurrentOpen = requested.year === today.year && requested.month === today.month;
  const prev = previousCalendarMonth(requested.year, requested.month);

  const injected = Boolean(opts.resolvePlanta && opts.loadMonthlyFacts);
  const resolvePlantaRow = opts.resolvePlanta || defaultResolvePlantaRow;
  const resolveByNombre = opts.resolvePlantByNombre || defaultResolvePlantByNombre;
  const loadFacts = opts.loadMonthlyFacts || queryMonthlyNewClientFacts;
  const loadMargen = opts.getMargenKgPorPeriodo || getMargenKgPorPeriodo;

  const run = async (client) => {
    const sessionPlant = await resolvePlantaRow(client, Number(plantaId));
    if (!sessionPlant) {
      return {
        ok: false,
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
        status: 404,
        error: "Planta no encontrada",
      };
    }

    let target = sessionPlant;
    const named = extractNamedPlant(question);
    if (named) {
      const found = await resolveByNombre(client, named);
      if (!found) {
        return {
          ok: false,
          code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
          status: 404,
          error: "Planta nombrada no encontrada",
        };
      }
      const namedDenied = assertM9DeltasAccess(auth, Number(found.id));
      if (!namedDenied.ok) return { ...namedDenied, abort: true };
      target = found;
    }

    const base = {
      ok: true,
      semantic_class: SEMANTIC_CLASS,
      planta_id: Number(target.id || plantaId),
      planta_nombre: target.nombre || null,
      periodoA: formatYyyyMm(prev.year, prev.month),
      periodoB: formatYyyyMm(requested.year, requested.month),
      period_source: requested.source,
      presented_as_closed_actual: false,
      forecast_used: false,
      margin_used_as_discount: false,
      clients: [],
      source_count: 0,
      transport_count: 0,
      total_kg: 0,
      total_ton: 0,
    };

    if (isFuture) {
      return {
        ...base,
        ok: false,
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
        status: 400,
        error: "El periodo solicitado es futuro. No afirmo compra real.",
        period_kind: "future",
      };
    }

    if (isCurrentOpen) {
      return {
        ...base,
        period_kind: "open_current_month",
        current_month_protection: true,
        answer_hint: "open_month",
      };
    }

    const facts = await loadFacts(client, target.nombre, prev.year, prev.month, requested.year, requested.month);
    if (!Array.isArray(facts) || facts.length === 0) {
      return {
        ...base,
        ok: false,
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
        status: 404,
        error: "No hay ventas en la fuente para la planta y el periodo solicitado.",
        period_kind: "closed_month",
      };
    }

    const margenARaw = await loadMargen(client, target.nombre, prev.year, prev.month);
    const margenBRaw = await loadMargen(client, target.nombre, requested.year, requested.month);
    const margenA = Number.isFinite(Number(margenARaw)) ? Number(margenARaw) : 1;
    const margenB = Number.isFinite(Number(margenBRaw)) ? Number(margenBRaw) : 1;
    const classified = classifyHistoricalNewClients(facts, margenA, margenB);

    return {
      ...base,
      ok: true,
      period_kind: "closed_month",
      presented_as_closed_actual: true,
      margen_a: Number.isFinite(Number(margenARaw)) ? Number(margenARaw) : null,
      margen_b: Number.isFinite(Number(margenBRaw)) ? Number(margenBRaw) : null,
      margen_fallback_used: !Number.isFinite(Number(margenARaw)) || !Number.isFinite(Number(margenBRaw)),
      formula:
        "ingreso_A <= 0 && ingreso_B > 0; ingreso = max(0, kg_real * (margen_periodo - |desc_kg|)); desc missing → 0 solo para clasificar",
      ...classified,
    };
  };

  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return sourceError(e && e.message);
    }
  }
  if (!pool || typeof pool.connect !== "function") {
    return sourceError("Fuente de historical_new_clients no disponible");
  }
  const client = await pool.connect();
  try {
    return await run(client);
  } catch (e) {
    return sourceError(e && e.message);
  } finally {
    client.release();
  }
}

function buildHistoricalNewClientsAnswer(payload) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar clientes nuevos históricos en esta planta.";
    }
    return payload && payload.error
      ? `No pude completar clientes nuevos históricos: ${payload.error}. No afirmo valores.`
      : "No pude completar clientes nuevos históricos. No afirmo valores.";
  }

  if (payload.period_kind === "open_current_month") {
    return [
      "CLIENTES NUEVOS — MES ABIERTO",
      `Planta: ${payload.planta_nombre || "—"}`,
      `Periodo solicitado: ${monthLabel(...payload.periodoB.split("-").map(Number))} (mes actual abierto).`,
      "No presento forecast DICF como compra real cerrada.",
      "Cuando el mes cierre, esta ruta usará kg reales y descuento real del mes.",
    ].join("\n");
  }

  const lines = [
    "CLIENTES NUEVOS HISTÓRICOS — mes calendario cerrado",
    `Planta: ${payload.planta_nombre || "—"}`,
    `Periodo B (solicitado, real): ${monthLabel(...String(payload.periodoB).split("-").map(Number))}`,
    `Periodo A (anterior, real): ${monthLabel(...String(payload.periodoA).split("-").map(Number))}`,
    "Fórmula Nuevo (equivalente DICF sobre datos cerrados): ingreso_A <= 0 AND ingreso_B > 0",
    "ingreso = max(0, kg_real × (margen_periodo − |descuento/kg|)). Sin forecast.",
    "Descuento reportado = fila real de arr.descuentos_diarios_cliente del mes B. Ausencia ≠ 0.",
    "Margen IGF no sustituye descuento.",
    `Total clientes nuevos: ${payload.source_count}`,
    `Total kg reales (suma cruda): ${fmtKg(payload.total_kg)}`,
    `Total toneladas (desde suma cruda): ${fmtTon(payload.total_kg)}`,
    `Lista completa transportada: ${payload.transport_count} (sin recorte).`,
    "",
  ];

  if (!payload.clients || payload.clients.length === 0) {
    lines.push("No hay clientes clasificados como Nuevos en este mes cerrado.");
    return lines.join("\n");
  }

  payload.clients.forEach((c, i) => {
    const canal = [c.canal, c.subcanal].filter(Boolean).join(" / ") || "—";
    const desc =
      c.discount_status === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND
        ? "descuento/kg DATA_NOT_FOUND (sin fila de descuento en el mes)"
        : `descuento/kg ${fmtDescKg(c.discount_kg)} | monto ${fmtMonto(c.discount_monto)}`;
    lines.push(
      `${i + 1}. ${c.cliente} | ${canal} | ${fmtKg(c.kg)} kg | ${fmtTon(c.kg)} t | ${desc}`
    );
  });
  return lines.join("\n");
}

function buildHistoricalNewClientsChatResult(payload, opts = {}) {
  const answer = buildHistoricalNewClientsAnswer(payload);
  const ok = Boolean(payload && payload.ok);
  let veracity = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
    veracity = DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED;
  } else if (payload && payload.code === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND) {
    veracity = DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
  } else if (payload && payload.period_kind === "open_current_month") {
    veracity = DIRECTOR_IA_VERACITY.SOURCE_PARTIAL;
  } else if (!ok) {
    veracity = DIRECTOR_IA_VERACITY.SOURCE_ERROR;
  }

  return {
    ok: ok || payload?.period_kind === "open_current_month",
    answer,
    sources: ok ? ["arr.ventas_diarias_cliente", "arr.descuentos_diarios_cliente"] : [],
    context_meta: {
      mode: "historical_new_clients",
      openai_called: false,
      veracity,
      semantic_class: SEMANTIC_CLASS,
      planta_id: opts.planta_id != null ? opts.planta_id : payload && payload.planta_id,
      periodoA: payload && payload.periodoA,
      periodoB: payload && payload.periodoB,
      period_kind: payload && payload.period_kind,
      presented_as_closed_actual: Boolean(payload && payload.presented_as_closed_actual),
      forecast_used: false,
      margin_used_as_discount: false,
      source_count: payload && payload.source_count,
      transport_count: payload && payload.transport_count,
    },
    historical_new_clients: ok
      ? {
          planta_nombre: payload.planta_nombre,
          periodoA: payload.periodoA,
          periodoB: payload.periodoB,
          clients: payload.clients,
          source_count: payload.source_count,
          transport_count: payload.transport_count,
          total_kg: payload.total_kg,
          total_ton: payload.total_ton,
        }
      : null,
    limitation:
      veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: "historical_new_clients" }
        : undefined,
    status: payload && payload.status,
    error: payload && payload.error,
    code: payload && payload.code,
  };
}

module.exports = {
  SEMANTIC_CLASS,
  isHistoricalNewClientsQuestion,
  resolveRequestedCalendarMonth,
  previousCalendarMonth,
  extractNamedPlant,
  classifyClosedNewClient,
  classifyHistoricalNewClients,
  computeIngreso,
  discountForIncome,
  reportedDiscount,
  loadHistoricalNewClientsForChat,
  buildHistoricalNewClientsAnswer,
  buildHistoricalNewClientsChatResult,
  queryMonthlyNewClientFacts,
};
