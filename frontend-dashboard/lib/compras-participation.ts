const TUXPAN_PROVIDER_NAMES = new Set(["PEMEX TUXPAN", "TOMZA TUXPAN"]);
const TEPEJI_PROVIDER_NAMES = new Set(["TOMZA TEPEJI"]);

export type ParticipationProvider = {
  id: number | string;
  nombre?: string | null;
};

export type ParticipationBag = Record<string, { kg?: number | null } | undefined> | null | undefined;

export type ParticipationSlice = {
  kg: number;
  pct: number | null;
};

export function normalizeParticipationName(name: string | null | undefined): string {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function finiteKg(value: number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function participationPct(kg: number, consolidatedKg: number | null | undefined): number | null {
  const total = Number(consolidatedKg);
  if (!Number.isFinite(total) || total <= 0) return null;
  return (kg / total) * 100;
}

export function comprasParticipation(
  providers: ParticipationProvider[] | null | undefined,
  bag: ParticipationBag,
  consolidatedKg: number | null | undefined
): { tuxpan: ParticipationSlice; tepeji: ParticipationSlice } {
  let tuxpanKg = 0;
  let tepejiKg = 0;
  for (const provider of providers || []) {
    const name = normalizeParticipationName(provider && provider.nombre);
    const cell = bag && (bag[String(provider.id)] || bag[provider.id as string]);
    const kg = finiteKg(cell && cell.kg);
    if (TUXPAN_PROVIDER_NAMES.has(name)) tuxpanKg += kg;
    else if (TEPEJI_PROVIDER_NAMES.has(name)) tepejiKg += kg;
  }
  return {
    tuxpan: { kg: tuxpanKg, pct: participationPct(tuxpanKg, consolidatedKg) },
    tepeji: { kg: tepejiKg, pct: participationPct(tepejiKg, consolidatedKg) },
  };
}

export function formatParticipationPct(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  return `${pct.toFixed(2)}%`;
}
