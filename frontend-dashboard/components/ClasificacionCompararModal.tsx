"use client";

import { useMemo, useRef, useState } from "react";
import {
  postClasificacionComparar,
  postClasificacionCompararAgregar,
  postClasificacionCompararInspeccionar,
  postClasificacionCompararRechazar,
  type ClasificacionColumnMap,
  type ClasificacionCompararResult,
  type ClasificacionPlantaOption,
  type ClasificacionSheetConfig,
  type ClasificacionSheetInspect,
} from "@/lib/api";

interface Props {
  open: boolean;
  token: string;
  selectedPlantaId?: number | null;
  selectedPlantaNombre?: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const CATEGORIAS = ["GASTOS", "INVERSIONES", "TALLER"] as const;

const FIELD_LABELS: Array<{ key: keyof ClasificacionColumnMap; label: string; hint?: string }> = [
  { key: "concepto", label: "Concepto / descripción", hint: "Obligatorio" },
  { key: "importe", label: "Importe", hint: "Vacío = rechazo CDJZ" },
  { key: "unidad", label: "Unidad / AT" },
  { key: "beneficiario", label: "Beneficiario / Proveedor" },
  { key: "mayor", label: "Mayor (taller)" },
  { key: "preventivo", label: "Preventivo (taller)" },
  { key: "pasivo", label: "Pasivo (taller)" },
  { key: "fecha", label: "Fecha" },
  { key: "banco", label: "Banco" },
  { key: "cuenta_bancaria", label: "No. cuenta" },
];

function emptyColumns(): ClasificacionColumnMap {
  return {
    concepto: "",
    importe: "",
    unidad: "",
    beneficiario: "",
    mayor: "",
    preventivo: "",
    pasivo: "",
    fecha: "",
    banco: "",
    cuenta_bancaria: "",
  };
}

function mesActualMx(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  return `${y}-${String(m).padStart(2, "0")}`;
}

function splitYyyyMm(value: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(String(value || "").trim());
  if (!m) {
    const d = mesActualMx();
    const [y, mo] = d.split("-").map(Number);
    return { year: y, month: mo };
  }
  return { year: Number(m[1]), month: Number(m[2]) };
}

function joinYyyyMm(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function yearOptionsAround(currentYear: number): number[] {
  const out: number[] = [];
  for (let y = currentYear + 1; y >= currentYear - 2; y--) out.push(y);
  return out;
}

function fmtMxn(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MesPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (yyyyMm: string) => void;
}) {
  const { year, month } = splitYyyyMm(value);
  const currentYear = splitYyyyMm(mesActualMx()).year;
  const years = yearOptionsAround(currentYear);

  return (
    <div className="rounded border border-slate-700 bg-slate-800/40 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{label}</span>
        <select
          value={year}
          onChange={(e) => onChange(joinYyyyMm(Number(e.target.value), month))}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {MESES_CORTOS.map((nombre, idx) => {
          const m = idx + 1;
          const selected = m === month;
          return (
            <button
              key={nombre}
              type="button"
              onClick={() => onChange(joinYyyyMm(year, m))}
              className={`rounded px-1.5 py-1.5 text-xs font-medium transition ${
                selected
                  ? "bg-violet-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {nombre}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const b64 = result.includes(",") ? result.split(",").pop() || "" : result;
      resolve(b64);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function sheetToConfig(
  s: ClasificacionSheetInspect,
  selectedPlantaId?: number | null
): ClasificacionSheetConfig {
  const hasUseful =
    Boolean(s.suggestedCategoria) ||
    (s.headers || []).some((h) => h.field === "concepto" || h.field === "importe");
  return {
    sheetName: s.sheetName,
    enabled: hasUseful,
    planta_id: s.suggestedPlantaId ?? selectedPlantaId ?? null,
    categoria: s.suggestedCategoria || "GASTOS",
    columns: { ...emptyColumns(), ...(s.suggestedColumns || {}) },
  };
}

export default function ClasificacionCompararModal({
  open,
  token,
  selectedPlantaId,
  selectedPlantaNombre,
  onClose,
  onChanged,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "map" | "result">("upload");
  const [mesCargo, setMesCargo] = useState(mesActualMx());
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [plantas, setPlantas] = useState<ClasificacionPlantaOption[]>([]);
  const [inspected, setInspected] = useState<ClasificacionSheetInspect[]>([]);
  const [configs, setConfigs] = useState<ClasificacionSheetConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClasificacionCompararResult | null>(null);
  const [selAdd, setSelAdd] = useState<Record<number, boolean>>({});
  const [selMissingExcel, setSelMissingExcel] = useState<Record<number, boolean>>({});
  const [selBlank, setSelBlank] = useState<Record<number, boolean>>({});
  const [applyReport, setApplyReport] = useState<{
    agregados: number;
    rechazos: number;
    fallos: string[];
  } | null>(null);

  const missingDash = useMemo(() => result?.missing_in_dashboard || [], [result]);
  const missingExcel = useMemo(() => result?.missing_in_excel || [], [result]);
  const rechazosCdjz = useMemo(() => result?.rechazos_cdjz || [], [result]);
  const enabledCount = configs.filter((c) => c.enabled).length;

  const countSelected = useMemo(() => {
    const nAdd = Object.values(selAdd).filter(Boolean).length;
    const nMiss = Object.values(selMissingExcel).filter(Boolean).length;
    const nBlank = Object.values(selBlank).filter(Boolean).length;
    return nAdd + nMiss + nBlank;
  }, [selAdd, selMissingExcel, selBlank]);

  if (!open) return null;

  const resetAll = () => {
    setStep("upload");
    setFile(null);
    setFileBase64(null);
    setInspected([]);
    setConfigs([]);
    setPlantas([]);
    setResult(null);
    setError(null);
    setSelAdd({});
    setSelMissingExcel({});
    setSelBlank({});
    setApplyReport(null);
    setApplying(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const initSelections = (data: ClasificacionCompararResult) => {
    const add: Record<number, boolean> = {};
    (data.missing_in_dashboard || []).forEach((_, i) => {
      add[i] = true;
    });
    const miss: Record<number, boolean> = {};
    (data.missing_in_excel || []).forEach((item, i) => {
      miss[i] = item.folio_id != null;
    });
    const blank: Record<number, boolean> = {};
    (data.rechazos_cdjz || []).forEach((item, i) => {
      blank[i] = item.folio_id != null;
    });
    setSelAdd(add);
    setSelMissingExcel(miss);
    setSelBlank(blank);
    setApplyReport(null);
  };

  const updateConfig = (idx: number, patch: Partial<ClasificacionSheetConfig>) => {
    setConfigs((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const updateColumn = (idx: number, key: keyof ClasificacionColumnMap, value: string) => {
    setConfigs((prev) =>
      prev.map((c, i) =>
        i === idx
          ? { ...c, columns: { ...c.columns, [key]: value.trim().toUpperCase() } }
          : c
      )
    );
  };

  const handleInspect = async () => {
    if (!file) {
      setError("Selecciona un archivo Excel (.xlsx / .xlsm)");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const b64 = await fileToBase64(file);
      setFileBase64(b64);
      const data = await postClasificacionCompararInspeccionar(token, { fileBase64: b64 });
      const sheets = data.sheets || [];
      setInspected(sheets);
      setPlantas(data.plantas || []);
      setConfigs(sheets.map((s) => sheetToConfig(s, selectedPlantaId)));
      setStep("map");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al inspeccionar Excel");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!fileBase64) {
      setError("Vuelve a cargar el archivo");
      return;
    }
    const active = configs.filter((c) => c.enabled);
    if (!active.length) {
      setError("Activa al menos una hoja");
      return;
    }
    for (const c of active) {
      if (!c.planta_id) {
        setError(`Define la planta de la hoja "${c.sheetName}"`);
        return;
      }
      if (!c.categoria) {
        setError(`Define la categoría de la hoja "${c.sheetName}"`);
        return;
      }
      if (!c.columns.concepto) {
        setError(`Mapea la columna Concepto en "${c.sheetName}"`);
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      const data = await postClasificacionComparar(token, {
        fileBase64,
        mes_cargo: mesCargo,
        sheetConfigs: configs,
      });
      setResult(data);
      initSelections(data);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al comparar");
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = (kind: "add" | "miss" | "blank", value: boolean) => {
    if (kind === "add") {
      const next: Record<number, boolean> = {};
      missingDash.forEach((_, i) => {
        next[i] = value;
      });
      setSelAdd(next);
    } else if (kind === "miss") {
      const next: Record<number, boolean> = {};
      missingExcel.forEach((item, i) => {
        next[i] = value && item.folio_id != null;
      });
      setSelMissingExcel(next);
    } else {
      const next: Record<number, boolean> = {};
      rechazosCdjz.forEach((item, i) => {
        next[i] = value && item.folio_id != null;
      });
      setSelBlank(next);
    }
  };

  const handleAceptarCambios = async () => {
    if (!result || countSelected === 0) {
      setError("Selecciona al menos un cambio para aplicar");
      return;
    }
    setError(null);
    setApplying(true);
    setApplyReport(null);
    let agregados = 0;
    let rechazos = 0;
    const fallos: string[] = [];

    const addDone = new Set<number>();
    const missDone = new Set<number>();
    const blankDone = new Set<number>();

    try {
      for (let i = 0; i < missingDash.length; i++) {
        if (!selAdd[i]) continue;
        const item = missingDash[i];
        try {
          await postClasificacionCompararAgregar(token, { mes_cargo: mesCargo, item });
          agregados += 1;
          addDone.add(i);
        } catch (e) {
          fallos.push(
            `Agregar: ${(item.concepto || "").slice(0, 60)} — ${
              e instanceof Error ? e.message : "error"
            }`
          );
        }
      }

      for (let i = 0; i < missingExcel.length; i++) {
        if (!selMissingExcel[i]) continue;
        const item = missingExcel[i];
        if (item.folio_id == null) continue;
        try {
          await postClasificacionCompararRechazar(token, item.folio_id);
          rechazos += 1;
          missDone.add(i);
        } catch (e) {
          fallos.push(
            `Rechazo (falta Excel): ${item.numero_folio || item.folio_id} — ${
              e instanceof Error ? e.message : "error"
            }`
          );
        }
      }

      for (let i = 0; i < rechazosCdjz.length; i++) {
        if (!selBlank[i]) continue;
        const item = rechazosCdjz[i];
        if (item.folio_id == null) continue;
        try {
          await postClasificacionCompararRechazar(
            token,
            item.folio_id,
            "Importe en blanco en Excel (indicador de rechazo CDJZ; no se modificó el importe del folio)."
          );
          rechazos += 1;
          blankDone.add(i);
        } catch (e) {
          fallos.push(
            `Rechazo (importe blanco): ${item.numero_folio || item.folio_id} — ${
              e instanceof Error ? e.message : "error"
            }`
          );
        }
      }

      const nextResult: ClasificacionCompararResult = {
        ...result,
        missing_in_dashboard: result.missing_in_dashboard.filter((_, i) => !addDone.has(i)),
        missing_in_excel: result.missing_in_excel.filter((_, i) => !missDone.has(i)),
        rechazos_cdjz: result.rechazos_cdjz.filter((_, i) => !blankDone.has(i)),
        matched_count: result.matched_count + addDone.size,
        dashboard_count: Math.max(
          0,
          result.dashboard_count + addDone.size - missDone.size - blankDone.size
        ),
      };
      setResult(nextResult);
      initSelections(nextResult);
      setApplyReport({ agregados, rechazos, fallos });
      if (agregados + rechazos > 0) onChanged?.();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-lg border border-slate-600 bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-white">COMPARAR / ACTUALIZAR</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Primero se muestran las diferencias; los cambios solo se aplican al pulsar{" "}
              <span className="text-emerald-300">Aceptar cambios</span>. Importe en blanco = rechazo
              CDJZ (sin cambiar el importe del folio).
              {selectedPlantaNombre ? ` Filtro UI: ${selectedPlantaNombre}.` : ""}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Paso {step === "upload" ? "1" : step === "map" ? "2" : "3"} de 3 —{" "}
              {step === "upload"
                ? "Archivo y mes"
                : step === "map"
                  ? "Mapeo de hojas/columnas"
                  : "Resultados"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetAll();
              onClose();
            }}
            className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-4">
          {step === "upload" && (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded border border-slate-700 bg-slate-800/40 p-3">
                  <p className="mb-2 text-xs text-slate-400">Archivo Excel de referencia</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xlsm,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
                    className="block w-full text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-violet-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-violet-600"
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                      setFile(f);
                      setResult(null);
                      setInspected([]);
                      setConfigs([]);
                      setFileBase64(null);
                    }}
                  />
                  {file && <p className="mt-2 truncate text-xs text-slate-500">{file.name}</p>}
                </div>
                <MesPicker label="Mes del documento" value={mesCargo} onChange={setMesCargo} />
              </div>
              <button
                type="button"
                onClick={handleInspect}
                disabled={loading || !file}
                className="rounded bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
              >
                {loading ? "Leyendo Excel…" : "Continuar: mapear hojas"}
              </button>
            </>
          )}

          {step === "map" && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  ← Cambiar archivo
                </button>
                <MesPicker label="Mes del documento" value={mesCargo} onChange={setMesCargo} />
                <span className="text-xs text-slate-500">
                  {enabledCount} hoja(s) activas · {inspected.length} detectadas
                </span>
              </div>

              <div className="space-y-3">
                {configs.map((cfg, idx) => {
                  const meta = inspected[idx];
                  const headerOpts = (meta?.headers || []).filter((h) => h.label);
                  return (
                    <div
                      key={cfg.sheetName}
                      className={`rounded border p-3 ${
                        cfg.enabled
                          ? "border-slate-600 bg-slate-800/40"
                          : "border-slate-800 bg-slate-900/40 opacity-70"
                      }`}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-slate-200">
                          <input
                            type="checkbox"
                            checked={cfg.enabled}
                            onChange={(e) => updateConfig(idx, { enabled: e.target.checked })}
                          />
                          <span className="font-semibold">{cfg.sheetName}</span>
                        </label>
                        {meta?.titleHint && (
                          <span className="text-xs text-slate-500">Título: {meta.titleHint}</span>
                        )}
                        {meta?.listadoHint && (
                          <span className="text-xs text-slate-500">{meta.listadoHint}</span>
                        )}
                      </div>

                      {cfg.enabled && (
                        <>
                          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <label className="text-xs text-slate-400">
                              Planta
                              <select
                                value={cfg.planta_id ?? ""}
                                onChange={(e) =>
                                  updateConfig(idx, {
                                    planta_id: e.target.value ? Number(e.target.value) : null,
                                  })
                                }
                                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
                              >
                                <option value="">— seleccionar —</option>
                                {plantas.map((p) => (
                                  <option key={p.clave} value={p.id}>
                                    {p.clave} · {p.title}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="text-xs text-slate-400">
                              Categoría
                              <select
                                value={cfg.categoria}
                                onChange={(e) => updateConfig(idx, { categoria: e.target.value })}
                                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
                              >
                                {CATEGORIAS.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Mapeo de columnas (letra Excel)
                          </p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {FIELD_LABELS.map((f) => (
                              <label key={f.key} className="text-xs text-slate-400">
                                {f.label}
                                {f.hint ? <span className="text-slate-600"> · {f.hint}</span> : null}
                                <div className="mt-1 flex gap-1">
                                  <input
                                    value={cfg.columns[f.key] || ""}
                                    onChange={(e) => updateColumn(idx, f.key, e.target.value)}
                                    placeholder="ej. C"
                                    className="w-16 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm uppercase text-slate-100"
                                  />
                                  <select
                                    value={cfg.columns[f.key] || ""}
                                    onChange={(e) => updateColumn(idx, f.key, e.target.value)}
                                    className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-900 px-1 py-1 text-[11px] text-slate-200"
                                  >
                                    <option value="">—</option>
                                    {headerOpts.map((h) => (
                                      <option key={`${h.col}-${h.label}`} value={h.col}>
                                        {h.col}: {h.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading || enabledCount === 0}
                className="rounded bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
              >
                {loading ? "Analizando…" : "Analizar diferencias"}
              </button>
            </>
          )}

          {step === "result" && result && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("map")}
                  disabled={applying}
                  className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  ← Ajustar mapeo
                </button>
                <span className="text-xs text-slate-400">
                  Hojas: {result.sheets.join(", ")} · Excel {result.excel_count} · Rechazos Excel{" "}
                  {result.excel_rechazos_count ?? 0} · Dashboard {result.dashboard_count} · Coinciden{" "}
                  {result.matched_count}
                </span>
              </div>

              <p className="rounded border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs text-slate-300">
                Revisa las diferencias y marca qué aplicar.{" "}
                <span className="font-medium text-white">Ningún cambio se guarda</span> hasta pulsar{" "}
                <span className="font-medium text-emerald-300">Aceptar cambios</span>.
              </p>

              {result.warnings && result.warnings.length > 0 && (
                <ul className="rounded border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}

              {applyReport && (
                <div
                  className={`rounded border px-3 py-2 text-xs ${
                    applyReport.fallos.length
                      ? "border-amber-800 bg-amber-950/30 text-amber-200"
                      : "border-emerald-800 bg-emerald-950/30 text-emerald-200"
                  }`}
                >
                  Aplicado: {applyReport.agregados} agregado(s), {applyReport.rechazos} rechazo(s)
                  CDJZ.
                  {applyReport.fallos.length > 0 && (
                    <ul className="mt-1 list-disc pl-4 text-amber-300">
                      {applyReport.fallos.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <section className="rounded border border-slate-700 bg-slate-800/30">
                  <div className="border-b border-slate-700 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-amber-300">
                        1. Agregar al dashboard ({missingDash.length})
                      </h3>
                      {missingDash.length > 0 && (
                        <button
                          type="button"
                          className="text-[10px] text-slate-400 hover:text-white"
                          onClick={() =>
                            toggleAll("add", !missingDash.every((_, i) => selAdd[i]))
                          }
                        >
                          {missingDash.every((_, i) => selAdd[i]) ? "Ninguno" : "Todos"}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">Están en el Excel y no en el dashboard.</p>
                  </div>
                  <ul className="max-h-72 space-y-2 overflow-y-auto p-3">
                    {missingDash.length === 0 && <li className="text-xs text-slate-500">Ninguno.</li>}
                    {missingDash.map((item, idx) => (
                      <li
                        key={`md-${idx}-${item.match_key || item.concepto}`}
                        className={`rounded border p-2 text-xs ${
                          selAdd[idx]
                            ? "border-amber-700/60 bg-slate-900/70"
                            : "border-slate-700 bg-slate-900/40"
                        }`}
                      >
                        <label className="flex cursor-pointer gap-2">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={Boolean(selAdd[idx])}
                            disabled={applying}
                            onChange={(e) =>
                              setSelAdd((prev) => ({ ...prev, [idx]: e.target.checked }))
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <div className="font-medium text-slate-200">
                              [{item.categoria}] {item.planta_clave || "—"} · {item.unidad || "—"}
                            </div>
                            {item.beneficiario && (
                              <div className="text-[11px] text-slate-500">
                                Benef.: {item.beneficiario}
                              </div>
                            )}
                            <div className="mt-0.5 text-slate-400">{item.concepto}</div>
                            <div className="mt-1 tabular-nums text-slate-300">
                              {fmtMxn(item.importe)}
                            </div>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded border border-slate-700 bg-slate-800/30">
                  <div className="border-b border-slate-700 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-rose-300">
                        2. Faltan en Excel ({missingExcel.length})
                      </h3>
                      {missingExcel.length > 0 && (
                        <button
                          type="button"
                          className="text-[10px] text-slate-400 hover:text-white"
                          onClick={() =>
                            toggleAll(
                              "miss",
                              !missingExcel.every((it, i) => !it.folio_id || selMissingExcel[i])
                            )
                          }
                        >
                          {missingExcel.every((it, i) => !it.folio_id || selMissingExcel[i])
                            ? "Ninguno"
                            : "Todos"}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      En dashboard del mes; rechazo CDJZ quita mes de cargo.
                    </p>
                  </div>
                  <ul className="max-h-72 space-y-2 overflow-y-auto p-3">
                    {missingExcel.length === 0 && <li className="text-xs text-slate-500">Ninguno.</li>}
                    {missingExcel.map((item, idx) => (
                      <li
                        key={`me-${item.folio_id}-${idx}`}
                        className={`rounded border p-2 text-xs ${
                          selMissingExcel[idx]
                            ? "border-rose-700/60 bg-slate-900/70"
                            : "border-slate-700 bg-slate-900/40"
                        }`}
                      >
                        <label className="flex cursor-pointer gap-2">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={Boolean(selMissingExcel[idx])}
                            disabled={applying || item.folio_id == null}
                            onChange={(e) =>
                              setSelMissingExcel((prev) => ({ ...prev, [idx]: e.target.checked }))
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <div className="font-medium text-slate-200">
                              {item.numero_folio || `ID ${item.folio_id}`} · [{item.categoria}]{" "}
                              {item.unidad || "—"}
                            </div>
                            <div className="mt-0.5 text-slate-400">{item.concepto}</div>
                            <div className="mt-1 tabular-nums text-slate-300">
                              {fmtMxn(item.importe)}
                            </div>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded border border-slate-700 bg-slate-800/30">
                  <div className="border-b border-slate-700 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-orange-300">
                        3. Importe en blanco ({rechazosCdjz.length})
                      </h3>
                      {rechazosCdjz.length > 0 && (
                        <button
                          type="button"
                          className="text-[10px] text-slate-400 hover:text-white"
                          onClick={() =>
                            toggleAll(
                              "blank",
                              !rechazosCdjz.every((it, i) => !it.folio_id || selBlank[i])
                            )
                          }
                        >
                          {rechazosCdjz.every((it, i) => !it.folio_id || selBlank[i])
                            ? "Ninguno"
                            : "Todos"}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Señal de rechazo CDJZ; el importe del folio no se modifica.
                    </p>
                  </div>
                  <ul className="max-h-72 space-y-2 overflow-y-auto p-3">
                    {rechazosCdjz.length === 0 && <li className="text-xs text-slate-500">Ninguno.</li>}
                    {rechazosCdjz.map((item, idx) => (
                      <li
                        key={`bl-${item.folio_id || "x"}-${idx}`}
                        className={`rounded border p-2 text-xs ${
                          selBlank[idx]
                            ? "border-orange-700/60 bg-slate-900/70"
                            : "border-slate-700 bg-slate-900/40"
                        }`}
                      >
                        <label className="flex cursor-pointer gap-2">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={Boolean(selBlank[idx])}
                            disabled={applying || item.folio_id == null}
                            onChange={(e) =>
                              setSelBlank((prev) => ({ ...prev, [idx]: e.target.checked }))
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <div className="font-medium text-slate-200">
                              {item.numero_folio ||
                                (item.folio_id ? `ID ${item.folio_id}` : "Sin folio")}{" "}
                              · [{item.categoria || "—"}]
                            </div>
                            <div className="mt-0.5 text-slate-400">{item.concepto}</div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              Imp. dashboard: {fmtMxn(item.importe_dashboard)}
                              {item.folio_id == null ? " · sin match" : ""}
                              {item.motivo ? ` · ${item.motivo}` : ""}
                            </div>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-emerald-900/40 bg-emerald-950/20 px-3 py-3">
                <p className="text-xs text-slate-300">
                  {countSelected} cambio(s) seleccionado(s) listos para aplicar.
                </p>
                <button
                  type="button"
                  onClick={handleAceptarCambios}
                  disabled={applying || countSelected === 0}
                  className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {applying ? "Aplicando…" : "Aceptar cambios"}
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="rounded border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-700 px-4 py-3">
          <button
            type="button"
            onClick={resetAll}
            className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Reiniciar
          </button>
          <button
            type="button"
            onClick={() => {
              resetAll();
              onClose();
            }}
            className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
