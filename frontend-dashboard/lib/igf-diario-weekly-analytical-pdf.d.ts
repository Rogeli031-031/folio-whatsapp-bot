export const A4W: number;
export const A4H: number;

export function drawAnalytical(pdf: unknown, report: unknown): void;

export function composePlantPdf(options: {
  report: unknown;
  svg: string;
  annexes?: unknown;
}): Promise<Blob>;
