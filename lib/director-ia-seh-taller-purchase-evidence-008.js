"use strict";

/**
 * 008 — SEH/regulación, gasto Taller y evidencia física de próxima compra.
 * Fixtures de 30 formas viven en test/fixtures. No es phrasebook de producción.
 */

const fs = require("fs");
const path = require("path");
const sehCarpetas = require("./seh-carpetas-legales");
const { sehIsSci } = require("./seh-equipos");
const { querySehEquipos, resolveSehPlantIdentity } = require("./director-ia-seh-operation-status");

const FAMILY_IDS = Object.freeze([
  "REGULATION_STATUS",
  "REGULATION_PLANT_DETAIL",
  "TALLER_EXPENSE",
  "EXPECTED_NEXT_PURCHASE",
]);

const SEH_AMBITO_CATEGORIAS = Object.freeze({
  planta: ["PLANTA", "SISTEMA CONTRA INCENDIO"],
  estacion: ["ESTACIONES"],
  autotanque: ["PIPAS"],
});

const MONTHS = Object.freeze({
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  setiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
});

function nq(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nclient(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isRegulationCue(n) {
  return Boolean(
    /\bregulacion(?:es)?\b/.test(n) ||
      /\bregulatori/.test(n) ||
      /\bseh\b/.test(n) ||
      /\bseguridad\s+e\s+higiene\b/.test(n) ||
      /\bcarpetas?\s+legales?\b/.test(n) ||
      /\bcumplimiento\s+(regulatorio|documental|de\s+seh|en\s+regulacion)\b/.test(n) ||
      (/\bcumplimiento\b/.test(n) &&
        /\b(planta|estacion|autotanque|nivel)\b/.test(n) &&
        !/\b(venta|forecast|pronostic|descuento|margen)\b/.test(n)) ||
      /\bnivel\s+de\s+cumplimiento\b/.test(n) ||
      /\bque\s+cumplimiento\s+(tenemos|tiene)\b/.test(n) && !/\bventa\b/.test(n) ||
      (/\bporcentaje\s+cumple\b/.test(n) && /\b(planta|estacion|autotanque)\b/.test(n)) ||
      (/\bpermisos?\b/.test(n) && !/\bfolio/.test(n))
  );
}

function isRegulationNoise(n) {
  return Boolean(
    /\baction\s+register\b/.test(n) ||
      (/\bacciones?\b/.test(n) && /\bvencid/.test(n)) ||
      /\bextintor/.test(n) ||
      /\beco\s*\d+/.test(n) ||
      /\bexcel\b/.test(n) ||
      /\bexport\b/.test(n) ||
      /\bdescarg/.test(n) ||
      (/\bnotas?\b/.test(n) && /\brevision/.test(n))
  );
}

function isRegulationPlantDetailQuestion(question, prior) {
  const n = nq(question);
  if (!n) return false;
  if (isRegulationNoise(n)) return false;
  const legal =
    /\bregulacion\s+de\s+planta\b/.test(n) ||
    /\bcarpetas?\s+legales?\b/.test(n) ||
    /\bsin\s+estado\b/.test(n) ||
    /\ben\s+tramite\b/.test(n) ||
    (/\bvencid/.test(n) && isRegulationCue(n)) ||
    /\bproxim[oa]s?(?:mente)?\s+a\s+vencer\b/.test(n) ||
    /\bvence\s+proximamente\b/.test(n) ||
    /\bvencen\s+en\s+30\s+dias\b/.test(n) ||
    (/\bvigentes?\b/.test(n) && (isRegulationCue(n) || /\bdocumentos?\b/.test(n))) ||
    /\bpermisos?\s+federales?\b/.test(n) ||
    /\bdocumentos?\s+de\s+regulacion\b/.test(n) ||
    (/\bdocumentos?\b/.test(n) && /\b(planta|indice|estatus)\b/.test(n)) ||
    /\bestatus\s+por\s+documento\b/.test(n) ||
    /\bindice\b/.test(n) ||
    (/\bpendientes?\b/.test(n) && (isRegulationCue(n) || /\bdocumentales?\b/.test(n)));
  if (legal) return true;
  if (
    prior &&
    prior.parent_intent === "seh_regulation" &&
    (/\by\s+en\s+planta\b/.test(n) ||
      /\bsin\s+estado\b/.test(n) ||
      /\bvencid/.test(n) ||
      /\btramite\b/.test(n) ||
      /\bvigentes?\b/.test(n))
  ) {
    return true;
  }
  return false;
}

function isRegulationStatusQuestion(question, prior) {
  const n = nq(question);
  if (!n) return false;
  if (isRegulationNoise(n)) return false;
  if (/\btaller\b/.test(n) && /\b(gasto|gastamos|folios?)\b/.test(n)) return false;
  if (isRegulationCue(n)) return true;
  if (prior && prior.parent_intent === "seh_regulation" && /^(y\s+)?(en\s+)?(planta|estacion|autotanque)\b/.test(n)) {
    return true;
  }
  return false;
}

function classifyRegulationFamily(question, prior) {
  if (isRegulationPlantDetailQuestion(question, prior)) return "REGULATION_PLANT_DETAIL";
  if (isRegulationStatusQuestion(question, prior)) return "REGULATION_STATUS";
  return null;
}

function isTallerExpenseFollowUp(question, prior) {
  if (!prior) return false;
  const parent = prior.parent_intent || prior.family;
  if (parent !== "expense_analytics" && parent !== "TALLER_EXPENSE") return false;
  const n = nq(question);
  if (!n) return false;
  return Boolean(
    /^(y\s+)?(en\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.test(
      n
    ) ||
      /acumulado/.test(n) ||
      /enero\s+a\s+septiembre/.test(n) ||
      /ano\s+a\s+la\s+fecha/.test(n) ||
      /\bcuantos\s+folios\b/.test(n) ||
      /\botros\s+estados\b/.test(n)
  );
}

function isTallerExpenseQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\btaller\s+mayor\b/.test(n) || /\btaller\s+por\s+at\b/.test(n)) return false;
  if (!/\btaller\b/.test(n)) return false;
  if (/\bforecast\b/.test(n) || /\bpronostic/.test(n) || /\bclientes?\b/.test(n)) return false;
  return Boolean(
    /\b(gasto|gastamos|gastado|gaste|gastos|pag[oó]|pagamos|pagado|suman|suma|total|importe|monto|cuesta|dinero|salio|categoria|representa|llevamos|llevo)\b/.test(
      n
    ) ||
      /\bacumul/.test(n) ||
      /\bdesembols/.test(n) ||
      /^taller\b/.test(n)
  );
}

function sehOperacionRowFilled(row) {
  if (sehIsSci(row && row.categoria)) {
    return Boolean(String((row && row.nombre) || "").trim() || (row && row.vence));
  }
  return Boolean(
    String((row && row.locacion) || "").trim() ||
      String((row && row.descripcion) || "").trim() ||
      String((row && row.componente) || "").trim() ||
      (row && row.vence)
  );
}

function sehOperacionRowCumple(row, todayYmd) {
  if (!sehOperacionRowFilled(row)) return false;
  const vence = row && row.vence ? String(row.vence).slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vence)) return false;
  return vence >= todayYmd;
}

