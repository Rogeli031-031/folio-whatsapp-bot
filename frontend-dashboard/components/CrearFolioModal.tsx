"use client";

import { useState, useEffect, useMemo } from "react";
import {
  fetchPlantas,
  fetchProyectosPorPlanta,
  postCrearFolio,
  postCheckDuplicadosFolio,
  type CrearFolioPayload,
  type CrearFolioInitialValues,
  type DuplicadoCandidate,
} from "@/lib/api";
import { tokenHasPermiso, getRoleFromDashboardToken } from "@/lib/auth";

const CATEGORIAS = [
  { clave: "GASTOS", nombre: "Gastos" },
  { clave: "INVERSIONES", nombre: "Inversiones" },
  { clave: "DYO", nombre: "Derechos y Obligaciones" },
  { clave: "TALLER", nombre: "Taller" },
];

const SUBCATEGORIAS: Record<string, string[]> = {
  GASTOS: ["Contractuales", "Equipo planta", "Estaciones", "Jurídicos", "Liquidaciones laborales", "Pasivos meses anteriores", "Rentas", "Trámites vehiculares", "Viáticos", "Varios"],
  INVERSIONES: ["Equipo para la planta", "Instalaciones a clientes", "Publicidad", "Tanques y cilindros", "Estaciones"],
  DYO: [],
  TALLER: ["REPARACIÓN MAYOR", "PASIVO/RECUPERACIÓN", "PREVENTIVO"],
};

const PRIORIDADES = ["Urgente no programado", "Alta", "Media", "Baja"];
const MAX_LINEAS = 8;

type LineaForm = { beneficiario: string; concepto: string; importe: string };

function emptyLinea(): LineaForm {
  return { beneficiario: "", concepto: "", importe: "" };
}

function parseImporte(raw: string): number {
  return parseFloat(String(raw || "").replace(/,/g, "."));
}

function normalizeCategoriaClave(raw: string | null | undefined): string {
  const c = String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  if (c.includes("TALLER")) return "TALLER";
  if (c.includes("INVERSION")) return "INVERSIONES";
  if (c.includes("DYO") || c.includes("DERECHO") || c.includes("OBLIGACION")) return "DYO";
  if (c.includes("GASTO")) return "GASTOS";
  return c || "GASTOS";
}

function matchSubcategoria(cat: string, raw: string | null | undefined): string {
  const want = String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  if (!want) return "";
  const list = SUBCATEGORIAS[cat] || [];
  const hit = list.find((s) => {
    const n = s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
    return n === want || n.includes(want) || want.includes(n);
  });
  return hit || String(raw || "").trim();
}

interface Props {
  open: boolean;
  onClose: () => void;
  plantaId: number;
  plantaNombre: string;
  token: string;
  onCreated: () => void;
  /** Si true, el folio se crea con prioridad "Urgente no programado" */
  urgente?: boolean;
  /** Prefill desde COMPARAR/ACTUALIZAR u otros flujos */
  initialValues?: CrearFolioInitialValues | null;
}

const PRIORIDAD_URGENTE = "Urgente no programado";

