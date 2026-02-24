/**
 * IGF handler para folio-whatsapp-bot
 * Responde preguntas sobre Compromiso IGF usando el esquema igf en la misma base de datos.
 * Consultas: margen por planta, deltas/cambios, resumen, top 10.
 */

"use strict";

/** Quita tildes para comparación sin acentos. */
function quitarTildes(s) {
  if (!s || typeof s !== "string") return "";
  return s
    .normalize("NFD")
    .replace(/\u0301/g, "")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Texto normalizado para detección: minúsculas, sin tildes. */
function textoParaDeteccion(texto) {
  return quitarTildes(String(texto || "").toLowerCase().trim());
}

/** Palabras clave que indican una pregunta IGF. */
const IGF_KEYWORDS = [
  "igf",
  "compromiso",
  "margen",
  "puebla",
  "rentabilidad",
  "cargo planta",
  "corporativo",
  "corp",
  "delta",
  "como cambio",   // "cómo cambió" sin tilde; para "Como cambio Morelos", etc.
  "resumen igf",
  "como esta puebla",
  "cómo está puebla",
  "totales igf",
  "top 10",
  "mayor variacion",
  "mayor variación",
];

/**
 * Devuelve true si el mensaje parece una pregunta sobre IGF.
 * @param {string} texto - Mensaje del usuario (puede ser en cualquier formato).
 */
function esPreguntaIGF(texto) {
  const t = textoParaDeteccion(texto);
  if (!t) return false;
  return IGF_KEYWORDS.some((kw) => t.includes(kw));
}

/**
 * Extrae nombre de planta del mensaje (ej. "puebla", "gt puebla") para usar en ILIKE.
 * Solo para consultas que no son "margen X"; en "margen X" usamos extraerPlantaDespuesDeMargen.
 */
function extraerNombrePlanta(texto) {
  const t = textoParaDeteccion(texto);
  const match = t.match(/\b(puebla|cdmx|monterrey|guadalajara|queretaro|querétaro|leon|león|merida|mérida|morelos)\b/);
  return match ? match[1] : null;
}

/**
 * Si el mensaje es tipo "margen X" o "margen X Y", devuelve "X" o "X Y" para buscar en empresa (cualquier planta).
 * Así "Margen Morelos" -> "morelos", "margen gt puebla" -> "gt puebla".
 */
function extraerPlantaDespuesDeMargen(textoNormalizado) {
  if (!textoNormalizado || typeof textoNormalizado !== "string") return null;
  const match = textoNormalizado.match(/margen\s+(.+)/);
  const term = match ? match[1].trim() : null;
  return term && term.length > 0 ? term : null;
}

/**
 * Si el mensaje es tipo "cómo cambió X", "como cambio X" o "delta X", devuelve "X" (cualquier planta).
 * Puede incluir "vs v2", "comparar con v5", "vs mes anterior" al final; se recorta para dejar solo el nombre de planta.
 * Texto normalizado ya sin tildes, así "cómo cambió" -> "como cambio".
 */
function extraerPlantaDespuesDeCambio(textoNormalizado) {
  if (!textoNormalizado || typeof textoNormalizado !== "string") return null;
  const match = textoNormalizado.match(/(?:como\s+cambio|delta)\s+(.+)/);
  let term = match ? match[1].trim() : null;
  if (!term) return null;
  // Quitar sufijos "vs v3", "comparar con v2", "vs v.5", "vs mes anterior", "comparar mes anterior", "vs v2 mes anterior"
  term = term
    .replace(/\s+vs\s+v\.?\s*\d+\s*(mes\s+anterior)?\s*$/i, "")
    .replace(/\s+vs\s+mes\s+anterior\s*$/i, "")
    .replace(/\s+comparar\s+(con\s+)?v\.?\s*\d+\s*(mes\s+anterior)?\s*$/i, "")
    .replace(/\s+comparar\s+mes\s+anterior\s*$/i, "")
    .trim();
  return term.length > 0 ? term : null;
}

/**
 * Parsea con qué versión comparar desde el mensaje normalizado.
 * Devuelve { tipo: 'anterior'|'mismo_mes'|'mes_anterior', versionNumber?: number } o null si no hay "vs".
 * - "vs v2" / "comparar con v5" -> { tipo: 'mismo_mes', versionNumber: 2 o 5 }
 * - "vs mes anterior" / "comparar mes anterior" -> { tipo: 'mes_anterior' } (última versión del mes anterior)
 * - "vs v2 mes anterior" -> { tipo: 'mes_anterior', versionNumber: 2 }
 * - Sin "vs" -> null (comportamiento por defecto: deltas de la vista)
 */
function parsearComparacionVersión(textoNormalizado) {
  if (!textoNormalizado || typeof textoNormalizado !== "string") return null;
  const t = textoNormalizado;
  // vs v2 mes anterior / comparar con v2 mes anterior
  const vsVnMesAnterior = t.match(/(?:vs|comparar\s+(?:con\s+)?)v\.?\s*(\d+)\s*mes\s+anterior/i);
  if (vsVnMesAnterior) return { tipo: "mes_anterior", versionNumber: parseInt(vsVnMesAnterior[1], 10) };
  // vs mes anterior / comparar mes anterior
  if (/\b(?:vs|comparar)\s+mes\s+anterior\b/i.test(t)) return { tipo: "mes_anterior" };
  // vs v2 / comparar con v5 / vs v.3
  const vsVn = t.match(/(?:vs|comparar\s+(?:con\s+)?)v\.?\s*(\d+)\b/i);
  if (vsVn) return { tipo: "mismo_mes", versionNumber: parseInt(vsVn[1], 10) };
  return null;
}

/**
 * Ejecuta la consulta adecuada al esquema igf y devuelve texto formateado para WhatsApp.
 * @param {object} client - Cliente pg (ya conectado).
 * @param {string} texto - Mensaje del usuario en minúsculas/normalizado.
 * @returns {Promise<string>} Mensaje listo para enviar por WhatsApp.
 */
async function consultarIGF(client, texto) {
  const t = textoParaDeteccion(texto);

  try {
    // A) Margen actual de una planta: "margen Puebla", "margen Morelos", "Margen GT Puebla", etc.
    if (t.includes("margen")) {
      const nombreBusqueda = extraerPlantaDespuesDeMargen(t);
      if (!nombreBusqueda) {
        return "IGF – Indica la planta. Ejemplos: margen Puebla, margen Morelos, margen GT Puebla.";
      }
      const res = await client.query(
        `SELECT c.empresa, c.margen_kg, c.venta_ton,
                (c.margen_kg * c.venta_ton * 1000) AS margen_mxn
         FROM igf.versions v
         JOIN igf.compromiso_lines c ON c.version_id = v.id
         WHERE v.plant_code = 'GLOBAL'
           AND v.is_current = true
           AND c.empresa ILIKE $1`,
        ["%" + nombreBusqueda + "%"]
      );
      const rows = res.rows || [];
      if (rows.length === 0) return "IGF – No hay datos de margen para esa planta en la versión actual.";
      const r = rows[0];
      const margenKg = r.margen_kg != null ? Number(r.margen_kg).toFixed(2) : "-";
      const margenMxn = r.margen_mxn != null ? Number(r.margen_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
      return `IGF – Margen ${r.empresa || nombreBusqueda} (actual): ${margenKg} $/kg. Margen en pesos: ${margenMxn} MXN.`;
    }

    // B) Cómo cambió una planta (deltas): "cómo cambió Puebla", "delta Morelos", "cómo cambió Puebla vs v2", "vs mes anterior"
    if (t.includes("como cambio") || t.includes("delta")) {
      const nombreBusqueda = extraerPlantaDespuesDeCambio(t);
      if (!nombreBusqueda) {
        return "IGF – Indica la planta. Ejemplos: cómo cambió Puebla, cómo cambió Puebla vs v2, cómo cambió Puebla vs mes anterior.";
      }
      const comparacion = parsearComparacionVersión(t);

      if (!comparacion) {
        // Comportamiento por defecto: deltas de la vista (última vs anterior)
        const res = await client.query(
          `SELECT empresa, year, month, version_number,
                  cargo_planta_mxn, delta_cargo_planta_mxn, cambio_cargo_planta,
                  corp_mxn, delta_corp_mxn, cambio_corp
           FROM igf.v_compromiso_analisis_detalle
           WHERE empresa ILIKE $1
           ORDER BY year DESC, month DESC, version_number DESC
           LIMIT 2`,
          ["%" + nombreBusqueda + "%"]
        );
        const rows = res.rows || [];
        if (rows.length === 0) return "IGF – No hay datos de cambios (deltas) para esa planta.";
        const r = rows[0];
        const cargoDir = (r.cambio_cargo_planta || "").trim().toUpperCase() || "—";
        const corpDir = (r.cambio_corp || "").trim().toUpperCase() || "—";
        const deltaCargo = r.delta_cargo_planta_mxn != null ? Number(r.delta_cargo_planta_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
        const deltaCorp = r.delta_corp_mxn != null ? Number(r.delta_corp_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
        return `IGF – ${r.empresa || nombreBusqueda}: Cargo planta ${cargoDir} ${deltaCargo} MXN. Corporativo ${corpDir} ${deltaCorp} MXN. (Para elegir versión: "cómo cambió Puebla vs v2" o "vs mes anterior".)`;
      }

      // Comparación explícita: última vs la que eligió (mismo mes o mes anterior)
      const resumenCur = await client.query(
        `SELECT year, month, version_number FROM igf.v_compromiso_analisis_resumen
         ORDER BY year DESC, month DESC, version_number DESC LIMIT 1`
      );
      const cur = resumenCur.rows && resumenCur.rows[0] ? resumenCur.rows[0] : null;
      if (!cur) return "IGF – No hay versión actual en el resumen.";

      let yearOtra = cur.year;
      let monthOtra = cur.month;
      let versionOtra = comparacion.versionNumber != null ? comparacion.versionNumber : null;

      if (comparacion.tipo === "mes_anterior") {
        const resumenPrev = await client.query(
          `SELECT year, month FROM (
             SELECT DISTINCT year, month FROM igf.v_compromiso_analisis_resumen
             ORDER BY year DESC, month DESC LIMIT 2
           ) m ORDER BY year DESC, month DESC OFFSET 1 LIMIT 1`
        );
        const prev = resumenPrev.rows && resumenPrev.rows[0] ? resumenPrev.rows[0] : null;
        if (!prev) return "IGF – No hay datos del mes anterior para comparar.";
        yearOtra = prev.year;
        monthOtra = prev.month;
        if (versionOtra == null) {
          const maxV = await client.query(
            `SELECT MAX(version_number) AS mv FROM igf.v_compromiso_analisis_resumen WHERE year = $1 AND month = $2`,
            [yearOtra, monthOtra]
          );
          versionOtra = (maxV.rows && maxV.rows[0] && maxV.rows[0].mv != null) ? parseInt(maxV.rows[0].mv, 10) : 1;
        }
      } else {
        // mismo_mes: comparar con v.X del mismo año/mes
        if (versionOtra == null) versionOtra = Math.max(1, (cur.version_number != null ? parseInt(cur.version_number, 10) : 1) - 1);
      }

      const fmt = (n) => (n != null && !isNaN(Number(n)) ? Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-");
      const rowActual = await client.query(
        `SELECT empresa, year, month, version_number, cargo_planta_mxn, corp_mxn
         FROM igf.v_compromiso_analisis_detalle
         WHERE empresa ILIKE $1 AND year = $2 AND month = $3 AND version_number = $4
         LIMIT 1`,
        ["%" + nombreBusqueda + "%", cur.year, cur.month, cur.version_number]
      );
      const rowOtra = await client.query(
        `SELECT empresa, year, month, version_number, cargo_planta_mxn, corp_mxn
         FROM igf.v_compromiso_analisis_detalle
         WHERE empresa ILIKE $1 AND year = $2 AND month = $3 AND version_number = $4
         LIMIT 1`,
        ["%" + nombreBusqueda + "%", yearOtra, monthOtra, versionOtra]
      );
      const rActual = rowActual.rows && rowActual.rows[0] ? rowActual.rows[0] : null;
      const rOtra = rowOtra.rows && rowOtra.rows[0] ? rowOtra.rows[0] : null;
      if (!rActual) return "IGF – No hay datos de esa planta en la versión actual.";
      if (!rOtra) return `IGF – No hay datos de esa planta en la versión a comparar (${yearOtra}/${monthOtra} v.${versionOtra}).`;
      const cargoActual = rActual.cargo_planta_mxn != null ? Number(rActual.cargo_planta_mxn) : null;
      const cargoOtra = rOtra.cargo_planta_mxn != null ? Number(rOtra.cargo_planta_mxn) : null;
      const corpActual = rActual.corp_mxn != null ? Number(rActual.corp_mxn) : null;
      const corpOtra = rOtra.corp_mxn != null ? Number(rOtra.corp_mxn) : null;
      const deltaCargo = (cargoActual != null && cargoOtra != null) ? cargoActual - cargoOtra : null;
      const deltaCorp = (corpActual != null && corpOtra != null) ? corpActual - corpOtra : null;
      const dirCargo = deltaCargo != null ? (deltaCargo >= 0 ? "SUBIÓ" : "BAJÓ") : "—";
      const dirCorp = deltaCorp != null ? (deltaCorp >= 0 ? "SUBIÓ" : "BAJÓ") : "—";
      const labelOtra = comparacion.tipo === "mes_anterior"
        ? `${yearOtra}/${monthOtra} v.${versionOtra}`
        : `v.${versionOtra} (${cur.year}/${cur.month})`;
      return (
        `IGF – ${rActual.empresa || nombreBusqueda}\n` +
        `Última (${cur.year}/${cur.month} v.${cur.version_number}) vs ${labelOtra}.\n` +
        `Cargo planta: ${dirCargo} ${fmt(deltaCargo)} MXN.\n` +
        `Corporativo: ${dirCorp} ${fmt(deltaCorp)} MXN.`
      );
    }

    // C) Resumen por versión (totales)
    if (t.includes("resumen") || t.includes("totales")) {
      const res = await client.query(
        `SELECT year, month, version_number, total_cargo_planta_mxn, total_corp_mxn,
                delta_cargo_planta_mxn, delta_corp_mxn
         FROM igf.v_compromiso_analisis_resumen
         ORDER BY year DESC, month DESC, version_number DESC
         LIMIT 5`
      );
      const rows = res.rows || [];
      if (rows.length === 0) return "IGF – No hay datos de resumen.";
      const r = rows[0];
      const cargo = r.total_cargo_planta_mxn != null ? Number(r.total_cargo_planta_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
      const corp = r.total_corp_mxn != null ? Number(r.total_corp_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
      const dCargo = r.delta_cargo_planta_mxn != null ? Number(r.delta_cargo_planta_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
      const dCorp = r.delta_corp_mxn != null ? Number(r.delta_corp_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
      return `IGF – Última versión: ${r.year}/${r.month} v.${r.version_number}. Cargo planta total: ${cargo} MXN. Corp: ${corp} MXN. Deltas: Cargo ${dCargo}, Corp ${dCorp}.`;
    }

    // D) Top 10 mayor variación
    if (t.includes("top 10") || t.includes("mayor variacion") || t.includes("mayor variación")) {
      const resVersion = await client.query(
        `SELECT id FROM igf.versions WHERE is_current = true AND plant_code = 'GLOBAL' LIMIT 1`
      );
      const versionId = resVersion.rows && resVersion.rows[0] ? resVersion.rows[0].id : null;
      if (!versionId) return "IGF – No hay versión actual para Top 10.";
      const res = await client.query(
        `SELECT empresa, delta_cargo_planta_mxn, cambio_cargo_planta
         FROM igf.v_compromiso_analisis_top10
         WHERE version_id = $1
         ORDER BY rn
         LIMIT 10`,
        [versionId]
      );
      const rows = res.rows || [];
      if (rows.length === 0) return "IGF – No hay datos Top 10 para la versión actual.";
      const lines = ["IGF – Top 10 mayor variación (cargo planta):"];
      rows.forEach((r, i) => {
        const delta = r.delta_cargo_planta_mxn != null ? Number(r.delta_cargo_planta_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
        const cambio = (r.cambio_cargo_planta || "").trim() || "—";
        lines.push(`${i + 1}. ${r.empresa || "?"}: ${cambio} ${delta} MXN`);
      });
      return lines.join("\n");
    }

    // E) Solo nombre de planta (ej. "Puebla", "Morelos"): devolver deltas de esa planta, NO totales globales
    const soloPalabras = /^[\w\sáéíóúüñ\-]+$/i.test(t.replace(/[\u0300-\u036f]/g, ""));
    const posiblePlanta = t.length >= 2 && t.length <= 50 && soloPalabras && !/^\d+$/.test(t);
    if (posiblePlanta && !t.includes("resumen") && !t.includes("totales") && !t.includes("top 10")) {
      const nombreBusqueda = t.trim();
      const res = await client.query(
        `SELECT empresa, year, month, version_number,
                cargo_planta_mxn, delta_cargo_planta_mxn, cambio_cargo_planta,
                corp_mxn, delta_corp_mxn, cambio_corp
         FROM igf.v_compromiso_analisis_detalle
         WHERE empresa ILIKE $1
         ORDER BY year DESC, month DESC, version_number DESC
         LIMIT 2`,
        ["%" + nombreBusqueda + "%"]
      );
      const rows = res.rows || [];
      if (rows.length > 0) {
        const r = rows[0];
        const cargoDir = (r.cambio_cargo_planta || "").trim().toUpperCase() || "—";
        const corpDir = (r.cambio_corp || "").trim().toUpperCase() || "—";
        const deltaCargo = r.delta_cargo_planta_mxn != null ? Number(r.delta_cargo_planta_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
        const deltaCorp = r.delta_corp_mxn != null ? Number(r.delta_corp_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
        return `IGF – Cambios (deltas) ${r.empresa || nombreBusqueda}: Cargo planta ${cargoDir} ${deltaCargo} MXN. Corporativo ${corpDir} ${deltaCorp} MXN.`;
      }
    }

    // Pregunta IGF genérica: devolver resumen reciente (totales de la versión, no por planta)
    const res = await client.query(
      `SELECT year, month, version_number, total_cargo_planta_mxn, total_corp_mxn,
              delta_cargo_planta_mxn, delta_corp_mxn
       FROM igf.v_compromiso_analisis_resumen
       ORDER BY year DESC, month DESC, version_number DESC
       LIMIT 1`
    );
    const rows = res.rows || [];
    if (rows.length === 0) return "IGF – No hay datos para esa consulta. Prueba: margen puebla, cómo cambió puebla, resumen igf, top 10.";
    const r = rows[0];
    const cargo = r.total_cargo_planta_mxn != null ? Number(r.total_cargo_planta_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
    const corp = r.total_corp_mxn != null ? Number(r.total_corp_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
    const dCargo = r.delta_cargo_planta_mxn != null ? Number(r.delta_cargo_planta_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
    const dCorp = r.delta_corp_mxn != null ? Number(r.delta_corp_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
    return `IGF – Última versión: ${r.year}/${r.month} v.${r.version_number}. Totales: Cargo planta ${cargo} MXN, Corp ${corp} MXN. Deltas versión: Cargo ${dCargo}, Corp ${dCorp}. (Para una planta: "margen Puebla" o "cómo cambió Puebla".)`;
  } catch (err) {
    console.error("[IGF] consultarIGF error:", err.message);
    return "IGF – No pude consultar los datos. Revisa que el esquema igf exista en la base.";
  }
}

/** Nombres de mes en español (minúsculas, sin tildes para coincidir con textoParaDeteccion). */
const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

/**
 * Lista de (year, month) disponibles en el resumen IGF, más recientes primero.
 * @param {object} client - Cliente pg.
 * @returns {Promise<Array<{year: number, month: number}>>}
 */
async function getMesesDisponibles(client) {
  const r = await client.query(
    `SELECT DISTINCT year, month FROM igf.v_compromiso_analisis_resumen
     ORDER BY year DESC, month DESC LIMIT 24`
  );
  return (r.rows || []).map((row) => ({
    year: row.year != null ? parseInt(row.year, 10) : null,
    month: row.month != null ? parseInt(row.month, 10) : null,
  })).filter((m) => m.year != null && m.month != null);
}

/**
 * Parsea la respuesta del usuario para "¿De qué mes?".
 * Acepta: "febrero", "2", "02", "2026/2", "2026-02", "febrero 2026".
 * @param {string} texto - Respuesta del usuario.
 * @param {Array<{year: number, month: number}>} mesesDisponibles - Lista de meses disponibles (getMesesDisponibles).
 * @returns {{ year: number, month: number } | null}
 */
function parseMesUsuario(texto, mesesDisponibles) {
  if (!texto || !mesesDisponibles || mesesDisponibles.length === 0) return null;
  const t = textoParaDeteccion(texto);
  // 2026/2 o 2026-2
  const yyyymm = t.match(/^(20\d{2})[\/\-](\d{1,2})$/);
  if (yyyymm) {
    const y = parseInt(yyyymm[1], 10);
    const m = parseInt(yyyymm[2], 10);
    if (y >= 2000 && y < 2100 && m >= 1 && m <= 12) {
      const found = mesesDisponibles.find((mes) => mes.year === y && mes.month === m);
      if (found) return found;
      return { year: y, month: m };
    }
  }
  // Solo número 1..12 = mes (usar año del primer mes disponible = más reciente)
  const soloNum = t.match(/^(\d{1,2})$/);
  if (soloNum) {
    const m = parseInt(soloNum[1], 10);
    if (m >= 1 && m <= 12) {
      const found = mesesDisponibles.find((mes) => mes.month === m);
      if (found) return found;
    }
  }
  // Nombre del mes
  for (let i = 0; i < MESES_ES.length; i++) {
    if (t.includes(MESES_ES[i]) || t === String(i + 1)) {
      const mesNum = i + 1;
      const found = mesesDisponibles.find((mes) => mes.month === mesNum);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Cuenta y lista versiones de un mes en el resumen IGF.
 * @param {object} client - Cliente pg.
 * @param {number} year - Año.
 * @param {number} month - Mes.
 * @returns {Promise<{ count: number, versiones: number[] }>}
 */
async function getVersionesDelMes(client, year, month) {
  const r = await client.query(
    `SELECT version_number FROM igf.v_compromiso_analisis_resumen
     WHERE year = $1 AND month = $2 ORDER BY version_number ASC`,
    [year, month]
  );
  const versiones = (r.rows || []).map((row) => parseInt(row.version_number, 10)).filter((n) => !isNaN(n));
  const uniq = [...new Set(versiones)];
  return { count: uniq.length, versiones: uniq.sort((a, b) => a - b) };
}

/**
 * Ejecuta la comparación: última versión (actual) vs (yearOtra, monthOtra, versionOtra) para la planta.
 * @param {object} client - Cliente pg.
 * @param {string} nombrePlanta - Nombre de planta para ILIKE.
 * @param {number} yearOtra - Año de la versión a comparar.
 * @param {number} monthOtra - Mes de la versión a comparar.
 * @param {number} versionOtra - Número de versión a comparar.
 * @param {string} tipoSalida - 'cargo' | 'corp' | 'ambos': qué deltas incluir en el resultado.
 * @returns {Promise<string>} Mensaje formateado para WhatsApp.
 */
async function ejecutarComparacion(client, nombrePlanta, yearOtra, monthOtra, versionOtra, tipoSalida = "ambos") {
  const resumenCur = await client.query(
    `SELECT year, month, version_number FROM igf.v_compromiso_analisis_resumen
     ORDER BY year DESC, month DESC, version_number DESC LIMIT 1`
  );
  const cur = resumenCur.rows && resumenCur.rows[0] ? resumenCur.rows[0] : null;
  if (!cur) return "IGF – No hay versión actual en el resumen.";
  const fmt = (n) => (n != null && !isNaN(Number(n)) ? Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-");
  const rowActual = await client.query(
    `SELECT empresa, cargo_planta_mxn, corp_mxn FROM igf.v_compromiso_analisis_detalle
     WHERE empresa ILIKE $1 AND year = $2 AND month = $3 AND version_number = $4 LIMIT 1`,
    ["%" + nombrePlanta + "%", cur.year, cur.month, cur.version_number]
  );
  const rowOtra = await client.query(
    `SELECT empresa, cargo_planta_mxn, corp_mxn FROM igf.v_compromiso_analisis_detalle
     WHERE empresa ILIKE $1 AND year = $2 AND month = $3 AND version_number = $4 LIMIT 1`,
    ["%" + nombrePlanta + "%", yearOtra, monthOtra, versionOtra]
  );
  const rActual = rowActual.rows && rowActual.rows[0] ? rowActual.rows[0] : null;
  const rOtra = rowOtra.rows && rowOtra.rows[0] ? rowOtra.rows[0] : null;
  if (!rActual) return "IGF – No hay datos de esa planta en la versión actual.";
  if (!rOtra) return `IGF – No hay datos de esa planta en ${yearOtra}/${monthOtra} v.${versionOtra}.`;
  const cargoActual = rActual.cargo_planta_mxn != null ? Number(rActual.cargo_planta_mxn) : null;
  const cargoOtra = rOtra.cargo_planta_mxn != null ? Number(rOtra.cargo_planta_mxn) : null;
  const corpActual = rActual.corp_mxn != null ? Number(rActual.corp_mxn) : null;
  const corpOtra = rOtra.corp_mxn != null ? Number(rOtra.corp_mxn) : null;
  const deltaCargo = (cargoActual != null && cargoOtra != null) ? cargoActual - cargoOtra : null;
  const deltaCorp = (corpActual != null && corpOtra != null) ? corpActual - corpOtra : null;
  const dirCargo = deltaCargo != null ? (deltaCargo >= 0 ? "SUBIÓ" : "BAJÓ") : "—";
  const dirCorp = deltaCorp != null ? (deltaCorp >= 0 ? "SUBIÓ" : "BAJÓ") : "—";

  const cabecera = `IGF – ${rActual.empresa || nombrePlanta}\nÚltima (${cur.year}/${cur.month} v.${cur.version_number}) vs ${yearOtra}/${monthOtra} v.${versionOtra}.`;
  const lineas = [];
  if (tipoSalida === "cargo" || tipoSalida === "ambos") {
    lineas.push(`• Cargo planta: ${dirCargo} ${fmt(deltaCargo)} MXN`);
  }
  if (tipoSalida === "corp" || tipoSalida === "ambos") {
    lineas.push(`• Gasto corporativo: ${dirCorp} ${fmt(deltaCorp)} MXN`);
  }
  return lineas.length > 0 ? `${cabecera}\n\nDeltas:\n${lineas.join("\n")}` : cabecera;
}

/**
 * Parsea la respuesta del usuario para "¿Cargo planta o gasto corporativo?".
 * Acepta: 1, 2, 3, "cargo planta", "cargo", "gasto corporativo", "corporativo", "corp", "ambos", "los dos".
 * @returns {'cargo'|'corp'|'ambos'|null}
 */
function parseTipoResultado(texto) {
  if (!texto || typeof texto !== "string") return null;
  const t = textoParaDeteccion(texto);
  if (/^[123]$/.test(t)) {
    if (t === "1") return "cargo";
    if (t === "2") return "corp";
    if (t === "3") return "ambos";
  }
  if (t.includes("cargo") && !t.includes("corporativo")) return "cargo";
  if (t.includes("corporativo") || t.includes("corp") || (t.includes("gasto") && t.includes("corp"))) return "corp";
  if (t.includes("ambos") || t.includes("los dos") || t.includes("ambas")) return "ambos";
  return null;
}

/**
 * Indica si el mensaje es "cómo cambió X" o "delta X" SIN indicar versión (vs v2, vs mes anterior, etc.).
 * En ese caso se debe iniciar el flujo de preguntas (mes → versión).
 */
function esCompararSinVersión(texto) {
  const t = textoParaDeteccion(texto);
  if (!t.includes("como cambio") && !t.includes("delta")) return false;
  if (parsearComparacionVersión(t)) return false; // ya tiene vs v2 / vs mes anterior
  return !!extraerPlantaDespuesDeCambio(t);
}

module.exports = {
  esPreguntaIGF,
  consultarIGF,
  quitarTildes,
  textoParaDeteccion,
  extraerPlantaDespuesDeCambio,
  parsearComparacionVersión,
  getMesesDisponibles,
  parseMesUsuario,
  getVersionesDelMes,
  ejecutarComparacion,
  parseTipoResultado,
  esCompararSinVersión,
};
