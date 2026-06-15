import { Suspense } from "react";
import { DirectorIaDisabled } from "@/modules/director-ia/components/DirectorIaDisabled";
import { DirectorIaShell } from "@/modules/director-ia/components/DirectorIaShell";
import { isDirectorIaEnabled } from "@/modules/director-ia/lib/is-enabled";

export default function DirectorIaPage() {
  if (!isDirectorIaEnabled()) {
    return <DirectorIaDisabled />;
  }
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
          <p className="text-slate-400">Cargando…</p>
        </div>
      }
    >
      <DirectorIaShell />
    </Suspense>
  );
}
