type Provider = { id: number; nombre: string };
type Totals = {
  providers: Record<string, { kg: number }>;
  consolidado: { kg: number };
};

export function comprasOriginShare(providers: Provider[], totals?: Totals) {
  let tuxpanKg = 0;
  let tepejiKg = 0;
  for (const provider of providers) {
    const name = provider.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toUpperCase();
    const kg = Number(totals?.providers[String(provider.id)]?.kg ?? 0);
    if (!Number.isFinite(kg)) continue;
    if (name === "PEMEX TUXPAN" || name === "TOMZA TUXPAN") tuxpanKg += kg;
    if (name === "TOMZA TEPEJI") tepejiKg += kg;
  }
  const totalKg = Number(totals?.consolidado.kg ?? 0);
  return {
    tuxpan: { kg: tuxpanKg, percent: totalKg > 0 ? tuxpanKg / totalKg * 100 : null },
    tepeji: { kg: tepejiKg, percent: totalKg > 0 ? tepejiKg / totalKg * 100 : null },
  };
}
