"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getTokenFromStorage, parseTokenFromQuery, setTokenInStorage, tokenCanAccessCompras } from "@/lib/auth";
import {
  createComprasProveedor,
  createComprasPurchase,
  deleteComprasFactura,
  deleteComprasPurchase,
  downloadComprasFacturaBlob,
  downloadComprasExcel,
  previewComprasExcelImport,
  commitComprasExcelImport,
  fetchComprasMonth,
  upsertComprasHg,
  upsertComprasFleteTarifa,
  fetchPlantas,
  patchComprasProveedor,
  patchComprasPurchase,
  uploadComprasFactura,
  type ComprasDocument,
  type ComprasMonthResponse,
  type ComprasProvider,
  type ComprasPurchase,
} from "@/lib/api";
import {
  COMPRAS_EXCEL_HG_NOTICE,
  COMPRAS_IMPORT_PENDING_LABEL,
  comprasImportConfirmPhrase,
  newComprasImportRequestId,
  type ComprasExcelPreview,
} from "@/lib/compras-import";
import {
  COMPRAS_MESES,
  formatCosto,
  formatFechaGrid,
  formatImporte,
  filterComprasPlantasMenu,
  formatFleteImporte,
  formatHgImporte,
  formatHgKilos,
  formatKg,
  formatTarifa,
  hgCosto,
  hgCostoDiario,
  hgImporte,
  hgImporteDiario,
  hgImporteSum,
  parseLocaleNumber,
  toYmd,
} from "@/lib/compras-format";
import { commitHgWrite } from "@/lib/compras-hg-write";
import { commitFleteTarifaWrite } from "@/lib/compras-flete-write";
import ComprasFleteDiario from "@/components/ComprasFleteDiario";
import {
  comprasParticipation,
  formatParticipationPct,
  type ParticipationBag,
  type ParticipationProvider,
} from "@/lib/compras-participation";

