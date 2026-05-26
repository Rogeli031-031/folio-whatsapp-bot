/**
 * Reduce peso de fotos embebidas en Excel (EVIDENCIAS / Action Register).
 * Requiere `sharp` (opcional: si falla la carga, devuelve el buffer original).
 */

let sharpMod = null;
try {
  sharpMod = require("sharp");
} catch (_) {
  sharpMod = null;
}

const DEFAULT_MAX_WIDTH = 720;
const DEFAULT_MAX_HEIGHT = 540;
const DEFAULT_JPEG_QUALITY = 72;

/**
 * @param {Buffer|null|undefined} buffer
 * @param {string} [contentType]
 * @param {{ maxWidth?: number, maxHeight?: number, jpegQuality?: number }} [opts]
 * @returns {Promise<{ buffer: Buffer, extension: 'jpeg'|'png'|'gif' }|null>}
 */
async function compressImageForExcel(buffer, contentType, opts = {}) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  const ct = String(contentType || "").toLowerCase();
  const maxWidth = opts.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = opts.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const jpegQuality = opts.jpegQuality ?? DEFAULT_JPEG_QUALITY;

  if (!sharpMod) {
    const ext = ct.includes("png") ? "png" : ct.includes("gif") ? "gif" : "jpeg";
    return { buffer, extension: ext };
  }

  try {
    if (ct.includes("gif")) {
      const outGif = await sharpMod(buffer, { animated: false, failOn: "none" })
        .rotate()
        .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true })
        .gif()
        .toBuffer();
      return { buffer: outGif, extension: "gif" };
    }

    const base = sharpMod(buffer, { failOn: "none" });
    const meta = await base.metadata().catch(() => ({}));
    const pipeline = base
      .rotate()
      .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true });

    if (meta.hasAlpha) {
      const outPng = await pipeline
        .png({ compressionLevel: 8, palette: true, quality: 80 })
        .toBuffer();
      return { buffer: outPng, extension: "png" };
    }

    const outJpeg = await pipeline.jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer();
    return { buffer: outJpeg, extension: "jpeg" };
  } catch (e) {
    console.warn("[excel-image-compress]", e.message || e);
    const ext = ct.includes("png") ? "png" : ct.includes("gif") ? "gif" : "jpeg";
    return { buffer, extension: ext };
  }
}

/**
 * Incrusta foto comprimida en columna «Foto» (col D) de la hoja EVIDENCIAS.
 * @param {import('exceljs').Workbook} wb
 * @param {import('exceljs').Worksheet} wsE
 * @param {import('exceljs').Row} row
 */
async function embedExcelEvidencePhoto(wb, wsE, row, rawBuf, contentType) {
  const compressed = await compressImageForExcel(rawBuf, contentType);
  if (!compressed?.buffer?.length) {
    row.getCell("foto").value = "(no disponible)";
    return;
  }
  const imageId = wb.addImage({
    buffer: compressed.buffer,
    extension: compressed.extension,
  });
  wsE.addImage(imageId, {
    tl: { col: 3.05, row: row.number - 1 + 0.05 },
    ext: { width: 220, height: 160 },
    editAs: "oneCell",
  });
}

module.exports = { compressImageForExcel, embedExcelEvidencePhoto };
