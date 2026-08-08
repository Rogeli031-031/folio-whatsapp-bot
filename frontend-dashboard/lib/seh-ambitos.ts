export const SEH_COMPONENTES = ["EXTINTOR", "VALVULA", "MANGUERA"] as const;

export const CLAVES_CODIGO_PLANTA = ["E7", "E8", "E9", "E10", "E11", "E12", "E13", "E15"];

export type SehAmbitoKey = "planta" | "estacion" | "autotanque";

export type SehAmbitoConfig = {
  key: SehAmbitoKey;
  cardTitle: string;
  categorias: string[];
  regulacionHref?: "carpetas-legales";
};

export const SEH_AMBITOS: SehAmbitoConfig[] = [
  {
    key: "planta",
    cardTitle: "PLANTA cumplimiento",
    categorias: ["PLANTA", "SISTEMA CONTRA INCENDIO"],
    regulacionHref: "carpetas-legales",
  },
  {
    key: "estacion",
    cardTitle: "ESTACION cumplimiento",
    categorias: ["ESTACIONES"],
  },
  {
    key: "autotanque",
    cardTitle: "AUTOTANQUE cumplimiento",
    categorias: ["PIPAS"],
  },
];

export function getSehAmbito(key: string | undefined): SehAmbitoConfig | null {
  return SEH_AMBITOS.find((a) => a.key === key) || null;
}

export function filterPlantasSeh(plantas: { id: number; nombre: string }[]) {
  return (plantas || []).filter(
    (p) =>
      !CLAVES_CODIGO_PLANTA.includes((p.nombre || "").trim().toUpperCase()) &&
      !/^E\d+$/.test((p.nombre || "").trim())
  );
}