function scoreSehOperacion(rows, categorias, todayYmd) {
  const cats = new Set((categorias || []).map((c) => String(c).toUpperCase()));
  let total = 0;
  let complying = 0;
  for (const row of rows || []) {
    if (!cats.has(String((row && row.categoria) || "").toUpperCase())) continue;
    if (!sehOperacionRowFilled(row)) continue;
    total += 1;
    if (sehOperacionRowCumple(row, todayYmd)) complying += 1;
  }
  return { total, complying, pct: total > 0 ? Math.round((100 * complying) / total) : 0 };
}

function loadLegalCatalog() {
  try {
    const src = fs.readFileSync(
      path.join(__dirname, "../frontend-dashboard/lib/seh-carpetas-legales-catalog.ts"),
      "utf8"
    );
    const map = {};
    const re = /no:\s*"([^"]+)"[\s\S]*?documento:\s*"([^"]+)"/g;
    let m = re.exec(src);
    while (m) {
      map[m[1]] = m[2];
      m = re.exec(src);
    }
    return map;
  } catch (_e) {
    return {};
  }
}

let LEGAL_CATALOG = null;
function legalCatalog() {
  if (!LEGAL_CATALOG) LEGAL_CATALOG = loadLegalCatalog();
  return LEGAL_CATALOG;
}

