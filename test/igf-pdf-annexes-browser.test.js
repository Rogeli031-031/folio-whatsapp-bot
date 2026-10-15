"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const os = require("node:os");
const { spawn } = require("node:child_process");
const ts = require("../frontend-dashboard/node_modules/typescript");
const { workbook, channel } = require("./helpers/igf-pdf-annex-fixture");
const { buildExecutiveView, renderExecutiveSvg } = require("../frontend-dashboard/lib/igf-diario-weekly-executive-chart");
const { buildAnalyticalReport, freezePlantExport } = require("../frontend-dashboard/lib/igf-diario-weekly-analytical-report");
const FRONT = path.join(__dirname, "../frontend-dashboard");
const lib = (name) => fs.readFileSync(path.join(FRONT, "lib", name), "utf8");
function cjs(name, exports, prefix = "") {
  return `${prefix}\nconst module = {exports:{}};\n${lib(name)}\n${exports.map((key) => `export { ${key} };`).join("\n")}`;
}
function typescript(name) {
  return ts.transpileModule(lib(name), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
}
test("Browser loads ARR Top15 and real XLSX, composes vector PDF, and fails incomplete annexes", { timeout: 60000 }, async () => {
  const excel = Buffer.from(await workbook().xlsx.writeBuffer());
  const rates = { venta_kg: 30000, resultado_kg: 0.6, resultado_mxn: 18000, precio_kg: 20, costo_kg: 12, flete_kg: 1, margen_kg: 7, gasto_corporativo_kg: 1, inversiones_kg: 0, impuestos_federales_kg: 0, presupuesto_nomina_gastos_kg: 2, presupuesto_imss_sua_kg: 0, extraordinarios_kg: 0, provisiones_planta_kg: 0, hg_kg: -0.1, com_desc_kg: -3.5 };
  const weeks = [0, 1].map((w) => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const kg = 28000 + i * 600 + w * 400;
      const margin = 7 + w * 0.2 + (i - 3) * 0.03;
      const result = margin - 6.4;
      return { fecha: `2026-10-${String(4 + w * 7 + i).padStart(2, "0")}`,
        metrics: { ...rates, venta_kg: kg, precio_kg: margin + 13, margen_kg: margin, resultado_kg: result, resultado_mxn: kg * result, hg_mxn: -kg * 0.1 },
        venta_casa_kg: kg / 3, venta_comisionista_kg: kg * 2 / 3,
        gasto_corporativo_mxn: kg, gasto_operativo_mxn: kg * 2 };
    });
    const kg = days.reduce((sum, d) => sum + d.metrics.venta_kg, 0);
    const result = days.reduce((sum, d) => sum + d.metrics.resultado_mxn, 0);
    const margin = days.reduce((sum, d) => sum + d.metrics.margen_kg * d.metrics.venta_kg, 0) / kg;
    return { id: `w${w}`, fecha_desde: days[0].fecha, fecha_hasta: days[6].fecha, week_number: 41 + w, week_year: 2026, estado: "real", days,
      metrics: { ...rates, venta_kg: kg, resultado_kg: result / kg, resultado_mxn: result, margen_kg: margin, precio_kg: margin + 13, hg_mxn: -kg * 0.1 },
      coverage: { resultado: { kg_total: kg, kg_covered: kg }, com_desc_kg: { kg_total: kg, kg_covered: kg } } };
  });
  const selectedIds = weeks.map((w) => w.id);
  const view = buildExecutiveView({ scope: "plant", plant: "Puebla - MUESTRA", weeks, selectedIds });
  const report = buildAnalyticalReport(freezePlantExport({ empresa: "Puebla - MUESTRA", weeks, selectedIds }), "MUESTRA SINTÉTICA");
  const data = { svg: renderExecutiveSvg(view, { fontFamily: "NotoSans", exportedAt: "MUESTRA SINTÉTICA" }), report };
  const imports = { jspdf: "/jspdf.mjs", "svg2pdf.js": "/svg2pdf.mjs", exceljs: "/exceljs.mjs", "@/lib/api": "/api.mjs", "@/lib/igf-pdf-workbook": "/workbook.mjs" };
  let mode = "ok", posted, requests = [];
  const modules = {
    "/jspdf.mjs": "export const jsPDF = globalThis.jspdf.jsPDF;",
    "/svg2pdf.mjs": "export const svg2pdf = globalThis.svg2pdf.svg2pdf;",
    "/exceljs.mjs": "export default globalThis.ExcelJS;",
    "/api.mjs": "const process={env:{}};\n" + typescript("api.ts"),
    "/loader.mjs": typescript("igf-pdf-annexes-loader.ts"),
    "/workbook.mjs": cjs("igf-pdf-workbook.js", ["extractDailyWorkbook", "DAILY_COLUMNS"]),
    "/annexes.mjs": cjs("igf-pdf-annexes.js", ["drawAnnexes"], 'import * as workbook from "/workbook.mjs"; const require = () => workbook;'),
    "/igf-diario-weekly-executive-pdf": cjs("igf-diario-weekly-executive-pdf.js", ["appendExecutiveSvg", "svgToExecutivePdf"]),
    "/compose.mjs": cjs("igf-diario-weekly-analytical-pdf.js", ["composePlantPdf"], 'import * as annexes from "/annexes.mjs"; const require = () => annexes;'),
  };
  const files = {
    "/jspdf.js": path.join(FRONT, "node_modules/jspdf/dist/jspdf.umd.min.js"),
    "/svg2pdf.js": path.join(FRONT, "node_modules/svg2pdf.js/dist/svg2pdf.umd.min.js"),
    "/exceljs.js": path.join(FRONT, "node_modules/exceljs/dist/exceljs.min.js"),
  };
  for (const file of ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf", "DejaVuSans.ttf", "DejaVuSans-Bold.ttf"]) files[`/fonts/${file}`] = path.join(FRONT, "public/fonts", file);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/result") {
      const chunks = []; req.on("data", (b) => chunks.push(b)); req.on("end", () => { posted = JSON.parse(Buffer.concat(chunks)); res.end("ok"); }); return;
    }
    if (url.pathname === "/mode") { mode = url.searchParams.get("value"); res.end("ok"); return; }
    if (url.pathname.startsWith("/api-backend/")) {
      requests.push({ path: url.pathname, top: url.searchParams.get("top_limit"), range: url.searchParams.get("range"), plant: url.searchParams.get("plant_code"), year: url.searchParams.get("year"), month: url.searchParams.get("month"), corte: url.searchParams.get("upload_day") });
      if (url.pathname.endsWith("dashboard-excel")) {
        if (mode === "excel-fail") { res.writeHead(500); res.end("fixture failure"); return; }
        res.writeHead(200, { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }); res.end(excel); return;
      }
      const ch = channel(url.searchParams.get("canal"));
      if (mode === "old-server") delete ch.top_limit;
      if (mode === "wrong-period" && ch.canal === "comisionista") ch.fecha_hasta = "2026-10-13";
      res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(ch)); return;
    }
    if (files[url.pathname]) { res.setHeader("Content-Type", url.pathname.endsWith(".ttf") ? "font/ttf" : "text/javascript"); fs.createReadStream(files[url.pathname]).pipe(res); return; }
    if (modules[url.pathname]) { res.setHeader("Content-Type", "text/javascript"); res.end(modules[url.pathname]); return; }
    if (url.pathname === "/") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(`<!doctype html><meta charset="utf-8"><script type="importmap">${JSON.stringify({ imports })}</script><script src="/jspdf.js"></script><script src="/svg2pdf.js"></script><script src="/exceljs.js"></script><script type="module">
      const results = {};
      try {
        const {loadPdfAnnexes} = await import('/loader.mjs');
        const {composePlantPdf} = await import('/compose.mjs');
        const opts = { token:'synthetic-test-token',year:2026,month:10,plantCode:'Puebla',empresa:'Puebla',uploadDay:'2026-10-15',versionAsOfCorte:true,weekAnchor:'2026-10-04' };
        const data = ${JSON.stringify(data).replace(/</g, "\\u003c")};
        const annexes = await loadPdfAnnexes(opts);
        const blob = await composePlantPdf({...data,annexes});
        const bytes = new Uint8Array(await blob.arrayBuffer()); let binary='';
        for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
        results.b64=btoa(binary); results.days=annexes.daily.rows.length;
        for(const mode of ['old-server','wrong-period','excel-fail']) {
          await fetch('/mode?value='+mode);
          try { await loadPdfAnnexes(opts); results[mode]='UNEXPECTED SUCCESS'; } catch(e) { results[mode]=e.message; }
        }
      } catch(e) { results.error = e.stack || e.message; }
      await fetch('/result',{method:'POST',body:JSON.stringify(results)});
      </script>`); return;
    }
    res.writeHead(404); res.end("not found");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "igf-annex-test-"));
  const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`, `http://127.0.0.1:${server.address().port}/`], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let logs = ""; chrome.stderr.on("data", (b) => { logs += b; });
  try {
    const start = Date.now();
    while (!posted && Date.now() - start < 45000) await new Promise((resolve) => setTimeout(resolve, 100));
    assert.ok(posted, logs.slice(-1000)); assert.equal(posted.error, undefined);
    assert.equal(posted.days, 31);
    assert.match(posted["old-server"], /Top 15/); assert.match(posted["wrong-period"], /misma planta y ventana/); assert.match(posted["excel-fail"], /obtener el Excel/);
    assert.ok(requests.filter((r) => r.path.endsWith("venta-serie")).every((r) => r.top === "15" && r.range === "1m"));
    assert.ok(requests.filter((r) => r.path.endsWith("dashboard-excel")).every((r) => r.plant === "Puebla" && r.year === "2026" && r.month === "10" && r.corte === "2026-10-15"));
    const dest = path.resolve(__dirname, "../../output/pdf"); fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, "igf-anexos-muestra.pdf"), Buffer.from(posted.b64, "base64"));
  } finally { chrome.kill(); server.closeAllConnections(); server.close(); }
});
