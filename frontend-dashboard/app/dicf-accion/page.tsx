"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
} from "@/lib/auth";
import { fetchDicfAccionLookup, type DicfAccionRow } from "@/lib/api";
import { DicfAccionResponderPanel } from "@/components/DicfAccionResponderPanel";

function DicfAccionContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [accion, setAccion] = useState<DicfAccionRow | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = parseTokenFromQuery(searchParams) || getTokenFromStorage();
    const c = (searchParams.get("codigo") || searchParams.get("code") || "").trim();
    setCodigo(c);
    if (t) {
      setTokenInStorage(t);
      setToken(t);
      setUnauthorized(false);
    } else {
      setToken(null);
      setUnauthorized(true);
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!token || !codigo) {
      setLoading(false);
      if (token && !codigo) setLoadErr("Falta el código de la acción en la URL (?codigo=…)");
      return;
    }
    setLoading(true);
    setLoadErr(null);
    try {
      const r = await fetchDicfAccionLookup(token, codigo);
      setAccion(r.accion);
    } catch (e: unknown) {
      setAccion(null);
      setLoadErr(e instanceof Error ? e.message : "No se pudo cargar la acción");
    } finally {
      setLoading(false);
    }
  }, [token, codigo]);

  useEffect(() => {
    load();
  }, [load]);

  if (unauthorized || !token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 bg-slate-950">
        <p className="text-slate-400">Abre el enlace completo que recibiste por WhatsApp (incluye el token).</p>
      </div>
    );
  }

  const tEnc = encodeURIComponent(token);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <h1 className="text-lg font-semibold text-amber-200">Acción DICF</h1>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/?t=${tEnc}`}
            className="rounded border border-slate-600 px-3 py-1 text-slate-300 hover:bg-slate-800"
          >
            KPI Financieros
          </Link>
          <Link
            href={`/dashboard?t=${tEnc}`}
            className="rounded border border-emerald-700 px-3 py-1 text-emerald-300 hover:bg-emerald-900/30"
          >
            Folios
          </Link>
        </nav>
      </header>

      {loading && <p className="text-slate-500">Cargando…</p>}
      {!loading && loadErr && (
        <div className="rounded border border-red-900/50 bg-red-950/40 p-4 text-red-200">
          <p>{loadErr}</p>
          <button
            type="button"
            className="mt-2 text-sm text-amber-400 underline"
            onClick={() => load()}
          >
            Reintentar
          </button>
        </div>
      )}
      {!loading && accion && (
        <DicfAccionResponderPanel token={token} accion={accion} onReload={load} />
      )}
    </div>
  );
}

export default function DicfAccionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          Cargando…
        </div>
      }
    >
      <DicfAccionContent />
    </Suspense>
  );
}
