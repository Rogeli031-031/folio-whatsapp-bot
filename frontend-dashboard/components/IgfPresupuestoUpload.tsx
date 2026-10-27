"use client";

import { useRef, useState } from "react";
import { importIgfPresupuesto, type PresupuestoImportPreview } from "@/lib/api";

const money = (value: number | null) => value == null ? "Sin desglose" : value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export default function IgfPresupuestoUpload({ token, plants, initialPlant, year, month, onSaved }: {
  token: string; plants: string[]; initialPlant: string; year: number; month: number; onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [plant, setPlant] = useState(initialPlant);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PresupuestoImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [saved, setSaved] = useState<string | null>(null);
  const invalidate = () => { setPreview(null); setError(null); };
  async function run(action: "preview" | "save") {
    if (lock.current || !file || !plant || !from || !to) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("El archivo no puede superar 5 MB");
      if (!/\.xlsx$/i.test(file.name)) throw new Error("Selecciona un archivo .xlsx");
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const result = await importIgfPresupuesto(token, { action, plant_code: plant, desde: from, hasta: to,
        file_base64: base64, ...(action === "save" ? { preview_token: preview?.preview_token } : {}) });
      if (action === "save") {
        setSaved(`Presupuesto guardado para ${plant}, del ${from} al ${to}.`);
        setOpen(false); setPreview(null); setFile(null); onSaved();
      } else setPreview(result);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo importar"); setPreview(null); }
    finally { lock.current = false; setBusy(false); }
  }
  const inputClass = "mt-1 w-full rounded border border-slate-500 bg-slate-800 p-2 text-white disabled:opacity-50";
  return <>
    <button type="button" className="rounded bg-sky-700 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-600" onClick={() => {
      setPlant(initialPlant || (plants.length === 1 ? plants[0] : ""));
      setFrom(`${year}-${String(month).padStart(2, "0")}-01`);
      setTo(`${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`);
      setFile(null); setPreview(null); setError(null); setSaved(null); setOpen(true);
    }}>Subir Presupuesto</button>
    {saved && <span role="status" className="text-xs text-emerald-300">{saved}</span>}
    {open && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="presupuesto-upload-title" className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-slate-600 bg-slate-900 p-5 text-slate-100">
        <h3 id="presupuesto-upload-title" className="text-xl font-semibold">Subir Presupuesto</h3>
        <p className="mt-2 text-sm text-slate-300">Importa los siete conceptos de operativos y corporativos de la hoja DatosCorpo. Solo se reemplazarán los días de la ventana; se conservarán los importes de los demás días y se actualizarán los totales mensuales. La distribución del mes quedará fijada por día para conservar estos importes.</p>
        <p className="mt-2 text-sm text-amber-200">Comprueba que el archivo corresponde a la planta elegida. Los importes se redondean a centavos. Las fórmulas deben estar recalculadas y guardadas en Excel.</p>
        <div className="my-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Planta<select value={plant} disabled={busy} onChange={e => { setPlant(e.target.value); setFile(null); invalidate(); }} className={inputClass}>
            <option value="">Selecciona una planta</option>{plants.map(p => <option key={p} value={p}>{p}</option>)}
          </select></label>
          <label className="text-sm">Archivo Excel (.xlsx, hasta 5 MB)<input key={plant} type="file" accept=".xlsx" disabled={busy || !plant} className={inputClass} onChange={e => { setFile(e.target.files?.[0] || null); invalidate(); }} /></label>
          <label className="text-sm">Desde<input type="date" min="2026-10-01" disabled={busy} value={from} className={inputClass} onChange={e => { setFrom(e.target.value); invalidate(); }} /></label>
          <label className="text-sm">Hasta<input type="date" min={from || "2026-10-01"} disabled={busy} value={to} className={inputClass} onChange={e => { setTo(e.target.value); invalidate(); }} /></label>
        </div>
        {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}
        {preview && <div className="mb-4">
          <h4 className="font-semibold">Vista previa · {plant} · {preview.dias} días</h4>
          <p className="mb-2 text-sm text-slate-300">{preview.desde} a {preview.hasta}. Revisa los cambios antes de guardar.</p>
          {preview.months.map(part => <div key={`${part.year}-${part.month}`} className="mb-4 overflow-x-auto">
            <p className="my-2 font-semibold">{String(part.month).padStart(2, "0")}/{part.year}</p>
            <table className="w-full text-sm"><thead><tr className="bg-slate-800 text-left"><th className="p-2">Concepto</th><th className="p-2">Ventana actual</th><th className="p-2">Ventana Excel</th><th className="p-2">Mes actual</th><th className="p-2">Mes después de guardar</th></tr></thead>
              <tbody>{part.concepts.map(c => <tr key={c.key} className="border-b border-slate-700"><th className="p-2 text-left font-normal">{c.label}</th><td className="p-2">{money(c.anterior_ventana)}</td><td className="p-2">{money(c.nuevo_ventana)}</td><td className="p-2">{money(c.mensual_anterior)}</td><td className="p-2 font-semibold">{money(c.mensual_nuevo)}</td></tr>)}</tbody>
            </table>
          </div>)}
          <details className="rounded border border-slate-700 p-2"><summary className="cursor-pointer">Ver importes diarios del Excel</summary><div className="mt-2 max-h-64 overflow-auto"><table className="w-full whitespace-nowrap text-xs"><thead><tr><th className="p-2 text-left">Fecha</th>{preview.months[0].concepts.map(c => <th className="p-2 text-right" key={c.key}>{c.label}</th>)}</tr></thead><tbody>{preview.days.map(day => <tr className="border-t border-slate-700" key={day.fecha}><th className="p-2">{day.fecha}</th>{preview.months[0].concepts.map(c => <td className="p-2 text-right" key={c.key}>{money(day.values[c.key])}</td>)}</tr>)}</tbody></table></div></details>
        </div>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy} className="rounded bg-slate-700 px-4 py-2 disabled:opacity-50" onClick={() => setOpen(false)}>Cancelar</button>
          <button type="button" disabled={busy || !file || !plant || !from || !to || from > to} className="rounded bg-sky-700 px-4 py-2 disabled:opacity-50" onClick={() => void run("preview")}>{busy ? "Procesando…" : "Revisar Excel"}</button>
          {preview && <button type="button" disabled={busy} className="rounded bg-emerald-700 px-4 py-2 font-semibold disabled:opacity-50" onClick={() => void run("save")}>Guardar presupuesto</button>}
        </div>
      </section>
    </div>}
  </>;
}
