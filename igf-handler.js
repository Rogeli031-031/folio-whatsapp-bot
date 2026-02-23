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
 * Si no hay nombre reconocido, devuelve null (se usará consulta sin filtro de planta o resumen).
 */
function extraerNombrePlanta(texto) {
  const t = textoParaDeteccion(texto);
  const match = t.match(/\b(puebla|cdmx|monterrey|guadalajara|queretaro|querétaro|leon|león|merida|mérida)\b/);
  return match ? match[1] : null;
}

/**
 * Ejecuta la consulta adecuada al esquema igf y devuelve texto formateado para WhatsApp.
 * @param {object} client - Cliente pg (ya conectado).
 * @param {string} texto - Mensaje del usuario en minúsculas/normalizado.
 * @returns {Promise<string>} Mensaje listo para enviar por WhatsApp.
 */
async function consultarIGF(client, texto) {
  const t = textoParaDeteccion(texto);
  const planta = extraerNombrePlanta(texto);

  try {
    // A) Margen actual de una planta (ej. "margen puebla")
    if ((t.includes("margen") && (planta || t.includes("puebla"))) || (t.includes("margen") && t.includes("igf"))) {
      const nombreBusqueda = planta || "puebla";
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

    // B) Cómo cambió una planta (deltas)
    if ((t.includes("como cambio") || t.includes("cómo cambió") || t.includes("delta")) && (planta || t.includes("puebla"))) {
      const nombreBusqueda = planta || "puebla";
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
      return `IGF – ${r.empresa || nombreBusqueda}: Cargo planta ${cargoDir} ${deltaCargo} MXN. Corporativo ${corpDir} ${deltaCorp} MXN.`;
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

    // Pregunta IGF genérica: devolver resumen reciente
    const res = await client.query(
      `SELECT year, month, version_number, total_cargo_planta_mxn, total_corp_mxn
       FROM igf.v_compromiso_analisis_resumen
       ORDER BY year DESC, month DESC, version_number DESC
       LIMIT 1`
    );
    const rows = res.rows || [];
    if (rows.length === 0) return "IGF – No hay datos para esa consulta. Prueba: margen puebla, resumen igf, top 10.";
    const r = rows[0];
    const cargo = r.total_cargo_planta_mxn != null ? Number(r.total_cargo_planta_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
    const corp = r.total_corp_mxn != null ? Number(r.total_corp_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
    return `IGF – Última versión: ${r.year}/${r.month} v.${r.version_number}. Cargo planta: ${cargo} MXN. Corp: ${corp} MXN. (Escribe "margen puebla", "resumen igf" o "top 10" para más.)`;
  } catch (err) {
    console.error("[IGF] consultarIGF error:", err.message);
    return "IGF – No pude consultar los datos. Revisa que el esquema igf exista en la base.";
  }
}

module.exports = {
  esPreguntaIGF,
  consultarIGF,
  quitarTildes,
  textoParaDeteccion,
};