function classifyLegalBucket(row, todayYmd) {
  const est = row && row.estatus ? String(row.estatus).toLowerCase() : "";
  if (est === "na") return "N/A";
  if (!est) return "sin estado";
  if (est === "en_tramite") return "en trámite";
  if (est === "vigente") {
    if (row.vencimiento_na) return "vigentes";
    const vence = row.vencimiento ? String(row.vencimiento).slice(0, 10) : "";
    if (!vence) return "vigentes";
    if (vence < todayYmd) return "vencidos";
    const [y, m, d] = vence.split("-").map(Number);
    const [ty, tm, td] = todayYmd.split("-").map(Number);
    const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
    if (Number.isFinite(days) && days >= 0 && days <= 30) return "próximos a vencer";
    return "vigentes";
  }
  return "sin estado";
}

function wantedLegalBucket(question) {
  const n = nq(question);
  if (/\bsin\s+estado\b/.test(n)) return "sin estado";
  if (/\ben\s+tramite\b/.test(n)) return "en trámite";
  if (/\bproxima/.test(n) || /\bvence\s+proxim/.test(n)) return "próximos a vencer";
  if (/\bvencid/.test(n)) return "vencidos";
  if (/\bvigentes?\b/.test(n)) return "vigentes";
  if (/\bn\/a\b/.test(n) || /\bno\s+aplica\b/.test(n)) return "N/A";
  if (/\bpermisos?\s+federales?\b/.test(n)) return "federales";
  if (/\bpendientes?\b/.test(n)) return "pendientes";
  return null;
}

function isFederalDoc(no) {
  return String(no || "").startsWith("1.");
}

function enrichLegalRow(row, catalog) {
  const no = String((row && row.doc_no) || "");
  return {
    no,
    documento: (catalog && catalog[no]) || no,
    estatus: row && row.estatus ? String(row.estatus) : "Sin estado",
    vencimiento: row && row.vencimiento_na ? "N/A" : row && row.vencimiento ? String(row.vencimiento).slice(0, 10) : "",
    observacion: (row && (row.comentario || row.observaciones)) || "",
    bucket: classifyLegalBucket(row, sehCarpetas.todayYmdMexico ? sehCarpetas.todayYmdMexico() : new Date().toISOString().slice(0, 10)),
  };
}

function buildSehRegulationAnswer(pack) {
  const plant = (pack && pack.plant_label) || "la planta";
  const a = pack && pack.ambitos;
  if (!a) return "INSUFFICIENT_EVIDENCE: no pude leer el cumplimiento SEH de la planta autorizada.";
  const line = (label, block) => {
    const pct = block && block.total > 0 ? Math.round((100 * block.complying) / block.total) : 0;
    const complying = block ? block.complying : 0;
    const total = block ? block.total : 0;
    return `${label}\n${pct}% — ${complying} de ${total} puntos en cumplimiento.`;
  };
  return [
    `${plant} — cumplimiento SEH`,
    "",
    line("PLANTA", a.planta),
    "",
    line("ESTACIÓN", a.estacion),
    "",
    line("AUTOTANQUE", a.autotanque),
  ].join("\n");
}

