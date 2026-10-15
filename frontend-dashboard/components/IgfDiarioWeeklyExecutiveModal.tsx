"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchIgfDiarioSemanal,
  type IgfDiarioSemanalAllResponse,
  type IgfDiarioSemanalCoverageMap,
  type IgfDiarioSemanalDay,
  type IgfDiarioSemanalMetrics,
  type IgfDiarioSemanalResponse,
} from "@/lib/api";
import {
  buildExecutiveView,
  canExportExecutivePdf,
  createPdfExportGate,
  defaultSelectedIds,
  downloadName,
  renderExecutiveSvg,
} from "@/lib/igf-diario-weekly-executive-chart";
import { coverageLines } from "@/lib/igf-diario-weekly-rows";
import { buildAnalyticalReport, freezePlantExport } from "@/lib/igf-diario-weekly-analytical-report";

type WeekDay = IgfDiarioSemanalDay & {
  com_desc_source?: string | null;
  com_desc_source_date?: string | null;
};

type WeekCard = {
  id: string;
  fecha_desde: string;
  fecha_hasta: string;
  week_number: number;
  week_year: number | null;
  estado: "real" | "parcial" | "proyectada" | null;
  complete: boolean | null;
  missing_components: string[];
  metrics: IgfDiarioSemanalMetrics;
  days: WeekDay[];
  coverage: IgfDiarioSemanalCoverageMap | null;
  coverage_note: string | null;
  plant_code: string | null;
  empresa: string | null;
  corte_ymd: string | null;
  version_as_of_corte: boolean | null;
};

function noteOf(coverage?: IgfDiarioSemanalCoverageMap | null): string | null {
  return coverageLines(coverage).length ? "Cobertura parcial" : null;
}

function weekFromPlant(payload: IgfDiarioSemanalResponse & { version_as_of_corte?: boolean }): WeekCard {
  const coverage = payload.coverage || payload.week.coverage || null;
  return {
    id: payload.week.fecha_desde,
    fecha_desde: payload.week.fecha_desde,
    fecha_hasta: payload.week.fecha_hasta,
    week_number: payload.week.week_number,
    week_year: payload.week.week_year,
    estado: payload.week.estado,
    complete: payload.week.complete ?? null,
    missing_components: payload.week.missing_components || [],
    metrics: payload.metrics,
    days: payload.days || [],
    coverage,
    coverage_note: noteOf(coverage),
    plant_code: payload.plant_code,
    empresa: payload.empresa,
    corte_ymd: payload.corte_ymd,
    version_as_of_corte: payload.version_as_of_corte ?? null,
  };
}

function weekFromAll(payload: IgfDiarioSemanalAllResponse & { version_as_of_corte?: boolean }): WeekCard {
  const resumen = payload.resumen;
  const coverage = resumen?.coverage || payload.week.coverage || null;
  return {
    id: payload.week.fecha_desde,
    fecha_desde: payload.week.fecha_desde,
    fecha_hasta: payload.week.fecha_hasta,
    week_number: payload.week.week_number,
    week_year: payload.week.week_year,
    estado: payload.week.estado,
    complete: null,
    missing_components: [],
    metrics: (resumen?.metrics || {}) as IgfDiarioSemanalMetrics,
    days: resumen?.days || [],
    coverage,
    coverage_note: noteOf(coverage),
    plant_code: resumen?.plant_code || null,
    empresa: resumen?.empresa || null,
    corte_ymd: payload.corte_ymd,
    version_as_of_corte: payload.version_as_of_corte ?? null,
  };
}

