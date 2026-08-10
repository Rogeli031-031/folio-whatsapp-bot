"use strict";

const SEH_CATEGORIAS = ["PLANTA", "PIPAS", "ESTACIONES", "SISTEMA CONTRA INCENDIO"];
const SEH_CAT_SCI = "SISTEMA CONTRA INCENDIO";
const SEH_COMPONENTES = ["EXTINTOR", "VALVULA", "MANGUERA"];

function sehIsSci(categoria) {
  return String(categoria || "").trim().toUpperCase() === SEH_CAT_SCI;
}

function sehNormalizeComponente(raw) {
  const c = String(raw || "").trim().toUpperCase();
  return SEH_COMPONENTES.includes(c) ? c : "";
}

/**
 * Parsea fecha de vencimiento.
 * Acepta YYYY-MM-DD, DD/MM/YYYY (México) y DD-MM-YYYY.
 * @param {unknown} raw
 * @returns {string|null} YYYY-MM-DD o null
 */
function sehParseVence(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // México: DD/MM/YYYY (o D/M/YYYY)
  const dmySlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmySlash) {
    const dd = parseInt(dmySlash[1], 10);
    const mm = parseInt(dmySlash[2], 10);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${dmySlash[3]}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    }
    return null;
  }

  // DD-MM-YYYY
  const dmyDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyDash) {
    const dd = parseInt(dmyDash[1], 10);
    const mm = parseInt(dmyDash[2], 10);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${dmyDash[3]}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    }
    return null;
  }

  return null;
}

/**
 * Limpia items del body PUT /api/seh para persistir en BD.
 * La foto es opcional: el texto/fecha debe guardarse aunque no haya imagen.
 * @param {unknown[]} rawItems
 * @param {string[]} scopeCats categorías permitidas (vacío = todas)
 */
function sehCleanPutItems(rawItems, scopeCats = []) {
  const hasScope = Array.isArray(scopeCats) && scopeCats.length > 0;
  const scope = hasScope
    ? [...new Set(scopeCats.map((c) => String(c || "").trim().toUpperCase()).filter((c) => SEH_CATEGORIAS.includes(c)))]
    : [];
  const cleaned = [];
  const list = Array.isArray(rawItems) ? rawItems : [];

  for (const it of list) {
    const categoria = String(it?.categoria || "").trim().toUpperCase();
    if (!SEH_CATEGORIAS.includes(categoria)) continue;
    if (scope.length && !scope.includes(categoria)) continue;

    const vence = sehParseVence(it?.vence);
    const sortOrder = Number.isFinite(Number(it?.sort_order))
      ? Math.max(0, Math.floor(Number(it.sort_order)))
      : cleaned.length;
    const idRaw = it?.id != null ? parseInt(String(it.id), 10) : null;
    const id = Number.isFinite(idRaw) ? idRaw : null;
    const fotoBase64 =
      typeof it?.foto_base64 === "string" && it.foto_base64.trim() ? String(it.foto_base64) : null;
    const wantsClearFoto = it?.clear_foto === true || it?.clear_foto === 1 || it?.clear_foto === "1";
    // Si hay foto nueva, gana el upload; clear solo aplica sin foto_base64.
    const clearFoto = Boolean(wantsClearFoto && !fotoBase64);
    const fotoFileName =
      it?.foto_file_name != null && String(it.foto_file_name).trim()
        ? String(it.foto_file_name).trim().slice(0, 200)
        : null;
    const fotoContentType =
      it?.foto_content_type != null && String(it.foto_content_type).trim()
        ? String(it.foto_content_type).trim()
        : null;

    if (sehIsSci(categoria)) {
      const nombre = String(it?.nombre || "").trim();
      // Sin datos de texto/fecha: omitir (si solo se borra la foto de un renglón vacío, el PUT lo elimina).
      if (!nombre && !vence && !fotoBase64) continue;
      cleaned.push({
        id,
        categoria,
        locacion: "",
        descripcion: "",
        componente: "",
        nombre,
        vence,
        sort_order: sortOrder,
        foto_base64: fotoBase64,
        foto_file_name: fotoBase64 ? fotoFileName : null,
        foto_content_type: fotoBase64 ? fotoContentType : null,
        clear_foto: clearFoto,
      });
      continue;
    }

    const locacion = String(it?.locacion || "").trim();
    const descripcion = String(it?.descripcion || "").trim();
    const componente = sehNormalizeComponente(it?.componente);
    if (!locacion && !descripcion && !componente && !vence && !fotoBase64) continue;
    cleaned.push({
      id,
      categoria,
      locacion,
      descripcion,
      componente,
      nombre: "",
      vence,
      sort_order: sortOrder,
      foto_base64: fotoBase64,
      foto_file_name: fotoBase64 ? fotoFileName : null,
      foto_content_type: fotoBase64 ? fotoContentType : null,
      clear_foto: clearFoto,
    });
  }

  return cleaned;
}

module.exports = {
  SEH_CATEGORIAS,
  SEH_CAT_SCI,
  SEH_COMPONENTES,
  sehIsSci,
  sehNormalizeComponente,
  sehParseVence,
  sehCleanPutItems,
};
