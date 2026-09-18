import { categoriaEsComisionista } from "@/lib/arr-categoria";
import type { ArrForecastSubcategoriaResumenRow } from "@/components/ArrDicfCategoriaBucketsModal";

export type CategoryCommissionLine = {
  subcategory: string;
  venta_ton: number;
  commission_projected_amount: number;
  commission_projected_per_kg: number;
};

export type CategoryCommissionPack = {
  category: "CASA" | "COMISIONISTA";
  subcategories_discovered: string[];
  lines: CategoryCommissionLine[];
  total: CategoryCommissionLine;
};

type ArrCommissionSourceRow = {
  categoria?: string;
  canal?: string;
  subcategoria?: string | null;
  kg_proyectado?: number | null;
  kg?: number | null;
  descuento_kg?: number | null;
  descKg?: number | null;
  monto?: number | null;
};

function rowKg(row: ArrCommissionSourceRow): number {
  const raw = row.kg_proyectado != null ? row.kg_proyectado : row.kg;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function rowDescKg(row: ArrCommissionSourceRow): number {
  if (row.descKg != null && Number.isFinite(Number(row.descKg))) return Math.abs(Number(row.descKg));
  if (row.descuento_kg != null && Number.isFinite(Number(row.descuento_kg))) {
    return Math.abs(Number(row.descuento_kg));
  }
  const kg = rowKg(row);
  const monto = row.monto != null ? Number(row.monto) : NaN;
  if (kg > 0 && Number.isFinite(monto)) return Math.abs(monto) / kg;
  return 0;
}

function rowSubcategory(row: ArrCommissionSourceRow): string {
  const raw = String(row.subcategoria || "").trim();
  return raw || "Sin subcategoría";
}

/** Misma agregación que Director IA 007 / Movimiento por categoría. */
export function buildCategoryCommissionFromArrRows(
  rows: ArrCommissionSourceRow[] | null | undefined,
  category: "CASA" | "COMISIONISTA"
): CategoryCommissionPack {
  const wantComi = category === "COMISIONISTA";
  const map = new Map<string, { kg: number; mxn: number }>();
  for (const row of rows || []) {
    if (!row) continue;
    const comi = categoriaEsComisionista(String(row.categoria || row.canal || ""));
    if (comi !== wantComi) continue;
    const kg = rowKg(row);
    if (kg <= 0) continue;
    const sub = rowSubcategory(row);
    const desc = rowDescKg(row);
    const cur = map.get(sub) || { kg: 0, mxn: 0 };
    cur.kg += kg;
    cur.mxn += kg * desc;
    map.set(sub, cur);
  }
  const names = Array.from(map.keys()).sort((a, b) => a.localeCompare(b, "es"));
  const lines = names.map((sub) => {
    const a = map.get(sub) || { kg: 0, mxn: 0 };
    const ventaTon = Math.round((a.kg / 1000) * 100) / 100;
    const amount = Math.round(a.mxn);
    const perKg = a.kg > 0 ? a.mxn / a.kg : 0;
    return {
      subcategory: sub,
      venta_ton: ventaTon,
      commission_projected_amount: amount,
      commission_projected_per_kg: Math.round(perKg * 1000) / 1000,
    };
  });
  const totalKg = lines.reduce((s, l) => s + l.venta_ton * 1000, 0);
  const totalMxn = lines.reduce((s, l) => s + l.commission_projected_amount, 0);
  return {
    category,
    subcategories_discovered: names,
    lines,
    total: {
      subcategory: "TOTAL",
      venta_ton: Math.round((totalKg / 1000) * 100) / 100,
      commission_projected_amount: Math.round(totalMxn),
      commission_projected_per_kg: totalKg > 0 ? Math.round((totalMxn / totalKg) * 1000) / 1000 : 0,
    },
  };
}

export function toModalResumenRows(pack: CategoryCommissionPack): ArrForecastSubcategoriaResumenRow[] {
  const body: ArrForecastSubcategoriaResumenRow[] = pack.lines.map((row) => ({
    subcategoria: row.subcategory,
    ventaTon: row.venta_ton,
    comisionProyectadaMxn: row.commission_projected_amount,
  }));
  if (!body.length) return [];
  body.push({
    subcategoria: pack.total.subcategory,
    ventaTon: pack.total.venta_ton,
    comisionProyectadaMxn: pack.total.commission_projected_amount,
    esTotal: true,
  });
  return body;
}
