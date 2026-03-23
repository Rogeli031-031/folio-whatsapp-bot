import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pagePath = path.join(root, "app", "page.tsx");
const outPath = path.join(root, "components", "IgfForecastClient.tsx");

let lines = fs.readFileSync(pagePath, "utf8").split(/\r?\n/);

// Quitar estado y efectos de Delta/DICF dentro de KpiContent (líneas 1-based del archivo original).
const ranges = [
  [301, 400], // useEffect Excel cliente DICF
  [220, 235], // periodos delta + reset cliente
  [185, 212], // estado delta/dicf
];
ranges.sort((a, b) => b[0] - a[0]);
for (const [a, b] of ranges) {
  lines.splice(a, b - a);
}

const removed = ranges.reduce((s, [a, b]) => s + (b - a), 0);
const innerEnd = 2090 - removed; // exclusivo; cierre de KpiContent
const inner = lines.slice(110, innerEnd);

let body = inner.join("\n");

body = body.replace(/^function KpiContent\(\)/m, "export function IgfForecastContent()");

body = body.replace(
  /      } finally \{\n        fetching = false;\n        if \(!cancelled && !igfForecast\) \{\n          setIgfLoading\(false\);\n        \}\n      \}/,
  `      } finally {
        fetching = false;
        if (!cancelled) {
          setIgfLoading(false);
        }
      }`
);

// Quitar sección Delta + DICF del main (desde título Delta hasta antes del spacer plantaFilter).
body = body.replace(
  /\n        <section className="mt-6 rounded-lg border border-slate-700 bg-slate-800\/60 p-4 flex-shrink-0">\n          <h3 className="text-base font-medium text-slate-200 mb-1">Delta ingreso Forecast[\s\S]*?\n        \{plantaFilter \? <div className="flex-1 min-h-\[35vh\] mt-6" aria-hidden \/> : null\}\n      <\/main>/,
  "\n      </main>"
);

// Encabezado: título y enlace volver a KPI
body = body.replace(
  /<div className="border-b border-slate-700 bg-slate-900\/50 px-4 py-3">\n        <h1 className="text-xl font-semibold text-white">KPI Financieros<\/h1>\n      <\/div>/,
  `<div className="border-b border-slate-700 bg-slate-900/50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-white">IGF Forecast</h1>
        <Link
          href={token ? \`/?t=\${encodeURIComponent(token)}\` : "/"}
          className="text-sm text-amber-300 hover:text-amber-200 underline"
        >
          ← KPI Financieros
        </Link>
      </div>`
);

body = body.replace(
  /<div className="flex flex-wrap gap-3 px-4 py-3 border-b border-slate-700\/80 bg-slate-800\/30">/,
  `<div className="flex flex-wrap gap-3 px-4 py-3 border-b border-slate-700/80 bg-slate-800/30">`
);

const header = `"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
  getRoleFromDashboardToken,
} from "@/lib/auth";
import {
  fetchIgfForecast,
  patchIgfForecastHg,
  getDashboardExcelDownloadUrl,
  fetchPresupuestoDetalle,
  fetchIgfFoliosDetalle,
  type IgfForecastResponse,
  type IgfForecastRow,
  type IgfFolioDetalleItem,
  type IgfFolioDetalleTipo,
  type PresupuestoDetalleItem,
} from "@/lib/api";
import {
  MESES,
  ORDEN_PROVINCIA,
  COLS_EXTRA,
  fmtNum,
  presupuestoGendKey,
  gastoKgFromFour,
  findRowByPlanta,
  PRESUPUESTO_GEND_STORAGE_KEY,
  INVERSION_CDJZ_STORAGE_KEY,
} from "@/lib/igf-kpi-ui";

`;

const out = header + body + "\n";

fs.writeFileSync(outPath, out, "utf8");
console.log("Wrote", outPath);
