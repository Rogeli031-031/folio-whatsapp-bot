"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchClienteContacto,
  putClienteContacto,
  type DeltaIngresoForecastCliente,
} from "@/lib/api";

export function ClienteContactoPanel(props: {
  token: string;
  planta: string;
  cliente: DeltaIngresoForecastCliente;
}) {
  const { token, planta, cliente } = props;
  const clienteNombre = (cliente.cliente || "").trim();
  const canal = (cliente.canal || "").trim();
  const subcanal = (cliente.subcanal || "").trim();

  const [nombreContacto, setNombreContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token || !planta || !clienteNombre) return;
    setLoading(true);
    setErr(null);
    setSaved(false);
    try {
      const r = await fetchClienteContacto(token, { planta, cliente_nombre: clienteNombre });
      const c = r.contacto;
      setNombreContacto(c?.nombre_contacto || "");
      setTelefono(c?.telefono || "");
      setCorreo(c?.correo || "");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error al cargar contacto");
    } finally {
      setLoading(false);
    }
  }, [token, planta, clienteNombre]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleSave = async () => {
    if (!clienteNombre) return;
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const r = await putClienteContacto(token, {
        planta,
        cliente_nombre: clienteNombre,
        canal,
        subcanal,
        nombre_contacto: nombreContacto,
        telefono,
        correo,
      });
      setNombreContacto(r.contacto?.nombre_contacto || "");
      setTelefono(r.contacto?.telefono || "");
      setCorreo(r.contacto?.correo || "");
      setSaved(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error al guardar contacto");
    } finally {
      setSaving(false);
    }
  };

  if (!token || !planta || !clienteNombre) return null;

  return (
    <div className="w-full shrink-0 rounded border border-slate-600 bg-slate-950/60 p-2 sm:w-72">
      <table className="w-full border-collapse text-xs">
        <tbody>
          <tr className="border-b border-slate-800">
            <td className="whitespace-nowrap py-1 pr-2 text-slate-400">Nombre de contacto:</td>
            <td className="py-1">
              <input
                type="text"
                value={nombreContacto}
                onChange={(e) => {
                  setNombreContacto(e.target.value);
                  setSaved(false);
                }}
                maxLength={200}
                disabled={loading || saving}
                className="w-full rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-sm text-slate-100"
              />
            </td>
          </tr>
          <tr className="border-b border-slate-800">
            <td className="whitespace-nowrap py-1 pr-2 text-slate-400">Teléfono:</td>
            <td className="py-1">
              <input
                type="text"
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value);
                  setSaved(false);
                }}
                maxLength={50}
                disabled={loading || saving}
                className="w-full rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-sm text-slate-100"
              />
            </td>
          </tr>
          <tr>
            <td className="whitespace-nowrap py-1 pr-2 text-slate-400">Correo:</td>
            <td className="py-1">
              <input
                type="email"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  setSaved(false);
                }}
                maxLength={200}
                disabled={loading || saving}
                className="w-full rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-sm text-slate-100"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-end gap-2">
        {loading && <span className="text-[0.7rem] text-slate-500">Cargando…</span>}
        {saved && !err && <span className="text-[0.7rem] text-emerald-400">Guardado</span>}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || loading}
          className="rounded bg-sky-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-600 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {err && <p className="mt-1 text-[0.7rem] text-red-400">{err}</p>}
    </div>
  );
}
