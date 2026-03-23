import type { IgfForecastRow } from "@/lib/api";

export const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export const ORDEN_PROVINCIA = [
  "GT - Puebla",
  "Tehuacán",
  "Acapulco",
  "GTM - Querétaro",
  "GTM - San Luis P.",
  "Morelos",
];

export const COLS_EXTRA: { key: keyof IgfForecastRow | string; label: string }[] = [
  { key: "bancos_planta_kg", label: "Bancos Planta" },
  { key: "provision_planta_kg", label: "Prov. Planta" },
  { key: "util_oper_kg", label: "Util. Oper. ($/kg)" },
  { key: "util_oper_importe", label: "Util. Oper. (Importe)" },
  { key: "gtos_apoyos_corp_kg", label: "Gtos/Apoyos Corp" },
  { key: "bancos_corp_kg", label: "Bancos Corp." },
  { key: "otros_programas_kg", label: "Otros Programas" },
  { key: "inversiones_kg", label: "Inversiones" },
  { key: "resultado_final_kg", label: "Resultado ($/kg)" },
  { key: "resultado_final_importe", label: "Resultado (Importe)" },
];

export const PRESUPUESTO_GEND_STORAGE_KEY = "dashboard-presupuesto-gend";
export const INVERSION_CDJZ_STORAGE_KEY = "dashboard-inversion-cdjz";

export function fmtNum(v: number | null, decimals = 2): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function normalizeEmpresa(s: string): string {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Clave única por planta para GEND: "GTM San Luis" y "San Luis" → "san luis", "Morelos" → "morelos", etc. */
export function presupuestoGendKey(empresa: string): string {
  const n = normalizeEmpresa(empresa || "");
  if (!n) return "";
  if (n.includes("san luis")) return "san luis";
  if (n.includes("puebla")) return "puebla";
  if (n.includes("queretaro")) return "queretaro";
  if (n.includes("tehuacan")) return "tehuacan";
  if (n.includes("acapulco")) return "acapulco";
  if (n.includes("morelos")) return "morelos";
  return n;
}

/** Gasto $/kg cuando hay filtro por planta: suma de Presupuesto + Folios Aprob. ZP + Folios en carro + Depósito y cierre (mismos 4 de la página inicio). */
export function gastoKgFromFour(row: IgfForecastRow): number {
  const n = (v: number | null | undefined) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : 0);
  return n(row.presupuesto_kg) + n(row.folios_aprob_zp_kg) + n(row.folios_carro_kg) + n(row.deposito_cierre_kg);
}

export function findRowByPlanta(rows: IgfForecastRow[], planta: string): IgfForecastRow | undefined {
  const norm = normalizeEmpresa(planta);
  const exact = rows.find((r) => (r.empresa?.trim() || "") === planta);
  if (exact) return exact;
  const normMatch = rows.find((r) => normalizeEmpresa(r.empresa || "") === norm);
  if (normMatch) return normMatch;
  const suffix = (planta.split(" - ").pop() || planta).trim();
  const normSuffix = normalizeEmpresa(suffix);
  if (!normSuffix) return undefined;
  const bySuffix = rows.find((r) => normalizeEmpresa(r.empresa || "") === normSuffix);
  if (bySuffix) return bySuffix;
  const byContains = rows.find((r) => {
    const rn = normalizeEmpresa(r.empresa || "");
    return rn.indexOf(normSuffix) >= 0 || normSuffix.indexOf(rn) >= 0;
  });
  if (byContains) return byContains;
  if (normSuffix.indexOf("san luis") >= 0) {
    return rows.find((r) => {
      const rn = normalizeEmpresa(r.empresa || "");
      return rn.indexOf("san luis") >= 0;
    });
  }
  return undefined;
}
