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
  type KanbanBoard as KanbanBoardData,
  type DashboardFilters,
} from "@/lib/api";
import FiltersBar from "@/components/FiltersBar";
import KanbanBoard from "@/components/KanbanBoard";
import FolioDrawer from "@/components/FolioDrawer";
import ComoCambioModal from "@/components/ComoCambioModal";
import DeltaVentaModal from "@/components/DeltaVentaModal";
import DeltaDescuentoModal from "@/components/DeltaDescuentoModal";
import PolizaModal from "@/components/PolizaModal";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [kanban, setKanban] = useState<KanbanBoardData | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({ solo_activos: "1" });
  const [drawerFolioId, setDrawerFolioId] = useState<number | null>(null);
  const [showComoCambioModal, setShowComoCambioModal] = useState(false);
  const [showDeltaVentaModal, setShowDeltaVentaModal] = useState(false);
  const [showDeltaDescuentoModal, setShowDeltaDescuentoModal] = useState(false);
  const [polizaFolioId, setPolizaFolioId] = useState<number | null>(null);

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
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowComoCambioModal(true)}
            className="flex items-center gap-1.5 rounded border border-slate-600 bg-blue-700/80 px-2.5 py-1.5 text-sm text-slate-100 hover:bg-blue-600/90"
            title="Cómo cambió (IGF): comparar dos versiones y descargar deltas"
          >
            <span aria-hidden>Δ</span>
            <span>Cómo cambió</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDeltaVentaModal(true)}
            className="flex items-center gap-1.5 rounded border border-slate-600 bg-blue-600 px-2.5 py-1.5 text-sm text-white hover:bg-blue-500"
            title="Delta Venta: clientes que dejaron de comprar, compraron más o disminuyeron"
          >
            Delta Venta
          </button>
          <button
            type="button"
            onClick={() => setShowDeltaDescuentoModal(true)}
            className="flex items-center gap-1.5 rounded border border-slate-600 bg-blue-600 px-2.5 py-1.5 text-sm text-white hover:bg-blue-500"
            title="Delta Descuento: clientes que dejaron de tener descuento, tienen más o disminuyeron"
          >
            Delta Descuento
          </button>
        </div>
      </div>
      <FiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        plantas={plantas}
      />
      {showComoCambioModal && token && (
        <ComoCambioModal
          token={token}
          plantas={plantas}
          onClose={() => setShowComoCambioModal(false)}
        />
      )}
      {showDeltaVentaModal && token && (
        <DeltaVentaModal
          token={token}
          plantas={plantas}
          onClose={() => setShowDeltaVentaModal(false)}
        />
      )}
      {showDeltaDescuentoModal && token && (
        <DeltaDescuentoModal
          token={token}
          plantas={plantas}
          onClose={() => setShowDeltaDescuentoModal(false)}
        />
      )}
      <main className="flex-1">
        <KanbanBoard
          data={kanban}
          onOpenFolio={setDrawerFolioId}
          onSubirPoliza={setPolizaFolioId}
        />
      </main>
      <FolioDrawer
        folioId={drawerFolioId}
        token={token}
        onClose={() => setDrawerFolioId(null)}
        onApproved={loadData}
      />
      {polizaFolioId != null && token && (
        <PolizaModal
          folioId={polizaFolioId}
          token={token}
          onClose={() => setPolizaFolioId(null)}
          onSuccess={loadData}
        />
      )}
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
