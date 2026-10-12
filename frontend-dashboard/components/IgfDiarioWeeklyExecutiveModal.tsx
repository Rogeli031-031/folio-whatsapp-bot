"use client";

import { useEffect, useMemo, useState } from "react";
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
  defaultSelectedIds,
  downloadName,
  renderExecutiveSvg,
} from "@/lib/igf-diario-weekly-executive-chart";
import { coverageLines } from "@/lib/igf-diario-weekly-rows";

type WeekCard = {
  id: string;
  fecha_desde: string;
  fecha_hasta: string;
  week_number: number;
  metrics: IgfDiarioSemanalMetrics;
  days: IgfDiarioSemanalDay[];
  coverage_note: string | null;
};

function noteOf(coverage?: IgfDiarioSemanalCoverageMap | null): string | null {
  return coverageLines(coverage).length ? "Cobertura parcial" : null;
}

function weekFromPlant(payload: IgfDiarioSemanalResponse): WeekCard {
  return {
    id: payload.week.fecha_desde,
    fecha_desde: payload.week.fecha_desde,
    fecha_hasta: payload.week.fecha_hasta,
    week_number: payload.week.week_number,
    metrics: payload.metrics,
    days: payload.days || [],
    coverage_note: noteOf(payload.coverage || payload.week.coverage),
  };
}

function weekFromAll(payload: IgfDiarioSemanalAllResponse): WeekCard {
  const resumen = payload.resumen;
  return {
    id: payload.week.fecha_desde,
    fecha_desde: payload.week.fecha_desde,
    fecha_hasta: payload.week.fecha_hasta,
    week_number: payload.week.week_number,
    metrics: (resumen?.metrics || {}) as IgfDiarioSemanalMetrics,
    days: resumen?.days || [],
    coverage_note: noteOf(resumen?.coverage || payload.week.coverage),
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function download() {
    const stamped = renderExecutiveSvg(view, {
      exportedAt: new Date().toLocaleString("es-MX"),
    });
    const blob = new Blob([stamped], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = image.width * scale;
      canvas.height = image.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(image, 0, 0);
      canvas.toBlob((png) => {
        if (!png) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(png);
        link.download = downloadName(view);
        link.click();
        URL.revokeObjectURL(link.href);
      }, "image/png");
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  return (
    <div data-executive-chart="fullscreen" className="fixed inset-0 z-[80] flex flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-sky-800 bg-slate-950 px-4 py-3">
        <h2 className="text-lg font-semibold">{view.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((open) => !open)}
              className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white"
            >
              Semanas ▼
            </button>
            {menu && (
              <div className="absolute right-0 z-20 mt-1 max-h-72 w-72 overflow-auto rounded border border-sky-800 bg-slate-900 p-2 shadow-xl">
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
          <button type="button" onClick={download} className="rounded bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white">
            Descargar
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
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {loading && <p className="text-sm text-slate-400">Cargando semanas…</p>}
        {error && <p className="text-sm text-red-300">{error}</p>}
        {!loading && !error && (
          <div className="min-w-[720px]" dangerouslySetInnerHTML={{ __html: svg }} />
        )}
      </div>
    </div>
  );
}
