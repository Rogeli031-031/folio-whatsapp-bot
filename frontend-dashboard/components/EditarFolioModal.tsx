"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchProyectosPorPlanta, patchFolioEditar, postFolioFactura } from "@/lib/api";

type FolioLike = Record<string, unknown>;

function toStr(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function toNumStr(v: unknown): string {
  if (v == null) return "";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "";
}

function getMesesOpciones(): { value: string; label: string }[] {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const out: { value: string; label: string }[] = [];
  const y = 2026;
  for (let m = 1; m <= 12; m++) {
    out.push({ value: `${y}-${String(m).padStart(2, "0")}`, label: `${meses[m - 1]} ${y}` });
  }
  return out;
}

interface Props {
  open: boolean;
  token: string;
  folioId: number;
  folio: FolioLike;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditarFolioModal({ open, token, folioId, folio, onClose, onSaved }: Props) {
  const plantaId = (folio.planta_id as number | null) ?? null;

  const [beneficiario, setBeneficiario] = useState("");
  const [concepto, setConcepto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [importe, setImporte] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [estacion, setEstacion] = useState("");
  const [unidad, setUnidad] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [mesCargo, setMesCargo] = useState("");
  const [banco, setBanco] = useState("");
  const [cuentaBancaria, setCuentaBancaria] = useState("");
  const [proyectoId, setProyectoId] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proyectos, setProyectos] = useState<{ id: number; codigo: string; nombre: string }[]>([]);
  const [uploadingFactura, setUploadingFactura] = useState(false);
  const facturaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setBeneficiario(toStr(folio.beneficiario));
    setConcepto(toStr(folio.concepto));
    setDescripcion(toStr(folio.descripcion));
    setImporte(toNumStr(folio.importe));
    setCategoria(toStr(folio.categoria));
    setSubcategoria(toStr(folio.subcategoria));
    setEstacion(toStr(folio.estacion));
    setUnidad(toStr(folio.unidad));
    setPrioridad(toStr(folio.prioridad));
    setMesCargo(toStr(folio.mes_cargo));
    setBanco(toStr(folio.banco));
    setCuentaBancaria(toStr(folio.cuenta_bancaria));
    setProyectoId(folio.proyecto_id != null ? String(folio.proyecto_id) : "");
    setError(null);
  }, [open, folio]);

  useEffect(() => {
    if (!open) return;
    if (!plantaId) {
      setProyectos([]);
      return;
    }
    fetchProyectosPorPlanta(token, plantaId)
      .then((r) => setProyectos(r.proyectos || []))
      .catch(() => setProyectos([]));
  }, [open, plantaId, token]);

  const meses = useMemo(() => getMesesOpciones(), []);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Editar folio</h3>
            <div className="flex items-center gap-1">
              <input
                ref={facturaInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f || !f.type.includes("pdf")) return;
                  const montoRaw = window.prompt("Monto de la factura en pesos mexicanos (MXN):");
                  if (montoRaw == null) return;
                  const monto = Number(String(montoRaw).replace(/[$,\s]/g, "").replace(",", "."));
                  if (!Number.isFinite(monto) || monto <= 0) {
                    setError("Indica un monto válido mayor a 0.");
                    return;
                  }
                  setUploadingFactura(true);
                  setError(null);
                  try {
                    const reader = new FileReader();
                    const base64 = await new Promise<string>((res, rej) => {
                      reader.onload = () => {
                        const data = reader.result as string;
                        res(data.indexOf(",") >= 0 ? data.split(",")[1] : data);
                      };
                      reader.onerror = rej;
                      reader.readAsDataURL(f);
                    });
                    await postFolioFactura(token, folioId, {
                      fileBase64: base64,
                      fileName: f.name || "factura.pdf",
                      monto,
                    });
                    onSaved();
                  } catch (err) {
                    setError((err as Error).message || "Error al subir la factura");
                  } finally {
                    setUploadingFactura(false);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => facturaInputRef.current?.click()}
                disabled={uploadingFactura}
                className="rounded bg-amber-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {uploadingFactura ? "Subiendo…" : "Adjuntar Factura"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="max-h-[75vh] overflow-y-auto p-4">
            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs text-slate-500">Beneficiario</span>
                <input value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs text-slate-500">Importe (MXN)</span>
                <input value={importe} onChange={(e) => setImporte(e.target.value)} inputMode="decimal" className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
              </label>

              <label className="text-sm text-slate-300 md:col-span-2">
                <span className="mb-1 block text-xs text-slate-500">Concepto</span>
                <input value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
              </label>

              <label className="text-sm text-slate-300 md:col-span-2">
                <span className="mb-1 block text-xs text-slate-500">Descripción (opcional)</span>
                <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs text-slate-500">Categoría</span>
                <input value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs text-slate-500">Subcategoría</span>
                <input value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs text-slate-500">Estación</span>
                <input value={estacion} onChange={(e) => setEstacion(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs text-slate-500">Unidad</span>
                <input value={unidad} onChange={(e) => setUnidad(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs text-slate-500">Prioridad</span>
                <input value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs text-slate-500">Mes de cargo</span>
                <select value={mesCargo} onChange={(e) => setMesCargo(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
                  <option value="">— Sin definir —</option>
                  {meses.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs text-slate-500">Banco</span>
                <input value={banco} onChange={(e) => setBanco(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs text-slate-500">Cuenta bancaria</span>
                <input value={cuentaBancaria} onChange={(e) => setCuentaBancaria(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
              </label>

              <label className="text-sm text-slate-300 md:col-span-2">
                <span className="mb-1 block text-xs text-slate-500">Proyecto</span>
                <select
                  value={proyectoId}
                  onChange={(e) => setProyectoId(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                >
                  <option value="">— Ninguno —</option>
                  {proyectos.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.codigo} — {p.nombre}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-700 bg-slate-800 px-4 py-3">
            <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setError(null);
                setSaving(true);
                try {
                  await patchFolioEditar(token, folioId, {
                    beneficiario,
                    concepto,
                    descripcion,
                    importe: importe.trim() === "" ? null : Number(importe),
                    categoria,
                    subcategoria,
                    estacion,
                    unidad,
                    prioridad,
                    mes_cargo: mesCargo,
                    banco,
                    cuenta_bancaria: cuentaBancaria,
                    proyecto_id: proyectoId ? Number(proyectoId) : null,
                  });
                  onSaved();
                  onClose();
                } catch (e) {
                  setError((e as Error).message || "Error al guardar");
                } finally {
                  setSaving(false);
                }
              }}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

