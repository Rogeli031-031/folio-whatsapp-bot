"use strict";

const FONT_FAMILY = "NotoSans";
const SVG_PX_TO_PT = 72 / 96;
const PDF_MAX_USER_UNIT = 14400;

function assertControlledSvg(svgText) {
  const text = String(svgText || "");
  if (!text.includes("<svg") || !text.includes("</svg>")) {
    throw new Error("La gráfica no produjo un SVG válido");
  }
  if (/<script\b|<foreignObject\b|<image\b|<iframe\b/i.test(text)) {
    throw new Error("El SVG de exportación contiene recursos no permitidos");
  }
  if (/\b(?:href|src)\s*=\s*["']?\s*https?:/i.test(text) || /url\(\s*["']?\s*https?:/i.test(text)) {
    throw new Error("El SVG de exportación contiene recursos no permitidos");
  }
  return text;
}

function pageBox(widthPx, heightPx) {
  let pageW = widthPx * SVG_PX_TO_PT;
  let pageH = heightPx * SVG_PX_TO_PT;
  const longest = Math.max(pageW, pageH);
  if (longest > PDF_MAX_USER_UNIT) {
    const scale = PDF_MAX_USER_UNIT / longest;
    pageW *= scale;
    pageH *= scale;
  }
  return {
    pageW,
    pageH,
    orientation: pageW > pageH ? "landscape" : "portrait",
  };
}

function binaryFromBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let out = "";
  const size = 8192;
  for (let index = 0; index < bytes.length; index += size) {
    out += String.fromCharCode.apply(null, bytes.subarray(index, index + size));
  }
  return out;
}

async function loadFace(pdf, url, fileName, style) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar la fuente del PDF");
  const bytes = await response.arrayBuffer();
  pdf.addFileToVFS(fileName, binaryFromBuffer(bytes));
  pdf.addFont(fileName, FONT_FAMILY, style, "Identity-H");
  return bytes;
}

async function ensureCanvasFont(weight, bytes) {
  if (!document.fonts || typeof FontFace !== "function") return;
  const face = new FontFace(FONT_FAMILY, bytes, { weight, style: "normal" });
  await face.load();
  document.fonts.add(face);
}

async function svgToExecutivePdf(svgText) {
  const source = assertControlledSvg(svgText);
  const [{ jsPDF }, svgModule] = await Promise.all([
    import("jspdf"),
    import("svg2pdf.js"),
  ]);
  const svg2pdf = svgModule.svg2pdf || svgModule.default;
  if (typeof svg2pdf !== "function") throw new Error("No está disponible la conversión vectorial");
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  if (parsed.querySelector("parsererror")) throw new Error("No se pudo leer el SVG de la gráfica");
  const svg = parsed.documentElement;
  const width = Number(svg.getAttribute("width"));
  const height = Number(svg.getAttribute("height"));
  if (!(width > 0) || !(height > 0)) throw new Error("La gráfica no tiene tamaño");
  const box = pageBox(width, height);
  const pdf = new jsPDF({
    unit: "pt",
    format: [box.pageW, box.pageH],
    orientation: box.orientation,
    compress: true,
    putOnlyUsedFonts: true,
  });
  const gotW = pdf.internal.pageSize.getWidth();
  const gotH = pdf.internal.pageSize.getHeight();
  if (Math.abs(gotW - box.pageW) > 0.6 || Math.abs(gotH - box.pageH) > 0.6) {
    throw new Error("El tamaño de página PDF no coincide con la gráfica");
  }
  const regular = await loadFace(pdf, "/fonts/NotoSans-Regular.ttf", "NotoSans-Regular.ttf", "normal");
  const bold = await loadFace(pdf, "/fonts/NotoSans-Bold.ttf", "NotoSans-Bold.ttf", "bold");
  await ensureCanvasFont("400", regular);
  await ensureCanvasFont("700", bold);
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  pdf.setFont(FONT_FAMILY, "normal");
  const host = document.createElement("div");
  host.setAttribute("data-pdf-export", "1");
  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.style.overflow = "hidden";
  host.style.pointerEvents = "none";
  host.style.opacity = "0";
  host.appendChild(document.importNode(svg, true));
  document.body.appendChild(host);
  const live = host.querySelector("svg");
  try {
    await svg2pdf(live, pdf, { x: 0, y: 0, width: box.pageW, height: box.pageH });
  } finally {
    host.remove();
  }
  const blob = pdf.output("blob");
  if (!(blob instanceof Blob) || blob.size < 8) throw new Error("El PDF generado está vacío");
  return blob;
}

module.exports = {
  FONT_FAMILY,
  SVG_PX_TO_PT,
  PDF_MAX_USER_UNIT,
  assertControlledSvg,
  pageBox,
  svgToExecutivePdf,
};
