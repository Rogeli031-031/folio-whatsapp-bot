"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
} from "@/lib/auth";
import {
  fetchKanban,
  fetchKpis,
  type KanbanBoard,
  type Kpis,
  type DashboardFilters,
} from "@/lib/api";
import KPIHeader from "@/components/KPIHeader";
import FiltersBar from "@/components/FiltersBar";
import KanbanBoard from "@/components/KanbanBoard";
import FolioDrawer from "@/components/FolioDrawer";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [kanban, setKanban] = useState<KanbanBoard | null>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({ solo_activos: "1" });
  const [drawerFolioId, setDrawerFolioId] = useState<number | null>(null);

  useEffect(() => {
    const t = parseTokenFromQuery(searchParams) || getTokenFromStorage();
    if (t) {
      setTokenInStorage(t);
      setToken(t);
      setUnauthorized(false);
    } else {
      setToken(null);
      setUnauthorized(true);
    }
  }, [searchParams]);

  const loadData = useCallback(() => {
    if (!token) return;
    fetchKanban(token, filters)
      .then(setKanban)
      .catch((e) => {
        if (e.message.includes("401") || e.message.includes("Token")) setUnauthorized(true);
      });
    fetchKpis(token, filters)
      .then(setKpis)
      .catch(() => {});
  }, [token, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (unauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
          <h1 className="text-lg font-semibold text-white">Acceso no autorizado</h1>
          <p className="mt-2 text-sm text-slate-400">
            Abre el enlace que recibiste por WhatsApp (válido 20 min) o escribe &quot;dashboard&quot; en el bot.
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-slate-400">Cargando…</p>
      </div>
    );
  }

  const plantas = kanban
    ? Array.from(
        new Map(
          kanban.board.flatMap((col) =>
            col.plantas.map((p) => [p.planta_id, { id: p.planta_id, nombre: p.planta_nombre }])
          )
        ).values()
      )
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      <KPIHeader kpis={kpis} />
      <FiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        plantas={plantas}
      />
      <main className="flex-1">
        <KanbanBoard
          data={kanban}
          onOpenFolio={setDrawerFolioId}
        />
      </main>
      <FolioDrawer
        folioId={drawerFolioId}
        token={token}
        onClose={() => setDrawerFolioId(null)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-4"><p className="text-slate-400">Cargando…</p></div>}>
      <DashboardContent />
    </Suspense>
  );
}
