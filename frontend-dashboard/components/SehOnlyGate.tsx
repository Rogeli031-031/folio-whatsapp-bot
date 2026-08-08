"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getTokenFromStorage,
  isSehOnlyToken,
  parseTokenFromQuery,
  setTokenInStorage,
} from "@/lib/auth";

function SehOnlyGateInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fromQuery = parseTokenFromQuery(searchParams);
    const t = fromQuery || getTokenFromStorage();
    if (fromQuery) setTokenInStorage(fromQuery);
    if (!t || !isSehOnlyToken(t)) return;
    if (pathname === "/seh" || (pathname || "").startsWith("/seh/")) return;
    router.replace(`/seh?t=${encodeURIComponent(t)}`);
  }, [pathname, router, searchParams]);

  return <>{children}</>;
}

/** Si el JWT es scope=seh, redirige cualquier ruta al tablero SEH. */
export default function SehOnlyGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <SehOnlyGateInner>{children}</SehOnlyGateInner>
    </Suspense>
  );
}