function buildLegalDetailAnswer(rows, question, plantLabel) {
  const catalog = legalCatalog();
  const today = sehCarpetas.todayYmdMexico();
  const wanted = wantedLegalBucket(question);
  const enriched = (rows || []).map((r) => {
    const e = enrichLegalRow(r, catalog);
    e.bucket = classifyLegalBucket(r, today);
    return e;
  });
  let filtered = enriched;
  if (wanted === "federales") filtered = enriched.filter((r) => isFederalDoc(r.no));
  else if (wanted === "pendientes") {
    filtered = enriched.filter((r) => r.bucket === "sin estado" || r.bucket === "en trámite" || r.bucket === "vencidos");
  } else if (wanted) {
    filtered = enriched.filter((r) => r.bucket === wanted);
  }
  const counts = {
    vigentes: 0,
    "en trámite": 0,
    "sin estado": 0,
    vencidos: 0,
    "próximos a vencer": 0,
    "N/A": 0,
  };
  for (const r of enriched) {
    if (counts[r.bucket] != null) counts[r.bucket] += 1;
  }
  const lines = [`${plantLabel || "Planta"} — regulación PLANTA`, ""];
  if (!wanted) {
    lines.push(
      `Vigentes: ${counts.vigentes}`,
      `En trámite: ${counts["en trámite"]}`,
      `Sin estado: ${counts["sin estado"]}`,
      `Vencidos: ${counts.vencidos}`,
      `Próximos a vencer: ${counts["próximos a vencer"]}`,
      `N/A: ${counts["N/A"]}`,
      ""
    );
  }
  if (!filtered.length) {
    lines.push(`INSUFFICIENT_EVIDENCE: no hay documentos físicos en «${wanted || "el índice"}». No invento estados.`);
    return lines.join("\n");
  }
  lines.push("No./Bloque | Documento | Estatus | Vencimiento | Observación");
  for (const r of filtered.slice(0, 40)) {
    const estLabel = !r.estatus || r.estatus === "null" ? "Sin estado" : r.estatus === "en_tramite" ? "en trámite" : r.estatus === "vigente" ? "vigente" : r.estatus === "na" ? "N/A" : r.estatus;
    lines.push(`${r.no} | ${r.documento} | ${estLabel} | ${r.vencimiento || "—"} | ${r.observacion || "—"}`);
  }
  return lines.join("\n");
}

async function loadSehRegulationForChat(pool, plantaId, req, opts = {}) {
  const question = opts.question || "";
  const identity = await resolveSehPlantIdentity({
    question,
    prior: opts.prior,
    selectedId: plantaId,
    selectedLabel: (req && req.body && req.body.planta_nombre) || opts.plant_label,
    resolvePlantByNombre: opts.resolvePlantByNombre,
    plantCatalog: opts.plantCatalog,
    db: opts.db || pool,
    pool,
  });
  if (!identity.ok) {
    const selectedId = Number(plantaId);
    if (Number.isFinite(selectedId) && selectedId > 0) {
      identity.ok = true;
      identity.plant_id = selectedId;
      identity.plant_label = (req && req.body && req.body.planta_nombre) || opts.plant_label || "la planta";
      identity.source = "selected_fallback";
    } else {
      return {
        ok: true,
        clarification: identity.clarification || "¿De qué planta quieres el estado de SEH?",
        family: classifyRegulationFamily(question, opts.prior) || "REGULATION_STATUS",
      };
    }
  }
  const today = sehCarpetas.todayYmdMexico();
  let equipos = Array.isArray(opts.equipoRows) ? opts.equipoRows : null;
  let carpetas = Array.isArray(opts.carpetaRows) ? opts.carpetaRows : null;
  if ((!equipos || !carpetas) && pool && typeof pool.connect === "function") {
    const client = await pool.connect();
    try {
      if (!equipos) equipos = await querySehEquipos(client, identity.plant_id);
      if (!carpetas) {
        await sehCarpetas.ensureSehCarpetasLegalesTables(client);
        carpetas = await sehCarpetas.listByPlanta(client, identity.plant_id);
      }
    } finally {
      client.release();
    }
  }
  equipos = equipos || [];
  carpetas = carpetas || [];
  const opPlanta = scoreSehOperacion(equipos, SEH_AMBITO_CATEGORIAS.planta, today);
  const opEst = scoreSehOperacion(equipos, SEH_AMBITO_CATEGORIAS.estacion, today);
  const opAuto = scoreSehOperacion(equipos, SEH_AMBITO_CATEGORIAS.autotanque, today);
  const reg = sehCarpetas.scoreRegulacion(carpetas, today);
  const planta = {
    complying: opPlanta.complying + reg.complying,
    total: opPlanta.total + reg.total,
  };
  planta.pct = planta.total > 0 ? Math.round((100 * planta.complying) / planta.total) : 0;
  const family = classifyRegulationFamily(question, opts.prior) || "REGULATION_STATUS";
  return {
    ok: true,
    family,
    plant_id: identity.plant_id,
    plant_label: identity.plant_label,
    ambitos: {
      planta,
      estacion: opEst,
      autotanque: opAuto,
    },
    regulacion: reg,
    carpetas,
    identity_source: identity.source,
  };
}

