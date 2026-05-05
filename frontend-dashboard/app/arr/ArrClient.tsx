"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ArrClient() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("t") ?? "";
  const backHref = token ? `/igf-forecast?t=${encodeURIComponent(token)}` : "/igf-forecast";

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
            Pronto estará disponible aquí.
          </p>
        </section>
      </main>
    </div>
  );
}
