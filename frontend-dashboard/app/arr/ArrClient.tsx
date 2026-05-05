"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import { IGF_MINI_RESUMEN_LABELS } from "@/lib/igf-kpi-ui";

export default function ArrClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("t") ?? "";
  const empresa = searchParams?.get("empresa") ?? "";
  const backHref = token ? `/igf-forecast?t=${encodeURIComponent(token)}` : "/igf-forecast";

  const handleEmpresaChange = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (next) {
        params.set("empresa", next);
      } else {
        params.delete("empresa");
      }
      const qs = params.toString();
      router.replace(qs ? `/arr?${qs}` : "/arr");
    },
    [router, searchParams]
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 bg-slate-900/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="text-sm text-amber-400 hover:text-amber-300"
          >
            ← IGF Forecast
          </Link>
          <h1 className="text-lg font-semibold text-slate-100">ARR</h1>
        </div>

        <label className="inline-flex items-center gap-2 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200">
          <span className="text-slate-400">Empresa:</span>
          <select
            value={empresa}
            onChange={(e) => handleEmpresaChange(e.target.value)}
            className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200 text-sm"
          >
            <option value="">Seleccionar…</option>
            {IGF_MINI_RESUMEN_LABELS.map((emp) => (
              <option key={emp} value={emp}>
                {emp}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <section className="w-full max-w-xl rounded-lg border border-amber-500/30 bg-slate-900/60 p-8 text-center shadow-lg">
          <div className="mb-4 flex justify-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-500/60 bg-amber-500/10 text-3xl text-amber-400">
              ⚙
            </span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-100">
            Pantalla en construcción
          </h2>
          <p className="text-sm text-slate-400">
            El módulo <span className="font-semibold text-amber-400">ARR</span> está en desarrollo.
            {empresa ? (
              <>
                {" "}Empresa seleccionada:{" "}
                <span className="font-semibold text-slate-100">{empresa}</span>.
              </>
            ) : (
              <> Selecciona una empresa para continuar.</>
            )}
          </p>
        </section>
      </main>
    </div>
  );
}
