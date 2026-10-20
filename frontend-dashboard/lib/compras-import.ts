export const COMPRAS_EXCEL_HG_NOTICE = "HG EN KILOS NO SE MODIFICARÁ";
export const COMPRAS_IMPORT_PENDING_LABEL = "Importación pendiente de habilitar";

export type ComprasExcelPreview = {
  ok: boolean;
  error?: string;
  message?: string;
  a1?: string;
  plant?: string;
  source_company?: string | null;
  sheets?: string[];
  desde?: string;
  hasta?: string;
  inserts?: number;
  excel_rows?: number;
  reconciled?: number;
  reconciled_with_invoice?: number;
  discrepancies?: number;
  nuevas?: number;
  deletes?: number;
  remaining?: number;
  kg_before?: number;
  importe_before?: number;
  kg_effective_before?: number;
  importe_effective_before?: number;
  kg_excel?: number;
  importe_excel?: number;
  max_fecha_excel_en_rango?: string | null;
  excel_range_warning?: string;
  by_provider?: Record<string, { kg: number; importe: number; rows: number }>;
  notas?: number;
  legacy_unclassified_count?: number;
  document_blockers?: number;
  hg_notice?: string;
  errors?: Array<{ code: string }>;
};

export function newComprasImportRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `imp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function comprasImportConfirmPhrase(plant: string, desde: string, hasta: string): string {
  return `APLICAR EXCEL ${plant} ${desde} ${hasta}`;
}
