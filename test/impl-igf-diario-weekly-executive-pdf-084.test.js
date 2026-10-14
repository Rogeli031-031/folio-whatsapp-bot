"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");
const zlib = require("node:zlib");

const chart = require("../frontend-dashboard/lib/igf-diario-weekly-executive-chart");
const pdf = require("../frontend-dashboard/lib/igf-diario-weekly-executive-pdf");

const ROOT = path.join(__dirname, "..");
const FRONT = path.join(ROOT, "frontend-dashboard");
const MODAL = fs.readFileSync(path.join(FRONT, "components", "IgfDiarioWeeklyExecutiveModal.tsx"), "utf8");
const CHART_SRC = fs.readFileSync(path.join(FRONT, "lib", "igf-diario-weekly-executive-chart.js"), "utf8");
const PDF_SRC = fs.readFileSync(path.join(FRONT, "lib", "igf-diario-weekly-executive-pdf.js"), "utf8");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EVIDENCE = path.join(ROOT, "docs", "dev-loop", "reports", "evidence-084");

function metrics(extra) {
  return {
    venta_kg: 1000,
    precio_kg: 12.5,
    margen_kg: 4.25,
    costo_kg: 6.1,
    flete_kg: 1.2,
    hg_mxn: -800,
    com_desc_kg: -3,
    resultado_mxn: 1500.5,
    gasto_corporativo_kg: 1,
    inversiones_kg: 1,
    impuestos_federales_kg: 1,
    presupuesto_nomina_gastos_kg: 1,
    presupuesto_imss_sua_kg: 1,
    extraordinarios_kg: 1,
    provisiones_planta_kg: 1,
    ...extra,
  };
}

