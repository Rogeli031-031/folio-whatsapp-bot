"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
} from "@/lib/auth";

function KpiContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

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

  if (unauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
          <h1 className="text-lg font-semibold text-white">Acceso no autorizado</h1>
          <p className="mt-2 text-sm text-slate-400">
            Abre el enlace que recibiste por WhatsApp (válido 20 min) o escribe &quot;dashboard&quot; en el bot.
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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-slate-700 bg-slate-900/50 px-4 py-3">
        <h1 className="text-xl font-semibold text-white">KPI Financieros</h1>
        <p className="mt-1 text-sm text-slate-400">IGF Forecast y métricas por planta / provincia</p>
      </div>
      <main className="flex-1 p-4">
        <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-6">
          <h2 className="text-lg font-medium text-slate-200">IGF Forecast</h2>
          <p className="mt-2 text-sm text-slate-400">
            Aquí se mostrará el forecast por planta y total provincia (venta, margen, descuento, gastos, impuestos, HG, utilidad de operación, resultado final). Los accesos a folios, presupuesto y deltas se controlan por rol.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Próximamente: tabla IGF Forecast y botones Revisar folios, Gasto presupuesto, Delta Ventas, Delta Descuentos, Delta Ingresos.
          </p>
        </section>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Ver dashboard de folios
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-4"><p className="text-slate-400">Cargando…</p></div>}>
      <KpiContent />
    </Suspense>
  );
}