type DetailState = {
  proveedor: ComprasProvider;
  fecha: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      resolve(dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : "Error";
  if (/acceso|planta/i.test(msg)) return "No tienes acceso a esta planta.";
  if (/proveedor/i.test(msg)) return "El proveedor no pertenece a esta planta.";
  if (/factura|pdf|válid/i.test(msg)) return "La factura no es válida.";
  if (/kg|importe|fecha/i.test(msg)) return msg;
  return "No se pudo guardar la compra.";
}

function downloadBlob(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

function formatExactAmount(value: number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

const COMPRAS_DOC_BLOCK = "Hay compras con factura sin contraparte en el Excel. No se aplicará la conciliación.";
const COMPRAS_SHEET_KEY = "compras-dashboard-sheet";
const COMPRAS_SEP_CLS = "min-w-[70px] w-[70px] border-0 bg-white p-0";
const COMPRAS_PROVIDER_GAP_CLS = "compras-provider-gap w-3 min-w-[12px] border-0 bg-white p-0";

export function comprasGridColSpan(providerCount: number, fleteExpanded: boolean): number {
  const n = Number.isFinite(providerCount) && providerCount > 0 ? Math.floor(providerCount) : 0;
  const fecha = 1;
  const compras = n * 3 + n;
  const notaCargo = 1;
  const consolidado = 3;
  const sepHg = 1;
  const hg = 3;
  const participacion = 2;
  const sepFlete = 1;
  const flete = fleteExpanded ? n * 3 + n + 3 : 0;
  return fecha + compras + notaCargo + consolidado + sepHg + hg + participacion + sepFlete + flete;
}

function normalizeComprasProviderName(name: string): string {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isNotaCargoProviderName(name: string | null | undefined): boolean {
  return normalizeComprasProviderName(String(name || "")) === "nota de cargo";
}

function notaImporteFrom(
  provider: { id: number } | null,
  bag: Record<string, { importe?: number | null } | undefined> | undefined
): number {
  if (!provider || !bag) return 0;
  const cell = bag[String(provider.id)];
  const n = Number(cell?.importe);
  return Number.isFinite(n) ? n : 0;
}

function readSavedSheet(): { plantaId: number | null; year: number | null; month: number | null } {
  try {
    const raw = localStorage.getItem(COMPRAS_SHEET_KEY);
    if (!raw) return { plantaId: null, year: null, month: null };
    const saved = JSON.parse(raw) as { plantaId?: unknown; year?: unknown; month?: unknown };
    const plantaId = Number(saved.plantaId);
    const year = Number(saved.year);
    const month = Number(saved.month);
    return {
      plantaId: Number.isInteger(plantaId) && plantaId > 0 ? plantaId : null,
      year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null,
      month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : null,
    };
  } catch {
    return { plantaId: null, year: null, month: null };
  }
}

export function ComprasClient() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [plantas, setPlantas] = useState<{ id: number; nombre: string }[]>([]);
  const [plantaId, setPlantaId] = useState<number | null>(null);
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [sheetReady, setSheetReady] = useState(false);
  const [savedPlantaId, setSavedPlantaId] = useState<number | null>(null);
  const [data, setData] = useState<ComprasMonthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [providersOpen, setProvidersOpen] = useState(false);
  const [fleteExpanded, setFleteExpanded] = useState(false);
  const [newProviderName, setNewProviderName] = useState("");
  const [providerSaving, setProviderSaving] = useState(false);
  const [excelBusy, setExcelBusy] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importDesde, setImportDesde] = useState("");
  const [importHasta, setImportHasta] = useState("");
  const [importPreview, setImportPreview] = useState<ComprasExcelPreview | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importRequestId, setImportRequestId] = useState("");
  const [importConfirm, setImportConfirm] = useState("");
  const loadSeq = useRef(0);

  useEffect(() => {
    const t = parseTokenFromQuery(searchParams) || getTokenFromStorage();
    if (t) {
      setTokenInStorage(t);
      setToken(t);
      setUnauthorized(false);
      setSinPermiso(!tokenCanAccessCompras(t));
    } else {
      setToken(null);
      setUnauthorized(true);
      setSinPermiso(false);
    }
  }, [searchParams]);

  useEffect(() => {
    const saved = readSavedSheet();
    if (saved.year != null) setYear(saved.year);
    if (saved.month != null) setMonth(saved.month);
    if (saved.plantaId != null) setSavedPlantaId(saved.plantaId);
    setSheetReady(true);
  }, []);

  useEffect(() => {
    if (!sheetReady || plantaId == null) return;
    localStorage.setItem(COMPRAS_SHEET_KEY, JSON.stringify({ plantaId, year, month }));
  }, [sheetReady, plantaId, year, month]);

  const requestedPlantaId = useMemo(() => {
    const n = Number(searchParams.get("planta_id"));
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [searchParams]);

  const loadPlantas = useCallback(async () => {
    if (!token || !sheetReady || sinPermiso) return;
    try {
      const r = await fetchPlantas(token);
      const list = filterComprasPlantasMenu(r.plantas || []);
      setPlantas(list);
      if (requestedPlantaId && !list.some((p) => p.id === requestedPlantaId)) {
        setPlantaId(null);
        setError("No tienes acceso a esta planta.");
        return;
      }
      setPlantaId((cur) => {
        if (requestedPlantaId && list.some((p) => p.id === requestedPlantaId)) return requestedPlantaId;
        if (cur && list.some((p) => p.id === cur)) return cur;
        if (savedPlantaId && list.some((p) => p.id === savedPlantaId)) return savedPlantaId;
        return list[0]?.id ?? null;
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg.includes("401") || msg.toLowerCase().includes("token")) setUnauthorized(true);
      setError("No tienes acceso a esta planta.");
    }
  }, [token, sheetReady, savedPlantaId, sinPermiso, requestedPlantaId]);

  useEffect(() => {
    void loadPlantas();
  }, [loadPlantas]);

  const loadMonth = useCallback(async () => {
    if (!token || !plantaId || !sheetReady) return;
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchComprasMonth(token, plantaId, year, month);
      if (seq !== loadSeq.current) return;
      setData(payload);
      setError(null);
    } catch (e: unknown) {
      if (seq !== loadSeq.current) return;
      setError(friendlyError(e));
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [token, plantaId, year, month, sheetReady]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  const years = useMemo(() => {
    const y = now.getFullYear();
    const set = new Set([y - 2, y - 1, y, y + 1, year]);
    return Array.from(set).sort((a, b) => a - b);
  }, [now, year]);

  const sheetProviders = data?.providers || [];
  const notaCargoProvider = sheetProviders.find((p) => isNotaCargoProviderName(p.nombre)) ?? null;
  const providers = sheetProviders.filter((p) => !isNotaCargoProviderName(p.nombre));
  const allProviders = data?.all_providers || [];
  const manageableProviders = allProviders.filter((p) => !isNotaCargoProviderName(p.nombre));
  const dayByYmd = useMemo(() => {
    const m = new Map<string, ComprasMonthResponse["grid"]["days"][number]>();
    for (const d of data?.grid.days || []) m.set(d.ymd, d);
    return m;
  }, [data]);
  const weekByNum = useMemo(() => {
    const m = new Map<number, ComprasMonthResponse["grid"]["weeks"][number]>();
    for (const w of data?.grid.weeks || []) m.set(w.week, w);
    return m;
  }, [data]);

  const igfHref = token ? `/igf-forecast?t=${encodeURIComponent(token)}` : "/igf-forecast";
  const plantaNombre = plantas.find((p) => p.id === plantaId)?.nombre || "";
  const importPhrase = comprasImportConfirmPhrase(plantaNombre || "PLANTA", importDesde, importHasta);

  async function reviewImport() {
    if (!token || !plantaId || !importFile || importBusy) return;
    setImportBusy(true);
    setError(null);
    try {
      const fileBase64 = await fileToBase64(importFile);
      const preview = await previewComprasExcelImport(token, {
        planta_id: plantaId,
        desde: importDesde,
        hasta: importHasta,
        file_name: importFile.name,
        fileBase64,
      });
      setImportPreview(preview);
      setImportRequestId(newComprasImportRequestId());
      setImportConfirm("");
    } catch (e: unknown) {
      setImportPreview(null);
      setError(friendlyError(e));
    } finally {
      setImportBusy(false);
    }
  }

  async function commitImport() {
    if (!token || !plantaId || !importFile || importBusy || !importPreview?.ok) return;
    if (importConfirm.trim() !== importPhrase) return;
    const requestId = importRequestId || newComprasImportRequestId();
    setImportBusy(true);
    setError(null);
    try {
      const fileBase64 = await fileToBase64(importFile);
      await commitComprasExcelImport(token, {
        planta_id: plantaId,
        desde: importDesde,
        hasta: importHasta,
        file_name: importFile.name,
        fileBase64,
        request_id: requestId,
      });
      setImportFile(null);
      setImportPreview(null);
      setImportConfirm("");
      await loadMonth();
    } catch (e: unknown) {
      setError(friendlyError(e));
    } finally {
      setImportBusy(false);
    }
  }

  async function handleCreateProvider() {
    if (!token || !plantaId || !newProviderName.trim() || providerSaving) return;
    if (isNotaCargoProviderName(newProviderName)) {
      setError("NOTA DE CARGO es un origen reservado del sistema.");
      return;
    }
    setProviderSaving(true);
    setError(null);
    try {
      await createComprasProveedor(token, plantaId, {
        nombre: newProviderName.trim(),
        orden: allProviders.length,
      });
      setNewProviderName("");
      await loadMonth();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setProviderSaving(false);
    }
  }

  async function handleToggleProvider(p: ComprasProvider) {
    if (!token || !plantaId) return;
    try {
      await patchComprasProveedor(token, plantaId, p.id, { activo: !p.activo });
      await loadMonth();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  async function handleMoveProvider(p: ComprasProvider, delta: number) {
    if (!token || !plantaId) return;
    try {
      await patchComprasProveedor(token, plantaId, p.id, { orden: (p.orden || 0) + delta });
      await loadMonth();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  if (unauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-slate-300">Inicia sesión en el dashboard para abrir Compras.</p>
      </div>
    );
  }

  if (sinPermiso) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-slate-300">No tienes permiso de Compras.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">Tomza en Acción</p>
          <h1 className="text-xl font-semibold text-white">CONTROL DE COMPRAS</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>Planta</span>
            <select
              aria-label="selector planta"
              value={plantaId ?? ""}
              onChange={(e) => setPlantaId(e.target.value ? Number(e.target.value) : null)}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
            >
              {plantas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>Año</span>
            <select
              aria-label="selector año"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>Mes</span>
            <select
              aria-label="selector mes"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
            >
              {COMPRAS_MESES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!token || !plantaId || excelBusy}
            onClick={() => {
              if (!token || !plantaId || excelBusy) return;
              setExcelBusy(true);
              void downloadComprasExcel(token, plantaId, year, month)
                .catch((e) => setError(friendlyError(e)))
                .finally(() => setExcelBusy(false));
            }}
            className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {excelBusy ? "Descargando…" : "Descargar Excel"}
          </button>
          <button
            type="button"
            disabled={!token || !plantaId || data?.reconcile_ready !== true}
            title={data?.reconcile_ready === true ? "Revisar conciliación" : COMPRAS_IMPORT_PENDING_LABEL}
            onClick={() => {
              if (data?.reconcile_ready !== true) return;
              document.getElementById("compras-excel-import-file")?.click();
            }}
            className="rounded bg-amber-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Revisar conciliación
          </button>
          {data?.reconcile_ready !== true && (
            <span className="text-xs text-amber-200">{COMPRAS_IMPORT_PENDING_LABEL}</span>
          )}
          <input
            id="compras-excel-import-file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              e.target.value = "";
              if (!file) return;
              setImportFile(file);
              setImportPreview(null);
              setImportConfirm("");
              setImportRequestId(newComprasImportRequestId());
            }}
          />
          <button
            type="button"
            aria-expanded={fleteExpanded}
            aria-label={fleteExpanded ? "Ocultar valor del flete según origen" : "Mostrar valor del flete según origen"}
            onClick={() => setFleteExpanded((v) => !v)}
            className="rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
          >
            {fleteExpanded ? "▼ OCULTAR FLETE" : "▶ MOSTRAR FLETE"}
          </button>
          <button
            type="button"
            onClick={() => setProvidersOpen((v) => !v)}
            className="rounded border border-cyan-600/70 bg-slate-900 px-3 py-1.5 text-xs text-cyan-100"
          >
            Proveedores
          </button>
          <Link href={igfHref} className="rounded bg-slate-700 px-3 py-1.5 text-xs text-white hover:bg-slate-600">
            Volver a IGF Forecast
          </Link>
        </div>
      </header>

      <main className="p-4">
        {error && (
          <p className="mb-3 flex items-start justify-between gap-3 rounded border border-red-700/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            <span>{error}</span>
            <button type="button" aria-label="Cerrar aviso" className="shrink-0 text-xs text-red-100" onClick={() => setError(null)}>Cerrar</button>
          </p>
        )}
        {providersOpen && (
          <section className="mb-4 rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <h2 className="mb-2 text-sm font-medium text-slate-200">Proveedores de {plantaNombre || "la planta"}</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              <input
                value={newProviderName}
                onChange={(e) => setNewProviderName(e.target.value)}
                placeholder="Nombre del proveedor"
                className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-white"
              />
              <button
                type="button"
                disabled={providerSaving || !newProviderName.trim()}
                onClick={() => void handleCreateProvider()}
                className="rounded bg-cyan-800 px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                {providerSaving ? "Guardando…" : "Agregar"}
              </button>
            </div>
            <ul className="space-y-1 text-sm">
              {manageableProviders.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 text-slate-200">
                  <span className={p.activo ? "" : "line-through text-slate-500"}>{p.nombre}</span>
                  <button type="button" className="text-xs text-cyan-300" onClick={() => void handleMoveProvider(p, -1)}>
                    Subir
                  </button>
                  <button type="button" className="text-xs text-cyan-300" onClick={() => void handleMoveProvider(p, 1)}>
                    Bajar
                  </button>
                  <button type="button" className="text-xs text-amber-300" onClick={() => void handleToggleProvider(p)}>
                    {p.activo ? "Desactivar" : "Activar"}
                  </button>
                </li>
              ))}
              {!manageableProviders.length && <li className="text-slate-400">Sin proveedores. Agrega al menos uno para capturar.</li>}
            </ul>
          </section>
        )}

        <div className="overflow-x-auto bg-white text-slate-900 shadow">
          <div className="flex min-w-max items-start justify-between gap-8 px-6 pb-2 pt-5">
            <div>
              <h2 className="text-[28px] font-bold leading-none tracking-tight text-black">CONTROL DE COMPRAS</h2>
              <p className="mt-3 text-[11px] uppercase tracking-wide text-slate-700">PLANTA {plantaNombre || "—"}</p>
            </div>
            <div className="pr-6 text-right">
              <p className="text-[28px] font-semibold leading-none text-black">{year}</p>
              <p className="mt-3 text-[11px] uppercase text-slate-600">
                MES <span className="ml-3 font-semibold text-black">{(COMPRAS_MESES[month - 1] || "").toUpperCase()}</span>
              </p>
            </div>
          </div>
          <table className="min-w-max border-separate border-spacing-0 text-[11px]">
            <thead>
              <tr>
                <th rowSpan={3} className="compras-provider-title sticky left-0 z-20 min-w-[92px] border border-black bg-black px-2 py-2 text-center font-semibold text-white">
                  FECHA
                </th>
                {providers.map((p) => (
                  <Fragment key={`t-${p.id}`}>
                    <th
                      colSpan={3}
                      className="compras-provider-title border-b border-black bg-white px-2 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-black"
                    >
                      {token && plantaId ? (
                        <TarifaCell
                          key={`${plantaId}:${p.id}:${year}:${month}`}
                          token={token}
                          plantaId={plantaId}
                          proveedorId={p.id}
                          proveedorNombre={p.nombre}
                          year={year}
                          month={month}
                          value={tarifaOf(data, p.id)}
                          overrides={data?.fletes_diarios || []}
                          onSaved={loadMonth}
                          onError={setError}
                        />
                      ) : (
                        <span className="mb-1 block text-[9px] font-semibold normal-case tracking-normal text-slate-600">
                          TARIFA {formatTarifa(tarifaOf(data, p.id))}
                        </span>
                      )}
                      {p.nombre}
                    </th>
                    <th rowSpan={3} className={COMPRAS_PROVIDER_GAP_CLS} />
                  </Fragment>
                ))}
                <th className="compras-provider-title border-b border-black bg-white px-2 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-black">
                  NOTA DE CARGO
                </th>
                <th colSpan={3} className="compras-provider-title border-b border-black bg-white px-2 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-black">
                  CONSOLIDADO
                </th>
                <th rowSpan={3} className={`compras-hg-gap ${COMPRAS_SEP_CLS}`} />
                <th colSpan={3} className="compras-hg-title border-b border-black bg-white px-2 py-2 text-center text-[12px] font-bold uppercase tracking-wide text-black">
                  HG
                </th>
                <th rowSpan={3} className="compras-participation-title min-w-[96px] border border-black bg-black px-2 py-2 text-center text-[12px] font-bold uppercase tracking-wide text-white">
                  TUXPAN
                </th>
                <th rowSpan={3} className="compras-participation-title min-w-[96px] border border-black bg-black px-2 py-2 text-center text-[12px] font-bold uppercase tracking-wide text-white">
                  TEPEJI
                </th>
                <th rowSpan={3} className={`compras-flete-gap ${COMPRAS_SEP_CLS}`} />
                {fleteExpanded && (
                  <th
                    colSpan={Math.max(3, providers.length * 4 + 3)}
                    className="compras-flete-title border-b border-black bg-white px-2 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-black"
                  >
                    VALOR DEL FLETE SEGÚN ORIGEN
                  </th>
                )}
              </tr>
              <tr>
                {providers.map((p) => (
                  <MetricHeads key={`m-${p.id}`} rowSpan={2} />
                ))}
                <th rowSpan={2} className="min-w-[88px] border border-black bg-black px-1 py-1 text-center font-normal text-white">
                  IMPORTE
                </th>
                <MetricHeads rowSpan={2} />
                <HgMetricHeads rowSpan={2} />
                {fleteExpanded &&
                  providers.map((p) => (
                    <Fragment key={`ft-${p.id}`}>
                      <th
                        colSpan={3}
                        className="compras-flete-origin border-b border-black bg-white px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-black"
                      >
                        {p.nombre}
                      </th>
                      <th rowSpan={2} className={COMPRAS_PROVIDER_GAP_CLS} />
                    </Fragment>
                  ))}
                {fleteExpanded && (
                  <th colSpan={3} className="compras-flete-origin border-b border-black bg-white px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-black">
                    CONSOLIDADO
                  </th>
                )}
              </tr>
              <tr>
                {fleteExpanded &&
                  providers.map((p) => (
                    <FleteMetricHeads key={`fm-${p.id}`} />
                  ))}
                {fleteExpanded && <FleteMetricHeads />}
              </tr>
            </thead>
            <tbody>
              {!data && (
                <tr>
                  <td colSpan={comprasGridColSpan(providers.length, fleteExpanded)} className="px-3 py-6 text-center text-slate-500">
                    {loading ? "Cargando…" : "Selecciona planta, año y mes."}
                  </td>
                </tr>
              )}
              {data?.grid.rows.map((row) => {
                if (row.type === "day") {
                  const day = dayByYmd.get(row.ymd);
                  const captured = Boolean(day?.captured);
                  return (
                    <tr key={row.ymd}>
                      <td
                        data-captured={captured ? "1" : "0"}
                        className={`sticky left-0 z-[1] border border-black px-2 py-1 font-medium ${
                          day?.fecha_discrepante
                            ? "bg-[#fff2cc] text-slate-900 compras-fecha-capturada"
                            : captured
                              ? "bg-[#b8cce4] text-slate-900 compras-fecha-capturada"
                              : "bg-white text-slate-800"
                        }`}
                      >
                        {formatFechaGrid(row.ymd)}
                      </td>
                      {providers.map((p) => {
                        const cell = day?.cells[String(p.id)] || day?.cells[p.id];
                        return (
                          <Fragment key={`${row.ymd}-${p.id}`}>
                            <ProviderCells
                              onClick={() => setDetail({ proveedor: p, fecha: row.ymd })}
                              kg={cell?.kg || 0}
                              importe={cell?.importe || 0}
                              costo={cell?.costo_kg ?? null}
                            />
                            <td className={COMPRAS_PROVIDER_GAP_CLS} />
                          </Fragment>
                        );
                      })}
                      <NotaCargoCell importe={notaImporteFrom(notaCargoProvider, day?.cells)} />
                      <ReadOnlyTriple kg={day?.consolidado.kg || 0} importe={day?.consolidado.importe || 0} costo={day?.consolidado.costo_kg ?? null} consolidado />
                      <td className={`compras-hg-gap ${COMPRAS_SEP_CLS}`} />
                      <HgDerivedCells
                        costo={hgCostoDiario(day) !== undefined
                          ? hgCostoDiario(day)
                          : hgCosto(day?.consolidado?.costo_kg, day?.flete?.consolidado?.tarifa)}
                        hg={day?.hg_kilos ?? null}
                        importe={hgImporteDiario(day) !== undefined
                          ? hgImporteDiario(day)
                          : hgImporte(
                            hgCosto(day?.consolidado?.costo_kg, day?.flete?.consolidado?.tarifa),
                            day?.hg_kilos ?? null
                          )}
                        editable={Boolean(token && plantaId)}
                        token={token}
                        plantaId={plantaId}
                        fecha={row.ymd}
                        onSaved={loadMonth}
                        onError={setError}
                      />
                      <PurchaseParticipationBlank />
                      <PurchaseParticipationBlank />
                      <td className={`compras-flete-gap ${COMPRAS_SEP_CLS}`} />
                      {fleteExpanded && <FleteRowCells providers={providers} flete={day?.flete} />}
                    </tr>
                  );
                }
                const week = weekByNum.get(row.week);
                return (
                  <Fragment key={`semana-${row.week}`}>
                    <tr>
                      <td className="sticky left-0 z-[1] border border-black bg-black px-2 py-1 font-semibold text-white">Semana {row.week}</td>
                      {providers.map((p) => {
                        const cell = week?.providers[String(p.id)] || week?.providers[p.id];
                        return (
                          <Fragment key={`w-${row.week}-${p.id}`}>
                            <ReadOnlyTriple
                              kg={cell?.kg || 0}
                              importe={cell?.importe || 0}
                              costo={cell?.costo_kg ?? null}
                              showZero
                              tone="week"
                            />
                            <td className={COMPRAS_PROVIDER_GAP_CLS} />
                          </Fragment>
                        );
                      })}
                      <NotaCargoCell importe={notaImporteFrom(notaCargoProvider, week?.providers)} showZero />
                      <ReadOnlyTriple
                        kg={week?.consolidado.kg || 0}
                        importe={week?.consolidado.importe || 0}
                        costo={week?.consolidado.costo_kg ?? null}
                        showZero
                        tone="week"
                        consolidado
                      />
                      <td className={`compras-hg-gap ${COMPRAS_SEP_CLS}`} />
                      <HgDerivedCells
                        costo={hgCosto(week?.consolidado?.costo_kg, week?.flete?.consolidado?.tarifa)}
                        hg={week?.hg_kilos ?? null}
                        importe={hgImporteSum(
                          (data?.grid.days || []).filter((d) => (week?.ymds || []).includes(d.ymd))
                        )}
                        bold
                      />
                      <PurchaseParticipationCells
                        providers={sheetProviders}
                        bag={week?.providers}
                        consolidatedKg={week?.consolidado?.kg}
                      />
                      <td className={`compras-flete-gap ${COMPRAS_SEP_CLS}`} />
                      {fleteExpanded && <FleteRowCells providers={providers} flete={week?.flete} showZero />}
                    </tr>
                    <tr className="compras-week-gap h-3">
                      <td className="border-0 bg-white p-0" colSpan={comprasGridColSpan(providers.length, fleteExpanded)} />
                    </tr>
                  </Fragment>
                );
              })}
              {data && (
                <tr>
                  <td className="sticky left-0 z-[1] border border-black bg-black px-2 py-1 font-bold text-white">TOTAL MES</td>
                  {providers.map((p) => {
                    const cell = data.grid.month.providers[String(p.id)] || data.grid.month.providers[p.id];
                    return (
                      <Fragment key={`m-${p.id}`}>
                        <ReadOnlyTriple
                          kg={cell?.kg || 0}
                          importe={cell?.importe || 0}
                          costo={cell?.costo_kg ?? null}
                          showZero
                          tone="total"
                        />
                        <td className={COMPRAS_PROVIDER_GAP_CLS} />
                      </Fragment>
                    );
                  })}
                  <NotaCargoCell importe={notaImporteFrom(notaCargoProvider, data.grid.month.providers)} showZero />
                  <ReadOnlyTriple
                    kg={data.grid.month.consolidado.kg || 0}
                    importe={data.grid.month.consolidado.importe || 0}
                    costo={data.grid.month.consolidado.costo_kg ?? null}
                    showZero
                    tone="total"
                    consolidado
                  />
                  <td className={`compras-hg-gap ${COMPRAS_SEP_CLS}`} />
                  <HgDerivedCells
                    costo={hgCosto(data.grid.month.consolidado?.costo_kg, data.grid.month.flete?.consolidado?.tarifa)}
                    hg={data.grid.month.hg_kilos ?? null}
                    importe={hgImporteSum(data.grid.days || [])}
                    bold
                  />
                  <PurchaseParticipationCells
                    providers={sheetProviders}
                    bag={data.grid.month.providers}
                    consolidatedKg={data.grid.month.consolidado?.kg}
                  />
                  <td className={`compras-flete-gap ${COMPRAS_SEP_CLS}`} />
                  {fleteExpanded && <FleteRowCells providers={providers} flete={data.grid.month.flete} showZero />}
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">Haz clic en las celdas de un proveedor para agregar, editar o adjuntar facturas. El consolidado y los costos se calculan solos.</p>
      </main>

      {importFile && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-amber-700 bg-slate-950 p-4 text-sm text-slate-100">
            <h2 className="text-base font-semibold">Revisar conciliación</h2>
            <p className="mt-2 text-amber-200">{COMPRAS_EXCEL_HG_NOTICE}</p>
            <p className="mt-2">Archivo: {importFile.name}</p>
            <p>Planta destino: {plantaNombre || "—"}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <label className="text-xs">
                Fecha desde
                <input type="date" value={importDesde} onChange={(e) => { setImportDesde(e.target.value); setImportPreview(null); }} className="mt-1 block rounded border border-slate-600 bg-slate-900 px-2 py-1" />
              </label>
              <label className="text-xs">
                Fecha hasta
                <input type="date" value={importHasta} onChange={(e) => { setImportHasta(e.target.value); setImportPreview(null); }} className="mt-1 block rounded border border-slate-600 bg-slate-900 px-2 py-1" />
              </label>
            </div>
            <button type="button" disabled={importBusy || !importDesde || !importHasta} onClick={() => void reviewImport()} className="mt-3 rounded bg-slate-700 px-3 py-1.5 text-xs disabled:opacity-50">
              {importBusy ? "Revisando…" : "Revisar conciliación"}
            </button>
            {importPreview && (
              <div className="mt-3 space-y-1 text-xs">
                <p>A1: {importPreview.a1 || "—"} · planta {importPreview.plant || "—"}{importPreview.source_company ? ` · ${importPreview.source_company}` : ""}</p>
                <p>Hojas: {(importPreview.sheets || []).join(", ") || "—"}</p>
                <p>Filas Excel: {importPreview.excel_rows ?? importPreview.inserts ?? 0} · Reconciliadas: {importPreview.reconciled ?? 0} · Con factura: {importPreview.reconciled_with_invoice ?? 0}</p>
                <p>Discrepancias: {importPreview.discrepancies ?? 0} · Nuevas: {importPreview.nuevas ?? 0} · Se eliminan sin factura: {importPreview.deletes ?? 0} · Bloqueos: {importPreview.document_blockers ?? 0}</p>
                <p>Notas de cargo: {importPreview.notas ?? 0}</p>
                <p>Kg efectivo actual {importPreview.kg_effective_before ?? importPreview.kg_before ?? 0} · kg Excel {importPreview.kg_excel ?? 0}</p>
                <p>Importe efectivo actual {importPreview.importe_effective_before ?? importPreview.importe_before ?? 0} · importe Excel {importPreview.importe_excel ?? 0}</p>
                <p>MAX_FECHA_EXCEL_EN_RANGO: {importPreview.max_fecha_excel_en_rango || "—"}</p>
                {importPreview.excel_range_warning ? <p className="text-amber-300">{importPreview.excel_range_warning}</p> : null}
                {Object.entries(importPreview.by_provider || {}).map(([name, cell]) => (
                  <p key={name}>{name}: {cell.rows} filas · {cell.kg} kg · {cell.importe}</p>
                ))}
                {(importPreview.provider_repairs || 0) > 0 && <p>provider_repairs: {importPreview.provider_repairs}</p>}
                {(importPreview.provider_repair_rows || []).map((row) => (
                  <p key={`repair-${row.compra_id}`}>compra {row.compra_id} · {row.fecha} · {row.kg} kg · {row.from_provider} → {row.to_provider}{row.has_document ? " · con factura" : ""}</p>
                ))}
                <p>legacy_matched_to_source: {importPreview.legacy_matched_to_source || 0}</p>
                <p>legacy_remaining_unclassified: {importPreview.legacy_remaining_unclassified || 0}</p>
                {(importPreview.document_blockers || 0) > 0 && <p className="text-red-300">{COMPRAS_DOC_BLOCK}</p>}
                {(importPreview.errors || []).filter((err) => err.code !== "UNMATCHED_DOCUMENT_PURCHASE").map((err) => (
                  <p key={`${err.code}-${err.sheet || ""}-${err.row || ""}-${err.fecha || ""}`} className="text-red-300">
                    {err.code}{err.sheet ? ` · ${err.sheet}` : ""}{err.row != null ? ` · fila ${err.row}` : ""}{err.fecha ? ` · ${err.fecha}` : ""}
                  </p>
                ))}
                {!importPreview.ok && (importPreview.error || importPreview.message) !== COMPRAS_DOC_BLOCK && !(importPreview.errors || []).some((err) => err.code === (importPreview.message || "")) && (
                  <p className="text-red-300">{importPreview.error || importPreview.message || "Importación bloqueada"}</p>
                )}
              </div>
            )}
            {importPreview?.ok && (
              <div className="mt-3">
                <p className="text-xs text-amber-200">Escribe exactamente: {importPhrase}</p>
                <input value={importConfirm} onChange={(e) => setImportConfirm(e.target.value)} className="mt-1 w-full rounded border border-amber-700 bg-slate-900 px-2 py-1 text-xs" />
                <button
                  type="button"
                  disabled={importBusy || importConfirm.trim() !== importPhrase}
                  onClick={() => void commitImport()}
                  className="mt-2 rounded bg-red-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {importBusy ? "Aplicando…" : "Aplicar Excel"}
                </button>
              </div>
            )}
            <button type="button" className="mt-3 text-xs text-slate-300" onClick={() => { if (importBusy) return; setImportFile(null); setImportPreview(null); }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {detail && token && plantaId && data && (
        <ComprasDetailModal
          token={token}
          plantaId={plantaId}
          data={data}
          detail={detail}
          onClose={() => setDetail(null)}
          onChanged={loadMonth}
        />
      )}
    </div>
  );
}

function HgDayCell({
  token,
  plantaId,
  fecha,
  value,
  onSaved,
  onError,
}: {
  token: string;
  plantaId: number;
  fecha: string;
  value: number | null;
  onSaved: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [text, setText] = useState(formatHgKilos(value));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setText(formatHgKilos(value));
  }, [value, fecha]);

  async function persist(next: number | null) {
    setSaving(true);
    const out = await commitHgWrite({
      next,
      confirmed: value,
      write: (hg) => upsertComprasHg(token, plantaId, { fecha, hg_kilos: hg }),
      reload: onSaved,
      onError,
    });
    setText(formatHgKilos(out.restore));
    setSaving(false);
  }

  async function commit() {
    if (saving) return;
    const raw = text.trim();
    if (raw === "") {
      if (value == null) return;
      await persist(null);
      return;
    }
    const n = parseLocaleNumber(raw);
    if (n == null) {
      setText(formatHgKilos(value));
      return;
    }
    const stored = Math.round(n);
    if (value != null && stored === value) {
      setText(formatHgKilos(value));
      return;
    }
    await persist(stored);
  }

  return (
    <td className="min-w-[56px] max-w-[72px] border border-black bg-[#d9d9d9] p-0">
      <input
        aria-label={`HG EN KILOS ${fecha}`}
        value={text}
        disabled={saving}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-full bg-transparent px-1 py-1 text-right tabular-nums outline-none"
      />
    </td>
  );
}

function PurchaseParticipationBlank() {
  return <td data-participation="blank" className="border border-black bg-white" />;
}

function PurchaseParticipationCell({ label, kg, pct }: { label: string; kg: number; pct: number | null }) {
  return (
    <td data-participation={label} className="min-w-[96px] border border-black bg-white px-1 py-1 text-center align-middle">
      <div className="text-[16px] font-bold leading-tight tabular-nums text-black">{formatParticipationPct(pct)}</div>
      <div className="text-[11px] font-medium leading-tight tabular-nums text-slate-700">{`${formatKg(kg, true)} kg`}</div>
    </td>
  );
}

function PurchaseParticipationCells({
  providers,
  bag,
  consolidatedKg,
}: {
  providers: ParticipationProvider[];
  bag: ParticipationBag;
  consolidatedKg: number | null | undefined;
}) {
  const participation = comprasParticipation(providers, bag, consolidatedKg);
  return (
    <>
      <PurchaseParticipationCell label="TUXPAN" kg={participation.tuxpan.kg} pct={participation.tuxpan.pct} />
      <PurchaseParticipationCell label="TEPEJI" kg={participation.tepeji.kg} pct={participation.tepeji.pct} />
    </>
  );
}

function HgMetricHeads({ rowSpan }: { rowSpan?: number }) {
  return (
    <>
      <th rowSpan={rowSpan} className="min-w-[70px] border border-black bg-black px-1 py-1 text-center font-normal text-white">
        COSTO
      </th>
      <th rowSpan={rowSpan} className="min-w-[56px] max-w-[72px] border border-black bg-black px-1 py-1 text-center font-normal text-white">
        HG EN KILOS
      </th>
      <th rowSpan={rowSpan} className="min-w-[80px] border border-black bg-black px-1 py-1 text-center font-normal text-white">
        IMPORTE
      </th>
    </>
  );
}

function HgDerivedCells({
  costo,
  hg,
  importe,
  editable,
  bold,
  token,
  plantaId,
  fecha,
  onSaved,
  onError,
}: {
  costo: number | null;
  hg: number | null;
  importe: number | null;
  editable?: boolean;
  bold?: boolean;
  token?: string | null;
  plantaId?: number | null;
  fecha?: string;
  onSaved?: () => Promise<void>;
  onError?: (message: string | null) => void;
}) {
  const costCls = `border border-black bg-white px-1 py-1 text-right tabular-nums ${bold || costo != null ? "font-bold" : ""}`;
  const impCls = `border border-black bg-white px-1 py-1 text-right tabular-nums ${bold || importe != null ? "font-bold" : ""}`;
  return (
    <>
      <td className={costCls}>{formatCosto(costo)}</td>
      {editable && token && plantaId && fecha && onSaved && onError ? (
        <HgDayCell
          token={token}
          plantaId={plantaId}
          fecha={fecha}
          value={hg}
          onSaved={onSaved}
          onError={onError}
        />
      ) : (
        <td
          className={`min-w-[56px] max-w-[72px] border border-black px-1 py-1 text-right tabular-nums ${
            bold ? "bg-white font-bold" : "bg-[#d9d9d9]"
          }`}
        >
          {formatHgKilos(hg)}
        </td>
      )}
      <td className={impCls}>{formatHgImporte(importe)}</td>
    </>
  );
}

function MetricHeads({ rowSpan }: { rowSpan?: number }) {
  return (
    <>
      <th rowSpan={rowSpan} className="min-w-[78px] border border-black bg-black px-1 py-1 text-center font-normal text-white">COMPRA KG</th>
      <th rowSpan={rowSpan} className="min-w-[70px] border border-black bg-black px-1 py-1 text-center font-normal text-white">COSTO KG</th>
      <th rowSpan={rowSpan} className="min-w-[88px] border border-black bg-black px-1 py-1 text-center font-normal text-white">IMPORTE</th>
    </>
  );
}

function FleteMetricHeads() {
  return (
    <>
      <th className="min-w-[78px] border border-black bg-black px-1 py-1 text-center font-normal text-white">COMPRA KG</th>
      <th className="min-w-[70px] border border-black bg-black px-1 py-1 text-center font-normal text-white">TARIFA</th>
      <th className="min-w-[88px] border border-black bg-black px-1 py-1 text-center font-normal text-white">IMPORTE</th>
    </>
  );
}

function tarifaOf(data: ComprasMonthResponse | null | undefined, proveedorId: number): number | null {
  const hit = (data && data.tarifas_flete ? data.tarifas_flete : []).find((t) => Number(t.proveedor_id) === Number(proveedorId));
  return hit && hit.tarifa != null ? Number(hit.tarifa) : null;
}

function fleteCellOf(
  flete:
    | {
        providers: Record<string, { kg: number; tarifa: number | null; importe: number | null }>;
        consolidado: { kg: number; tarifa: number | null; importe: number | null };
      }
    | undefined,
  proveedorId: number
) {
  if (!flete) return { kg: 0, tarifa: null as number | null, importe: 0 as number | null };
  return flete.providers[String(proveedorId)] || flete.providers[proveedorId] || { kg: 0, tarifa: null, importe: 0 };
}

function FleteRowCells({
  providers,
  flete,
  showZero = false,
}: {
  providers: ComprasProvider[];
  flete?: {
    providers: Record<string, { kg: number; tarifa: number | null; importe: number | null }>;
    consolidado: { kg: number; tarifa: number | null; importe: number | null };
  };
  showZero?: boolean;
}) {
  const cons = (flete && flete.consolidado) || { kg: 0, tarifa: null, importe: 0 };
  return (
    <>
      {providers.map((p) => {
        const cell = fleteCellOf(flete, p.id);
        return (
          <Fragment key={`flete-${p.id}`}>
            <td className="border border-black bg-white px-1 py-1 text-right tabular-nums">{formatKg(cell.kg, showZero)}</td>
            <td className="border border-black bg-white px-1 py-1 text-right tabular-nums">{formatTarifa(cell.tarifa)}</td>
            <td className="border border-black bg-white px-1 py-1 text-right tabular-nums">
              {formatFleteImporte(cell.importe, showZero || cell.kg === 0)}
            </td>
            <td className={COMPRAS_PROVIDER_GAP_CLS} />
          </Fragment>
        );
      })}
      <td className="border border-black bg-white px-1 py-1 text-right tabular-nums">{formatKg(cons.kg, showZero)}</td>
      <td className="border border-black bg-white px-1 py-1 text-right tabular-nums">{formatTarifa(cons.tarifa)}</td>
      <td className="border border-black bg-white px-1 py-1 text-right tabular-nums">
        {formatFleteImporte(cons.importe, showZero || cons.kg === 0)}
      </td>
    </>
  );
}

function TarifaCell({
  token,
  plantaId,
  proveedorId,
  proveedorNombre,
  year,
  month,
  value,
  overrides,
  onSaved,
  onError,
}: {
  token: string;
  plantaId: number;
  proveedorId: number;
  proveedorNombre: string;
  year: number;
  month: number;
  value: number | null;
  overrides: { proveedor_id: number; fecha: string; tarifa: number }[];
  onSaved: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [text, setText] = useState(formatTarifa(value));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setText(formatTarifa(value));
  }, [value, proveedorId, year, month]);

  async function persist(next: number | null) {
    setSaving(true);
    const out = await commitFleteTarifaWrite({
      next,
      confirmed: value,
      write: (tarifa) => upsertComprasFleteTarifa(token, plantaId, { proveedor_id: proveedorId, year, month, tarifa }),
      reload: onSaved,
      onError,
    });
    setText(formatTarifa(out.restore));
    setSaving(false);
  }

  async function commit() {
    if (saving) return;
    const raw = text.trim();
    if (raw === "") {
      if (value == null) return;
      await persist(null);
      return;
    }
    const n = parseLocaleNumber(raw);
    if (n == null || n < 0) {
      setText(formatTarifa(value));
      return;
    }
    if (value != null && n === value) {
      setText(formatTarifa(value));
      return;
    }
    await persist(n);
  }

  return (
    <div className="mb-1 flex items-center justify-center gap-1 text-[9px] font-semibold normal-case tracking-normal text-slate-700">
      <ComprasFleteDiario token={token} plantaId={plantaId} proveedorId={proveedorId} nombre={proveedorNombre} year={year} month={month} defaultValue={value} overrides={overrides} onSaved={onSaved} />
      <span>Base</span>
      <input
        aria-label={`TARIFA ${proveedorNombre}`}
        value={text}
        disabled={saving}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-16 border border-slate-400 bg-white px-1 py-0.5 text-right text-[11px] tabular-nums text-black outline-none"
      />
    </div>
  );
}

function ProviderCells({
  kg,
  importe,
  costo,
  onClick,
}: {
  kg: number;
  importe: number;
  costo: number | null;
  onClick: () => void;
}) {
  return (
    <>
      <td className="cursor-pointer border border-black bg-[#d9d9d9] px-1 py-1 text-right tabular-nums hover:bg-slate-200" onClick={onClick}>
        {formatKg(kg)}
      </td>
      <td className={`cursor-pointer border border-black bg-white px-1 py-1 text-right tabular-nums hover:bg-slate-50 ${costo != null ? "font-bold" : ""}`} onClick={onClick}>
        {formatCosto(costo)}
      </td>
      <td className="cursor-pointer border border-black bg-[#d9d9d9] px-1 py-1 text-right tabular-nums hover:bg-slate-200" onClick={onClick}>
        {formatImporte(importe)}
      </td>
    </>
  );
}

function NotaCargoCell({ importe, showZero }: { importe: number; showZero?: boolean }) {
  return (
    <td className={`border border-black bg-[#d9d9d9] px-1 py-1 text-right tabular-nums ${showZero ? "font-bold" : ""}`}>
      {formatImporte(importe, Boolean(showZero))}
    </td>
  );
}

function ReadOnlyTriple({
  kg,
  importe,
  costo,
  showZero,
  consolidado,
}: {
  kg: number;
  importe: number;
  costo: number | null;
  showZero?: boolean;
  tone?: "week" | "total";
  consolidado?: boolean;
}) {
  const capture = consolidado ? "bg-white" : "bg-[#d9d9d9]";
  const kgCls = `border border-black px-1 py-1 text-right tabular-nums ${capture} ${showZero ? "font-bold" : ""}`;
  const costCls = `border border-black bg-white px-1 py-1 text-right tabular-nums ${costo != null || showZero ? "font-bold" : ""}`;
  const impCls = `border border-black px-1 py-1 text-right tabular-nums ${capture} ${showZero ? "font-bold" : ""}`;
  return (
    <>
      <td className={kgCls}>{formatKg(kg, showZero)}</td>
      <td className={costCls}>{formatCosto(costo)}</td>
      <td className={impCls}>{formatImporte(importe, showZero)}</td>
    </>
  );
}

function ComprasDetailModal({
  token,
  plantaId,
  data,
  detail,
  onClose,
  onChanged,
}: {
  token: string;
  plantaId: number;
  data: ComprasMonthResponse;
  detail: DetailState;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const purchases = data.purchases.filter(
    (p) => p.proveedor_id === detail.proveedor.id && toYmd(p.fecha) === detail.fecha
  );
  const docsByCompra = useMemo(() => {
    const m = new Map<number, ComprasDocument[]>();
    for (const d of data.documents || []) {
      if (!m.has(d.compra_id)) m.set(d.compra_id, []);
      m.get(d.compra_id)!.push(d);
    }
    return m;
  }, [data.documents]);
  const usesEffective = purchases.some((p) => p.effective_kg != null || p.effective_importe != null);
  const totalKg = purchases.reduce((a, p) => a + (Number(p.effective_kg ?? p.kg) || 0), 0);
  const totalImp = purchases.reduce((a, p) => a + (Number(p.effective_importe ?? p.importe) || 0), 0);
  const totalCosto = totalKg > 0 ? totalImp / totalKg : null;

  const [kg, setKg] = useState("");
  const [importe, setImporte] = useState("");
  const [facturaFile, setFacturaFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editKg, setEditKg] = useState("");
  const [editImp, setEditImp] = useState("");

  async function addPurchase() {
    if (saving) return;
    const nKg = parseLocaleNumber(kg);
    const nImp = parseLocaleNumber(importe);
    if (nKg == null || nKg <= 0 || nImp == null || nImp < 0) {
      setErr("kg debe ser mayor que 0 e importe no puede ser negativo.");
      return;
    }
    if (facturaFile && facturaFile.type && facturaFile.type !== "application/pdf") {
      setErr("La factura no es válida.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const created = await createComprasPurchase(token, plantaId, {
        proveedor_id: detail.proveedor.id,
        fecha: detail.fecha,
        kg: nKg,
        importe: nImp,
      });
      if (facturaFile && created.purchase && created.purchase.id) {
        const fileBase64 = await fileToBase64(facturaFile);
        await uploadComprasFactura(token, plantaId, created.purchase.id, {
          fileBase64,
          file_name: facturaFile.name || "factura.pdf",
        });
      }
      setKg("");
      setImporte("");
      setFacturaFile(null);
      await onChanged();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(p: ComprasPurchase) {
    if (saving) return;
    const nKg = parseLocaleNumber(editKg);
    const nImp = parseLocaleNumber(editImp);
    if (nKg == null || nKg <= 0 || nImp == null || nImp < 0) {
      setErr("kg debe ser mayor que 0 e importe no puede ser negativo.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await patchComprasPurchase(token, plantaId, p.id, { kg: nKg, importe: nImp });
      setEditingId(null);
      await onChanged();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  async function removePurchase(id: number) {
    if (saving) return;
    setSaving(true);
    setErr(null);
    try {
      await deleteComprasPurchase(token, plantaId, id);
      await onChanged();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  async function uploadFactura(compraId: number, file: File) {
    if (saving) return;
    if (file.type && file.type !== "application/pdf") {
      setErr("La factura no es válida.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const fileBase64 = await fileToBase64(file);
      await uploadComprasFactura(token, plantaId, compraId, { fileBase64, file_name: file.name || "factura.pdf" });
      await onChanged();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(compraId: number, doc: ComprasDocument, view: boolean) {
    try {
      const blob = await downloadComprasFacturaBlob(token, plantaId, compraId, doc.id);
      if (view) {
        const href = URL.createObjectURL(blob);
        window.open(href, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(href), 60_000);
      } else {
        downloadBlob(blob, doc.nombre_archivo || "factura.pdf");
      }
    } catch (e) {
      setErr(friendlyError(e));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{detail.proveedor.nombre}</h2>
            <p className="text-sm text-slate-300">{formatFechaGrid(detail.fecha)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded bg-slate-700 px-2 py-1 text-sm">
            Cerrar
          </button>
        </div>
        {err && <p className="mb-2 text-sm text-red-300">{err}</p>}
        <ul className="space-y-3">
          {purchases.map((p, idx) => {
            const docs = docsByCompra.get(p.id) || [];
            const costo = Number(p.kg) > 0 ? Number(p.importe) / Number(p.kg) : null;
            return (
              <li key={p.id} className="rounded border border-slate-700 bg-slate-800/70 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <strong>Compra {idx + 1}</strong>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(p.id);
                        setEditKg(String(p.kg));
                        setEditImp(String(p.importe));
                      }}
                      className="text-cyan-300"
                    >
                      Editar
                    </button>
                    <button type="button" disabled={saving} onClick={() => void removePurchase(p.id)} className="text-red-300 disabled:opacity-50">
                      Eliminar
                    </button>
                  </div>
                </div>
                {editingId === p.id ? (
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <input value={editKg} onChange={(e) => setEditKg(e.target.value)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm" />
                    <input value={editImp} onChange={(e) => setEditImp(e.target.value)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm" />
                    <button type="button" disabled={saving} onClick={() => void saveEdit(p)} className="rounded bg-cyan-800 px-2 py-1 text-sm disabled:opacity-50">
                      {saving ? "Guardando…" : "Guardar compra"}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="rounded bg-slate-700 px-2 py-1 text-sm">
                      Cancelar
                    </button>
                  </div>
                ) : p.excel_only ? (
                  <p className="text-sm text-slate-200">
                    EXCEL — USADO PARA CALCULO: KG {formatKg(p.effective_kg ?? p.kg)} · Importe ${formatExactAmount(p.effective_importe ?? p.importe)}
                  </p>
                ) : p.reconciled ? (
                  <div className="space-y-1 text-sm text-slate-200">
                    <p>CAPTURADO / FACTURA: KG {formatKg(p.captured_kg ?? p.kg)} · Importe ${formatExactAmount(p.captured_importe ?? p.importe)}</p>
                    <p>EXCEL — USADO PARA CALCULO: KG {formatKg(p.effective_kg ?? p.kg)} · Importe ${formatExactAmount(p.effective_importe ?? p.importe)}</p>
                    {!p.discrepant && <p className="text-xs text-emerald-300">COINCIDE</p>}
                  </div>
                ) : (
                  <p className="text-sm text-slate-200">
                    KG: {formatKg(p.kg)} · Importe: ${formatImporte(p.importe)} · Costo/kg: {formatCosto(costo)}
                  </p>
                )}
                <div className="mt-2 space-y-1">
                  {docs.map((d) => (
                    <div key={d.id} className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <span>Factura: {d.nombre_archivo}</span>
                      <button type="button" className="text-cyan-300" onClick={() => void handleDownload(p.id, d, true)}>
                        Ver
                      </button>
                      <button type="button" className="text-cyan-300" onClick={() => void handleDownload(p.id, d, false)}>
                        Descargar
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        className="text-red-300 disabled:opacity-50"
                        onClick={() => void deleteComprasFactura(token, plantaId, p.id, d.id).then(onChanged)}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                  <label className="mt-2 block text-xs text-slate-300">
                    <span className="mb-1 block font-medium text-cyan-200">Subir factura PDF de respaldo</span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={saving}
                      className="block w-full text-xs text-slate-200 file:mr-2 file:rounded file:border-0 file:bg-cyan-800 file:px-2 file:py-1 file:text-white"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void uploadFactura(p.id, file);
                      }}
                    />
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
        {detail.proveedor.activo !== false ? (
          <div className="mt-4 rounded border border-slate-700 p-3">
            <h3 className="mb-2 text-sm font-medium">+ Agregar compra</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-300">
                KG
                <input value={kg} onChange={(e) => setKg(e.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm" />
              </label>
              <label className="text-xs text-slate-300">
                Importe
                <input value={importe} onChange={(e) => setImporte(e.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm" />
              </label>
            </div>
            <label className="mt-3 block text-xs text-slate-300">
              <span className="mb-1 block font-medium text-cyan-200">Factura PDF de respaldo</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={saving}
                className="block w-full text-xs text-slate-200 file:mr-2 file:rounded file:border-0 file:bg-cyan-800 file:px-3 file:py-1.5 file:text-white"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && file.type && file.type !== "application/pdf") {
                    setErr("La factura no es válida.");
                    setFacturaFile(null);
                    e.target.value = "";
                    return;
                  }
                  setFacturaFile(file);
                }}
              />
              {facturaFile ? <span className="mt-1 block text-slate-400">{facturaFile.name}</span> : <span className="mt-1 block text-slate-500">Selecciona el PDF de la compra. Se guarda junto con KG e importe.</span>}
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void addPurchase()}
              className="mt-3 rounded bg-cyan-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar compra"}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-amber-200">Proveedor inactivo: se conserva el histórico y no admite compras nuevas.</p>
        )}
        <div className="mt-4 border-t border-slate-700 pt-3 text-sm">
          <strong>{usesEffective ? "TOTAL DEL DIA — USADO PARA CALCULO" : "TOTAL DEL DÍA"}</strong>
          <p>
            {formatKg(totalKg) || "0"} kg · ${usesEffective ? formatExactAmount(totalImp) : (formatImporte(totalImp) || "0.00")} · {formatCosto(totalCosto) || "—"}/kg
          </p>
        </div>
      </div>
    </div>
  );
}