function enrichExpensePeriod(question, filters, now) {
  if (filters && (filters.period_month || (filters.period_start && filters.period_end))) return filters;
  const n = nq(question);
  const d = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const y = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric" }).format(d);
  const m = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", month: "2-digit" }).format(d);
  if (/\bano\s+a\s+la\s+fecha\b/.test(n) || /\beste\s+ano\s+hasta\s+hoy\b/.test(n)) {
    return { period_mode: "RANGE", period_start: `${y}-01`, period_end: `${y}-${m}` };
  }
  const hasta = n.match(/\beste\s+ano\s+hasta\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/);
  if (hasta && MONTHS[hasta[1]]) {
    return { period_mode: "RANGE", period_start: `${y}-01`, period_end: `${y}-${MONTHS[hasta[1]]}` };
  }
  const acum = n.match(
    /\bacumulado\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:-|\s+a\s+)(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/
  );
  if (acum && MONTHS[acum[1]] && MONTHS[acum[2]]) {
    return { period_mode: "RANGE", period_start: `${y}-${MONTHS[acum[1]]}`, period_end: `${y}-${MONTHS[acum[2]]}` };
  }
  const formal = n.match(
    /\bdel\s+1\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(20\d{2}))?\s+al\s+\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(20\d{2}))?/
  );
  if (formal && MONTHS[formal[1]] && MONTHS[formal[3]]) {
    const y1 = formal[2] || y;
    const y2 = formal[4] || y;
    return { period_mode: "RANGE", period_start: `${y1}-${MONTHS[formal[1]]}`, period_end: `${y2}-${MONTHS[formal[3]]}` };
  }
  return filters || {};
}

function flattenDicfClients(raw) {
  const out = [];
  for (const key of ["dejaron", "disminuyeron", "aumentaron", "nuevos"]) {
    const list = raw && raw[key] && raw[key].clientes;
    for (const c of list || []) {
      if (!c) continue;
      out.push({
        cliente: c.cliente || c.nombre || "",
        freqDays: c.freqDays,
        lastPurchaseDate: c.lastPurchaseDate || c.last_date || null,
        daysSinceLast: c.daysSinceLastReal != null ? c.daysSinceLastReal : c.daysSinceLast,
        estado: c.estado || null,
      });
    }
  }
  return out.filter((r) => r.cliente);
}

