import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagePath = path.join(__dirname, "..", "app", "page.tsx");
let s = fs.readFileSync(pagePath, "utf8").replace(/\r\n/g, "\n");

const start =
  '      <main className={plantaFilter ? "flex-1 p-4 flex flex-col" : "flex-1 p-4"}>';
const end = `        )}
        <section className="mt-6 rounded-lg border border-slate-700 bg-slate-800/60 p-4 flex-shrink-0">
          <h3 className="text-base font-medium text-slate-200 mb-1">Delta ingreso Forecast</h3>`;

const i = s.indexOf(start);
const j = s.indexOf(end);
if (i < 0 || j < 0 || j <= i) {
  console.error("Markers not found", { i, j });
  process.exit(1);
}

const replacement = `      <main className="flex-1 p-4">
        <section className="mt-6 rounded-lg border border-slate-700 bg-slate-800/60 p-4 flex-shrink-0">
          <h3 className="text-base font-medium text-slate-200 mb-1">Delta ingreso Forecast</h3>`;

s = s.slice(0, i) + replacement + s.slice(j + end.length);
fs.writeFileSync(pagePath, s, "utf8");
console.log("Pruned IGF main block, bytes:", j - i);
