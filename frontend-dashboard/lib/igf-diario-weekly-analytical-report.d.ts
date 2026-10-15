export const PARTIDAS: Array<{ key: string; label: string; sign: number }>;
export const PARTIAL_LABEL: string;

export function freezePlantExport(input: {
  weeks: readonly unknown[];
  selectedIds: readonly string[];
  empresa?: string;
  plantCode?: string;
}): {
  plant: string;
  plantCode: string;
  corte_ymd: string | null;
  version_as_of_corte: boolean;
  weeks: unknown[];
};

export function buildAnalyticalReport(
  frozen: ReturnType<typeof freezePlantExport>,
  exportedAt?: string | null,
): {
  plant: string;
  plantCode: string;
  corte_ymd: string | null;
  version_as_of_corte: boolean;
  exportedAt: string | null;
  single_week: boolean;
  weeks: unknown[];
  transitions: unknown[];
  partial_label: string;
};
