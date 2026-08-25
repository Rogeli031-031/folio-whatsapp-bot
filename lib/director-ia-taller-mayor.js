"use strict";

/**
 * Chat legado: taller_mayor (read model B por unidad).
 * Identidad = (planta_id, token canónico de public.folios.unidad).
 * Clasificación = matchTallerTipoCol(subcategoria) === "mayor".
 * No económico. No placa. No unit master. No fuzzy. No cross-plant.
 * GPT sintetiza; no decide identidad, folio, importe, estatus, periodo ni reviewability.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { assertFolioStatusAccess, requirePlantaId } = require("./director-ia-m2-folio-status");
const {
  queryTallerFolios,
  homologarUnidadToken,
  parseUnidadFilter,
} = require("./director-ia-m5-taller-at");
const { expandTallerRows, matchTallerTipoCol } = require("./taller-at-excel");
const {
  classifyCancellationEligibility,
  isIgfReviewableSupportsQuestion,
  wantsCounterfactual,
  categoryFeedsIgfSupportCalc,
  overlayFolioKgFromSums,
  applyGastoAndResult,
  addRowToSums,
  emptySums,
  igfFolioBucket,
} = require("./director-ia-igf-reviewable-supports");
const { currentYearMonthCdmx } = require("./director-ia-mejora-continua");

const SEMANTIC_CLASS = "taller_mayor";
const SOURCE = "public.folios";
const HISTORY_MES_DESDE = "2000-01";

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

const SYSTEM_ADDENDUM = [
  "EVIDENCIA DE TALLER MAYOR POR UNIDAD (chat legado; read model B).",
  "No es IES. No es Reasoning Engine N5. No es taller_at de todos los tipos. No es IGF reviewable de planta.",
  "El runtime ya resolvió planta, periodo mes_cargo, token canónico de unidad, SUM(importe), Folios, estatus y reviewability.",
  "unidad = token canónico de public.folios.unidad. No es económico. No es placa. No hay catálogo de unidades.",
  "Taller Mayor = subcategoria reconocida por matchTallerTipoCol (REPARACION + MAYOR). No clasifiques por importe ni por concepto.",
  "Si una unidad tiene varios Folios, están todos en la evidencia. No elijas uno en silencio.",
  "reviewable != cancelar != recomendación != ahorro != reversión contable. Director IA es READ ONLY.",
  "missing != 0. Ausencia de concepto/historial/overlay no es cero.",
  "No diagnostiques mecánica. No infieras causa desde el concepto. No recomiendes cancelar porque el importe es alto.",
].join(" ");

function normalizeQuestion(raw) {
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ymKey(year, month) {
  return `${Number(year)}-${String(month).padStart(2, "0")}`;
}

function isValidYyyyMm(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ""));
}

function nowYearMonth(now) {
  if (now && Number.isFinite(Number(now.year)) && Number.isFinite(Number(now.month))) {
    return { year: Number(now.year), month: Number(now.month) };
  }
  if (now instanceof Date) {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "numeric",
    });
    const parts = fmt.formatToParts(now);
    return {
      year: parseInt((parts.find((p) => p.type === "year") || {}).value || "0", 10),
      month: parseInt((parts.find((p) => p.type === "month") || {}).value || "0", 10),
    };
  }
  return currentYearMonthCdmx();
}

function parseExplicitYyyyMm(raw) {
  const found = [];
  const re = /\b(\d{4}-\d{2})\b/g;
  const text = String(raw || "");
  let m;
  while ((m = re.exec(text))) {
    if (isValidYyyyMm(m[1])) found.push(m[1]);
  }
  return found;
}

function parseNamedMonthCurrentYear(q, today) {
  const hits = [];
  for (const [name, num] of Object.entries(MONTH_NAME_TO_NUM)) {
    if (new RegExp(`\\b${name}\\b`).test(q)) hits.push(num);
  }
  const uniq = [...new Set(hits)];
  if (uniq.length !== 1) return null;
  return ymKey(today.year, uniq[0]);
}

function mentionsUnresolvedPastMonth(q) {
  return /\bmes\s+pasado\b/.test(q) || /\bmes\s+anterior\b/.test(q);
}

function resolveTallerMayorPeriod(question, opts = {}) {
  const q = normalizeQuestion(question);
  const today = nowYearMonth(opts.now);
  const current = ymKey(today.year, today.month);
  const inherited = Array.isArray(opts.active_period_months)
    ? opts.active_period_months.map((m) => String(m || "").trim()).filter(isValidYyyyMm)
    : [];

  if (mentionsUnresolvedPastMonth(q)) {
    return {
      ok: false,
      code: "period_unresolved",
      error: "«Mes pasado» no está resuelto de forma segura. Indica YYYY-MM. No invento el mes.",
    };
  }

  const explicit = parseExplicitYyyyMm(question);
  if (explicit.length === 1) {
    return { ok: true, yyyymm: explicit[0], inherited: false, source: "explicit_yyyymm" };
  }
  if (explicit.length > 1) {
    return {
      ok: false,
      code: "period_ambiguous",
      error: "Indica un solo mes YYYY-MM. No elijo el periodo en silencio.",
    };
  }

  const named = parseNamedMonthCurrentYear(q, today);
  if (named) {
    return { ok: true, yyyymm: named, inherited: false, source: "named_month_current_year" };
  }

  if (/\beste mes\b/.test(q) || /\bdel mes\b/.test(q) || /\bel mes\s+(actual|en curso)\b/.test(q)) {
    return { ok: true, yyyymm: current, inherited: false, source: "current_cdmx" };
  }

  if (inherited.length === 1) {
    return { ok: true, yyyymm: inherited[0], inherited: true, source: "active_period" };
  }

  return { ok: true, yyyymm: current, inherited: false, source: "current_cdmx_default" };
}

function isTallerMayorQuestion(raw) {
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (/\b(excel|xlsx|export|descarg|workbook)\b/.test(q)) return false;
  if (/\binversiones?\b/.test(q)) return false;
  if (/\bclasificacion\b/.test(q)) return false;
  if (/\bgastos?\b/.test(q) && !/\btaller\b/.test(q)) return false;
  const hasTaller = /\btaller\b/.test(q);
  const hasMayor = /\bmayor\b/.test(q);
  const hasReparacionMayor = /\breparacion\s+mayor\b/.test(q);
  if (hasTaller && hasMayor) return true;
  if (
    hasReparacionMayor &&
    (/\bunidades?\b/.test(q) || /\bapoyos?\b/.test(q) || /\bfolios?\b/.test(q) || /\bat\b/.test(q))
  ) {
    return true;
  }
  return false;
}

function isTallerMayorIgfHypothetical(raw) {
  const q = normalizeQuestion(raw);
  if (!q || !/\bigf\b/.test(q)) return false;
  if (typeof wantsCounterfactual === "function" && wantsCounterfactual(raw)) return true;
  return (
    /\bafectar/.test(q) ||
    /\bno\s+entrar/.test(q) ||
    /\bsi\s+no\s+/.test(q) ||
    /\bquedaria\b/.test(q)
  );
}

function namesHighestAmount(q) {
  const amount = /\bimporte\b/.test(q) || /\bmonto\b/.test(q) || /\bapoyos?\b/.test(q) || /\bsuma\b/.test(q);
  const rank = /\balto\b/.test(q) || /\bmas\b/.test(q) || (/\bmayor\b/.test(q) && !/\btaller\b/.test(q));
  return amount && rank;
}

function asksHistoryExpansion(q) {
  if (/\bhistorico\b/.test(q) || /\bhistorial\b/.test(q)) return true;
  if (/\ben\s+total\b/.test(q)) return true;
  if (/\btodos\b/.test(q) && /\bfolios?\b/.test(q)) return true;
  if (/\botros\b/.test(q) && /\bfolios?\b/.test(q)) return true;
  return false;
}

function asksAllTallerTypes(q) {
  return /\btodos\s+los\s+tipos\b/.test(q) || (/\by de taller\b/.test(q) && !/\bmayor\b/.test(q));
}

function namesTallerMayorFollowUp(q, opts = {}) {
  if (namesHighestAmount(q)) return true;
  if (/\bunidades?\b/.test(q)) return true;
  if (/\breparacion/.test(q) || /\breparando\b/.test(q)) return true;
  if (/\bfolios?\b/.test(q)) return true;
  if (/\bestatus\b/.test(q) || /\bestado\b/.test(q)) return true;
  if (/\bdetener\b/.test(q) || /\bcancel/.test(q)) return true;
  if (/\bllevamos\b/.test(q)) return true;
  if (isTallerMayorIgfHypothetical(q)) return true;
  if (asksHistoryExpansion(q)) return true;
  if (opts.hasActiveUnit && (/\bes[ae]\b/.test(q) || /\besta\b/.test(q) || /\bat\b/.test(q))) {
    return true;
  }
  return false;
}

function isTallerMayorFollowUp(raw, kind, opts = {}) {
  if (kind === "pronoun" || kind === "attention" || kind === "confirm") return true;
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (opts.hasActiveUnit || opts.hasActiveFolio) {
    if (namesTallerMayorFollowUp(q, opts)) return true;
    if (typeof isIgfReviewableSupportsQuestion === "function" && isIgfReviewableSupportsQuestion(raw)) {
      return true;
    }
  }
  return isTallerMayorQuestion(raw);
}

function canonicalUnitToken(raw) {
  const list = homologarUnidadToken(raw);
  if (list && list.length) return list[0];
  return null;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function sumImporte(rows) {
  let total = 0;
  let seen = false;
  for (const row of rows || []) {
    if (row && row.importe != null && Number.isFinite(Number(row.importe))) {
      total += Number(row.importe);
      seen = true;
    }
  }
  return seen ? round2(total) : null;
}

function projectFolio(row, unitToken) {
  const eligibility = classifyCancellationEligibility(row.estatus);
  return {
    folio_id: row.folio_id != null ? Number(row.folio_id) : row.id != null ? Number(row.id) : null,
    numero_folio: row.numero_folio ? String(row.numero_folio) : null,
    unit_token: unitToken,
    planta_id: row.planta_id != null ? Number(row.planta_id) : null,
    period: row.mes_cargo || null,
    importe: row.importe != null && Number.isFinite(Number(row.importe)) ? Number(row.importe) : null,
    estatus: row.estatus || null,
    concepto: (() => {
      const c = row.concepto != null ? String(row.concepto).trim() : "";
      if (!c || c === "—" || c === "-") return null;
      return c;
    })(),
    subcategoria: row.subcategoria || null,
    categoria: row.categoria || "TALLER",
    reviewability: {
      group: eligibility.group,
      cancelable_under_current_rules: eligibility.cancelable_under_current_rules,
      reason: eligibility.reason,
    },
    source: SOURCE,
  };
}

function groupUnits(rows, plantaId, periodYm) {
  const byToken = new Map();
  let missingTokenRows = 0;
  for (const row of rows || []) {
    if (!row || row.row_kind === "grupo") continue;
    const token = canonicalUnitToken(row.unidad);
    if (!token) {
      missingTokenRows += 1;
      continue;
    }
    if (!byToken.has(token)) {
      byToken.set(token, []);
    }
    byToken.get(token).push(row);
  }

  const units = [...byToken.entries()]
    .map(([unit_token, groupRows]) => {
      const folios = [];
      const seen = new Set();
      for (const row of groupRows) {
        const projected = projectFolio(row, unit_token);
        const key = `${projected.folio_id || ""}:${projected.numero_folio || ""}:${projected.importe}`;
        if (seen.has(key)) continue;
        seen.add(key);
        folios.push(projected);
      }
      const folioIds = new Set(folios.map((f) => f.folio_id).filter((id) => id != null));
      return {
        unit_token,
        planta_id: Number(plantaId),
        period: periodYm,
        folio_count: folioIds.size || folios.length,
        sum_importe: sumImporte(folios),
        folios,
      };
    })
    .sort((a, b) => {
      const as = a.sum_importe == null ? -Infinity : a.sum_importe;
      const bs = b.sum_importe == null ? -Infinity : b.sum_importe;
      if (bs !== as) return bs - as;
      return String(a.unit_token).localeCompare(String(b.unit_token));
    });

  return { units, missingTokenRows };
}

function rankHighestUnits(units) {
  const ranked = (units || []).filter((u) => u.sum_importe != null);
  if (!ranked.length) return { winners: [], tied: false };
  const top = ranked[0].sum_importe;
  const winners = ranked.filter((u) => u.sum_importe === top);
  return { winners, tied: winners.length > 1 };
}

function isMayorRow(row) {
  if (!row || row.row_kind === "grupo") return false;
  if (row.tipo === "mayor") return true;
  return matchTallerTipoCol(row.subcategoria) === "mayor";
}

function parseExplicitFolioId(question) {
  const raw = String(question || "");
  const idMatch = raw.match(/\bfolio\s*(?:id\s*)?(\d{2,})\b/i);
  if (idMatch) return Number(idMatch[1]);
  return null;
}

function resolveView(question, opts = {}) {
  const q = normalizeQuestion(question);
  if (isTallerMayorIgfHypothetical(q)) return "igf_hypothetical";
  if (
    (typeof isIgfReviewableSupportsQuestion === "function" && isIgfReviewableSupportsQuestion(question)) ||
    (/\bdetener\b/.test(q) || /\bcancel/.test(q))
  ) {
    return "reviewability";
  }
  if (asksHistoryExpansion(q)) return "history";
  if (/\bllevamos\b/.test(q) || (/\bcuanto\b/.test(q) && /\breparacion/.test(q))) return "running_total";
  if (namesHighestAmount(q)) return "rank_highest";
  if (/\bestatus\b/.test(q) || /\bestado\b/.test(q)) return "status";
  if (/\breparacion/.test(q) && !isTallerMayorQuestion(question)) return "repair_detail";
  if (/\bfolio\b/.test(q) && !/\bfolios\b/.test(q) && !/\botros\b/.test(q)) return "folio_identity";
  if (opts.hasActiveUnit) return "unit_detail";
  return "list";
}

function baseLimitations(extra = []) {
  return [
    "Director IA es read-only. No cancela ni solicita cancelación.",
    "reviewable != cancelar != recomendación != ahorro != reversión contable.",
    "unidad = token canónico de public.folios.unidad; no es económico ni placa.",
    "Taller Mayor viene de subcategoria (matchTallerTipoCol), no de importe ni concepto.",
    ...extra,
  ];
}

function entityFromSelection(unit, folio) {
  if (!unit) return [];
  if (folio && folio.folio_id != null) {
    return [
      {
        kind: "folio",
        display: folio.numero_folio || unit.unit_token,
        unit_token: unit.unit_token,
        folio_id: folio.folio_id,
        numero_folio: folio.numero_folio || null,
      },
    ];
  }
  return [
    {
      kind: "unit",
      display: unit.unit_token,
      unit_token: unit.unit_token,
      folio_id: null,
      numero_folio: null,
    },
  ];
}

function buildSingleFolioIgfHypothetical(folio, opts = {}) {
  if (!folio) {
    return {
      ok: false,
      plant_wide_candidates: false,
      mutated: false,
      realized_savings: false,
      limitations: ["No hay Folio activo. No sustituyo por candidatos reviewable de planta."],
    };
  }
  const feeds = categoryFeedsIgfSupportCalc(folio.categoria || "TALLER", folio.subcategoria);
  const limitations = [
    "Director IA es read-only. No cancela.",
    "No es ahorro realizado ni reversión contable.",
    "No sustituyo este Folio por candidatos reviewable de planta.",
  ];
  let overlay = null;
  if (opts.igfBaseFields && Array.isArray(opts.plantMathRows) && feeds) {
    const ventaTon = opts.igfBaseFields.venta_ton;
    if (ventaTon != null && Number(ventaTon) > 0) {
      const currentSums = emptySums();
      const hypoSums = emptySums();
      const targetId = Number(folio.folio_id);
      for (const row of opts.plantMathRows) {
        addRowToSums(currentSums, row, Boolean(opts.isMesActual));
        if (Number(row.id) !== targetId) addRowToSums(hypoSums, row, Boolean(opts.isMesActual));
      }
      const currentKg = overlayFolioKgFromSums(
        ventaTon,
        Number(opts.plantCount) || 1,
        currentSums,
        Boolean(opts.isMesActual),
        opts.igfBaseFields.inversiones_kg
      );
      const hypoKg = overlayFolioKgFromSums(
        ventaTon,
        Number(opts.plantCount) || 1,
        hypoSums,
        Boolean(opts.isMesActual),
        opts.igfBaseFields.inversiones_kg
      );
      const currentLive = applyGastoAndResult(opts.igfBaseFields, currentKg);
      const hypoLive = applyGastoAndResult(opts.igfBaseFields, hypoKg);
      overlay = {
        folio_id: folio.folio_id,
        numero_folio: folio.numero_folio,
        unit_token: folio.unit_token,
        igf_bucket: igfFolioBucket(folio.estatus, folio.categoria, folio.subcategoria, Boolean(opts.isMesActual)),
        resultado_final_kg_current: currentLive && currentLive.resultado_final_kg,
        resultado_final_kg_without_folio: hypoLive && hypoLive.resultado_final_kg,
        mutated: false,
        realized_savings: false,
      };
    } else {
      limitations.push("Falta denominador venta_ton > 0. No convierto ausencia en overlay cero.");
    }
  } else if (!feeds) {
    limitations.push("Este Folio no alimenta cubos IGF. No invento el contrafactual.");
  } else {
    limitations.push("Overlay IGF de este Folio no calculado en este turno; no invento el delta ni candidatos de planta.");
  }
  return {
    ok: true,
    folio_id: folio.folio_id,
    numero_folio: folio.numero_folio,
    unit_token: folio.unit_token,
    feeds_igf: feeds,
    reviewability: folio.reviewability,
    mutated: false,
    realized_savings: false,
    plant_wide_candidates: false,
    overlay,
    limitations,
  };
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [plantaId]);
  return r.rows[0] || null;
}

function assembleTallerMayorPack(input) {
  const periodYm = input.periodYm;
  const plantaId = Number(input.planta_id);
  const view = input.view || "list";
  const mayorOnly = input.mayorOnly !== false;
  const filtered = (input.expandedRows || []).filter((row) => {
    if (!row || row.row_kind === "grupo") return false;
    if (mayorOnly && !isMayorRow(row)) return false;
    const mes = String(row.mes_cargo || "");
    if (input.periodFilter && mes !== periodYm) return false;
    return true;
  });
  const grouped = groupUnits(filtered, plantaId, periodYm);
  const units = grouped.units;
  const limitations = baseLimitations(input.extraLimitations || []);
  if (grouped.missingTokenRows > 0) {
    limitations.push(
      `${grouped.missingTokenRows} fila(s) Taller Mayor sin token canónico de unidad. missing != 0; no entran al ranking.`
    );
  }
  if (!units.length) {
    limitations.push("No hay unidades con Taller Mayor en este periodo/planta. Eso no es un total 0 inventado.");
  }

  let selectedUnit = input.selectedUnitToken
    ? units.find((u) => u.unit_token === input.selectedUnitToken) || null
    : null;
  let selectedFolio = null;
  let needsClarification = null;
  let ranking = null;

  if (view === "rank_highest") {
    ranking = rankHighestUnits(units);
    if (ranking.tied) {
      needsClarification = {
        status: "ambiguous",
        target: "unit",
        hint: ranking.winners.map((u) => u.unit_token).join(", "),
        reason: "Hay empate de SUM(importe) entre unidades. No elijo una en silencio.",
      };
      selectedUnit = null;
    } else if (ranking.winners[0]) {
      selectedUnit = ranking.winners[0];
    }
  }

  if (selectedUnit && selectedUnit.folios.length === 1) {
    selectedFolio = selectedUnit.folios[0];
  } else if (selectedUnit && input.selectedFolioId != null) {
    selectedFolio = selectedUnit.folios.find((f) => Number(f.folio_id) === Number(input.selectedFolioId)) || null;
  }

  const wantsSingleFolio =
    view === "reviewability" ||
    view === "folio_identity" ||
    view === "status" ||
    view === "igf_hypothetical";

  if (wantsSingleFolio && selectedUnit && !selectedFolio && selectedUnit.folios.length > 1) {
    needsClarification = {
      status: "ambiguous",
      target: "folio",
      hint: selectedUnit.unit_token,
      reason: `La unidad ${selectedUnit.unit_token} tiene ${selectedUnit.folio_count} Folios. No elijo uno en silencio.`,
      folios: selectedUnit.folios.map((f) => ({
        folio_id: f.folio_id,
        numero_folio: f.numero_folio,
        importe: f.importe,
        estatus: f.estatus,
      })),
    };
  }

  if (view === "reviewability" && !selectedUnit && !selectedFolio) {
    needsClarification = {
      status: "ambiguous",
      target: "folio",
      hint: null,
      reason: "No hay Folio activo. No evalúo reviewable de planta ni invento un Folio.",
    };
  }

  const historyUnits = input.historyUnits || null;
  let runningTotal = null;
  if (view === "running_total") {
    if (input.historyExpanded && historyUnits && selectedUnit) {
      const hist = historyUnits.find((u) => u.unit_token === selectedUnit.unit_token);
      runningTotal = {
        scope: "expanded_history",
        unit_token: selectedUnit.unit_token,
        sum_importe: hist ? hist.sum_importe : selectedUnit.sum_importe,
        period: hist ? "history" : periodYm,
      };
      limitations.push("Horizonte ampliado porque el usuario lo pidió de forma explícita.");
    } else if (selectedUnit) {
      runningTotal = {
        scope: "thread_period",
        unit_token: selectedUnit.unit_token,
        sum_importe: selectedUnit.sum_importe,
        period: periodYm,
      };
    }
  }

  let igfHypothetical = null;
  if (view === "igf_hypothetical") {
    igfHypothetical = buildSingleFolioIgfHypothetical(selectedFolio, {
      igfBaseFields: input.igfBaseFields,
      plantMathRows: input.plantMathRows,
      plantCount: input.plantCount,
      isMesActual: input.isMesActual,
    });
    limitations.push(...(igfHypothetical.limitations || []));
  }

  if (view === "reviewability" && selectedFolio) {
    limitations.push("Reviewability aplica a este Folio activo. No es listado IGF reviewable de planta.");
  }

  const provenance = {
    source: SOURCE,
    classification: "matchTallerTipoCol(subcategoria)===mayor",
    identity: "planta_id + canonical public.folios.unidad token",
    period_field: "mes_cargo",
    requery: true,
    aligned_before_gpt: true,
  };

  return {
    ok: true,
    semantic_class: SEMANTIC_CLASS,
    planta_id: plantaId,
    planta_nombre: input.planta_nombre || null,
    planta_clave: input.planta_clave || null,
    period: {
      yyyymm: periodYm,
      field: "mes_cargo",
      source: input.periodSource || "current_cdmx",
      inherited: Boolean(input.periodInherited),
    },
    view,
    units,
    selected_unit: selectedUnit
      ? {
          unit_token: selectedUnit.unit_token,
          planta_id: selectedUnit.planta_id,
          period: selectedUnit.period,
          folio_count: selectedUnit.folio_count,
          sum_importe: selectedUnit.sum_importe,
          folios: selectedUnit.folios,
        }
      : null,
    selected_folio: selectedFolio,
    ranking,
    running_total: runningTotal,
    history_units: historyUnits,
    igf_hypothetical: igfHypothetical,
    needs_clarification: Boolean(needsClarification),
    clarification: needsClarification,
    active_entities: entityFromSelection(selectedUnit, selectedFolio),
    limitations: [...new Set(limitations)],
    provenance,
    read_only: true,
    mutated: false,
    partial: grouped.missingTokenRows > 0 || !units.length,
    assembly_status: needsClarification ? "needs_clarification" : units.length ? "ok" : "empty",
    source: SOURCE,
    retrieved_at: new Date().toISOString(),
  };
}

async function loadTallerMayorForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return { ...missing, abort: true };
  const denied = assertFolioStatusAccess(auth, Number(plantaId));
  if (!denied.ok) return { ...denied, abort: true };

  const question = opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const period = resolveTallerMayorPeriod(question, {
    now: opts.now,
    active_period_months: opts.active_period_months,
  });
  if (!period.ok) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 400,
      error: period.error,
      period_code: period.code,
    };
  }

  const namedUnits = parseUnidadFilter(question);
  const selectedUnitToken = namedUnits[0] || opts.active_unit || null;
  const selectedFolioId = parseExplicitFolioId(question) || opts.active_folio_id || null;
  const view = resolveView(question, {
    hasActiveUnit: Boolean(selectedUnitToken),
    hasActiveFolio: Boolean(selectedFolioId),
  });
  const expandHistory = view === "history" || (view === "running_total" && asksHistoryExpansion(normalizeQuestion(question)));
  const mayorOnly = !asksAllTallerTypes(normalizeQuestion(question));

  const queryFn = opts.queryTallerFolios || queryTallerFolios;
  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;
  const expandFn = opts.expandTallerRows || expandTallerRows;

  async function run(client) {
    const planta = await resolvePlanta(client, Number(plantaId));
    const mesDesde = expandHistory ? HISTORY_MES_DESDE : period.yyyymm;
    const mesHasta = period.yyyymm;
    const folioRows = await queryFn(client, auth, Number(plantaId), mesDesde, mesHasta, {
      resolveEquivalentIds: opts.resolveEquivalentIds,
    });
    const expanded = expandFn(folioRows || []);
    const periodRows = expanded.filter((row) => String(row.mes_cargo || "") === period.yyyymm);
    const extraLimitations = [];
    if (!mayorOnly) extraLimitations.push("Se ampliaron tipos TALLER porque el usuario lo pidió de forma explícita.");
    if (expandHistory) extraLimitations.push("Historial: misma planta + mismo token. Default Taller Mayor.");

    let historyUnits = null;
    if (expandHistory) {
      const histFiltered = expanded.filter((row) => (mayorOnly ? isMayorRow(row) : row && row.row_kind !== "grupo"));
      historyUnits = groupUnits(histFiltered, plantaId, "history").units;
    }

    return assembleTallerMayorPack({
      planta_id: Number(plantaId),
      planta_nombre: planta && planta.nombre ? String(planta.nombre) : null,
      planta_clave: planta && planta.clave ? String(planta.clave) : null,
      periodYm: period.yyyymm,
      periodSource: period.source,
      periodInherited: period.inherited,
      periodFilter: !expandHistory,
      expandedRows: expandHistory ? expanded : periodRows,
      selectedUnitToken,
      selectedFolioId,
      view,
      mayorOnly,
      historyUnits,
      extraLimitations,
      igfBaseFields: opts.igfBaseFields,
      plantMathRows: opts.plantMathRows,
      plantCount: opts.plantCount,
      isMesActual: period.yyyymm === ymKey(nowYearMonth(opts.now).year, nowYearMonth(opts.now).month),
    });
  }

  const injected = Boolean(opts.queryTallerFolios && opts.resolvePlanta);
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return {
        ok: false,
        abort: true,
        code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
        status: 500,
        error: (e && e.message) || "Error de fuente de Taller Mayor",
      };
    }
  }

  if (!pool || typeof pool.connect !== "function") {
    return {
      ok: false,
      abort: true,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 500,
      error: "Fuente de Taller Mayor no disponible",
    };
  }

  const client = await pool.connect();
  try {
    return await run(client);
  } catch (e) {
    return {
      ok: false,
      abort: true,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 500,
      error: (e && e.message) || "Error de fuente de Taller Mayor",
    };
  } finally {
    client.release();
  }
}

function formatMoney(value) {
  if (value == null || !Number.isFinite(Number(value))) return "importe no registrado";
  return Number(value).toFixed(2);
}

function formatTallerMayorContext(assembled) {
  if (!assembled || assembled.ok !== true) return "Taller Mayor no ensamblado.";
  const lines = [
    `planta_id=${assembled.planta_id} planta=${assembled.planta_nombre || "—"}`,
    `periodo=${assembled.period && assembled.period.yyyymm} campo=${assembled.period && assembled.period.field}`,
    `view=${assembled.view}`,
    `unidades=${(assembled.units || []).length}`,
  ];
  for (const unit of assembled.units || []) {
    lines.push(
      `UNIDAD ${unit.unit_token} folio_count=${unit.folio_count} SUM=${formatMoney(unit.sum_importe)}`
    );
    for (const folio of unit.folios || []) {
      lines.push(
        `  FOLIO id=${folio.folio_id} num=${folio.numero_folio || "—"} importe=${formatMoney(folio.importe)} estatus=${
          folio.estatus || "—"
        } concepto=${folio.concepto || "no registrado"} subcategoria=${folio.subcategoria || "—"} reviewability=${
          folio.reviewability && folio.reviewability.group
        }`
      );
    }
  }
  if (assembled.selected_unit) {
    lines.push(`active_unit=${assembled.selected_unit.unit_token}`);
  }
  if (assembled.selected_folio) {
    lines.push(
      `active_folio=${assembled.selected_folio.folio_id} ${assembled.selected_folio.numero_folio || ""}`.trim()
    );
  } else if (assembled.selected_unit && assembled.selected_unit.folio_count > 1) {
    lines.push("active_folio=ninguno (varios Folios; no hay selección silenciosa)");
  }
  if (assembled.clarification) {
    lines.push(`clarification=${assembled.clarification.reason}`);
  }
  if (assembled.igf_hypothetical) {
    lines.push(
      `igf_hypothetical folio=${assembled.igf_hypothetical.folio_id} plant_wide=${assembled.igf_hypothetical.plant_wide_candidates} savings=${assembled.igf_hypothetical.realized_savings}`
    );
  }
  if (assembled.running_total) {
    lines.push(
      `running_total scope=${assembled.running_total.scope} SUM=${formatMoney(assembled.running_total.sum_importe)}`
    );
  }
  lines.push(`LIMITATIONS: ${(assembled.limitations || []).join(" | ")}`);
  return lines.join("\n");
}

function buildTallerMayorPrompt(assembled, question) {
  const systemPrompt = `${SYSTEM_ADDENDUM} Responde en español. Una sola respuesta.`;
  const userContent = [`Pregunta del usuario: ${String(question || "").trim()}`, "", formatTallerMayorContext(assembled)].join(
    "\n"
  );
  return { systemPrompt, userContent };
}

function buildTallerMayorAnswer(assembled) {
  if (!assembled || assembled.ok !== true) {
    return (assembled && assembled.error) || "No pude consultar Taller Mayor. No invento unidades ni importes.";
  }
  if (assembled.clarification) return assembled.clarification.reason;
  const scope = assembled.planta_nombre || `planta ${assembled.planta_id}`;
  const mes = assembled.period && assembled.period.yyyymm;
  if (assembled.selected_unit) {
    const u = assembled.selected_unit;
    const folioBit =
      u.folio_count > 1
        ? `${u.folio_count} Folios (no elijo uno).`
        : assembled.selected_folio
          ? `Folio ${assembled.selected_folio.numero_folio || assembled.selected_folio.folio_id}.`
          : "Sin Folio único.";
    return (
      `Unidad ${u.unit_token} en ${scope} (${mes}): ${u.folio_count} Folio(s), SUM ${formatMoney(u.sum_importe)}. ${folioBit} ` +
      `Hechos de ${SOURCE}.unidad. No es económico ni placa.`
    );
  }
  if (!assembled.units || assembled.units.length === 0) {
    return `No hay unidades con Taller Mayor en ${scope} (${mes}). missing != 0.`;
  }
  const lines = assembled.units.slice(0, 16).map((u, i) => {
    return `${i + 1}. ${u.unit_token}; ${u.folio_count} folio(s); SUM ${formatMoney(u.sum_importe)}`;
  });
  return (
    `${assembled.units.length} unidad(es) con Taller Mayor en ${scope} (${mes}). Agrupado por token canónico. ` +
    `No es taller_at de todos los tipos.\n${lines.join("\n")}`
  );
}

function deriveTallerMayorGap(pack) {
  const missing = [...(pack && pack.limitations ? pack.limitations : [])];
  if (pack && pack.clarification) missing.push(pack.clarification.reason);
  return {
    missing_fields: [...new Set(missing)].slice(0, 12),
    why_blocks:
      "Taller Mayor alinea token de unidad, mes_cargo y Folios antes de sintetizar. No invento identidad ni elijo un Folio en silencio.",
    physical_source: "director-ia-taller-mayor",
    physical_person: null,
  };
}

function buildTallerMayorChatResult(assembled, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : assembled && assembled.planta_id;
  const openaiCalled = Boolean(opts.openai_called);
  const okPayload = assembled && assembled.ok === true;
  return {
    ok: true,
    answer: opts.answer || buildTallerMayorAnswer(assembled),
    sources: okPayload ? [SOURCE] : [],
    context_meta: {
      mode: SEMANTIC_CLASS,
      requested_domain: SEMANTIC_CLASS,
      openai_called: openaiCalled,
      openai_call_count: openaiCalled ? 1 : 0,
      semantic_class: SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      assembly_status: assembled && assembled.assembly_status,
      limitations: (assembled && assembled.limitations) || [],
      prompt_mode: SEMANTIC_CLASS,
      focus_type: SEMANTIC_CLASS,
      ies_runtime: false,
      reasoning_engine: false,
      partial: Boolean(assembled && assembled.partial),
    },
    taller_mayor: okPayload
      ? {
          semantic_class: assembled.semantic_class,
          planta_id: assembled.planta_id,
          planta_nombre: assembled.planta_nombre,
          period: assembled.period,
          view: assembled.view,
          units: assembled.units,
          selected_unit: assembled.selected_unit,
          selected_folio: assembled.selected_folio,
          ranking: assembled.ranking,
          running_total: assembled.running_total,
          igf_hypothetical: assembled.igf_hypothetical,
          limitations: assembled.limitations,
          provenance: assembled.provenance,
          read_only: true,
          mutated: false,
        }
      : null,
  };
}

module.exports = {
  SEMANTIC_CLASS,
  SOURCE,
  SYSTEM_ADDENDUM,
  normalizeQuestion,
  isTallerMayorQuestion,
  isTallerMayorFollowUp,
  isTallerMayorIgfHypothetical,
  resolveTallerMayorPeriod,
  namesHighestAmount,
  asksHistoryExpansion,
  canonicalUnitToken,
  groupUnits,
  rankHighestUnits,
  isMayorRow,
  resolveView,
  assembleTallerMayorPack,
  loadTallerMayorForChat,
  buildSingleFolioIgfHypothetical,
  formatTallerMayorContext,
  buildTallerMayorPrompt,
  buildTallerMayorAnswer,
  buildTallerMayorChatResult,
  deriveTallerMayorGap,
};
