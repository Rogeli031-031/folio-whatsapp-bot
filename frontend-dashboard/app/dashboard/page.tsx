"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
  getRoleFromDashboardToken,
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
import DeltaIngresoModal from "@/components/DeltaIngresoModal";
import PolizaModal from "@/components/PolizaModal";
import ImprimirGastosModal from "@/components/ImprimirGastosModal";
import CrearFolioModal from "@/components/CrearFolioModal";
import CrearProyectoModal from "@/components/CrearProyectoModal";
import AnalisisDuplicadosModal from "@/components/AnalisisDuplicadosModal";
import ResumenCategoriasMesCargo from "@/components/ResumenCategoriasMesCargo";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [roleHint, setRoleHint] = useState<string | null>(null);
  const [kanban, setKanban] = useState<KanbanBoardData | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({ solo_activos: "1", ventana: "1" });
  const [drawerFolioId, setDrawerFolioId] = useState<number | null>(null);
  const [showComoCambioModal, setShowComoCambioModal] = useState(false);
  const [showDeltaVentaModal, setShowDeltaVentaModal] = useState(false);
  const [showDeltaDescuentoModal, setShowDeltaDescuentoModal] = useState(false);
  const [showDeltaIngresoModal, setShowDeltaIngresoModal] = useState(false);
  const [polizaFolioId, setPolizaFolioId] = useState<number | null>(null);
  const [imprimirGastos, setImprimirGastos] = useState<{ id: number; numeroFolio: string; etapa?: string } | null>(null);
  const [crearFolio, setCrearFolio] = useState<{ planta_id: number; planta_nombre: string } | null>(null);
  const [crearFolioUrgente, setCrearFolioUrgente] = useState<{ planta_id: number; planta_nombre: string } | null>(null);
  const [crearProyecto, setCrearProyecto] = useState<{ planta_id: number; planta_nombre: string } | null>(null);
  const [analisisDuplicados, setAnalisisDuplicados] = useState<{ planta_id: number; planta_nombre: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const t = parseTokenFromQuery(searchParams) || getTokenFromStorage();
    if (t) {
      setTokenInStorage(t);
      setToken(t);
      setRoleHint(getRoleFromDashboardToken(t));
      setUnauthorized(false);
    } else {
      setToken(null);
      setRoleHint(null);
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

  const isGVDashboardBlocked = token ? getRoleFromDashboardToken(token) === "GV" : false;
  useEffect(() => {
    if (!token || !isGVDashboardBlocked) return;
    router.replace(`/?t=${encodeURIComponent(token)}`);
  }, [token, isGVDashboardBlocked, router]);

  if (isGVDashboardBlocked && token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-slate-400">Redirigiendo a Delta ingreso Forecast…</p>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
          <h1 className="text-lg font-semibold text-white">Acceso no autorizado</h1>
          <p className="mt-2 text-sm text-slate-400">
            Abre el enlace que recibiste por WhatsApp (válido 20 horas) o escribe &quot;dashboard&quot; en el bot.
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

  /** Códigos de identificación (E7, E8, etc.) no se muestran en el filtro; solo plantas por nombre (Acapulco, Morelos, etc.). */
  const CLAVES_CODIGO_PLANTA = ["E7", "E8", "E9", "E10", "E11", "E12", "E13", "E15"];
  const plantas = kanban
    ? Array.from(
        new Map(
          kanban.board.flatMap((col) =>
            col.plantas.map((p) => [p.planta_id, { id: p.planta_id, nombre: p.planta_nombre }])
          )
        ).values()
      ).filter(
        (p) =>
          !CLAVES_CODIGO_PLANTA.includes((p.nombre || "").trim().toUpperCase()) &&
          !/^E\d+$/.test((p.nombre || "").trim())
      )
    : [];

  const selectedPlantaId = filters.plantas ? Number(filters.plantas) || undefined : undefined;
  const role = (kanban?.meta?.role ?? roleHint ?? "GG").toUpperCase();
  const isGA = role === "GA";

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900/50 px-4 py-2">
        <div className="flex items-center gap-2">
          {!isGA && (
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded border border-slate-600 bg-slate-700 px-2.5 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
            >
              Inicio
            </Link>
          )}
          <Link
            href={token ? `/seh?t=${encodeURIComponent(token)}` : "/seh"}
            className="flex items-center gap-1.5 rounded border border-emerald-700/70 bg-emerald-800/80 px-2.5 py-1.5 text-sm font-medium text-emerald-50 hover:bg-emerald-700"
            title="SEH: PLANTA, PIPAS, ESTACIONES y sistema contra incendio por planta"
          >
            SEH
          </Link>
          {!isGA && (
            <button
              type="button"
              onClick={() => setShowComoCambioModal(true)}
              className="flex items-center gap-1.5 rounded border border-slate-600 bg-blue-700/80 px-2.5 py-1.5 text-sm text-slate-100 hover:bg-blue-600/90"
              title="Cómo cambió (IGF): comparar dos versiones y descargar deltas"
            >
              <span aria-hidden>Δ</span>
              <span>Cómo cambió</span>
            </button>
          )}
          {!isGA && (
            <>
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
              <button
                type="button"
                onClick={() => setShowDeltaIngresoModal(true)}
                className="flex items-center gap-1.5 rounded border border-slate-600 bg-blue-600 px-2.5 py-1.5 text-sm text-white hover:bg-blue-500"
                title="Delta Ingreso: venta kg × (margen $/kg − descuento $/kg) por periodo; clientes que dejaron, subieron o bajaron"
              >
                Delta Ingreso
              </button>
            </>
          )}
        </div>
      </div>
      <FiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        plantas={plantas}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
      />
      {showComoCambioModal && token && !isGA && (
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
      {showDeltaIngresoModal && token && (
        <DeltaIngresoModal
          token={token}
          plantas={plantas}
          onClose={() => setShowDeltaIngresoModal(false)}
        />
      )}
      <main className="flex-1 min-h-0 overflow-auto">
        <ResumenCategoriasMesCargo
          data={kanban}
          selectedPlantaId={selectedPlantaId}
          filters={filters}
          onOpenFolio={setDrawerFolioId}
          token={token}
          onRefresh={loadData}
        />
        <KanbanBoard
          data={kanban}
          selectedPlantaId={selectedPlantaId}
          searchTerm={searchTerm}
          token={token}
          onOpenFolio={setDrawerFolioId}
          onSelectPlanta={(id) =>
            setFilters((prev) => ({
              ...prev,
              plantas: id != null ? String(id) : undefined,
            }))
          }
          onSubirPoliza={setPolizaFolioId}
          onImprimirGastos={(id, numeroFolio, etapa) => setImprimirGastos({ id, numeroFolio, etapa })}
          onCrearFolio={(plantaId, plantaNombre) => setCrearFolio({ planta_id: plantaId, planta_nombre: plantaNombre })}
          onCrearFolioUrgente={(plantaId, plantaNombre) => setCrearFolioUrgente({ planta_id: plantaId, planta_nombre: plantaNombre })}
          onCrearProyecto={(plantaId, plantaNombre) => setCrearProyecto({ planta_id: plantaId, planta_nombre: plantaNombre })}
          onAnalizarDuplicados={(plantaId, plantaNombre) =>
            setAnalisisDuplicados({ planta_id: plantaId, planta_nombre: plantaNombre })
          }
          onMovedEtapa={loadData}
        />
      </main>
      <FolioDrawer
        folioId={drawerFolioId}
        token={token}
        role={role}
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
      {imprimirGastos != null && token && (
        <ImprimirGastosModal
          folioId={imprimirGastos.id}
          numeroFolio={imprimirGastos.numeroFolio}
          token={token}
          etapa={imprimirGastos.etapa}
          onClose={() => setImprimirGastos(null)}
        />
      )}
      {crearFolio != null && token && (
        <CrearFolioModal
          open={true}
          onClose={() => setCrearFolio(null)}
          plantaId={crearFolio.planta_id}
          plantaNombre={crearFolio.planta_nombre}
          token={token}
          onCreated={loadData}
        />
      )}
      {crearFolioUrgente != null && token && (
        <CrearFolioModal
          open={true}
          onClose={() => setCrearFolioUrgente(null)}
          plantaId={crearFolioUrgente.planta_id}
          plantaNombre={crearFolioUrgente.planta_nombre}
          token={token}
          onCreated={loadData}
          urgente={true}
        />
      )}
      {crearProyecto != null && token && (
        <CrearProyectoModal
          open={true}
          onClose={() => setCrearProyecto(null)}
          plantaId={crearProyecto.planta_id}
          plantaNombre={crearProyecto.planta_nombre}
          token={token}
          onCreated={loadData}
        />
      )}
      {analisisDuplicados != null && token && (
        <AnalisisDuplicadosModal
          open={true}
          token={token}
          plantaId={analisisDuplicados.planta_id}
          plantaNombre={analisisDuplicados.planta_nombre}
          onClose={() => setAnalisisDuplicados(null)}
          onOpenFolio={(id) => {
            setAnalisisDuplicados(null);
            setDrawerFolioId(id);
          }}
          onCancelled={loadData}
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
