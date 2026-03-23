import { Suspense } from "react";
import { IgfForecastContent } from "@/components/IgfForecastClient";

export default function IgfForecastPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-slate-400">Cargando…</p>
        </div>
      }
    >
      <IgfForecastContent />
    </Suspense>
  );
}
