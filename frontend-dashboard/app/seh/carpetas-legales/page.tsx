"use client";

import { Fragment, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
} from "@/lib/auth";
import { CARPETAS_LEGALES_SECTIONS } from "@/lib/seh-carpetas-legales-catalog";

const HEADER_BG = "#1F4E79";
const SECTION_BG = "#D6E3F0";
const SECTION_TEXT = "#1F4E79";
const BORDER = "#8FAADC";
const GRID = "#B4C6E7";

function CarpetasLegalesContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = parseTokenFromQuery(searchParams) || getTokenFromStorage();
    if (t) {
      setTokenInStorage(t);
      setToken(t);
    } else {
      setToken(null);
    }
  }, [searchParams]);

  const plantaId = searchParams.get("planta_id");
  const backParts = [
    token ? `t=${encodeURIComponent(token)}` : "",
    plantaId ? `planta_id=${encodeURIComponent(plantaId)}` : "",
  ].filter(Boolean);
  const backHref = `/seh${backParts.length ? `?${backParts.join("&")}` : ""}`;

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            className="rounded border border-slate-400 bg-slate-100 px-2.5 py-1.5 text-sm text-slate-800 hover:bg-slate-200"
          >
            ← Volver a SEH
          </Link>
          <span className="rounded border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900">
            REGULACIÓN · PLANTA
          </span>
        </div>
        <span className="text-xs text-slate-500">Índice de carpetas legales por planta</span>
      </div>

      <div className="mx-auto max-w-[1200px] p-4">
        <div
          className="overflow-x-auto rounded-sm bg-white shadow-sm"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <table className="w-full min-w-[920px] border-collapse text-[12px] leading-snug">
            <thead>
              <tr>
                <th
                  colSpan={5}
                  className="px-3 py-3 text-center text-[15px] font-bold tracking-wide text-white"
                  style={{ background: HEADER_BG, border: `1px solid ${HEADER_BG}` }}
                >
                  ÍNDICE - CARPETAS LEGALES PLANTAS
                </th>
              </tr>
              <tr className="text-white">
                {(
                  [
                    ["w-[7%]", "No. / Bloque"],
                    ["w-[26%]", "Categoría / Documento Requerido"],
                    ["w-[32%]", "Especificación / Norma / Detalle"],
                    ["w-[15%]", "Estatus (Vigente / En Trámite / N/A)"],
                    ["w-[20%]", "Observaciones / Notas"],
                  ] as const
                ).map(([w, label]) => (
                  <th
                    key={label}
                    className={`${w} px-2 py-2 text-center font-bold`}
                    style={{ background: HEADER_BG, border: `1px solid ${BORDER}` }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CARPETAS_LEGALES_SECTIONS.map((section) => (
                <Fragment key={section.id}>
                  <tr>
                    <td
                      className="px-2 py-2 text-center text-[11px] font-bold whitespace-nowrap"
                      style={{
                        background: HEADER_BG,
                        color: "#fff",
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      {section.labelLeft}
                    </td>
                    <td
                      colSpan={4}
                      className="px-2 py-2 text-center text-[12px] font-bold"
                      style={{
                        background: SECTION_BG,
                        color: SECTION_TEXT,
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      {section.title}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.no} className="bg-white">
                      <td
                        className="px-2 py-1.5 text-center font-medium"
                        style={{ border: `1px solid ${GRID}` }}
                      >
                        {row.no}
                      </td>
                      <td className="px-2 py-1.5" style={{ border: `1px solid ${GRID}` }}>
                        {row.documento}
                      </td>
                      <td className="px-2 py-1.5" style={{ border: `1px solid ${GRID}` }}>
                        {row.especificacion}
                      </td>
                      <td className="px-2 py-1.5" style={{ border: `1px solid ${GRID}` }} />
                      <td className="px-2 py-1.5" style={{ border: `1px solid ${GRID}` }}>
                        {row.observaciones}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function CarpetasLegalesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb] p-4">
          <p className="text-slate-600">Cargando índice…</p>
        </div>
      }
    >
      <CarpetasLegalesContent />
    </Suspense>
  );
}
