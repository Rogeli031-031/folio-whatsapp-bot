import { Suspense } from "react";
import { ComprasClient } from "@/components/ComprasClient";

export default function ComprasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-slate-400">Cargando…</p>
        </div>
      }
    >
      <ComprasClient />
    </Suspense>
  );
}
