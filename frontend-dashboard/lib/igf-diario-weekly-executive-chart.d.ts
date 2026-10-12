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
  weeks: Array<{ id: string; week_number: number; range: string; label: string }>;
  indicators: Array<{ id: string; pending?: boolean }>;
};

export function renderExecutiveSvg(
  view: ReturnType<typeof buildExecutiveView>,
  options?: { exportedAt?: string },
): string;

export function downloadName(view: { title?: string }): string;
