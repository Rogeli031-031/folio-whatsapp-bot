"use client";

import { useEffect, useState } from "react";
import FolioDrawer from "@/components/FolioDrawer";
import {
  fetchIgfDiarioFoliosDeposito,
  type IgfDiarioFolioDepositoCell,
  type IgfDiarioFolioDepositoItem,
  type IgfDiarioFoliosDepositoResponse,
} from "@/lib/api";
import { getRoleFromDashboardToken } from "@/lib/auth";

const ESTADO_LABEL: Record<string, string> = {
  DEPOSITO_CIERRE: "Depósito y cierre",
  COMPROBACIONES: "Comprobaciones",
  EVIDENCIAS: "Evidencias",
};

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function moneyText(amount: number | null, count: number) {
  if (count <= 0) return "—";
  if (amount == null) return "Sin importe";
  return money.format(amount);
}

function countText(count: number) {
  if (count === 1) return "1 folio";
  return `${count} folios`;
}

function fechaVisible(fecha: string) {
  const [year, month, day] = fecha.split("-");
  return `${day}/${month}/${year}`;
}

function estadoVisible(estado: string) {
  return ESTADO_LABEL[estado] || estado;
}

function FolioCard(props: { folio: IgfDiarioFolioDepositoItem; onOpen: (id: number) => void }) {
  const folio = props.folio;
  const open = () => props.onOpen(folio.id);
  return (
    <article className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="min-h-11 text-left text-base font-semibold text-cyan-200 underline-offset-2 hover:underline"
          onClick={open}
        >
          {folio.folio}
        </button>
        <span className="shrink-0 pt-2 text-base font-semibold text-slate-50">
          {folio.importe == null ? "Sin importe" : money.format(folio.importe)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="rounded-full border border-emerald-800 bg-emerald-950 px-2 py-1 text-xs text-emerald-100">
          {estadoVisible(folio.estado)}
        </span>
        <button
          type="button"
          className="min-h-11 shrink-0 px-2 text-sm font-medium text-cyan-300"
          onClick={open}
        >
          Abrir folio →
        </button>
      </div>
      <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-5 text-slate-200" title={folio.descripcion}>
        {folio.descripcion}
      </p>
    </article>
  );
}

function CellLines(props: { cell: IgfDiarioFolioDepositoCell | null; emphasize?: boolean }) {
  if (!props.cell || props.cell.folio_count <= 0) {
    return <span className="text-slate-500">—</span>;
  }
  return (
    <span className={`block text-left leading-tight ${props.emphasize ? "text-sky-100" : "text-slate-100"}`}>
      <span className="block font-semibold">{moneyText(props.cell.amount_total, props.cell.folio_count)}</span>
      <span className="block text-[0.7rem] text-slate-300">{countText(props.cell.folio_count)}</span>
      {props.cell.description_short ? (
        <span className="block max-w-[8.5rem] truncate text-[0.7rem] text-slate-400" title={props.cell.description_short}>
          {props.cell.description_short}
        </span>
      ) : null}
      {props.cell.missing_amount_count > 0 ? (
        <span className="block text-[0.65rem] text-amber-200">
          {props.cell.missing_amount_count} sin importe
        </span>
      ) : null}
    </span>
  );
}

export default function IgfDiarioFoliosDepositoMatrix(props: {
  token: string;
  uploadDay: string;
  versionAsOfCorte: boolean;
}) {
  const [data, setData] = useState<IgfDiarioFoliosDepositoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ empresa: string; fecha: string } | null>(null);
  const [openFolioId, setOpenFolioId] = useState<number | null>(null);
  const [dashboardRole, setDashboardRole] = useState<string | null>(null);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);
  const corte = props.uploadDay.trim();
  const ready = /^\d{4}-\d{2}-\d{2}$/.test(corte);

  useEffect(() => {
    if (!props.token || !ready) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelected(null);
    setOpenFolioId(null);
    setRoleNotice(null);
    setDashboardRole(getRoleFromDashboardToken(props.token));
    fetchIgfDiarioFoliosDeposito({
      token: props.token,
      uploadDay: corte,
      versionAsOfCorte: props.versionAsOfCorte,
    })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setData(null);
          setError(err.message || "No se pudo cargar la matriz de folios.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [props.token, corte, props.versionAsOfCorte, ready]);

  const selectedCell = selected && data
    ? data.plants.find((plant) => plant.empresa === selected.empresa)?.days[selected.fecha] || null
    : null;
  const resolvedRole = dashboardRole && dashboardRole.trim() ? dashboardRole.trim() : "";

  const handleOpenFolio = (id: number) => {
    if (!resolvedRole) {
      setOpenFolioId(null);
      setRoleNotice("No se pudo validar el rol para abrir el folio.");
      return;
    }
    setRoleNotice(null);
    setOpenFolioId(id);
  };

  return (
    <section className="mt-6 rounded-lg border border-slate-700 bg-slate-900/70 p-4">
      <h3 className="text-base font-semibold text-slate-100">Folios en Depósito y Cierre (o adelante)</h3>
      <p className="mb-3 text-xs text-slate-400">
        Importe de folios por día y planta. Incluye folios que alcanzaron Depósito y Cierre o una etapa posterior. No incluye cancelados.
      </p>
      {!ready && <p className="text-sm text-slate-400">Selecciona la fecha de carga para armar el mes.</p>}
      {loading && <p className="text-sm text-slate-400">Cargando matriz de folios…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {data && (
        <div className="overflow-x-auto">
          <table className="min-w-max border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-slate-300">
                <th className="sticky left-0 z-20 bg-slate-900 px-2 py-2 text-left">Planta</th>
                {data.days.map((fecha) => (
                  <th key={fecha} className="min-w-[8.5rem] px-2 py-2 text-left font-medium">
                    {fecha.slice(8, 10)}
                  </th>
                ))}
                <th className="sticky right-0 z-20 bg-sky-950 px-2 py-2 text-left text-sky-100">Total mes</th>
              </tr>
            </thead>
            <tbody>
              {data.plants.map((plant) => (
                <tr key={plant.empresa} className="border-b border-slate-800">
                  <th className="sticky left-0 z-10 bg-slate-900 px-2 py-2 text-left font-semibold text-slate-100">
                    {plant.empresa}
                  </th>
                  {data.days.map((fecha) => {
                    const cell = plant.days[fecha] || null;
                    const active = selected?.empresa === plant.empresa && selected?.fecha === fecha;
                    return (
                      <td key={fecha} className="px-1 py-1 align-top">
                        {cell ? (
                          <button
                            type="button"
                            className={`w-full rounded px-1 py-1 text-left ${
                              active ? "border border-cyan-400 bg-sky-950/70" : "border border-transparent bg-emerald-950/40"
                            }`}
                            onClick={() => {
                              setOpenFolioId(null);
                              setRoleNotice(null);
                              setSelected({ empresa: plant.empresa, fecha });
                            }}
                          >
                            <CellLines cell={cell} />
                          </button>
                        ) : (
                          <span className="block px-1 py-2 text-slate-500">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 bg-sky-950 px-2 py-2 align-top text-sky-100">
                    <CellLines cell={plant.total_month} emphasize />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-600 bg-sky-950/80">
                <th className="sticky left-0 bg-sky-950 px-2 py-2 text-left text-sky-100">Total día</th>
                {data.days.map((fecha) => (
                  <td key={fecha} className="px-2 py-2 align-top text-sky-100">
                    <CellLines cell={data.daily_totals[fecha]} emphasize />
                  </td>
                ))}
                <td className="sticky right-0 bg-sky-950 px-2 py-2 align-top text-sky-100">
                  <CellLines cell={data.grand_total} emphasize />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {selected && selectedCell && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/70 p-3 sm:items-center sm:p-4" role="dialog" aria-label="Detalle de folios">
          <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-600 bg-slate-900 p-4 text-slate-100">
            <h4 className="text-lg font-semibold">{selected.empresa} · {fechaVisible(selected.fecha)}</h4>
            <p className="mt-2 text-2xl font-semibold text-slate-50">
              {moneyText(selectedCell.amount_total, selectedCell.folio_count)}
            </p>
            <p className="text-sm text-slate-300">{countText(selectedCell.folio_count)}</p>
            <div className="mt-4 space-y-3">
              {(selectedCell.folios || []).map((folio) => (
                <FolioCard key={folio.id} folio={folio} onOpen={handleOpenFolio} />
              ))}
            </div>
            {roleNotice ? <p className="mt-3 text-sm text-amber-200" role="status">{roleNotice}</p> : null}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="min-h-11 rounded bg-slate-700 px-3 py-2"
                onClick={() => {
                  setOpenFolioId(null);
                  setRoleNotice(null);
                  setSelected(null);
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {openFolioId != null && resolvedRole ? (
        <FolioDrawer
          folioId={openFolioId}
          token={props.token}
          role={resolvedRole}
          onClose={() => setOpenFolioId(null)}
        />
      ) : null}
    </section>
  );
}
