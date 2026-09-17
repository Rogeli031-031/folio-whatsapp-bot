"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const FRONTEND = path.join(ROOT, "frontend-dashboard");
const MODAL_SRC = fs.readFileSync(
  path.join(FRONTEND, "modules", "director-ia", "components", "DirectorIaChatModal.tsx"),
  "utf8"
);
const ACCIONES_SRC = fs.readFileSync(path.join(FRONTEND, "app", "acciones", "page.tsx"), "utf8");
const TW_CONFIG = fs.readFileSync(path.join(FRONTEND, "tailwind.config.ts"), "utf8");

const CHROME =
  process.env.CHROME_PATH ||
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "google-chrome");

const VIEWPORTS = [
  { w: 1700, h: 900 },
  { w: 1440, h: 900 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
];

const LONG_ANSWER = Array.from(
  { length: 32 },
  (_, i) =>
    `${i + 1}. Riesgo operativo: desviación de gasto, folios abiertos, margen y seguimiento de acciones pendientes en el corte vigente.`
).join("\\n");

function compileTailwind() {
  const out = path.join(os.tmpdir(), `igf-physical-bounds-${process.pid}.css`);
  const cli = path.join(FRONTEND, "node_modules", "tailwindcss", "lib", "cli.js");
  const r = spawnSync(
    process.execPath,
    [cli, "-c", "tailwind.config.ts", "-i", "./app/globals.css", "-o", out, "--minify"],
    { cwd: FRONTEND, encoding: "utf8", timeout: 120000 }
  );
  if (r.status !== 0) {
    throw new Error(`tailwindcss failed (${r.status}): ${r.stderr || r.stdout}`);
  }
  return fs.readFileSync(out, "utf8");
}

function fixtureHtml(css, { long }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><style>${css}</style></head>
<body>
<div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6">
  <div id="dialog" class="flex flex-col min-h-0 overflow-hidden w-[calc(100vw-48px)] max-w-[900px] h-[calc(100vh-64px)] max-h-[560px] rounded-xl border border-cyan-800/60 bg-slate-900 shadow-xl" role="dialog">
    <div class="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 shrink-0">
      <div>
        <h2 class="text-base font-semibold text-white">Chat Director IA</h2>
        <p class="text-xs text-slate-400 mt-0.5">Planta: Acapulco</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button type="button" id="btn-plant" class="rounded border border-slate-600 px-3 py-1 text-sm text-slate-300">Cambiar planta</button>
        <button type="button" id="btn-close" class="rounded border border-slate-600 px-3 py-1 text-sm text-slate-300">Cerrar</button>
      </div>
    </div>
    <div class="flex flex-col flex-1 min-h-0 px-4 py-3 overflow-hidden">
      <div class="h-full flex flex-col min-h-0 overflow-hidden flex-1">
        <div id="messages" class="flex-1 min-h-0 overflow-y-auto space-y-3 px-1 py-2">
          <div class="flex justify-end"><div class="max-w-[92%] rounded-lg px-3 py-2 text-sm bg-cyan-950/70 border border-cyan-700/50 text-cyan-50">¿Cómo vamos?</div></div>
          ${
            long
              ? `<div class="flex justify-start"><div class="max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap bg-slate-800 border border-slate-600 text-slate-100">${LONG_ANSWER.replace(/\\n/g, "\n")}</div></div>`
              : `<div class="flex justify-start"><div class="max-w-[92%] rounded-lg px-3 py-2 text-sm bg-slate-800 border border-slate-600 text-slate-100">Corte estable.</div></div>`
          }
        </div>
        <div class="shrink-0">
          <div class="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-700">
            <input id="input" type="text" placeholder="Escribe tu pregunta…" class="flex-1 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"/>
            <button type="button" id="btn-send" class="rounded border border-cyan-600/80 bg-cyan-950/50 px-4 py-2 text-sm text-cyan-100 shrink-0">Enviar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
function vis(el){
  const r = el.getBoundingClientRect();
  const vh = innerHeight, vw = innerWidth;
  return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), in: r.top>=-1 && r.bottom<=vh+1 && r.left>=-1 && r.right<=vw+1 };
}
const dialog = document.getElementById("dialog");
const messages = document.getElementById("messages");
const m = {
  vp: [innerWidth, innerHeight],
  dialog: vis(dialog),
  header: vis(document.querySelector("h2")),
  close: vis(document.getElementById("btn-close")),
  plant: vis(document.getElementById("btn-plant")),
  input: vis(document.getElementById("input")),
  send: vis(document.getElementById("btn-send")),
  messages: Object.assign(vis(messages), { scrollHeight: messages.scrollHeight, clientHeight: messages.clientHeight })
};
document.title = "MEASURE " + JSON.stringify(m);
const pre = document.createElement("pre");
pre.id = "__measure__";
pre.textContent = JSON.stringify(m);
document.body.appendChild(pre);
</script>
</body></html>`;
}

function fileUrl(filePath) {
  return "file:///" + path.resolve(filePath).replace(/\\/g, "/");
}

function measureWithChrome(url, viewport) {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "igf-chrome-"));
  const r = spawnSync(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-default-apps",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${userData}`,
      "--force-device-scale-factor=1",
      `--window-size=${viewport.w},${viewport.h}`,
      "--virtual-time-budget=1500",
      "--dump-dom",
      url,
    ],
    { encoding: "utf8", timeout: 25000, maxBuffer: 20 * 1024 * 1024 }
  );
  const html = `${r.stdout || ""}${r.stderr || ""}`;
  const pre = html.match(/<pre id="__measure__">([\s\S]*?)<\/pre>/);
  const title = html.match(/<title>MEASURE ([\s\S]*?)<\/title>/);
  const raw = pre ? pre[1] : title ? title[1].replace(/&quot;/g, '"') : null;
  if (!raw) {
    throw new Error(
      `chrome measure failed (status=${r.status} signal=${r.signal}): ${html.slice(0, 500)}`
    );
  }
  return JSON.parse(raw.replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
}

