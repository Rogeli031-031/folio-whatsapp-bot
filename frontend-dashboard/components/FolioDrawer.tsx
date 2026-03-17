"use client";

import { useEffect, useState } from "react";
import {
  fetchFolio,
  fetchTimeline,
  fetchMedia,
  fetchFinanzas,
  fetchMediaUrl,
  postAprobarFolio,
  postRegresarFolioAZp,
  patchFolioMesCargo,
  patchFolioSoloZpAd,
  patchFolioPorRecuperar,
  patchFolioPrioridad,
  postSolicitarPorRecuperar,
  postFolioCotizacion,
  postFolioFactura,
  fetchIgfEmpresas,
  patchFolioPrestamoAPlanta,
} from "@/lib/api";
import EditarFolioModal from "@/components/EditarFolioModal";

/** Opciones de mes de cargo: solo Enero 2026 a Diciembre 2026. */
function getMesesOpciones(): { value: string; label: string }[] {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const out: { value: string; label: string }[] = [];
  const y = 2026;
  for (let m = 1; m <= 12; m++) {
    out.push({
      value: `${y}-${String(m).padStart(2, "0")}`,
      label: `${meses[m - 1]} ${y}`,
    });
  }
  return out;
}

interface Props {
  folioId: number | null;
  token: string | null;
  role?: string;
  onClose: () => void;
  onApproved?: () => void;
}

const ESTADOS_APROBABLES = ["PENDIENTE_APROB_PLANTA", "APROB_PLANTA", "PENDIENTE_APROB_ZP"];
const ESTADOS_CARRO_COMPRA = ["APROBADO_ZP", "LISTO_PARA_PROGRAMACION", "SELECCIONADO_SEMANA", "SOLICITANDO_PAGO"];