export default function CrearFolioModal({
  open,
  onClose,
  plantaId,
  plantaNombre,
  token,
  onCreated,
  urgente = false,
  initialValues = null,
}: Props) {
  const [plantas, setPlantas] = useState<{ id: number; nombre: string }[]>([]);
  const [lineas, setLineas] = useState<LineaForm[]>([emptyLinea()]);
  const [categoria, setCategoria] = useState("GASTOS");
  const [subcategoria, setSubcategoria] = useState("");
  const [prioridad, setPrioridad] = useState(urgente ? PRIORIDAD_URGENTE : "Media");
  const [unidad, setUnidad] = useState("");
  const [estacion, setEstacion] = useState("");
  const [banco, setBanco] = useState("");
  const [cuenta_bancaria, setCuentaBancaria] = useState("");
  const [mesCargoPrefill, setMesCargoPrefill] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlantaId, setSelectedPlantaId] = useState(plantaId);
  const [proyectoId, setProyectoId] = useState<number | null>(null);
  const [proyectos, setProyectos] = useState<{ id: number; codigo: string; nombre: string }[]>([]);
  const [soloZpAd, setSoloZpAd] = useState(false);
  const [dupCandidates, setDupCandidates] = useState<DuplicadoCandidate[]>([]);
  const [dupIgnored, setDupIgnored] = useState(false);

  useEffect(() => {
    if (open) {
      const initPlanta =
        initialValues?.planta_id != null && Number.isFinite(Number(initialValues.planta_id))
          ? Number(initialValues.planta_id)
          : plantaId;
      setSelectedPlantaId(initPlanta);
      setProyectoId(null);
      setPrioridad(urgente ? PRIORIDAD_URGENTE : "Media");
      setDupCandidates([]);
      setDupIgnored(false);
      setError(null);
      if (initialValues) {
        const cat = normalizeCategoriaClave(initialValues.categoria);
        setCategoria(cat);
        setSubcategoria(matchSubcategoria(cat, initialValues.subcategoria));
        setUnidad(initialValues.unidad != null ? String(initialValues.unidad) : "");
        setBanco(initialValues.banco != null ? String(initialValues.banco) : "");
        setCuentaBancaria(
          initialValues.cuenta_bancaria != null ? String(initialValues.cuenta_bancaria) : ""
        );
        setMesCargoPrefill(
          initialValues.mes_cargo && /^\d{4}-\d{2}$/.test(String(initialValues.mes_cargo))
            ? String(initialValues.mes_cargo)
            : null
        );
        const imp =
          initialValues.importe != null && initialValues.importe !== ""
            ? String(initialValues.importe)
            : "";
        setLineas([
          {
            beneficiario: initialValues.beneficiario != null ? String(initialValues.beneficiario) : "",
            concepto: initialValues.concepto != null ? String(initialValues.concepto) : "",
            importe: imp,
          },
        ]);
      } else {
        setLineas([emptyLinea()]);
        setCategoria("GASTOS");
        setSubcategoria("");
        setUnidad("");
        setEstacion("");
        setBanco("");
        setCuentaBancaria("");
        setMesCargoPrefill(null);
        setSoloZpAd(false);
      }
      if (token) fetchPlantas(token).then((r) => setPlantas(r.plantas || [])).catch(() => setPlantas([]));
    }
  }, [open, token, plantaId, urgente, initialValues]);

  useEffect(() => {
    setDupCandidates([]);
    setDupIgnored(false);
  }, [lineas, selectedPlantaId]);

  useEffect(() => {
    if (!open || !token || !selectedPlantaId) {
      setProyectos([]);
      return;
    }
    fetchProyectosPorPlanta(token, selectedPlantaId)
      .then((r) => setProyectos(r.proyectos || []))
      .catch(() => setProyectos([]));
  }, [open, token, selectedPlantaId]);

  const subs = SUBCATEGORIAS[categoria] || [];
  const showUnidad = categoria === "TALLER";
  const tallerTipoRequerido = categoria === "TALLER";
  const showEstacion = subcategoria.trim().toLowerCase() === "estaciones";

  const totalImporte = useMemo(() => {
    return lineas.reduce((s, L) => {
      const n = parseImporte(L.importe);
      return s + (Number.isFinite(n) && n >= 0 ? n : 0);
    }, 0);
  }, [lineas]);

  const updateLinea = (idx: number, patch: Partial<LineaForm>) => {
    setLineas((prev) => prev.map((L, i) => (i === idx ? { ...L, ...patch } : L)));
  };

  const addLinea = () => {
    setLineas((prev) => (prev.length >= MAX_LINEAS ? prev : [...prev, emptyLinea()]));
  };

  const removeLinea = (idx: number) => {
    setLineas((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const buildValidLineas = () => {
    const out: { beneficiario?: string; concepto: string; importe: number }[] = [];
    for (const L of lineas) {
      const concepto = L.concepto.trim();
      const importeNum = parseImporte(L.importe);
      if (!concepto && !L.importe.trim() && !L.beneficiario.trim()) continue;
      if (!concepto || concepto.length < 2) {
        return { error: "Cada solicitud llena necesita concepto (mín. 2 caracteres)." as string | null, lineas: out };
      }
      if (!Number.isFinite(importeNum) || importeNum < 0) {
        return { error: "Cada solicitud necesita un importe válido (≥ 0)." as string | null, lineas: out };
      }
      out.push({
        beneficiario: L.beneficiario.trim() || undefined,
        concepto,
        importe: importeNum,
      });
    }
    if (!out.length) {
      return { error: "Agrega al menos una solicitud con concepto e importe." as string | null, lineas: out };
    }
    return { error: null as string | null, lineas: out };
  };

  const createFolio = async (validLineas: { beneficiario?: string; concepto: string; importe: number }[]) => {
    const total = validLineas.reduce((s, L) => s + L.importe, 0);
    const payload: CrearFolioPayload = {
      planta_id: selectedPlantaId,
      proyecto_id: proyectoId && proyectoId > 0 ? proyectoId : undefined,
      lineas: validLineas,
      beneficiario: validLineas[0]?.beneficiario,
      concepto: validLineas[0]?.concepto,
      importe: total,
      categoria,
      subcategoria: subcategoria.trim() || undefined,
      prioridad,
      unidad: unidad.trim() || undefined,
      estacion: estacion.trim() || undefined,
      banco: banco.trim() || undefined,
      cuenta_bancaria: cuenta_bancaria.trim() || undefined,
      solo_zp_ad: soloZpAd || undefined,
      mes_cargo: mesCargoPrefill || undefined,
    };
    await postCrearFolio(token, payload);
    onCreated();
    onClose();
    setLineas([emptyLinea()]);
    setSubcategoria("");
    setUnidad("");
    setEstacion("");
    setBanco("");
    setCuentaBancaria("");
    setMesCargoPrefill(null);
    setSoloZpAd(false);
    setDupCandidates([]);
    setDupIgnored(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (tallerTipoRequerido && !subcategoria.trim()) {
      setError("Para Taller debes seleccionar el tipo de solicitud (Reparación mayor, Pasivo/Recuperación o Preventivo).");
      return;
    }
    const built = buildValidLineas();
    if (built.error) {
      setError(built.error);
      return;
    }
    setSaving(true);
    try {
      if (!dupIgnored) {
        try {
          const first = built.lineas[0];
          const check = await postCheckDuplicadosFolio(token, {
            planta_id: selectedPlantaId,
            concepto: first.concepto,
            importe: built.lineas.reduce((s, L) => s + L.importe, 0),
            meses: 12,
            umbral: 0.72,
          });
          if (check.alert && check.candidates?.length) {
            setDupCandidates(check.candidates);
            setSaving(false);
            return;
          }
        } catch {
          // Si el chequeo falla, no bloquear la creación
        }
      }
      await createFolio(built.lineas);
    } catch (err) {
      setError((err as Error).message || "Error al guardar el folio.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const plantaOptions = plantas.length
    ? plantas.some((p) => p.id === plantaId)
      ? plantas
      : [{ id: plantaId, nombre: plantaNombre }, ...plantas]
    : [{ id: plantaId, nombre: plantaNombre }];

  const totalFmt = totalImporte.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-lg border border-slate-600 bg-slate-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2 sticky top-0 bg-slate-900 z-10">
          <div>
            <h2 className="text-lg font-medium text-slate-200">
              {urgente ? "Crear folio urgente" : initialValues ? "Crear folio (desde Excel)" : "Crear folio"}
            </h2>
            {mesCargoPrefill && (
              <p className="text-[11px] text-emerald-400/90">Mes de cargo al guardar: {mesCargoPrefill}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-2">
          {error && <p className="rounded bg-red-900/50 px-2 py-1 text-sm text-red-300">{error}</p>}
          {initialValues && (
            <p className="rounded border border-violet-800/50 bg-violet-950/30 px-3 py-2 text-xs text-violet-200">
              Datos precargados desde el Excel. Puedes editarlos antes de guardar.
            </p>
          )}
          {dupCandidates.length > 0 && (
            <div className="rounded border border-amber-700/60 bg-amber-950/40 px-3 py-2 space-y-2">
              <p className="text-sm font-medium text-amber-200">
                Posible duplicado: mismo importe y concepto similar a {dupCandidates.length} folio(s) en los últimos 12 meses.
              </p>
              <ul className="max-h-36 space-y-1.5 overflow-y-auto text-xs text-slate-300">
                {dupCandidates.map((c) => (
                  <li key={c.id} className="rounded bg-slate-900/50 px-2 py-1.5">
                    <span className="font-mono text-amber-300">{c.numero_folio || c.folio_codigo}</span>
                    <span className="ml-2 text-amber-200/80">{Math.round(c.score * 100)}%</span>
                    <p className="mt-0.5 line-clamp-2 text-slate-400">{c.concepto}</p>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    setDupIgnored(true);
                    setSaving(true);
                    setError(null);
                    try {
                      const built = buildValidLineas();
                      if (built.error) {
                        setError(built.error);
                        setDupIgnored(false);
                        return;
                      }
                      await createFolio(built.lineas);
                    } catch (err) {
                      setError((err as Error).message || "Error al guardar el folio.");
                      setDupIgnored(false);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="rounded bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  Crear de todos modos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDupCandidates([]);
                    setDupIgnored(false);
                  }}
                  className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600"
                >
                  Revisar datos
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Planta</label>
              <select
                value={selectedPlantaId}
                onChange={(e) => setSelectedPlantaId(Number(e.target.value))}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                required
              >
                {plantaOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Proyecto (opcional)</label>
              <select
                value={proyectoId ?? ""}
                onChange={(e) => { const v = e.target.value; setProyectoId(v === "" ? null : Number(v)); }}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
              >
                <option value="">— Ninguno —</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.codigo} – {p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded border border-slate-700 bg-slate-950/40 p-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-400">
                Solicitudes (beneficiario / concepto / importe) — máx. {MAX_LINEAS}
              </p>
              <button
                type="button"
                onClick={addLinea}
                disabled={lineas.length >= MAX_LINEAS}
                className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600 disabled:opacity-40"
              >
                + Agregar renglón
              </button>
            </div>
            {lineas.map((L, idx) => (
              <div key={idx} className="rounded border border-slate-700/80 bg-slate-900/60 p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">Solicitud {idx + 1}</span>
                  {lineas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLinea(idx)}
                      className="text-[11px] text-red-400 hover:text-red-300"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-0.5">Beneficiario</label>
                    <input
                      type="text"
                      value={L.beneficiario}
                      onChange={(e) => updateLinea(idx, { beneficiario: e.target.value })}
                      className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                      placeholder="Nombre o razón social"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-0.5">Importe (MXN) *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={L.importe}
                      onChange={(e) => updateLinea(idx, { importe: e.target.value })}
                      className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                      placeholder="Ej: 1500 o 1,500.50"
                      required={idx === 0}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 mb-0.5">Concepto *</label>
                    <textarea
                      value={L.concepto}
                      onChange={(e) => updateLinea(idx, { concepto: e.target.value })}
                      className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200 min-h-[44px]"
                      placeholder="Descripción del gasto"
                      required={idx === 0}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-end gap-2 border-t border-slate-700 pt-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Total folio</span>
              <span className="rounded bg-emerald-900/40 px-2.5 py-1 text-sm font-semibold text-emerald-300">
                $ {totalFmt}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Categoría *</label>
              <select
                value={categoria}
                onChange={(e) => { setCategoria(e.target.value); setSubcategoria(""); }}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                required
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.clave} value={c.clave}>{c.nombre}</option>
                ))}
              </select>
            </div>
            {subs.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-0.5">
                  {tallerTipoRequerido ? "Tipo de solicitud *" : "Subcategoría"}
                </label>
                <select
                  value={subcategoria}
                  onChange={(e) => setSubcategoria(e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                  required={tallerTipoRequerido}
                >
                  <option value="">{tallerTipoRequerido ? "— Selecciona —" : "— Opcional —"}</option>
                  {subs.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Prioridad *</label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                required
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            {showUnidad && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-0.5">Unidad</label>
                <input
                  type="text"
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                  placeholder="AT-15 o varias: 11,12,13"
                />
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Se homologa a AT-XX. Varias pipas: el importe se reparte en partes iguales en reportes.
                </p>
              </div>
            )}
            {showEstacion && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-0.5">Estación</label>
                <input
                  type="text"
                  value={estacion}
                  onChange={(e) => setEstacion(e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                  placeholder="Nombre estación"
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Banco</label>
              <input
                type="text"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                placeholder="Nombre del banco"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Cuenta bancaria</label>
              <input
                type="text"
                value={cuenta_bancaria}
                onChange={(e) => setCuentaBancaria(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                placeholder="CLABE o número de cuenta"
              />
            </div>
          </div>
          <div className="pt-2">
            {(() => {
              const roleUpper = (getRoleFromDashboardToken(token) || "").toUpperCase();
              const fromToken = tokenHasPermiso(token, "acceso_marcar_solo_zp_ad");
              const puedeMarcarPrivado =
                fromToken == null ? roleUpper === "ZP" || roleUpper === "AD" : fromToken;
              if (!puedeMarcarPrivado) return null;
              return (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={soloZpAd}
                      onChange={(e) => setSoloZpAd(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm text-slate-300">Solo ZP y AD (hacer privado)</span>
                  </label>
                  <p className="mt-0.5 text-xs text-slate-500">
                    El folio solo lo verán usuarios con permiso de ver folios Solo ZP y AD (privados). No se
                    enviarán notificaciones por WhatsApp excepto a ZP.
                  </p>
                </>
              );
            })()}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar folio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