function sevenDays(start, extra) {
  const days = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  for (let index = 0; index < 7; index += 1) {
    const fecha = cursor.toISOString().slice(0, 10);
    days.push({
      fecha,
      metrics: metrics({
        precio_kg: 12 + index * 0.1,
        venta_kg: 100 + index * 10,
        hg_mxn: -100 - index,
        ...extra,
      }),
      venta_casa_kg: 70 + index,
      venta_comisionista_kg: 30 + index,
      gasto_corporativo_mxn: 1000 + index,
      gasto_operativo_mxn: 500 + index,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function week(id, number, desde, hasta, extra) {
  return {
    id,
    week_number: number,
    fecha_desde: desde,
    fecha_hasta: hasta,
    metrics: metrics(extra),
    days: sevenDays(desde, extra),
    coverage_note: number === 41 ? "Cobertura parcial" : null,
  };
}

const AVAILABLE = [
  week("w40", 40, "2026-09-27", "2026-10-03", { resultado_mxn: 900, hg_mxn: -100 }),
  week("w41", 41, "2026-10-04", "2026-10-10", { resultado_mxn: 1500.5, hg_mxn: -800, com_desc_kg: -3, flete_kg: null }),
  week("w42", 42, "2026-10-11", "2026-10-17", { resultado_mxn: 1800.25, hg_mxn: -1200, com_desc_kg: -2.5 }),
  week("w43", 43, "2026-10-18", "2026-10-24", { resultado_mxn: 1100, hg_mxn: -900, com_desc_kg: -4 }),
  week("w44", 44, "2026-10-25", "2026-10-31", { resultado_mxn: 1300, hg_mxn: -700 }),
  week("w45", 45, "2026-11-01", "2026-11-07", { resultado_mxn: 1400, hg_mxn: -650 }),
];

function viewOf(scope, plant, ids) {
  return chart.buildExecutiveView({
    scope,
    plant,
    weeks: AVAILABLE,
    selectedIds: ids,
  });
}

function svgOf(view) {
  return chart.renderExecutiveSvg(view, {
    exportedAt: "14/10/2026, 13:00:00",
    fontFamily: "NotoSans",
  });
}

function downloadBody() {
  const start = MODAL.indexOf("async function download");
  const end = MODAL.indexOf("return (", start);
  assert.ok(start >= 0 && end > start);
  return MODAL.slice(start, end);
}

function money(value) {
  return value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

test("el nombre del PDF identifica planta o Todas y sanea el archivo", () => {
  const acapulco = viewOf("plant", "Acapulco", ["w41", "w42"]);
  assert.equal(chart.downloadName(acapulco), "IGF_Diario_Acapulco_2026-10-04_a_2026-10-17.pdf");
  const todas = viewOf("all", "Provincia", ["w41", "w42", "w43"]);
  assert.equal(chart.downloadName(todas), "IGF_Diario_Todas_2026-10-04_a_2026-10-24.pdf");
  const titled = chart.downloadName({
    title: "IGF Diario semanal · San Luis Potosí",
    weeks: [{ fecha_desde: "2026-10-04", fecha_hasta: "2026-10-10" }],
  });
  assert.equal(titled, "IGF_Diario_San_Luis_Potosi_2026-10-04_a_2026-10-10.pdf");
  assert.match(titled, /\.pdf$/);
  assert.doesNotMatch(titled, /[\\/:*?"<>|]/);
});

test("la descarga se bloquea sin semanas, durante la carga o si falló la carga", () => {
  assert.equal(chart.canExportExecutivePdf({ loading: true, loadError: null, exporting: false, weekCount: 2 }), false);
  assert.equal(chart.canExportExecutivePdf({ loading: false, loadError: "x", exporting: false, weekCount: 2 }), false);
  assert.equal(chart.canExportExecutivePdf({ loading: false, loadError: null, exporting: true, weekCount: 2 }), false);
  assert.equal(chart.canExportExecutivePdf({ loading: false, loadError: null, exporting: false, weekCount: 0 }), false);
  assert.equal(chart.canExportExecutivePdf({ loading: false, loadError: null, exporting: false, weekCount: 1 }), true);
});

test("un doble intento solo abre una exportación", () => {
  const gate = chart.createPdfExportGate();
  assert.equal(gate.tryBegin(), true);
  assert.equal(gate.tryBegin(), false);
  assert.equal(gate.isBusy(), true);
  gate.end();
  assert.equal(gate.tryBegin(), true);
});

test("el botón congela el view, pide PDF y no abre la impresión", () => {
  const body = downloadBody();
  assert.ok(body.indexOf("const snapshot = view") < body.indexOf("await"));
  assert.match(body, /renderExecutiveSvg\(snapshot,/);
  assert.match(body, /fontFamily:\s*"NotoSans"/);
  assert.doesNotMatch(body, /tooltip/);
  assert.match(body, /import\("@\/lib\/igf-diario-weekly-executive-pdf"\)/);
  assert.match(body, /application\/pdf/);
  assert.match(body, /downloadName\(snapshot\)/);
  assert.match(body, /tryBegin\(\)/);
  assert.ok(body.indexOf("tryBegin()") < body.indexOf("await"));
  assert.match(body, /setExportError/);
  assert.doesNotMatch(body, /setWeeks|setSelected|toBlob|image\/png|window\.print/);
  assert.match(MODAL, /Descargar PDF/);
  assert.match(MODAL, /Generando PDF…/);
  assert.match(MODAL, /data-download="pdf"/);
  assert.match(MODAL, /role="alert"/);
  assert.match(MODAL, /data-week-toggle="1"/);
  assert.match(MODAL, /data-close="executive"/);
  assert.match(MODAL, /data-point-tooltip="1"/);
  assert.match(MODAL, /data-executive-chart="fullscreen"/);
  assert.doesNotMatch(PDF_SRC, /import\("jspdf"\)[\s\S]{0,40}from "/);
  assert.match(PDF_SRC, /import\("jspdf"\)/);
  assert.match(PDF_SRC, /import\("svg2pdf\.js"\)/);
});

test("el SVG de exportación conserva símbolos, flechas vectoriales y semanas elegidas", () => {
  const view = viewOf("plant", "Acapulco", ["w41", "w42"]);
  const svg = svgOf(view);
  assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /Δ vs\. S41/);
  assert.match(svg, /—/);
  assert.match(svg, /Mié/);
  assert.match(svg, /Sáb/);
  assert.match(svg, /PÚBLICO/);
  assert.match(svg, /Pendiente/);
  assert.match(svg, /Cobertura parcial/);
  assert.match(svg, /data-arrow="up"|data-arrow="down"/);
  assert.match(svg, /<polygon data-arrow="down"/);
  assert.doesNotMatch(svg, /▲|▼/);
  assert.match(svg, /Semana 41/);
  assert.match(svg, /Semana 42/);
  assert.doesNotMatch(svg, /Semana 40/);
  assert.doesNotMatch(svg, /data-tooltip="open"/);
  assert.equal(svg.includes("data-frame-count=\"5\""), true);
  for (const frame of chart.FRAMES) assert.match(svg, new RegExp(frame.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const indicator of chart.INDICATORS) assert.match(svg, new RegExp(`data-indicator="${indicator.id}"`));
  const hg = view.indicators.find((item) => item.id === "hg");
  assert.equal(hg.columns[1].tone, "good");
  assert.match(svg, /data-indicator="hg"[\s\S]*data-arrow="down" points="[^"]+" fill="#34d399"/);
  const cd = view.indicators.find((item) => item.id === "com_desc");
  assert.equal(cd.columns[1].tone, "good");
  const width = Number(svg.match(/width="(\d+(?:\.\d+)?)"/)[1]);
  const height = Number(svg.match(/height="(\d+(?:\.\d+)?)"/)[1]);
  assert.equal(width, chart.gridWidth(2));
  assert.ok(height > 1500);
});

test("la página PDF respeta la proporción y el límite de la biblioteca", () => {
  const tall = pdf.pageBox(1680, 2018);
  assert.equal(tall.orientation, "portrait");
  assert.ok(Math.abs(tall.pageW / tall.pageH - 1680 / 2018) < 0.0001);
  const wide = pdf.pageBox(4000, 2018);
  assert.equal(wide.orientation, "landscape");
  assert.ok(Math.abs(wide.pageW / wide.pageH - 4000 / 2018) < 0.0001);
  const huge = pdf.pageBox(30000, 2018);
  assert.ok(huge.pageW <= pdf.PDF_MAX_USER_UNIT + 0.001);
  assert.ok(huge.pageH <= pdf.PDF_MAX_USER_UNIT);
  assert.ok(Math.abs(huge.pageW / huge.pageH - 30000 / 2018) < 0.0001);
});

test("el SVG controlado rechaza recursos externos y acepta su propio xmlns", () => {
  const ok = svgOf(viewOf("plant", "Acapulco", ["w41"]));
  assert.equal(pdf.assertControlledSvg(ok).includes("<svg"), true);
  assert.throws(() => pdf.assertControlledSvg("<svg></svg><script>1</script>"), /no permitidos/);
  assert.throws(() => pdf.assertControlledSvg('<svg><image href="https://evil.test/a.png"/></svg>'), /no permitidos/);
  assert.throws(() => pdf.assertControlledSvg("no es svg"), /SVG válido/);
});

test("una, dos, tres y todas las semanas del fixture arman la gráfica completa", () => {
  for (const ids of [["w41"], ["w41", "w42"], ["w41", "w42", "w43"], AVAILABLE.map((item) => item.id)]) {
    const svg = svgOf(viewOf("plant", "Acapulco", ids));
    assert.match(svg, new RegExp(`data-week-count="${ids.length}"`));
    assert.match(svg, /data-frame-count="5"/);
    assert.doesNotMatch(svg, ids.includes("w40") ? /a^/ : /Semana 40/);
  }
  const one = svgOf(viewOf("plant", "Acapulco", ["w41"]));
  assert.doesNotMatch(one, /Δ vs\./);
  const todas = svgOf(viewOf("all", "Provincia", ["w41", "w42", "w43"]));
  assert.match(todas, /IGF Diario semanal · Todas/);
  assert.match(CHART_SRC, /sense: "up"/);
  assert.match(CHART_SRC, /if \(indicator && indicator\.id === "hg"\) return delta < 0 \? "good" : "bad"/);
});

function inflateStreams(buffer) {
  const text = buffer.toString("latin1");
  const streams = [];
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf("stream", cursor);
    if (start < 0) break;
    let dataStart = start + "stream".length;
    if (text[dataStart] === "\r") dataStart += 1;
    if (text[dataStart] === "\n") dataStart += 1;
    const end = text.indexOf("endstream", dataStart);
    if (end < 0) break;
    let dataEnd = end;
    if (text[dataEnd - 1] === "\n") dataEnd -= 1;
    if (text[dataEnd - 1] === "\r") dataEnd -= 1;
    const slice = Buffer.from(text.slice(dataStart, dataEnd), "latin1");
    try {
      streams.push(zlib.inflateSync(slice).toString("latin1"));
    } catch {
      streams.push(slice.toString("latin1"));
    }
    cursor = end + "endstream".length;
  }
  return streams;
}

function decodeUtf16Hex(hex) {
  const bytes = hex.length % 4 === 0 ? hex : hex.padStart(Math.ceil(hex.length / 4) * 4, "0");
  let out = "";
  for (let index = 0; index < bytes.length; index += 4) {
    out += String.fromCharCode(parseInt(bytes.slice(index, index + 4), 16));
  }
  return out;
}

function cmapFrom(streams) {
  const map = new Map();
  for (const stream of streams) {
    const chars = stream.match(/beginbfchar[\s\S]*?endbfchar/g) || [];
    for (const block of chars) {
      for (const pair of block.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        map.set(pair[1].toUpperCase(), decodeUtf16Hex(pair[2]));
      }
    }
    const ranges = stream.match(/beginbfrange[\s\S]*?endbfrange/g) || [];
    for (const block of ranges) {
      for (const range of block.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        let src = parseInt(range[1], 16);
        const last = parseInt(range[2], 16);
        let dst = parseInt(range[3], 16);
        const width = range[1].length;
        for (; src <= last; src += 1, dst += 1) {
          map.set(src.toString(16).toUpperCase().padStart(width, "0"), String.fromCodePoint(dst));
        }
      }
    }
  }
  return map;
}

function pdfText(buffer) {
  const streams = inflateStreams(buffer);
  const map = cmapFrom(streams);
  let text = "";
  for (const stream of streams) {
    const show = stream.match(/<([0-9A-Fa-f]+)>\s*Tj|\[([\s\S]*?)\]\s*TJ/g) || [];
    for (const token of show) {
      const hexes = token.match(/<([0-9A-Fa-f]+)>/g) || [];
      for (const hex of hexes) {
        const raw = hex.slice(1, -1).toUpperCase();
        const width = [...map.keys()][0] ? [...map.keys()][0].length : 4;
        for (let index = 0; index < raw.length; index += width) {
          const glyph = map.get(raw.slice(index, index + width));
          text += glyph || "";
        }
      }
    }
  }
  return text;
}

function pdfInfo(buffer) {
  const raw = buffer.toString("latin1");
  const streams = inflateStreams(buffer);
  const boxes = [...raw.matchAll(/\/MediaBox\s*\[\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\]/g)];
  const pages = (raw.match(/\/Type\s*\/Page(?!s)/g) || []).length;
  const joined = streams.join("\n");
  return {
    pages,
    boxes: boxes.map((item) => item.slice(1).map(Number)),
    images: (raw.match(/\/Subtype\s*\/Image\b/g) || []).length,
    vectors: /\b(?:m|l|c|re|S|f)\b/.test(joined),
    text: pdfText(buffer),
  };
}

function browserModule() {
  return PDF_SRC.replace(
    /module\.exports\s*=\s*\{[\s\S]*?\};?\s*$/,
    "export { FONT_FAMILY, SVG_PX_TO_PT, PDF_MAX_USER_UNIT, assertControlledSvg, pageBox, svgToExecutivePdf };\n",
  );
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".ttf")) return "font/ttf";
  if (filePath.endsWith(".mjs") || filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  return "application/octet-stream";
}

function startServer(cases) {
  const files = {
    "/vendor/jspdf.umd.min.js": path.join(FRONT, "node_modules", "jspdf", "dist", "jspdf.umd.min.js"),
    "/vendor/svg2pdf.umd.min.js": path.join(FRONT, "node_modules", "svg2pdf.js", "dist", "svg2pdf.umd.min.js"),
    "/fonts/NotoSans-Regular.ttf": path.join(FRONT, "public", "fonts", "NotoSans-Regular.ttf"),
    "/fonts/NotoSans-Bold.ttf": path.join(FRONT, "public", "fonts", "NotoSans-Bold.ttf"),
  };
  let posted = null;
  const server = http.createServer((req, res) => {
    const url = req.url.split("?")[0];
    if (req.method === "POST" && url === "/result") {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        posted = Buffer.concat(chunks);
        res.writeHead(200);
        res.end("ok");
      });
      return;
    }
    if (url === "/shims/jspdf.mjs") {
      res.writeHead(200, { "Content-Type": "text/javascript" });
      res.end("export const jsPDF = globalThis.jspdf.jsPDF;\n");
      return;
    }
    if (url === "/shims/svg2pdf.mjs") {
      res.writeHead(200, { "Content-Type": "text/javascript" });
      res.end("export const svg2pdf = globalThis.svg2pdf.svg2pdf;\nexport default svg2pdf;\n");
      return;
    }
    if (url === "/pdf.mjs") {
      res.writeHead(200, { "Content-Type": "text/javascript" });
      res.end(browserModule());
      return;
    }
    if (url === "/harness.html") {
      const html = `<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"jspdf":"/shims/jspdf.mjs","svg2pdf.js":"/shims/svg2pdf.mjs"}}</script><script src="/vendor/jspdf.umd.min.js"></script><script src="/vendor/svg2pdf.umd.min.js"></script><script type="module">const cases = JSON.parse(document.getElementById("cases").textContent); const { svgToExecutivePdf } = await import("/pdf.mjs"); const results = []; for (const item of cases) { try { const blob = await svgToExecutivePdf(item.svg); const bytes = new Uint8Array(await blob.arrayBuffer()); let binary = ""; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); results.push({ id: item.id, mime: blob.type, b64: btoa(binary) }); } catch (error) { results.push({ id: item.id, error: String(error && error.message || error) }); } } await fetch("/result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(results) }); document.body.dataset.done = "1";</script><script type="application/json" id="cases">${JSON.stringify(cases).replace(/</g, "\\u003c")}</script>`;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    const filePath = files[url];
    if (!filePath) {
      res.writeHead(404);
      res.end("missing");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({
        server,
        port: server.address().port,
        posted: () => posted,
      });
    });
  });
}

test("Chrome convierte el SVG real a un PDF vectorial con texto seleccionable", { timeout: 120000 }, async () => {
  assert.equal(fs.existsSync(CHROME), true);
  const cases = [
    { id: "bad", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>1</script></svg>' },
    { id: "acapulco", svg: svgOf(viewOf("plant", "Acapulco", ["w41", "w42"])) },
    { id: "one", svg: svgOf(viewOf("plant", "Acapulco", ["w41"])) },
    { id: "three", svg: svgOf(viewOf("plant", "Acapulco", ["w41", "w42", "w43"])) },
    { id: "todas", svg: svgOf(viewOf("all", "Provincia", ["w41", "w42", "w43"])) },
    { id: "max", svg: svgOf(viewOf("plant", "Acapulco", AVAILABLE.map((item) => item.id))) },
  ];
  const host = await startServer(cases);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "pdf084-"));
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profile}`,
    `http://127.0.0.1:${host.port}/harness.html`,
  ], { stdio: ["ignore", "pipe", "pipe"] });
  let logs = "";
  chrome.stdout.on("data", (chunk) => { logs += chunk; });
  chrome.stderr.on("data", (chunk) => { logs += chunk; });
  const started = Date.now();
  while (!host.posted() && Date.now() - started < 90000) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  chrome.kill();
  host.server.close();
  assert.ok(host.posted(), `Chrome no entregó el PDF\n${logs.slice(-2000)}`);
  const results = JSON.parse(host.posted().toString("utf8"));
  const bad = results.find((item) => item.id === "bad");
  assert.match(bad.error, /no permitidos/);
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const manifest = [];
  for (const id of ["acapulco", "one", "three", "todas", "max"]) {
    const item = results.find((entry) => entry.id === id);
    assert.equal(item.error, undefined, item.error);
    assert.equal(item.mime, "application/pdf");
    const buffer = Buffer.from(item.b64, "base64");
    assert.equal(buffer.subarray(0, 5).toString("latin1"), "%PDF-");
    const info = pdfInfo(buffer);
    assert.equal(info.pages, 1);
    assert.equal(info.images, 0);
    assert.equal(info.vectors, true);
    assert.match(info.text, /IGF Diario semanal/);
    assert.match(info.text, /Exportado 14\/10\/2026, 13:00:00/);
    assert.match(info.text, /RESULTADO/);
    assert.match(info.text, /GASTOS/);
    assert.match(info.text, /MARGEN \/ PRECIO \/ COSTOS/);
    assert.match(info.text, /HG \/ VOLUMEN/);
    assert.match(info.text, /VENTAS POR CANAL/);
    assert.match(info.text, /PRECIO DE VENTA AL PÚBLICO/);
    assert.match(info.text, /DESCUENTO COMPRA/);
    assert.match(info.text, /Pendiente/);
    assert.match(info.text, /Mié/);
    assert.match(info.text, /Sáb/);
    assert.match(info.text, /\$/);
    if (id !== "one") {
      assert.match(info.text, /\u0394 vs\. S\d+/);
      assert.match(info.text, /%/);
    }
    const name = {
      acapulco: "IGF_Diario_Acapulco_2026-10-04_a_2026-10-17.pdf",
      one: "IGF_Diario_Acapulco_2026-10-04_a_2026-10-10.pdf",
      three: "IGF_Diario_Acapulco_2026-10-04_a_2026-10-24.pdf",
      todas: "IGF_Diario_Todas_2026-10-04_a_2026-10-24.pdf",
      max: "IGF_Diario_Acapulco_2026-09-27_a_2026-11-07.pdf",
    }[id];
    fs.writeFileSync(path.join(EVIDENCE, name), buffer);
    const box = info.boxes[0];
    manifest.push({
      id,
      file: name,
      fixture: "local",
      pages: info.pages,
      mediaBox: box,
      bytes: buffer.length,
      images: info.images,
    });
    if (id === "acapulco") {
      assert.match(info.text, /Acapulco/);
      assert.match(info.text, /Semana 41/);
      assert.match(info.text, /Semana 42/);
      assert.doesNotMatch(info.text, /Semana 40/);
      assert.match(info.text, /04\/10\/2026/);
      assert.match(info.text, /17\/10\/2026/);
      assert.match(info.text, new RegExp(money(1500.5).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(info.text, /Cobertura parcial/);
      assert.match(info.text, /\u2014/);
      assert.equal(box[2] > box[0], true);
      const svg = cases.find((entry) => entry.id === "acapulco").svg;
      const width = Number(svg.match(/width="([^"]+)"/)[1]);
      const height = Number(svg.match(/height="([^"]+)"/)[1]);
      const expected = pdf.pageBox(width, height);
      assert.ok(Math.abs(box[2] - expected.pageW) < 1.5);
      assert.ok(Math.abs(box[3] - expected.pageH) < 1.5);
    }
    if (id === "todas") assert.match(info.text, /Todas/);
    if (id === "one") assert.doesNotMatch(info.text, /Semana 42/);
    if (id === "max") {
      assert.match(info.text, /Semana 40/);
      assert.match(info.text, /Semana 45/);
    }
  }
  fs.writeFileSync(path.join(EVIDENCE, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
});