function matchExpectedClients(rows, hint) {
  const h = nclient(hint);
  if (!h) return { status: "none", rows: rows || [] };
  const list = rows || [];
  const exact = list.filter((r) => nclient(r.cliente) === h);
  if (exact.length === 1) return { status: "unique", rows: exact };
  const contains = list.filter((r) => {
    const c = nclient(r.cliente);
    return c.includes(h) || h.includes(c);
  });
  if (contains.length === 1) return { status: "unique", rows: contains };
  if (contains.length > 1) return { status: "ambiguous", rows: contains };
  return { status: "none", rows: [] };
}

function formatDmy(ymd) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd || "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function buildExpectedNextAnswer(row) {
  return [
    `${row.cliente} compró por última vez el ${formatDmy(row.lastPurchaseDate)}.`,
    `Su frecuencia histórica es aproximadamente cada ${row.historical_frequency} días.`,
    `La siguiente compra esperada por ese patrón sería alrededor del ${formatDmy(row.expected_next)} (${row.expected_next}).`,
    "",
    "Es una estimación histórica / estimación basada en frecuencia histórica (last_purchase_date + freqDays), no un compromiso ni forecast contractual.",
  ].join("\n");
}

async function loadDicfClientsPhysical(db, plantLabel, opts = {}) {
  const runtime009 = require("./director-ia-purchase-evidence-enrichment-009");
  const enrich = (rows) =>
    runtime009.enrichDicfClientsLastPurchase(rows || [], {
      db: opts.db || db,
      plantCodes: opts.plantCodes,
      now: opts.now,
      dicfCacheRows: opts.dicfCacheRows,
      ventasMaxByClient: opts.ventasMaxByClient,
    });
  if (Array.isArray(opts.dicfRows) && opts.dicfRows.length) {
    return enrich(opts.dicfRows);
  }
  if (opts.computeDicf && (db || opts.allowComputeWithoutDb)) {
    try {
      const raw = await opts.computeDicf(db, opts.arrPlantCode || plantLabel, plantLabel, opts.getMargenKgPorPeriodo);
      const flat = flattenDicfClients(raw);
      if (flat.length) return enrich(flat);
    } catch (_e) {
      /* fallback cache */
    }
  }
  if (db && typeof db.query === "function" && opts.plantCodes && opts.plantCodes.length) {
    const year = opts.now ? opts.now.getFullYear() : new Date().getFullYear();
    const month = opts.now ? opts.now.getMonth() + 1 : new Date().getMonth() + 1;
    try {
      const cached = await db.query(
        `SELECT cliente_norm AS cliente, freq_days AS "freqDays", days_since_last AS "daysSinceLast",
                last_date AS "lastPurchaseDate"
           FROM arr.dicf_cliente_mes
          WHERE UPPER(TRIM(plant_code)) = ANY($1::text[])
            AND year = $2 AND month = $3`,
        [opts.plantCodes.map((c) => String(c).toUpperCase()), year, month]
      );
      const mapped = (cached.rows || []).map((r) => ({
        cliente: r.cliente,
        freqDays: Number(r.freqDays),
        lastPurchaseDate: r.lastPurchaseDate ? String(r.lastPurchaseDate).slice(0, 10) : null,
        daysSinceLast: Number(r.daysSinceLast),
      }));
      return enrich(mapped);
    } catch (_e) {
      return [];
    }
  }
  return [];
}

module.exports = {
  FAMILY_IDS,
  nq,
  isRegulationStatusQuestion,
  isRegulationPlantDetailQuestion,
  classifyRegulationFamily,
  isTallerExpenseQuestion,
  isTallerExpenseFollowUp,
  scoreSehOperacion,
  sehOperacionRowFilled,
  sehOperacionRowCumple,
  loadSehRegulationForChat,
  buildSehRegulationAnswer,
  buildLegalDetailAnswer,
  classifyLegalBucket,
  wantedLegalBucket,
  enrichExpensePeriod,
  flattenDicfClients,
  matchExpectedClients,
  buildExpectedNextAnswer,
  loadDicfClientsPhysical,
  formatDmy,
};
