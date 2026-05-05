import { Suspense } from "react";
import ArrClient from "./ArrClient";

export default function ArrPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-slate-400">Cargando…</p>
        </div>
      }
    >
      <ArrClient />
    </Suspense>
  );
}