let css;

describe("FIX-IGF-DIRECTOR-IA-MODAL-PHYSICAL-BOUNDS-001 — clases y emisión", () => {
  it("source large usa calc+max y no min() arbitrary", { timeout: 120000 }, () => {
    css = compileTailwind();
    assert.match(MODAL_SRC, /w-\[calc\(100vw-48px\)\]/);
    assert.match(MODAL_SRC, /max-w-\[900px\]/);
    assert.match(MODAL_SRC, /h-\[calc\(100vh-64px\)\]/);
    assert.match(MODAL_SRC, /max-h-\[560px\]/);
    assert.match(MODAL_SRC, /flex flex-col min-h-0 overflow-hidden/);
    assert.doesNotMatch(MODAL_SRC, /w-\[min\(|h-\[min\(/);
    assert.match(TW_CONFIG, /\.\/modules\/\*\*\/\*\.\{js,ts,jsx,tsx,mdx\}/);
    assert.doesNotMatch(ACCIONES_SRC, /size="large"/);
  });

  it("Tailwind emite width/max-width/height/max-height físicos", { timeout: 120000 }, () => {
    if (!css) css = compileTailwind();
    assert.ok(css.includes(".w-\\[calc\\(100vw-48px\\)\\]{width:calc(100vw - 48px)}"));
    assert.ok(css.includes(".max-w-\\[900px\\]{max-width:900px}"));
    assert.ok(css.includes(".h-\\[calc\\(100vh-64px\\)\\]{height:calc(100vh - 64px)}"));
    assert.ok(css.includes(".max-h-\\[560px\\]{max-height:560px}"));
    assert.equal(css.includes("min(900px"), false);
    assert.equal(css.includes("min(560px"), false);
  });
});

describe("FIX-IGF-DIRECTOR-IA-MODAL-PHYSICAL-BOUNDS-001 — getBoundingClientRect", () => {
  it("dialog no crece con 32 líneas y respeta 900×560 en viewports de escritorio", { timeout: 180000 }, async () => {
    assert.ok(fs.existsSync(CHROME), `Chrome no encontrado: ${CHROME}`);
    if (!css) css = compileTailwind();
    assert.ok(css, "css compilado");

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "igf-bounds-"));
    const shortFile = path.join(dir, "short.html");
    const longFile = path.join(dir, "long.html");
    fs.writeFileSync(shortFile, fixtureHtml(css, { long: false }));
    fs.writeFileSync(longFile, fixtureHtml(css, { long: true }));

    const results = [];
    for (const vp of VIEWPORTS) {
      const shortM = measureWithChrome(fileUrl(shortFile), vp);
      const longM = measureWithChrome(fileUrl(longFile), vp);
      results.push({ vp, short: shortM, long: longM });

      assert.equal(shortM.dialog.w, longM.dialog.w, `width cambió en ${vp.w}x${vp.h}`);
      assert.equal(shortM.dialog.h, longM.dialog.h, `height cambió en ${vp.w}x${vp.h}`);
      assert.ok(longM.dialog.w <= 900 + 1, `width ${longM.dialog.w} > 900 en ${vp.w}`);
      assert.ok(longM.dialog.h <= 560 + 1, `height ${longM.dialog.h} > 560 en ${vp.h}`);
      const [innerW, innerH] = longM.vp;
      assert.ok(longM.dialog.w <= innerW - 48 + 1);
      assert.ok(longM.dialog.h <= innerH - 64 + 1);
      if (innerW >= 950) assert.ok(longM.dialog.w <= 900 + 1);
      if (innerH >= 624) assert.ok(longM.dialog.h <= 560 + 1);
      for (const key of ["header", "close", "plant", "input", "send"]) {
        assert.equal(longM[key].in, true, `${key} no visible en ${vp.w}x${vp.h}`);
      }
      assert.ok(
        longM.messages.scrollHeight > longM.messages.clientHeight + 1,
        "solo el historial debe crecer en scrollHeight"
      );
    }

    assert.equal(results.length, VIEWPORTS.length);
  });
});
