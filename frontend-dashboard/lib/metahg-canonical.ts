import type { ArrExportMetahgLine } from "@/lib/arr-export-metahg-meta-sheet";

/** Orden fijo en hoja META (filas 32–45 cuando el bloque empieza en A30). */
export const METAHG_CANONICAL_CATEGORIES = [
  "PIPAS CASA",
  "PORTATIL",
  "ESTACIONES CARB.",
  "PIPAS COMISIONISTA",
  "PREDIEROS",
  "RECUPERACION 1",
  "RECUPERACION 2",
  "COMPRA",
  "COMPRA TUXPAN",
  "COMPRA TEPEJI",
  "COMPRA TULA",
  "CONS. PROPIOS",
  "VTA. AÑO ANTERIOR",
  "TOTAL",
] as const;

export const METAHG_BLOCK_START_ROW = 30;
export const METAHG_HEADER_ROW = 31;
export const METAHG_FIRST_DATA_ROW = 32;

export type MetahgCanonicalRowKey =
  | "pipasCasa"
  | "portatil"
  | "estacionesCarb"
  | "pipasComisionista"
  | "predieros"
  | "recuperacion1"
  | "recuperacion2"
  | "compra"
  | "compraTuxpan"
  | "compraTepeji"
  | "compraTula"
  | "consPropios"
  | "vtaAnioAnterior"
  | "total";

const KEY_BY_INDEX: MetahgCanonicalRowKey[] = [
  "pipasCasa",
  "portatil",
  "estacionesCarb",
  "pipasComisionista",
  "predieros",
  "recuperacion1",
  "recuperacion2",
  "compra",
  "compraTuxpan",
  "compraTepeji",
  "compraTula",
  "consPropios",
  "vtaAnioAnterior",
  "total",
];

function normCat(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchCanonical(categoria: string): number {
  const n = normCat(categoria);
  if (n === "total") return METAHG_CANONICAL_CATEGORIES.length - 1;
  if (n.includes("vta") && n.includes("anterior")) return 12;
  if (n.includes("pipas") && n.includes("casa")) return 0;
  if (n.includes("portatil") || n.includes("portátil")) return 1;
  if (n.includes("estaciones")) return 2;
  if (n.includes("pipas") && n.includes("comision")) return 3;
  if (n.includes("predier")) return 4;
  if (n === "recuperacion 1" || n.includes("recuperacion 1")) return 5;
  if (n === "recuperacion 2" || n.includes("recuperacion 2")) return 6;
  if (n === "compra tuxpan" || n.includes("tuxpan")) return 8;
  if (n === "compra tepeji" || n.includes("tepeji")) return 9;
  if (n === "compra tula" || n.includes("tula")) return 10;
  if (n === "compra") return 7;
  if (n.includes("cons") && n.includes("prop")) return 11;
  return -1;
}

/** Arma 14 filas en orden canónico; incluye TOTAL y VTA. AÑO ANTERIOR aunque falten en BD. */
export function buildCanonicalMetahgLines(
  dbLines: ArrExportMetahgLine[]
): ArrExportMetahgLine[] {
  const slots: (ArrExportMetahgLine | null)[] = METAHG_CANONICAL_CATEGORIES.map(
    (categoria) => ({
      categoria,
      prom: null,
      kilos: null,
      comision: null,
      total: null,
      pct: null,
      kilos_h: null,
      is_total_row: categoria.toUpperCase() === "TOTAL",
    })
  );

  for (const line of dbLines) {
    const idx = matchCanonical(line.categoria);
    if (idx < 0) continue;
    const isTotal = line.is_total_row || normCat(line.categoria) === "total";
    slots[idx] = {
      ...line,
      categoria: METAHG_CANONICAL_CATEGORIES[idx],
      is_total_row: isTotal || idx === slots.length - 1,
    };
  }

  return slots.map((s) => s!);
}

/** Mapa fila Excel (META!C32, D45, …) por clave canónica. */
export function buildMetahgRowMap(
  firstDataRow: number = METAHG_FIRST_DATA_ROW
): Record<MetahgCanonicalRowKey, number> {
  const map = {} as Record<MetahgCanonicalRowKey, number>;
  KEY_BY_INDEX.forEach((key, i) => {
    map[key] = firstDataRow + i;
  });
  return map;
}

export function empresaToPlantCode(empresa: string): string {
  const t = normCat(empresa);
  if (t.includes("puebla")) return "puebla";
  if (t.includes("tehuacan")) return "tehuacan";
  if (t.includes("acapulco")) return "acapulco";
  if (t.includes("queretaro")) return "queretaro";
  if (t.includes("san luis")) return "san luis";
  if (t.includes("morelos")) return "morelos";
  return t.replace(/[^a-z0-9]+/g, "_").slice(0, 80);
}
