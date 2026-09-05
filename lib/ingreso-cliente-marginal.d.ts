export function ingresoClienteMarginal(
  kg: number,
  descKg: number | null | undefined,
  m: { margenKg?: number | null; hgDisplay?: number | null; hgDinero?: number | null },
  hgCliente?: number | null,
  hgCompra?: number | null
): number | null;

export function targetKgDesdeIgfVentaTon(ventaTon: number | null | undefined): number | undefined;

export function metricsFromIgfLine(row: {
  hg_pct?: number | null;
  hg_kg?: number | null;
  hgPct?: number | null;
  hgKg?: number | null;
}): {
  hgDisplay: number | null;
  hgDinero: number | null;
  hgPct: number | null;
  hgKg: number | null;
};