export default function FolioDrawer({ folioId, token, role = "GG", onClose, onApproved }: Props) {
  const [folio, setFolio] = useState<Record<string, unknown> | null>(null);
  const [timeline, setTimeline] = useState<{ estatus: string; estatus_visible?: string; etapa_icon?: string; comentario: string; actor_rol: string | null; creado_en: string }[]>([]);
  const [media, setMedia] = useState<{ id: number; tipo: string; file_name: string | null }[]>([]);
  const [finanzas, setFinanzas] = useState<{ status: string; monto_mxn?: number | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [mesCargoEdit, setMesCargoEdit] = useState<string>("");
  const [savingMesCargo, setSavingMesCargo] = useState(false);
  const [savingSoloZpAd, setSavingSoloZpAd] = useState(false);
  const [savingPorRecuperar, setSavingPorRecuperar] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cotizacionFile, setCotizacionFile] = useState<File | null>(null);
  const [uploadingCotizacion, setUploadingCotizacion] = useState(false);
  const [cotizacionError, setCotizacionError] = useState<string | null>(null);
  const [facturaFile, setFacturaFile] = useState<File | null>(null);
  const [uploadingFactura, setUploadingFactura] = useState(false);
  const [facturaError, setFacturaError] = useState<string | null>(null);
  const [prestamoOpen, setPrestamoOpen] = useState(false);
  const [igfEmpresas, setIgfEmpresas] = useState<string[]>([]);
  const [prestamoSelect, setPrestamoSelect] = useState<string>("");
  const [savingPrestamo, setSavingPrestamo] = useState(false);

  useEffect(() => {
    if (!folioId || !token) {
      setFolio(null);
      setTimeline([]);
      setMedia([]);
      setFinanzas(null);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchFolio(token, folioId),
      fetchTimeline(token, folioId),
      fetchMedia(token, folioId),
      fetchFinanzas(token, folioId),
    ])
      .then(([f, t, m, fin]) => {
        const fol = f as Record<string, unknown>;
        setFolio(fol);
        setMesCargoEdit((fol.mes_cargo as string) || "");
        setTimeline((t as { events: typeof timeline }).events || []);
        setMedia((m as { items: typeof media }).items || []);
        setFinanzas(fin as { status: string; monto_mxn?: number | null });
      })
      .catch(() => {
        setFolio(null);
      })
      .finally(() => setLoading(false));
  }, [folioId, token]);

  if (folioId == null) return null;

  const openMediaUrl = async (mediaId: number) => {
    if (!token) return;
    try {
      const { url } = await fetchMediaUrl(token, folioId, mediaId);
      window.open(url, "_blank");
    } catch (e) {
      console.error(e);
    }
  };

  const estatus = (folio?.estatus as string) || "";
  const estatusUpper = estatus.trim().toUpperCase();
  const roleUpper = role && String(role).toUpperCase();
  const soloLectura = roleUpper === "CF_CDMX" || roleUpper === "GA"; // Contralor CDMX y GA solo ven e imprimen, no aprueban
  const puedeEditar = roleUpper === "AD";
  const puedeAprobar = !soloLectura && ESTADOS_APROBABLES.includes(estatusUpper);
  const puedeRegresarZp = !soloLectura && ESTADOS_CARRO_COMPRA.includes(estatusUpper);
  const puedeAsignarMesCargo = (roleUpper === "GG" || roleUpper === "AD" || roleUpper === "ZP") && ESTADOS_CARRO_COMPRA.includes(estatusUpper);
  const puedeSoloZpAd = roleUpper === "ZP" || roleUpper === "AD";
  const soloZpAd = !!folio?.solo_zp_ad;
  const porRecuperar = !!folio?.por_recuperar;
  const solicitudPorRecuperarPendiente = !!folio?.solicitud_por_recuperar_pendiente;
  const esUrgente = (folio?.prioridad ?? "").toString().toLowerCase().includes("urgente");
  const puedeMarcarUrgente = !soloLectura && (roleUpper === "GG" || roleUpper === "AD" || roleUpper === "ZP");
  const puedeSolicitarCancelacion = (roleUpper === "GA" || roleUpper === "GG" || roleUpper === "CF_CDMX") && !["CANCELADO", "PAGADO", "CERRADO", "CANCELACION_SOLICITADA"].includes(estatusUpper);
  const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").trim().replace(/\D/g, "");
  const numeroFolio = (folio?.numero_folio as string) || (folio?.folio_codigo as string) || "";
  const cmdCancelacion = numeroFolio ? `cancelar ${numeroFolio} motivo: ` : "cancelar F-YYYYMM-XXX motivo: ";
  const solicitudCancelacionHref = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(cmdCancelacion)}` : null;

  const handleAprobar = async () => {
    if (!token || !folioId || !puedeAprobar) return;
    setApproveError(null);
    setApproving(true);
    try {
      await postAprobarFolio(token, folioId);
      const [f, t] = await Promise.all([fetchFolio(token, folioId), fetchTimeline(token, folioId)]);
      setFolio(f as Record<string, unknown>);
      setTimeline((t as { events: typeof timeline }).events || []);
      onApproved?.();
    } catch (e) {
      setApproveError((e as Error).message || "Error al aprobar");
    } finally {
      setApproving(false);
    }
  };

  const handleSolicitudCancelacion = () => {
    if (!puedeSolicitarCancelacion) return;
    if (solicitudCancelacionHref) {
      window.open(solicitudCancelacionHref, "_blank", "noopener,noreferrer");
    } else {
      navigator.clipboard
        .writeText(cmdCancelacion)
        .then(() => alert(`Comando copiado: ${cmdCancelacion}`))
        .catch(() => {});
    }
  };

  const handleRegresarZp = async () => {
    if (!token || !folioId || !puedeRegresarZp) return;
    setApproveError(null);
    setApproving(true);
    try {
      await postRegresarFolioAZp(token, folioId);
      const [f, t] = await Promise.all([fetchFolio(token, folioId), fetchTimeline(token, folioId)]);
      setFolio(f as Record<string, unknown>);
      setMesCargoEdit((f as Record<string, unknown>).mes_cargo as string || "");
      setTimeline((t as { events: typeof timeline }).events || []);
      onApproved?.();
    } catch (e) {
      setApproveError((e as Error).message || "Error al regresar a ZP");
    } finally {
      setApproving(false);
    }
  };

  const handleSoloZpAd = async () => {
    if (!token || !folioId || !puedeSoloZpAd) return;
    setApproveError(null);
    setSavingSoloZpAd(true);
    try {
      await patchFolioSoloZpAd(token, folioId, !soloZpAd);
      const f = await fetchFolio(token, folioId);
      setFolio(f as Record<string, unknown>);
      onApproved?.();
    } catch (e) {
      setApproveError((e as Error).message || "Error al cambiar visibilidad");
    } finally {
      setSavingSoloZpAd(false);
    }
  };

  const handlePorRecuperar = async () => {
    if (!token || !folioId || porRecuperar || solicitudPorRecuperarPendiente) return;
    setApproveError(null);
    setSavingPorRecuperar(true);
    try {
      await postSolicitarPorRecuperar(token, folioId);
      const f = await fetchFolio(token, folioId);
      setFolio(f as Record<string, unknown>);
      onApproved?.();
    } catch (e) {
      setApproveError((e as Error).message || "Error al enviar solicitud");
    } finally {
      setSavingPorRecuperar(false);
    }
  };

  const handleMarcarUrgente = async (checked: boolean) => {
    if (!token || !folioId || !puedeMarcarUrgente) return;
    setApproveError(null);
    try {
      await patchFolioPrioridad(token, folioId, checked ? "Urgente no programado" : "Media");
      const f = await fetchFolio(token, folioId);
      setFolio(f as Record<string, unknown>);
      onApproved?.();
    } catch (e) {
      setApproveError((e as Error).message || "Error al cambiar prioridad");
    }
  };

  const onCotizacionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setCotizacionError(null);
    setCotizacionFile(null);
    if (!f) return;
    if (!f.type.includes("pdf")) {
      setCotizacionError("Solo se acepta PDF.");
      return;
    }
    setCotizacionFile(f);
    setUploadingCotizacion(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const data = reader.result as string;
      const base64 = data.indexOf(",") >= 0 ? data.split(",")[1] : data;
      if (!token || !folioId || !base64) {
        setUploadingCotizacion(false);
        return;
      }
      setCotizacionError(null);
      try {
        await postFolioCotizacion(token, folioId, {
          fileBase64: base64,
          fileName: f.name || "cotizacion.pdf",
        });
        setCotizacionFile(null);
        const [fol, t, m] = await Promise.all([
          fetchFolio(token, folioId),
          fetchTimeline(token, folioId),
          fetchMedia(token, folioId),
        ]);
        setFolio(fol as Record<string, unknown>);
        setTimeline((t as { events: typeof timeline }).events || []);
        setMedia((m as { items: typeof media }).items || []);
        onApproved?.();
      } catch (err) {
        setCotizacionError((err as Error).message || "Error al subir la cotización");
      } finally {
        setUploadingCotizacion(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const onFacturaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFacturaError(null);
    setFacturaFile(null);
    if (!f) return;
    if (!f.type.includes("pdf")) {
      setFacturaError("Solo se acepta PDF.");
      return;
    }
    setFacturaFile(f);
    setUploadingFactura(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const data = reader.result as string;
      const base64 = data.indexOf(",") >= 0 ? data.split(",")[1] : data;
      if (!token || !folioId || !base64) {
        setUploadingFactura(false);
        return;
      }
      setFacturaError(null);
      try {
        await postFolioFactura(token, folioId, {
          fileBase64: base64,
          fileName: f.name || "factura.pdf",
        });
        setFacturaFile(null);
        const [fol, t, m] = await Promise.all([
          fetchFolio(token, folioId),
          fetchTimeline(token, folioId),
          fetchMedia(token, folioId),
        ]);
        setFolio(fol as Record<string, unknown>);
        setTimeline((t as { events: typeof timeline }).events || []);
        setMedia((m as { items: typeof media }).items || []);
        onApproved?.();
      } catch (err) {
        setFacturaError((err as Error).message || "Error al subir la factura");
      } finally {
        setUploadingFactura(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const handleSaveMesCargo = async () => {
    if (!token || !folioId || !puedeAsignarMesCargo) return;
    setApproveError(null);
    setSavingMesCargo(true);
    try {
      await patchFolioMesCargo(token, folioId, mesCargoEdit && /^\d{4}-\d{2}$/.test(mesCargoEdit) ? mesCargoEdit : null);
      const f = await fetchFolio(token, folioId);
      setFolio(f as Record<string, unknown>);
      setMesCargoEdit((f as Record<string, unknown>).mes_cargo as string || "");
      onApproved?.();
    } catch (e) {
      setApproveError((e as Error).message || "Error al guardar mes de cargo");
    } finally {
      setSavingMesCargo(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto border-l border-slate-700 bg-slate-900 shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3">
          <h2 className="font-semibold text-white">
            {folio ? (folio.folio_codigo as string) : `Folio #${folioId}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-4">
          {loading && <p className="text-slate-400">Cargando…</p>}
          {folio && !loading && (
            <>
              <section>
                <h3 className="mb-2 text-sm font-medium text-slate-400">Datos</h3>
                <dl className="space-y-1 text-sm">
                  <div><dt className="text-slate-500">Planta</dt><dd className="text-slate-200">{String(folio.planta_nombre ?? "—")}</dd></div>
                  <div><dt className="text-slate-500">Beneficiario</dt><dd className="text-slate-200">{String((folio as Record<string, unknown>).beneficiario ?? "—")}</dd></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <dt className="text-slate-500">Estatus</dt>
                      <dd className="text-slate-200">{folio.etapa_icon ? <span className="mr-1">{folio.etapa_icon as string}</span> : null}{String(folio.estatus_visible ?? folio.estatus ?? "—")}</dd>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {puedeEditar && (
                        <button
                          type="button"
                          onClick={() => setEditOpen(true)}
                          className="rounded bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-500"
                        >
                          Editar
                        </button>
                      )}
                      {puedeSolicitarCancelacion && (
                        <button
                          type="button"
                          onClick={handleSolicitudCancelacion}
                          className="rounded bg-red-900/80 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
                        >
                          Solicitud de cancelación
                        </button>
                      )}
                      {puedeAprobar && (
                        <button
                          type="button"
                          onClick={handleAprobar}
                          disabled={approving}
                          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {approving ? "…" : "Aprobar folio"}
                        </button>
                      )}
                      {puedeRegresarZp && (
                        <button
                          type="button"
                          onClick={handleRegresarZp}
                          disabled={approving}
                          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                        >
                          {approving ? "…" : "Regresar a ZP"}
                        </button>
                      )}
                    </div>
                  </div>
                  {approveError && <p className="text-sm text-red-400">{approveError}</p>}
                  {puedeSoloZpAd && (
                    <div className="pt-2 border-t border-slate-700">
                      <button
                        type="button"
                        onClick={handleSoloZpAd}
                        disabled={savingSoloZpAd}
                        className={`rounded px-3 py-1.5 text-sm font-medium ${soloZpAd ? "bg-amber-700 text-white hover:bg-amber-600" : "bg-slate-600 text-white hover:bg-slate-500"} disabled:opacity-50`}
                      >
                        {savingSoloZpAd ? "…" : soloZpAd ? "Quitar privado (visible para todos)" : "Solo ZP y AD (hacer privado)"}
                      </button>
                      {soloZpAd && <p className="text-xs text-slate-500 mt-1">Solo Director ZP y Asistente de Dirección pueden ver este folio.</p>}
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-700">
                    <button
                      type="button"
                      onClick={handlePorRecuperar}
                      disabled={savingPorRecuperar || porRecuperar || solicitudPorRecuperarPendiente}
                      className={`rounded px-3 py-1.5 text-sm font-medium ${porRecuperar ? "bg-blue-600 text-white" : solicitudPorRecuperarPendiente ? "bg-amber-700/80 text-amber-100" : "bg-slate-600 text-white hover:bg-slate-500"} disabled:opacity-50`}
                    >
                      {savingPorRecuperar ? "…" : porRecuperar ? "Por recuperar (aprobado)" : solicitudPorRecuperarPendiente ? "Solicitud enviada (pendiente CDMX)" : "Por recuperar"}
                    </button>
                    <p className="text-xs text-slate-500 mt-1">
                      {solicitudPorRecuperarPendiente ? "El Contralor Financiero CDMX debe aprobar o rechazar por WhatsApp." : "Pagado de presupuesto y debe recuperarse. Se identifica en azul en el tablero."}
                    </p>
                  </div>
                  {!soloLectura && (
                    <div className="pt-2 border-t border-slate-700">
                      <dt className="text-slate-500 mb-1">Préstamos a planta</dt>
                      <dd>
{(folio as Record<string, unknown>).prestamo_a_planta ? (
                            <p className="text-sm text-slate-300 mb-1">
                              Cargado a: <strong>{(folio as Record<string, unknown>).prestamo_a_planta as string}</strong>
                            </p>
                        ) : null}
                        {!prestamoOpen ? (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!token) return;
                              setPrestamoOpen(true);
                              setPrestamoSelect(((folio as Record<string, unknown>).prestamo_a_planta as string) || "");
                              try {
                                const { empresas } = await fetchIgfEmpresas(token);
                                setIgfEmpresas(empresas || []);
                              } catch {
                                setIgfEmpresas([]);
                              }
                            }}
                            className="rounded bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-500"
                          >
                            Préstamos a planta
                          </button>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={prestamoSelect}
                              onChange={(e) => setPrestamoSelect(e.target.value)}
                              className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                            >
                              <option value="">— Ninguna —</option>
                              {igfEmpresas.map((emp) => (
                                <option key={emp} value={emp}>{emp}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!token || folioId == null) return;
                                setSavingPrestamo(true);
                                try {
                                  await patchFolioPrestamoAPlanta(token, folioId, prestamoSelect.trim() || null);
                                  const f = await fetchFolio(token, folioId);
                                  setFolio(f as Record<string, unknown>);
                                  setPrestamoOpen(false);
                                  onApproved?.();
                                } finally {
                                  setSavingPrestamo(false);
                                }
                              }}
                              disabled={savingPrestamo}
                              className="rounded bg-slate-600 px-2 py-1.5 text-sm text-white hover:bg-slate-500 disabled:opacity-50"
                            >
                              {savingPrestamo ? "…" : "Guardar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrestamoOpen(false)}
                              className="rounded px-2 py-1.5 text-sm text-slate-400 hover:text-slate-200"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </dd>
                    </div>
                  )}
                  {puedeAsignarMesCargo && (
                    <div className="pt-2 border-t border-slate-700">
                      <dt className="text-slate-500 mb-1">Mes de cargo (para documento e impresión)</dt>
                      <dd className="flex flex-wrap items-center gap-2">
                        <select
                          value={mesCargoEdit}
                          onChange={(e) => setMesCargoEdit(e.target.value)}
                          className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                        >
                          <option value="">— Sin definir —</option>
                          {getMesesOpciones().map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleSaveMesCargo}
                          disabled={savingMesCargo}
                          className="rounded bg-slate-600 px-2 py-1.5 text-sm text-white hover:bg-slate-500 disabled:opacity-50"
                        >
                          {savingMesCargo ? "…" : "Guardar"}
                        </button>
                      </dd>
                    </div>
                  )}
                  <div><dt className="text-slate-500">Importe</dt><dd className="text-slate-200">{folio.importe != null ? `$${Number(folio.importe).toLocaleString("es-MX")}` : "N/A"}</dd></div>
                  <div><dt className="text-slate-500">Concepto</dt><dd className="text-slate-200">{String(folio.descripcion_display ?? folio.concepto ?? "—")}</dd></div>
                </dl>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-medium text-slate-400">Timeline</h3>
                <ul className="space-y-2 text-sm">
                  {timeline.map((ev, i) => (
                    <li key={i} className="border-l-2 border-slate-600 pl-2">
                      <span className="text-slate-500">{new Date(ev.creado_en).toLocaleString("es-MX")}</span>
                      <span className="ml-2 text-slate-300">
                        {ev.etapa_icon ? <span className="mr-1">{ev.etapa_icon}</span> : null}
                        {ev.estatus_visible || ev.estatus || "—"}
                      </span>
                      {ev.comentario && <p className="text-slate-400">{ev.comentario}</p>}
                      {ev.actor_rol && <span className="text-xs text-slate-500">{ev.actor_rol}</span>}
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-medium text-slate-400">Adjuntos</h3>
                {(() => {
                  const tieneCotizacion = !!(folio.cotizacion_url || folio.cotizacion_s3key) || media.some((m) => (m.tipo || "").toUpperCase() === "COTIZACION");
                  return (
                    <>
                      {!tieneCotizacion && (
                        <div className="mb-3">
                          <p className="text-xs text-slate-500 mb-1">Este folio no tiene cotización adjunta (se muestra en rojo en el tablero). Selecciona un PDF para subir.</p>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={onCotizacionFileChange}
                            disabled={uploadingCotizacion}
                            className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200 file:mr-2 file:rounded file:border-0 file:bg-amber-600 file:px-2 file:py-1 file:text-white file:hover:bg-amber-500 disabled:opacity-50"
                          />
                          {cotizacionFile && <span className="mt-1 block text-xs text-slate-500">{uploadingCotizacion ? "Subiendo…" : cotizacionFile.name}</span>}
                          {cotizacionError && <p className="mt-1 text-xs text-red-400">{cotizacionError}</p>}
                        </div>
                      )}
                      {media.length === 0 ? (
                        <p className="text-sm text-slate-500">Sin adjuntos</p>
                      ) : null}
                    </>
                  );
                })()}
                      {media.length === 0 ? null : (
                  <ul className="space-y-1">
                    {(() => {
                      const byTipo = {} as Record<string, { id: number; tipo: string; file_name: string | null }>;
                      media.forEach((m) => {
                        const t = (m.tipo || "").toUpperCase();
                        if (t === "COTIZACION" && !byTipo.COTIZACION) byTipo.COTIZACION = m;
                        if (t === "POLIZA" && !byTipo.POLIZA) byTipo.POLIZA = m;
                        if (t === "FACTURA" && !byTipo.FACTURA) byTipo.FACTURA = m;
                      });
                      const items = [
                        byTipo.COTIZACION ? { label: "Cotización", ...byTipo.COTIZACION } : null,
                        byTipo.POLIZA ? { label: "Póliza", ...byTipo.POLIZA } : null,
                        byTipo.FACTURA ? { label: "Factura", ...byTipo.FACTURA } : null,
                      ].filter(Boolean) as { label: string; id: number; file_name: string | null }[];
                      if (items.length === 0) {
                        return media.map((m) => (
                          <li key={m.id}>
                            <button type="button" onClick={() => openMediaUrl(m.id)} className="text-sm text-blue-400 hover:underline">
                              {m.tipo} {m.file_name || `#${m.id}`}
                            </button>
                          </li>
                        ));
                      }
                      return items.map((it) => (
                        <li key={it.id}>
                          <button type="button" onClick={() => openMediaUrl(it.id)} className="text-sm text-blue-400 hover:underline">
                            {it.label}: {it.file_name || `#${it.id}`}
                          </button>
                        </li>
                      ));
                    })()}
                  </ul>
                )}
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-1">Adjuntar factura (PDF).</p>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={onFacturaFileChange}
                    disabled={uploadingFactura}
                    className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200 file:mr-2 file:rounded file:border-0 file:bg-amber-600 file:px-2 file:py-1 file:text-white file:hover:bg-amber-500 disabled:opacity-50"
                  />
                  {facturaFile && <span className="mt-1 block text-xs text-slate-500">{uploadingFactura ? "Subiendo…" : facturaFile.name}</span>}
                  {facturaError && <p className="mt-1 text-xs text-red-400">{facturaError}</p>}
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-medium text-slate-400">Finanzas</h3>
                {finanzas?.status === "PENDIENTE_INTEGRACION" ? (
                  <p className="text-sm text-slate-500">
                    Pendiente de integración.
                    {finanzas.monto_mxn != null && ` Monto: $${Number(finanzas.monto_mxn).toLocaleString("es-MX")}`}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">N/A</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
      {editOpen && token && folioId != null && folio && (
        <EditarFolioModal
          open={editOpen}
          token={token}
          folioId={folioId}
          folio={folio}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            const [f, t] = await Promise.all([fetchFolio(token, folioId), fetchTimeline(token, folioId)]);
            setFolio(f as Record<string, unknown>);
            setMesCargoEdit((f as Record<string, unknown>).mes_cargo as string || "");
            setTimeline((t as { events: typeof timeline }).events || []);
            onApproved?.();
          }}
        />
      )}
    </>
  );
}