export default function IgfDiarioWeeklyExecutiveModal({
  token,
  year,
  month,
  plantCode,
  empresa,
  todas,
  uploadDay,
  versionAsOfCorte,
  weekAnchor,
  onClose,
}: {
  token: string;
  year: number;
  month: number;
  plantCode?: string;
  empresa: string;
  todas?: boolean;
  uploadDay?: string | null;
  versionAsOfCorte?: boolean;
  weekAnchor?: string | null;
  onClose: () => void;
}) {
  const [weeks, setWeeks] = useState<WeekCard[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [menu, setMenu] = useState(false);
  const [tip, setTip] = useState<{ fecha: string; label: string; shown: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportGateRef = useRef(createPdfExportGate());

  useEffect(() => {
    let cancel = false;
    const base = {
      token,
      year,
      month,
      plantCode,
      todas,
      uploadDay,
      versionAsOfCorte,
    };
    async function loadChain(anchor: string | null | undefined, dir: "prev" | "next") {
      const seen = new Set<string>();
      const out: WeekCard[] = [];
      let cursor = (anchor || "").trim();
      while (cursor && !seen.has(cursor)) {
        seen.add(cursor);
        const payload = await fetchIgfDiarioSemanal({ ...base, weekAnchor: cursor });
        if (cancel) return out;
        const card = "plants" in payload ? weekFromAll(payload) : weekFromPlant(payload as IgfDiarioSemanalResponse);
        out.push(card);
        const nav = payload.nav;
        const enabled = dir === "prev" ? nav.prev_enabled : nav.next_enabled;
        cursor = enabled ? (dir === "prev" ? nav.prev_anchor : nav.next_anchor) : "";
      }
      return out;
    }
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(async () => {
        const seed = await fetchIgfDiarioSemanal({ ...base, weekAnchor });
        if (cancel) return;
        const current = "plants" in seed ? weekFromAll(seed) : weekFromPlant(seed as IgfDiarioSemanalResponse);
        const older = seed.nav.prev_enabled ? await loadChain(seed.nav.prev_anchor, "prev") : [];
        const newer = seed.nav.next_enabled ? await loadChain(seed.nav.next_anchor, "next") : [];
        const merged = new Map<string, WeekCard>();
        [...older.reverse(), current, ...newer].forEach((week) => merged.set(week.id, week));
        const ordered = Array.from(merged.values()).sort((a, b) => a.fecha_desde.localeCompare(b.fecha_desde));
        if (!cancel) {
          setWeeks(ordered);
          setSelected(defaultSelectedIds(ordered));
        }
      })
      .catch((err: Error) => {
        if (!cancel) setError(err.message || "No se pudo abrir la gráfica");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [token, year, month, plantCode, todas, uploadDay, versionAsOfCorte, weekAnchor]);

  const view = useMemo(
    () => buildExecutiveView({
      scope: todas ? "all" : "plant",
      plant: empresa,
      weeks,
      selectedIds: selected,
    }),
    [todas, empresa, weeks, selected],
  );
  const svg = useMemo(() => renderExecutiveSvg(view), [view]);

  useEffect(() => {
    if (!menu) return;
    function onDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function download() {
    const snapshot = view;
    const exportedAt = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
    const plantExport = todas ? null : freezePlantExport({
      weeks,
      selectedIds: selected,
      empresa,
      plantCode,
    });
    const analyticalReport = plantExport ? buildAnalyticalReport(plantExport, exportedAt) : null;
    if (!canExportExecutivePdf({
      loading,
      loadError: error,
      exporting,
      weekCount: snapshot.weeks.length,
    })) return;
    if (!exportGateRef.current.tryBegin()) return;
    setExporting(true);
    setExportError(null);
    let href = "";
    try {
      const stamped = renderExecutiveSvg(snapshot, {
        exportedAt,
        fontFamily: "NotoSans",
      });
      const pdf = await import("@/lib/igf-diario-weekly-executive-pdf");
      const blob = analyticalReport
        ? await (await import("@/lib/igf-diario-weekly-analytical-pdf")).composePlantPdf({
          report: analyticalReport,
          svg: stamped,
        })
        : await pdf.svgToExecutivePdf(stamped);
      if (!(blob instanceof Blob) || blob.size < 8) throw new Error("El PDF generado está vacío");
      href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = downloadName(snapshot);
      link.type = "application/pdf";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      const release = href;
      window.setTimeout(() => URL.revokeObjectURL(release), 60000);
    } catch (err: unknown) {
      if (href) URL.revokeObjectURL(href);
      setExportError(err instanceof Error ? err.message : "No se pudo generar el PDF");
    } finally {
      exportGateRef.current.end();
      setExporting(false);
    }
  }

  return (
    <div data-executive-chart="fullscreen" className="fixed inset-0 z-[80] flex w-full flex-col bg-[#071422] text-slate-100">
      <header className="sticky top-0 z-10 flex w-full flex-wrap items-center justify-between gap-3 border-b border-[#245074] bg-[#071422] px-4 py-3">
        <h2 className="text-lg font-semibold">{view.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div ref={menuRef} data-week-menu="1" className="relative">
            <button
              type="button"
              data-week-toggle="1"
              aria-expanded={menu}
              onClick={() => setMenu((open) => !open)}
              className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white"
            >
              Semanas ▼
            </button>
            {menu && (
              <div data-week-panel="1" className="absolute right-0 z-20 mt-1 max-h-72 w-72 overflow-auto rounded border border-sky-800 bg-slate-900 p-2 shadow-xl">
                {weeks.map((week) => (
                  <label key={week.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(week.id)}
                      onChange={() => toggle(week.id)}
                    />
                    <span>Semana {week.week_number}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            data-download="pdf"
            disabled={!canExportExecutivePdf({ loading, loadError: error, exporting, weekCount: view.weeks.length })}
            onClick={() => void download()}
            className="rounded bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {exporting ? "Generando PDF…" : "Descargar PDF"}
          </button>
          <button
            type="button"
            data-close="executive"
            onClick={onClose}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white"
          >
            Cerrar X
          </button>
        </div>
      </header>
      <div
        data-grid-scroll="1"
        className="min-h-0 w-full flex-1 overflow-auto"
        onMouseMove={(event) => {
          const node = (event.target as HTMLElement).closest?.("[data-point]");
          if (!node) {
            setTip(null);
            return;
          }
          setTip({
            fecha: node.getAttribute("data-fecha-label") || "",
            label: node.getAttribute("data-label") || "",
            shown: node.getAttribute("data-shown") || "",
            x: event.clientX,
            y: event.clientY,
          });
        }}
        onMouseLeave={() => setTip(null)}
      >
        {loading && <p className="px-4 py-3 text-sm text-slate-400">Cargando semanas…</p>}
        {error && <p className="px-4 py-3 text-sm text-red-300">{error}</p>}
        {exportError && <p className="px-4 py-3 text-sm text-red-300" role="alert">{exportError}</p>}
        {!loading && !error && (
          <div className="w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        )}
      </div>
      {tip && (
        <div
          data-point-tooltip="1"
          className="pointer-events-none fixed z-[90] rounded border border-sky-400 bg-[#0b1c30] px-3 py-2 text-xs text-slate-100 shadow-xl"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          <div>{tip.fecha}</div>
          <div>{tip.label}</div>
          <div>{tip.shown}</div>
        </div>
      )}
    </div>
  );
}
