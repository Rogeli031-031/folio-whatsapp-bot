import { fetchArrVentaSerie } from "@/lib/api";

export async function loadPdfAnnexes(options: {
  token: string; year: number; month: number; plantCode: string; empresa: string;
  uploadDay?: string | null; versionAsOfCorte?: boolean; weekAnchor?: string | null;
}) {
  const { token, plantCode, empresa } = options;
  if (!plantCode.trim()) throw new Error("Selecciona una planta para descargar los anexos");
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 120000);
  try {
    const [casa, comisionista] = await Promise.all([
      fetchArrVentaSerie(token, { empresa, range: "1m", canal: "casa", top_limit: 15 }, { signal: abort.signal }),
      fetchArrVentaSerie(token, { empresa, range: "1m", canal: "comisionista", top_limit: 15 }, { signal: abort.signal }),
    ]);
    if (casa.top_limit !== 15 || comisionista.top_limit !== 15) {
      throw new Error("El servidor todavía no tiene disponible el Top 15 para PDF");
    }
    if (!casa.ok || !comisionista.ok || casa.canal !== "casa" || comisionista.canal !== "comisionista"
      || casa.range !== "1m" || comisionista.range !== "1m" || casa.plant_code !== comisionista.plant_code
      || casa.fecha_desde !== comisionista.fecha_desde || casa.fecha_hasta !== comisionista.fecha_hasta) {
      throw new Error("Los anexos ARR no corresponden a la misma planta y ventana 1M. Vuelve a intentar.");
    }
    return { casa, comisionista };
  } catch (error) {
    abort.abort();
    throw error;
  } finally { clearTimeout(timer); }
}
