"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getTokenFromStorage, parseTokenFromQuery, setTokenInStorage } from "@/lib/auth";
import {
  createComprasProveedor,
  createComprasPurchase,
  deleteComprasFactura,
  deleteComprasPurchase,
  downloadComprasFacturaBlob,
  fetchComprasMonth,
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
  COMPRAS_MESES,
  formatCosto,
  formatFechaGrid,
  formatImporte,
  formatKg,
  parseLocaleNumber,
} from "@/lib/compras-format";

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

export function ComprasClient() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [plantas, setPlantas] = useState<{ id: number; nombre: string }[]>([]);
  const [plantaId, setPlantaId] = useState<number | null>(null);
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<ComprasMonthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [providersOpen, setProvidersOpen] = useState(false);
  const [newProviderName, setNewProviderName] = useState("");
  const [providerSaving, setProviderSaving] = useState(false);

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

  const loadPlantas = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetchPlantas(token);
      const list = r.plantas || [];
      setPlantas(list);
      setPlantaId((cur) => (cur && list.some((p) => p.id === cur) ? cur : list[0]?.id ?? null));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg.includes("401") || msg.toLowerCase().includes("token")) setUnauthorized(true);
      setError("No tienes acceso a esta planta.");
    }
  }, [token]);

  useEffect(() => {
    void loadPlantas();
  }, [loadPlantas]);

  const loadMonth = useCallback(async () => {
    if (!token || !plantaId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchComprasMonth(token, plantaId, year, month);
      setData(payload);
    } catch (e: unknown) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [token, plantaId, year, month]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, [now]);

  const providers = data?.providers || [];
  const allProviders = data?.all_providers || [];
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

  async function handleCreateProvider() {
    if (!token || !plantaId || !newProviderName.trim() || providerSaving) return;
    setProviderSaving(true);
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
        {error && <p className="mb-3 rounded border border-red-700/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>}
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
              {allProviders.map((p) => (
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
              {!allProviders.length && <li className="text-slate-400">Sin proveedores. Agrega al menos uno para capturar.</li>}
            </ul>
          </section>
        )}

        <div className="overflow-x-auto rounded border border-slate-700 bg-white text-slate-900 shadow">
          <table className="min-w-max border-collapse text-[11px]">
            <thead className="sticky top-0 z-10">
              <tr>
                <th rowSpan={2} className="sticky left-0 z-20 min-w-[92px] border border-slate-500 bg-[#2f2f2f] px-2 py-1 text-left text-white">
                  FECHA
                </th>
                {providers.map((p) => (
                  <th key={p.id} colSpan={3} className="border border-slate-500 bg-[#2f2f2f] px-2 py-1 text-center font-semibold uppercase tracking-wide text-white">
                    {p.nombre}
                  </th>
                ))}
                <th colSpan={3} className="border border-slate-500 bg-[#1f1f1f] px-2 py-1 text-center font-semibold uppercase tracking-wide text-white">
                  CONSOLIDADO
                </th>
              </tr>
              <tr>
                {providers.map((p) => (
                  <MetricHeads key={p.id} />
                ))}
                <MetricHeads />
              </tr>
            </thead>
            <tbody>
              {!data && (
                <tr>
                  <td colSpan={Math.max(4, providers.length * 3 + 4)} className="px-3 py-6 text-center text-slate-500">
                    {loading ? "Cargando…" : "Selecciona planta, año y mes."}
                  </td>
                </tr>
              )}
              {data?.grid.rows.map((row) => {
                if (row.type === "day") {
                  const day = dayByYmd.get(row.ymd);
                  const captured = Boolean(day?.captured);
                  return (
                    <tr key={row.ymd} className="hover:bg-slate-50">
                      <td
                        data-captured={captured ? "1" : "0"}
                        className={`sticky left-0 z-[1] border border-slate-300 px-2 py-1 font-medium ${
                          captured ? "bg-amber-200 text-slate-900 compras-fecha-capturada" : "bg-white text-slate-800"
                        }`}
                      >
                        {formatFechaGrid(row.ymd)}
                      </td>
                      {providers.map((p) => {
                        const cell = day?.cells[String(p.id)] || day?.cells[p.id];
                        return (
                          <ProviderCells
                            key={`${row.ymd}-${p.id}`}
                            onClick={() => setDetail({ proveedor: p, fecha: row.ymd })}
                            kg={cell?.kg || 0}
                            importe={cell?.importe || 0}
                            costo={cell?.costo_kg ?? null}
                          />
                        );
                      })}
                      <ReadOnlyTriple kg={day?.consolidado.kg || 0} importe={day?.consolidado.importe || 0} costo={day?.consolidado.costo_kg ?? null} strong />
                    </tr>
                  );
                }
                const week = weekByNum.get(row.week);
                return (
                  <tr key={`semana-${row.week}`} className="bg-slate-200 font-semibold">
                    <td className="sticky left-0 z-[1] border border-slate-400 bg-slate-200 px-2 py-1">Semana {row.week}</td>
                    {providers.map((p) => {
                      const cell = week?.providers[String(p.id)] || week?.providers[p.id];
                      return (
                        <ReadOnlyTriple
                          key={`w-${row.week}-${p.id}`}
                          kg={cell?.kg || 0}
                          importe={cell?.importe || 0}
                          costo={cell?.costo_kg ?? null}
                        />
                      );
                    })}
                    <ReadOnlyTriple
                      kg={week?.consolidado.kg || 0}
                      importe={week?.consolidado.importe || 0}
                      costo={week?.consolidado.costo_kg ?? null}
                      strong
                    />
                  </tr>
                );
              })}
              {data && (
                <tr className="bg-slate-300 font-bold">
                  <td className="sticky left-0 z-[1] border border-slate-500 bg-slate-300 px-2 py-1">TOTAL MES</td>
                  {providers.map((p) => {
                    const cell = data.grid.month.providers[String(p.id)] || data.grid.month.providers[p.id];
                    return (
                      <ReadOnlyTriple
                        key={`m-${p.id}`}
                        kg={cell?.kg || 0}
                        importe={cell?.importe || 0}
                        costo={cell?.costo_kg ?? null}
                      />
                    );
                  })}
                  <ReadOnlyTriple
                    kg={data.grid.month.consolidado.kg || 0}
                    importe={data.grid.month.consolidado.importe || 0}
                    costo={data.grid.month.consolidado.costo_kg ?? null}
                    strong
                  />
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">Haz clic en las celdas de un proveedor para agregar, editar o adjuntar facturas. El consolidado y los costos se calculan solos.</p>
      </main>

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

function MetricHeads() {
  return (
    <>
      <th className="min-w-[78px] border border-slate-500 bg-[#3a3a3a] px-1 py-1 text-center font-normal text-white">COMPRA KG</th>
      <th className="min-w-[70px] border border-slate-500 bg-[#3a3a3a] px-1 py-1 text-center font-normal text-white">COSTO KG</th>
      <th className="min-w-[88px] border border-slate-500 bg-[#3a3a3a] px-1 py-1 text-center font-normal text-white">IMPORTE</th>
    </>
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
      <td className="cursor-pointer border border-slate-300 px-1 py-1 text-right tabular-nums hover:bg-cyan-50" onClick={onClick}>
        {formatKg(kg)}
      </td>
      <td className="cursor-pointer border border-slate-300 px-1 py-1 text-right tabular-nums text-slate-600 hover:bg-cyan-50" onClick={onClick}>
        {formatCosto(costo)}
      </td>
      <td className="cursor-pointer border border-slate-300 px-1 py-1 text-right tabular-nums hover:bg-cyan-50" onClick={onClick}>
        {formatImporte(importe)}
      </td>
    </>
  );
}

function ReadOnlyTriple({
  kg,
  importe,
  costo,
  strong,
}: {
  kg: number;
  importe: number;
  costo: number | null;
  strong?: boolean;
}) {
  const cls = `border border-slate-300 px-1 py-1 text-right tabular-nums ${strong ? "bg-slate-100" : ""}`;
  return (
    <>
      <td className={cls}>{formatKg(kg)}</td>
      <td className={cls}>{formatCosto(costo)}</td>
      <td className={cls}>{formatImporte(importe)}</td>
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
  const purchases = data.purchases.filter((p) => p.proveedor_id === detail.proveedor.id && p.fecha === detail.fecha);
  const docsByCompra = useMemo(() => {
    const m = new Map<number, ComprasDocument[]>();
    for (const d of data.documents || []) {
      if (!m.has(d.compra_id)) m.set(d.compra_id, []);
      m.get(d.compra_id)!.push(d);
    }
    return m;
  }, [data.documents]);
  const totalKg = purchases.reduce((a, p) => a + (Number(p.kg) || 0), 0);
  const totalImp = purchases.reduce((a, p) => a + (Number(p.importe) || 0), 0);
  const totalCosto = totalKg > 0 ? totalImp / totalKg : null;

  const [kg, setKg] = useState("");
  const [importe, setImporte] = useState("");
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
    setSaving(true);
    setErr(null);
    try {
      await createComprasPurchase(token, plantaId, {
        proveedor_id: detail.proveedor.id,
        fecha: detail.fecha,
        kg: nKg,
        importe: nImp,
      });
      setKg("");
      setImporte("");
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
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-cyan-200">
                    <span>Subir factura</span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      disabled={saving}
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
          <button
            type="button"
            disabled={saving}
            onClick={() => void addPurchase()}
            className="mt-2 rounded bg-cyan-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar compra"}
          </button>
        </div>
        <div className="mt-4 border-t border-slate-700 pt-3 text-sm">
          <strong>TOTAL DEL DÍA</strong>
          <p>
            {formatKg(totalKg) || "0"} kg · ${formatImporte(totalImp) || "0.00"} · {formatCosto(totalCosto) || "—"}/kg
          </p>
        </div>
      </div>
    </div>
  );
}
