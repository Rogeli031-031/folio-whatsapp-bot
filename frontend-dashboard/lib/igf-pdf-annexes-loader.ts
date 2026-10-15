import { fetchArrVentaSerie, getDashboardExcelDownloadUrl } from "@/lib/api";
import { extractDailyWorkbook } from "@/lib/igf-pdf-workbook";

export async function loadPdfAnnexes(options: {
  token: string; year: number; month: number; plantCode: string; empresa: string;
  uploadDay?: string | null; versionAsOfCorte?: boolean; weekAnchor?: string | null;
}) {
  const { token, year, month, plantCode, empresa, uploadDay, versionAsOfCorte, weekAnchor } = options;
  if (!plantCode.trim()) throw new Error("Selecciona una planta para descargar los anexos");
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 120000);
  const excelUrl = new URL(getDashboardExcelDownloadUrl(token, year, month, uploadDay, versionAsOfCorte, plantCode, true, false), window.location.origin);
  if (weekAnchor) excelUrl.searchParams.set("week_anchor", weekAnchor);
  excelUrl.searchParams.set("summary_metric", "resultado_mxn");
  try {
    const [casa, comisionista, daily] = await Promise.all([
      fetchArrVentaSerie(token, { empresa, range: "1m", canal: "casa", top_limit: 15 }, { signal: abort.signal }),
      fetchArrVentaSerie(token, { empresa, range: "1m", canal: "comisionista", top_limit: 15 }, { signal: abort.signal }),
      (async () => {
        const response = await fetch(excelUrl.toString(), { cache: "no-store", signal: abort.signal });
        if (!response.ok) throw new Error("No se pudo obtener el Excel IGF de la planta");
        const bytes = await response.arrayBuffer();
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(bytes);
        return extractDailyWorkbook(workbook, { year, month });
      })(),
    ]);
    if (casa.top_limit !== 15 || comisionista.top_limit !== 15) {
      throw new Error("El servidor todavía no tiene disponible el Top 15 para PDF");
    }
    if (!casa.ok || !comisionista.ok || casa.canal !== "casa" || comisionista.canal !== "comisionista"
      || casa.range !== "1m" || comisionista.range !== "1m" || casa.plant_code !== comisionista.plant_code
      || casa.fecha_desde !== comisionista.fecha_desde || casa.fecha_hasta !== comisionista.fecha_hasta) {
      throw new Error("Los anexos ARR no corresponden a la misma planta y ventana 1M. Vuelve a intentar.");
    }
    return { casa, comisionista, daily };
  } catch (error) {
    abort.abort();
    throw error;
  } finally { clearTimeout(timer); }
}
