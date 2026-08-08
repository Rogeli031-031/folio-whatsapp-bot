"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import SehOperacionBoard from "@/components/SehOperacionBoard";
import { getSehAmbito } from "@/lib/seh-ambitos";

function OperacionContent() {
  const params = useParams();
  const key = typeof params?.ambito === "string" ? params.ambito : "";
  const ambito = getSehAmbito(key);

  if (!ambito) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-slate-400">Ámbito SEH no válido.</p>
      </div>
    );
  }

  return <SehOperacionBoard ambito={ambito} />;
}

export default function SehOperacionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-slate-400">Cargando operación…</p>
        </div>
      }
    >
      <OperacionContent />
    </Suspense>
  );
}
