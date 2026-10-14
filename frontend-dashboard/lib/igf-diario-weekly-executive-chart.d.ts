export const GASTO_COMPONENTS: string[];

export function defaultSelectedIds(
  weeks: Array<{ id?: string; fecha_desde: string }>,
  count?: number,
): string[];

export function buildExecutiveView(input: {
  scope?: "plant" | "all";
  plant?: string;
  weeks: readonly unknown[];
  selectedIds: string[];
}): {
  title: string;
  weeks: Array<{ id: string; week_number: number; range: string; label: string; fecha_desde?: string; fecha_hasta?: string }>;
  indicators: Array<{ id: string; pending?: boolean }>;
};

export function renderExecutiveSvg(
  view: ReturnType<typeof buildExecutiveView>,
  options?: { exportedAt?: string; fontFamily?: string },
): string;

export function downloadName(view: { title?: string; scope?: string; weeks?: Array<{ fecha_desde?: string; fecha_hasta?: string }> }): string;

export function canExportExecutivePdf(state: {
  loading?: boolean;
  loadError?: unknown;
  exporting?: boolean;
  weekCount?: number;
}): boolean;

export function createPdfExportGate(): {
  isBusy(): boolean;
  tryBegin(): boolean;
  end(): void;
};
