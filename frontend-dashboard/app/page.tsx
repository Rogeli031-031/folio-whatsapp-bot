"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
} from "@/lib/auth";
import {
  fetchIgfForecast,
  patchIgfForecastHg,
  getDashboardExcelDownloadUrl,
  fetchDeltaIngresoPeriodos,
  postDeltaIngresoForecastDatos,
  getDeltaIngresoForecastExcelUrl,
  getDicfExcelUrl,
  postDicfDatos,
  fetchDicfConfig,
  postDicfConfig,
  type IgfForecastResponse,
  type IgfForecastRow,
  type DeltaIngresoForecastResult,
  type DicfResult,
  type DicfConfig,
} from "@/lib/api";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ORDEN_PROVINCIA = ["GT - Puebla", "Tehuacán", "Acapulco", "GTM - Querétaro", "GTM - San Luis P.", "Morelos"];

const COLS_EXTRA: { key: keyof IgfForecastRow | string; label: string }[] = [
  { key: "bancos_planta_kg", label: "Bancos Planta" },
  { key: "provision_planta_kg", label: "Prov. Planta" },
  { key: "util_oper_kg", label: "Util. Oper. ($/kg)" },
  { key: "util_oper_importe", label: "Util. Oper. (Importe)" },
  { key: "gtos_apoyos_corp_kg", label: "Gtos/Apoyos Corp" },
  { key: "bancos_corp_kg", label: "Bancos Corp." },
  { key: "otros_programas_kg", label: "Otros Programas" },
  { key: "inversiones_kg", label: "Inversiones" },
  { key: "resultado_final_kg", label: "Resultado ($/kg)" },
  { key: "resultado_final_importe", label: "Resultado (Importe)" },
];

function fmtNum(v: number | null, decimals = 2): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function normalizeEmpresa(s: string): string {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Gasto $/kg cuando hay filtro por planta: suma de Presupuesto + Folios Aprob. ZP + Folios en carro + Depósito y cierre (mismos 4 de la página inicio). */
function gastoKgFromFour(row: IgfForecastRow): number {
  const n = (v: number | null | undefined) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : 0);
  return n(row.presupuesto_kg) + n(row.folios_aprob_zp_kg) + n(row.folios_carro_kg) + n(row.deposito_cierre_kg);
}

function findRowByPlanta(rows: IgfForecastRow[], planta: string): IgfForecastRow | undefined {
  const norm = normalizeEmpresa(planta);
  const exact = rows.find((r) => (r.empresa?.trim() || "") === planta);
  if (exact) return exact;
  const normMatch = rows.find((r) => normalizeEmpresa(r.empresa || "") === norm);
  if (normMatch) return normMatch;
  const suffix = (planta.split(" - ").pop() || planta).trim();
  const normSuffix = normalizeEmpresa(suffix);
  if (!normSuffix) return undefined;
  const bySuffix = rows.find((r) => normalizeEmpresa(r.empresa || "") === normSuffix);
  if (bySuffix) return bySuffix;
  const byContains = rows.find((r) => {
    const rn = normalizeEmpresa(r.empresa || "");
    return rn.indexOf(normSuffix) >= 0 || normSuffix.indexOf(rn) >= 0;
  });
  if (byContains) return byContains;
  if (normSuffix.indexOf("san luis") >= 0) {
    return rows.find((r) => {
      const rn = normalizeEmpresa(r.empresa || "");
      return rn.indexOf("san luis") >= 0;
    });
  }
  return undefined;
}

function KpiContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [igfForecast, setIgfForecast] = useState<IgfForecastResponse | null>(null);
  const [igfLoading, setIgfLoading] = useState(false);
  const [igfError, setIgfError] = useState<string | null>(null);
  const [hgSaving, setHgSaving] = useState<string | null>(null);
  const [plantaFilter, setPlantaFilter] = useState<string>("");
  const [igfMesAnterior, setIgfMesAnterior] = useState<IgfForecastResponse | null>(null);
  const [igfMesAnteriorLoading, setIgfMesAnteriorLoading] = useState(false);
  const [deltaForecastPlanta, setDeltaForecastPlanta] = useState("");
  const [deltaForecastPeriodos, setDeltaForecastPeriodos] = useState<string[]>([]);
  const [deltaForecastPeriodoA, setDeltaForecastPeriodoA] = useState("");
  const [deltaForecastPeriodoB, setDeltaForecastPeriodoB] = useState("");
  const [deltaForecastData, setDeltaForecastData] = useState<DeltaIngresoForecastResult | null>(null);
  const [dicfData, setDicfData] = useState<DicfResult | null>(null);
  const [deltaCanalFilter, setDeltaCanalFilter] = useState<{ tipo: "dejaron" | "nuevos" | "aumentaron" | "disminuyeron"; canal: string; subcanal: string } | null>(null);
  const [dicfClienteQuery, setDicfClienteQuery] = useState<string>("");
  const [deltaForecastLoading, setDeltaForecastLoading] = useState(false);
  const [deltaForecastError, setDeltaForecastError] = useState<string | null>(null);
  const [showDeltaCliente, setShowDeltaCliente] = useState(false);
  const [deltaClienteSel, setDeltaClienteSel] = useState<{ grupo: string; cliente: import("@/lib/api").DeltaIngresoForecastCliente } | null>(null);
  const [dicfMesRowsByCliente, setDicfMesRowsByCliente] = useState<Record<string, {
    loading: boolean;
    error: string | null;
    rows: { mes: string; ventaTon: number | null; descKg: number | null; ingresoMxn: number | null; _descMxn?: number | null; _margenKg?: number | null }[];
  }>>({});
  const [dicfConfig, setDicfConfig] = useState<DicfConfig | null>(null);
  const [showDicfParams, setShowDicfParams] = useState(false);
  const [dicfParamsLoading, setDicfParamsLoading] = useState(false);
  const [dicfParamsSaving, setDicfParamsSaving] = useState(false);
  const [dicfParamsWindowDays, setDicfParamsWindowDays] = useState<string>("60");
  const [dicfParamsToleranciaDias, setDicfParamsToleranciaDias] = useState<string>("2");
  const [dicfParamsUmbralMxn, setDicfParamsUmbralMxn] = useState<string>("50000");
  const [dicfParamsUmbralPctNeg, setDicfParamsUmbralPctNeg] = useState<string>("0.15");
  const [dicfParamsUmbralPctPos, setDicfParamsUmbralPctPos] = useState<string>("0.15");
  const [dicfParamsMinKgHist, setDicfParamsMinKgHist] = useState<string>("0");

  useEffect(() => {
    if (!token || !deltaForecastPlanta) {
      setDeltaForecastPeriodos([]);
      return;
    }
    fetchDeltaIngresoPeriodos(token, deltaForecastPlanta)
      .then((r) => setDeltaForecastPeriodos(r.periodos || []))
      .catch(() => setDeltaForecastPeriodos([]));
  }, [token, deltaForecastPlanta]);

  useEffect(() => {
    // Cambia de planta -> reinicia búsqueda/selección para no mezclar clientes.
    setDicfClienteQuery("");
    setDeltaClienteSel(null);
  }, [deltaForecastPlanta]);

  useEffect(() => {
    const t = parseTokenFromQuery(searchParams) || getTokenFromStorage();
    if (t) {
      setTokenInStorage(t);
      setToken(t);
      setUnauthorized(false);
    } else {
      setToken(null);
      setUnauthorized(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let fetching = false;

    const load = async () => {
      if (fetching || !token || cancelled) return;
      fetching = true;
      if (!igfForecast) setIgfLoading(true);
      setIgfError(null);
      try {
        const data = await fetchIgfForecast(token);
        if (!cancelled) {
          setIgfForecast(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setIgfError(e?.message || "Error al cargar IGF Forecast");
        }
      } finally {
        fetching = false;
        if (!cancelled && !igfForecast) {
          setIgfLoading(false);
        }
      }
    };

    load();
    const id = setInterval(load, 60000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  useEffect(() => {
    if (!token || !igfForecast || !plantaFilter) {
      setIgfMesAnterior(null);
      return;
    }
    const y = igfForecast.year;
    const m = igfForecast.month;
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    setIgfMesAnteriorLoading(true);
    fetchIgfForecast(token, { year: prevYear, month: prevMonth })
      .then(setIgfMesAnterior)
      .catch(() => setIgfMesAnterior(null))
      .finally(() => setIgfMesAnteriorLoading(false));
  }, [token, plantaFilter, igfForecast?.year, igfForecast?.month]);

  useEffect(() => {
    if (!token || !deltaForecastPlanta || !deltaClienteSel || !dicfData) return;

    const clienteNombre = (deltaClienteSel.cliente?.cliente || "").trim();
    if (!clienteNombre) return;

    const grupo = (deltaClienteSel.grupo || "").toLowerCase();
    const tipo: "dejaron" | "nuevos" | "aumentaron" | "disminuyeron" | null =
      grupo.includes("dejaron") ? "dejaron"
        : grupo.includes("nuevos") ? "nuevos"
          : grupo.includes("aument") ? "aumentaron"
            : (grupo.includes("dismin") || grupo.includes("- ingreso")) ? "disminuyeron"
              : grupo.includes("+ ingreso") ? "aumentaron"
                : null;

    const canal = (deltaClienteSel.cliente?.canal || "").trim();
    const subcanal = (deltaClienteSel.cliente?.subcanal || "").trim();
    const cacheKey = `${deltaForecastPlanta}||${tipo || "?"}||${canal}||${subcanal}||${clienteNombre}`.toLowerCase();
    const cached = dicfMesRowsByCliente[cacheKey];
    if (cached?.loading || (cached?.rows?.length ?? 0) > 0 || cached?.error) return;

    let cancelled = false;
    setDicfMesRowsByCliente((prev) => ({
      ...prev,
      [cacheKey]: { loading: true, error: null, rows: [] },
    }));

    (async () => {
      try {
        const url = getDicfExcelUrl(
          token,
          deltaForecastPlanta,
          tipo && canal && subcanal ? { tipo, canal, subcanal } : null
        );
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Error al descargar Excel (${resp.status})`);
        const buf = await resp.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets["Venta (Ton)"] || wb.Sheets[wb.SheetNames?.[0] || ""];
        if (!ws) throw new Error("No se encontró hoja 'Venta (Ton)' en el Excel");

        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
        const header = (aoa?.[0] || []).map((x) => (x != null ? String(x).trim() : ""));
        if (!header.length) throw new Error("Excel vacío");

        const monthLabels: string[] = [];
        for (const h of header) {
          if (/^venta\s+/i.test(h || "")) {
            const label = String(h).replace(/^venta\s+/i, "").trim();
            if (label) monthLabels.push(label);
          }
        }

        const findHeaderIdx = (fullLabel: string) =>
          header.findIndex((h) => (h || "").toLowerCase() === fullLabel.toLowerCase());

        const row = (aoa || []).find((r) => {
          const c = r?.[0] != null ? String(r[0]).trim() : "";
          return c === clienteNombre || c.toLowerCase() === clienteNombre.toLowerCase();
        });
        if (!row) throw new Error("No se encontró el cliente en el Excel");

        const rows = monthLabels.map((mes) => {
          const iV = findHeaderIdx(`Venta ${mes}`);
          const iD = findHeaderIdx(`Descuento ${mes}`);
          const iM = findHeaderIdx(`Margen ${mes}`);
          const ventaTonRaw = iV >= 0 ? Number(row[iV]) : NaN;
          const descMxnRaw = iD >= 0 ? Number(row[iD]) : NaN;
          const margenKgRaw = iM >= 0 ? Number(row[iM]) : NaN;
          const ventaTon = Number.isFinite(ventaTonRaw) ? ventaTonRaw : null;
          const descMxn = Number.isFinite(descMxnRaw) ? descMxnRaw : null;
          const margenKg = Number.isFinite(margenKgRaw) ? margenKgRaw : null;
          const ventaKg = ventaTon != null ? ventaTon * 1000 : null;
          const descKg = ventaKg != null && ventaKg > 0 && descMxn != null ? descMxn / ventaKg : null;
          const ingresoMxn =
            ventaKg != null && ventaKg > 0 && margenKg != null
              ? ventaKg * margenKg - Math.abs(descMxn != null ? descMxn : 0)
              : null;
          return { mes, ventaTon, descKg, ingresoMxn, _descMxn: descMxn, _margenKg: margenKg };
        });

        if (cancelled) return;
        setDicfMesRowsByCliente((prev) => ({
          ...prev,
          [cacheKey]: { loading: false, error: null, rows },
        }));
      } catch (e: any) {
        if (cancelled) return;
        setDicfMesRowsByCliente((prev) => ({
          ...prev,
          [cacheKey]: { loading: false, error: e?.message || "Error al leer Excel", rows: [] },
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, deltaForecastPlanta, deltaClienteSel, dicfData]);

  if (unauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
          <h1 className="text-lg font-semibold text-white">Acceso no autorizado</h1>
          <p className="mt-2 text-sm text-slate-400">
            Abre el enlace que recibiste por WhatsApp (válido 5 horas) o escribe &quot;dashboard&quot; en el bot.
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-slate-700 bg-slate-900/50 px-4 py-3">
        <h1 className="text-xl font-semibold text-white">KPI Financieros</h1>
      </div>
      <div className="flex flex-wrap gap-3 px-4 py-3 border-b border-slate-700/80 bg-slate-800/30">
        {igfForecast && token && (
          <a
            href={getDashboardExcelDownloadUrl(token, igfForecast.year, igfForecast.month)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500"
          >
            Descargar Excel (Forecast)
          </a>
        )}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          Ver dashboard de folios
        </Link>
      </div>
      <main className={plantaFilter ? "flex-1 p-4 flex flex-col" : "flex-1 p-4"}>
        <section className={`rounded-lg border border-slate-700 bg-slate-800/60 p-4 ${plantaFilter ? "flex-shrink-0" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-medium text-slate-200">{plantaFilter ? "Comparación por planta" : "IGF Forecast"}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {igfForecast && (
                <>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span>Planta:</span>
                    <select
                      value={plantaFilter}
                      onChange={(e) => setPlantaFilter(e.target.value)}
                      className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-slate-200 text-xs"
                    >
                      <option value="">Todas</option>
                      {Array.from(new Set(igfForecast.rows.map((r) => r.empresa?.trim()).filter(Boolean))).sort().map((emp) => (
                        <option key={emp} value={emp}>{emp}</option>
                      ))}
                    </select>
                  </label>
                  <span className="text-xs text-slate-500">
                    {MESES[igfForecast.month - 1]} {igfForecast.year}
                    {igfForecast.version_number != null && ` · v${igfForecast.version_number}`}
                  </span>
                </>
              )}
            </div>
          </div>
          {!plantaFilter && (
          <>
          {igfLoading && <p className="text-sm text-slate-400">Cargando datos…</p>}
          {igfError && <p className="text-sm text-red-400">{igfError}</p>}
          {!igfLoading && !igfError && igfForecast && (
            <div className={`overflow-x-auto ${plantaFilter ? "max-h-[55vh] overflow-y-auto" : ""}`}>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-600 bg-slate-800/80 text-[0.6em]">
                    <th className="text-left py-2.5 px-2 font-semibold text-slate-300 border-r border-slate-600">Empresa</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300 border-r border-slate-600">Venta (ton)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Margen ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Com. y Desc. ($/kg)</th>
                    {plantaFilter ? (
                      <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Gasto ($/kg)</th>
                    ) : (
                      <>
                        <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Presupuesto ($/kg)</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Folios Aprob. Director ZP ($/kg)</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Folios en carro ($/kg)</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Depósito y cierre ($/kg)</th>
                      </>
                    )}
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Impuesto ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">HG (%)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">HG ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Bancos Planta</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Prov. Planta</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300 border-r border-slate-600">Util. Oper. ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-emerald-300 bg-slate-900/80">Util. Oper. (Importe)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Gtos/Apoyos Corp</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Bancos Corp.</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Otros Programas</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Inversiones</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Resultado ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-amber-300 bg-slate-900/80">Resultado (Importe)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = plantaFilter
                      ? igfForecast.rows.filter((r) => (r.empresa?.trim() || "") === plantaFilter)
                      : igfForecast.rows.filter((r) => !/^TOTALES?$/i.test(r.empresa?.trim() || ""));
                    const sorted = [...filtered]
                      .sort((a, b) => {
                        const iA = ORDEN_PROVINCIA.indexOf(a.empresa?.trim() || "");
                        const iB = ORDEN_PROVINCIA.indexOf(b.empresa?.trim() || "");
                        if (iA === -1 && iB === -1) return (a.empresa || "").localeCompare(b.empresa || "");
                        if (iA === -1) return 1;
                        if (iB === -1) return -1;
                        return iA - iB;
                      });
                    return sorted.map((row: IgfForecastRow, i: number) => (
                      <tr
                        key={row.empresa ? row.empresa : `row-${i}`}
                        className="border-b border-slate-700/80"
                      >
                        <td className="py-2 px-2 text-[0.6em] font-semibold text-slate-100 border-r border-slate-600">{row.empresa || "—"}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300 border-r border-slate-600">{fmtNum(row.venta_ton, 2)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.margen_kg)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.com_desc_kg)}</td>
                        {plantaFilter ? (
                          <td className={`py-2 px-2 text-right tabular-nums ${gastoKgFromFour(row) < 0 ? "text-red-400" : "text-slate-300"}`}>
                            {fmtNum(gastoKgFromFour(row))}
                          </td>
                        ) : (
                          <>
                            <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.presupuesto_kg ?? null)}</td>
                            <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.folios_aprob_zp_kg ?? null)}</td>
                            <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.folios_carro_kg ?? null)}</td>
                            <td className={`py-2 px-2 text-right tabular-nums ${row.deposito_cierre_kg != null && Number(row.deposito_cierre_kg) < 0 ? "text-red-400" : "text-slate-300"}`}>
                              {fmtNum(row.deposito_cierre_kg ?? null)}
                            </td>
                          </>
                        )}
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.impuesto_kg)}</td>
                        <td className="py-2 px-2 text-right text-slate-300">
                          <input
                            key={`hg-${row.empresa ?? i}-${row.hg_pct != null ? (Number(row.hg_pct) * 100).toFixed(1) : ""}`}
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            className="w-14 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-right text-slate-200 text-sm"
                            defaultValue={row.hg_pct != null ? (Number(row.hg_pct) * 100).toFixed(1) : ""}
                            placeholder="—"
                            onBlur={async (e) => {
                              const raw = e.target.value.trim();
                              if (raw === "" || !token || !igfForecast) return;
                              const v = parseFloat(raw);
                              if (Number.isNaN(v)) return;
                              const newPct = v / 100;
                              const currentPct = row.hg_pct != null ? Number(row.hg_pct) : null;
                              if (currentPct !== null && Math.abs(newPct - currentPct) < 1e-9) return;
                              setHgSaving(row.empresa || null);
                              try {
                                await patchIgfForecastHg(token, {
                                  year: igfForecast.year,
                                  month: igfForecast.month,
                                  empresa: row.empresa || "",
                                  hg_pct: newPct,
                                });
                                const updated = await fetchIgfForecast(token, {
                                  year: igfForecast.year,
                                  month: igfForecast.month,
                                });
                                setIgfForecast(updated);
                              } catch {
                                e.target.value = row.hg_pct != null ? (Number(row.hg_pct) * 100).toFixed(1) : "";
                              } finally {
                                setHgSaving(null);
                              }
                            }}
                          />
                          {hgSaving === row.empresa && <span className="ml-1 text-xs text-slate-500">Guardando…</span>}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.hg_kg ?? null)}</td>
                        {COLS_EXTRA.map((c) => {
                          const val = (row as Record<string, unknown>)[c.key] as number | null | undefined;
                          const isImporte = c.key === "resultado_final_importe" || c.key === "util_oper_importe";
                          const isInversionesKg = c.key === "inversiones_kg";
                          const invIsNeg = !isImporte && val != null && Number(val) < 0;
                          const highlightClass =
                            c.key === "util_oper_importe"
                              ? "bg-emerald-900/30 text-emerald-300 font-semibold"
                              : c.key === "resultado_final_importe"
                              ? "bg-amber-900/30 text-amber-300 font-semibold"
                              : "";
                          return (
                            <td
                              key={c.key}
                              className={`py-2 px-2 text-right tabular-nums ${isInversionesKg && invIsNeg ? "text-red-400" : "text-slate-300"} ${c.key === "util_oper_kg" ? "border-r border-slate-600" : ""} ${highlightClass}`}
                            >
                              {isImporte ? fmtNum(val ?? null, 0) : fmtNum(val ?? null)}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
                {igfForecast.totales && !plantaFilter && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-600 bg-slate-700/50">
                      <td className="py-3 px-2 text-base font-bold text-slate-100 border-r border-slate-600">Total</td>
                      <td className="py-3 px-2 text-right tabular-nums text-base font-bold text-slate-100 border-r border-slate-600">
                        {fmtNum(igfForecast.totales.venta_ton ?? null, 2)}
                      </td>
                      <td colSpan={11} className="py-3 px-2" />
                      <td className="py-3 px-2 border-r border-slate-600" />
                      <td className="py-3 px-2 text-right tabular-nums text-base font-bold text-slate-100">
                        {fmtNum(igfForecast.totales.util_oper_importe ?? null, 0)}
                      </td>
                      <td colSpan={4} className="py-3 px-2" />
                      <td className="py-3 px-2" />
                      <td className="py-3 px-2 text-right tabular-nums text-base font-bold text-slate-100">
                        {fmtNum(igfForecast.totales.resultado_final_importe ?? null, 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              {igfForecast.rows.length === 0 && (
                <p className="text-sm text-slate-500 py-4">No hay datos IGF para este mes.</p>
              )}
            </div>
          )}
          </>
          )}
        </section>
        {plantaFilter && igfForecast && (
          <section className="mt-6 rounded-lg border border-slate-700 bg-slate-800/60 p-4 flex-shrink-0">
            <h3 className="text-base font-medium text-slate-200 mb-2">Comparación IGF Forecast vs última versión del mes anterior</h3>
            {igfMesAnteriorLoading && <p className="text-sm text-slate-400">Cargando mes anterior…</p>}
            {!igfMesAnteriorLoading && igfForecast && (() => {
              const rowF = findRowByPlanta(igfForecast.rows, plantaFilter);
              const rowA = igfMesAnterior ? findRowByPlanta(igfMesAnterior.rows, plantaFilter) : undefined;
              if (!rowF) return <p className="text-sm text-slate-500">No hay datos de forecast para esta planta.</p>;
              const n = (v: unknown): number => (v != null && !Number.isNaN(Number(v)) ? Number(v) : 0);
              const delta = (a: number | null | undefined, b: number | null | undefined) => n(a) - n(b);
              type Col = { key: string; label: string; fmt: (v: number) => string; isPct?: boolean };
              const cols: Col[] = [
                { key: "empresa", label: "Empresa", fmt: () => "" },
                { key: "venta_ton", label: "Venta (ton)", fmt: (v) => fmtNum(v, 2) },
                { key: "margen_kg", label: "Margen ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "com_desc_kg", label: "Com. y Desc. ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "gasto_kg", label: "Gasto ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "impuesto_kg", label: "Impuesto ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "hg_pct", label: "HG (%)", fmt: (v) => fmtNum(v * 100, 1), isPct: true },
                { key: "hg_kg", label: "HG ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "bancos_planta_kg", label: "Bancos Planta", fmt: (v) => fmtNum(v) },
                { key: "provision_planta_kg", label: "Prov. Planta", fmt: (v) => fmtNum(v) },
                { key: "util_oper_kg", label: "Util. Oper. ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "util_oper_importe", label: "Util. Oper. (Importe)", fmt: (v) => fmtNum(v, 0) },
                { key: "gtos_apoyos_corp_kg", label: "Gtos/Apoyos Corp", fmt: (v) => fmtNum(v) },
                { key: "bancos_corp_kg", label: "Bancos Corp.", fmt: (v) => fmtNum(v) },
                { key: "otros_programas_kg", label: "Otros Programas", fmt: (v) => fmtNum(v) },
                { key: "inversiones_kg", label: "Inversiones", fmt: (v) => fmtNum(v) },
                { key: "resultado_final_kg", label: "Resultado ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "resultado_final_importe", label: "Resultado (Importe)", fmt: (v) => fmtNum(v, 0) },
              ];
              // Util. Oper. ($/kg) = suma de las 7 líneas (Margen, Com.Desc, Gasto, Impuesto, HG $/kg, Bancos Planta, Prov. Planta). Gasto = suma de los 4 (Presupuesto, Folios ZP, Folios carro, Depósito y cierre).
              const calcUtilOperKg = (row: IgfForecastRow | undefined): number => {
                if (!row) return 0;
                const r = row as Record<string, unknown>;
                const num = (x: unknown) => n(x as number | null | undefined);
                const gastoKg = gastoKgFromFour(row);
                return num(r.margen_kg) + num(r.com_desc_kg) + gastoKg + num(r.impuesto_kg) + num(r.hg_kg) + num(r.bancos_planta_kg) + num(r.provision_planta_kg);
              };
              const cellVal = (row: IgfForecastRow | undefined, c: Col) => {
                if (!row) return "—";
                if (c.key === "empresa") return row.empresa ?? "—";
                if (c.key === "gasto_kg") return fmtNum(gastoKgFromFour(row));
                if (row === rowA && (c.key === "util_oper_kg" || c.key === "util_oper_importe")) {
                  const utilKg = calcUtilOperKg(row);
                  if (c.key === "util_oper_kg") return fmtNum(utilKg);
                  return fmtNum(utilKg * n((row as Record<string, unknown>).venta_ton as number | null | undefined) * 1000, 0);
                }
                const v = (row as Record<string, unknown>)[c.key];
                if (c.isPct && v != null) return (Number(v) * 100).toFixed(1);
                return fmtNum(v as number | null ?? null, c.key.includes("importe") || c.key === "util_oper_importe" || c.key === "resultado_final_importe" ? 0 : 2);
              };
              const utilOperKgA = rowA ? calcUtilOperKg(rowA) : 0;
              const utilOperImporteA = rowA ? utilOperKgA * n((rowA as Record<string, unknown>).venta_ton as number | null | undefined) * 1000 : 0;
              const cellDeltaNum = (c: Col): number | null => {
                if (c.key === "empresa" || !rowA) return null;
                const vF = c.key === "gasto_kg" ? gastoKgFromFour(rowF) : (rowF as Record<string, unknown>)[c.key] as number | null | undefined;
                const vA = c.key === "util_oper_kg" ? utilOperKgA : c.key === "util_oper_importe" ? utilOperImporteA : c.key === "gasto_kg" ? gastoKgFromFour(rowA) : (rowA as Record<string, unknown>)[c.key] as number | null | undefined;
                return c.isPct ? (n(vF) - n(vA)) * 100 : delta(vF, vA);
              };
              const ventaKgA = rowA ? n((rowA as Record<string, unknown>).venta_ton as number | null | undefined) * 1000 : 0;
              const ventaKgF = n((rowF as Record<string, unknown>).venta_ton as number | null | undefined) * 1000;
              // Impacto (Importe): fórmula Excel (COL_fila2*$B$2)-(COL_fila3*$B$3) = (valor_forecast*venta_kg_forecast) - (valor_mes_anterior*venta_kg_mes_anterior) para Gtos/Apoyos Corp, Bancos Corp., Otros Programas, Inversiones.
              const cellImpacto = (c: Col): number | null => {
                if (c.key === "empresa" || !rowA) return null;
                if (c.key === "hg_pct") return null;
                if (c.key === "util_oper_kg") return null;
                const vF = (rowF as Record<string, unknown>)[c.key] as number | null | undefined;
                const vA = (rowA as Record<string, unknown>)[c.key] as number | null | undefined;
                if (c.key === "venta_ton") {
                  const utilOperF = n((rowF as Record<string, unknown>).util_oper_kg as number | null | undefined);
                  return (ventaKgF - ventaKgA) * utilOperF;
                }
                if (c.key === "com_desc_kg") return (n(vF) - n(vA)) * ventaKgA;
                if (c.key === "gasto_kg") return (gastoKgFromFour(rowF) - gastoKgFromFour(rowA)) * ventaKgA;
                if (c.key === "impuesto_kg") return (n(vF) - n(vA)) * ventaKgA;
                if (c.key === "bancos_planta_kg") return (n(vF) - n(vA)) * ventaKgA;
                if (c.key === "provision_planta_kg") return (n(vF) - n(vA)) * ventaKgA;
                // Fórmula imagen: (valor_forecast * venta_kg_forecast) - (valor_mes_anterior * venta_kg_mes_anterior)
                if (c.key === "gtos_apoyos_corp_kg" || c.key === "bancos_corp_kg" || c.key === "otros_programas_kg" || c.key === "inversiones_kg") {
                  return (n(vF) * ventaKgF) - (n(vA) * ventaKgA);
                }
                if (c.key === "util_oper_importe") return n((rowF as Record<string, unknown>).util_oper_importe as number | null | undefined) - utilOperImporteA;
                if (c.key === "resultado_final_importe") return delta(vF, vA);
                const deltaKg = c.isPct ? (n(vF) - n(vA)) * 100 : delta(vF, vA);
                if (c.isPct) return null;
                return deltaKg * ventaKgA;
              };
              return (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-600 bg-slate-800/80 text-[0.6em]">
                        {cols.map((c) => {
                          if (c.key === "empresa") {
                            return (
                              <th key={c.key} className="text-left py-2 px-2 font-semibold text-slate-300 border-r border-slate-600">
                                {c.label}
                              </th>
                            );
                          }
                          const highlightHeaderClass =
                            c.key === "util_oper_importe"
                              ? "text-emerald-300 bg-slate-900/80"
                              : c.key === "resultado_final_importe"
                              ? "text-amber-300 bg-slate-900/80"
                              : "text-slate-300";
                          return (
                            <th
                              key={c.key}
                              className={`text-right py-2 px-2 font-semibold ${highlightHeaderClass}`}
                            >
                              {c.label}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-600 bg-slate-800/40">
                        <td className="py-2 px-2 text-[0.6em] font-semibold text-amber-200 border-r border-slate-600">IGF Forecast</td>
                        {cols.slice(1).map((c) => {
                          const highlightColClass =
                            c.key === "util_oper_importe"
                              ? "bg-emerald-900/30 text-emerald-300 font-semibold"
                              : c.key === "resultado_final_importe"
                              ? "bg-amber-900/30 text-amber-300 font-semibold"
                              : "text-slate-300";
                          return (
                            <td key={c.key} className={`py-2 px-2 text-right tabular-nums ${highlightColClass}`}>
                              {cellVal(rowF, c)}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-b border-slate-600 bg-slate-800/40">
                        <td className="py-2 px-2 text-[0.6em] font-semibold text-slate-300 border-r border-slate-600">IGF mes anterior</td>
                        {cols.slice(1).map((c) => {
                          const highlightColClass =
                            c.key === "util_oper_importe"
                              ? "bg-emerald-900/10 text-emerald-200"
                              : c.key === "resultado_final_importe"
                              ? "bg-amber-900/10 text-amber-200"
                              : "text-slate-300";
                          return (
                            <td key={c.key} className={`py-2 px-2 text-right tabular-nums ${highlightColClass}`}>
                              {cellVal(rowA, c)}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-t-2 border-slate-500 bg-slate-700/50">
                        <td className="py-2 px-2 text-[0.6em] font-semibold text-slate-200 border-r border-slate-600">Cambio</td>
                        {cols.slice(1).map((c) => {
                          const d = cellDeltaNum(c);
                          const hasDelta = d !== null;
                          const highlightColClass =
                            c.key === "util_oper_importe"
                              ? "bg-emerald-900/20"
                              : c.key === "resultado_final_importe"
                              ? "bg-amber-900/20"
                              : "";
                          return (
                            <td
                              key={c.key}
                              className={`py-2 px-2 text-right tabular-nums ${hasDelta && d! > 0 ? "text-green-400" : hasDelta && d! < 0 ? "text-red-400" : "text-slate-400"} ${highlightColClass}`}
                            >
                              {hasDelta ? (d! >= 0 ? "+" : "") + (c.isPct ? fmtNum(d!, 1) : c.fmt(d!)) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-t border-slate-600 bg-slate-700/40">
                        <td className="py-2 px-2 text-[0.6em] font-semibold text-slate-300 border-r border-slate-600">Impacto (Importe)</td>
                        {cols.slice(1).map((c) => {
                          const imp = cellImpacto(c);
                          const hasImp = imp !== null;
                          const highlightColClass =
                            c.key === "util_oper_importe"
                              ? "bg-emerald-900/20"
                              : c.key === "resultado_final_importe"
                              ? "bg-amber-900/20"
                              : "";
                          return (
                            <td
                              key={c.key}
                              className={`py-2 px-2 text-right tabular-nums ${hasImp && imp! > 0 ? "text-green-400" : hasImp && imp! < 0 ? "text-red-400" : "text-slate-400"} ${highlightColClass}`}
                            >
                              {hasImp ? (imp! >= 0 ? "+" : "") + fmtNum(imp!, 0) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </section>
        )}
        <section className="mt-6 rounded-lg border border-slate-700 bg-slate-800/60 p-4 flex-shrink-0">
          <h3 className="text-base font-medium text-slate-200 mb-1">Delta ingreso Forecast</h3>
          <p className="text-xs text-slate-400 mb-3">
            A = mes anterior real · B = forecast a cierre. Clasificación por planta, canal/subcanal y cliente.
          </p>
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Planta</span>
              <select
                value={deltaForecastPlanta}
                onChange={(e) => {
                setDeltaForecastPlanta(e.target.value);
                setDeltaForecastData(null);
                setDicfData(null);
                setShowDeltaCliente(false);
                }}
                className="rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-slate-200"
              >
                <option value="">— Seleccionar —</option>
                {igfForecast?.rows?.map((r) => r.empresa?.trim()).filter(Boolean)
                  ? Array.from(new Set(igfForecast.rows.map((r) => r.empresa?.trim()).filter(Boolean))).sort().map((emp) => (
                      <option key={emp} value={emp}>{emp}</option>
                    ))
                  : null}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Periodo A (mes anterior)</span>
              <select
                value={deltaForecastPeriodoA}
                onChange={(e) => setDeltaForecastPeriodoA(e.target.value)}
                className="rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-slate-200"
              >
                <option value="">—</option>
                {deltaForecastPeriodos.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Periodo B (forecast)</span>
              <select
                value={deltaForecastPeriodoB}
                onChange={(e) => setDeltaForecastPeriodoB(e.target.value)}
                className="rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-slate-200"
              >
                <option value="">—</option>
                {deltaForecastPeriodos.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!token || !deltaForecastPlanta || !deltaForecastPeriodoA || !deltaForecastPeriodoB || deltaForecastPeriodoA === deltaForecastPeriodoB || deltaForecastLoading}
                onClick={async () => {
                  if (!token) return;
                  setDeltaForecastLoading(true);
                  setDeltaForecastError(null);
                  setShowDeltaCliente(false);
                  setDicfData(null);
                  try {
                    const data = await postDeltaIngresoForecastDatos(token, {
                      planta: deltaForecastPlanta,
                      periodoA: deltaForecastPeriodoA,
                      periodoB: deltaForecastPeriodoB,
                    });
                    setDeltaForecastData(data);
                  } catch (e: unknown) {
                    setDeltaForecastError((e as Error)?.message || "Error al cargar");
                  } finally {
                    setDeltaForecastLoading(false);
                  }
                }}
                className="rounded border border-amber-500 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
              >
                {deltaForecastLoading ? "Cargando…" : "Delta Ingreso Forecast"}
              </button>
              <button
                type="button"
                disabled={!token || !deltaForecastPlanta || deltaForecastLoading}
                onClick={async () => {
                  if (!token) return;
                  setDeltaForecastLoading(true);
                  setDeltaForecastError(null);
                  setDeltaForecastData(null);
                  try {
                    const data = await postDicfDatos(token, { planta: deltaForecastPlanta });
                    setDicfData(data);
                    setShowDeltaCliente(true);
                  } catch (e: unknown) {
                    setDeltaForecastError((e as Error)?.message || "Error al cargar");
                  } finally {
                    setDeltaForecastLoading(false);
                  }
                }}
                className="rounded border border-amber-500 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
              >
                {deltaForecastLoading ? "…" : "Delta Ingreso Cliente Forecast"}
              </button>
            </div>
            <div className="min-w-[14rem]">
              <label className="block text-xs text-slate-500 mb-1">Buscar cliente</label>
              <input
                value={dicfClienteQuery}
                onChange={(e) => setDicfClienteQuery(e.target.value)}
                placeholder="Escribe el nombre…"
                className="w-full rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-500"
              />
            </div>
            {deltaForecastData && token && !dicfData && (
              <a
                href={getDeltaIngresoForecastExcelUrl(token, deltaForecastPlanta, deltaForecastPeriodoA, deltaForecastPeriodoB)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500"
              >
                Descargar Excel
              </a>
            )}
            {dicfData && token && deltaForecastPlanta && (
              <a
                href={getDicfExcelUrl(token, deltaForecastPlanta, deltaCanalFilter)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                title={deltaCanalFilter
                  ? `Excel filtrado: ${deltaCanalFilter.canal} · ${deltaCanalFilter.subcanal} · ${deltaCanalFilter.tipo}`
                  : "Excel con 3 hojas: Venta (Ton), Descuento ($/kg), Margen ($/kg) — últimos 30 días por cliente. Selecciona un botón de la tabla para exportar solo esa celda."}
              >
                Descargar Excel (Cliente Forecast)
              </a>
            )}
          </div>
          {deltaForecastError && <p className="text-sm text-red-400 mb-2">{deltaForecastError}</p>}
          {(deltaForecastData || dicfData) && (
            <div className="overflow-x-auto">
              {dicfData && (
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="text-xs text-slate-400">
                    Proyección a cierre del mes (últimos {dicfData.window_days} días · datos hasta {dicfData.last_date ?? "—"}).
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!token || !deltaForecastPlanta || !dicfData?.periodoMes) return;
                      const [y, m] = dicfData.periodoMes.split("-").map(Number);
                      if (!Number.isFinite(y) || !Number.isFinite(m)) return;
                      setShowDicfParams((v) => !v);
                      if (!showDicfParams) {
                        setDicfParamsLoading(true);
                        try {
                          const cfg = await fetchDicfConfig(token, deltaForecastPlanta, y, m);
                          setDicfConfig(cfg);
                          setDicfParamsWindowDays(String(cfg.window_days));
                          setDicfParamsToleranciaDias(String(cfg.tolerancia_dias));
                          setDicfParamsUmbralMxn(String(cfg.umbral_mxn));
                          setDicfParamsUmbralPctNeg(String(cfg.umbral_pct_neg));
                          setDicfParamsUmbralPctPos(String(cfg.umbral_pct_pos));
                          setDicfParamsMinKgHist(String(cfg.min_kg_hist));
                        } catch {
                          setDicfConfig(null);
                          setDicfParamsWindowDays("60");
                        } finally {
                          setDicfParamsLoading(false);
                        }
                      }
                    }}
                    className="text-xs rounded border border-slate-600 px-2 py-1 text-slate-400 hover:bg-slate-800"
                  >
                    {dicfParamsLoading ? "…" : showDicfParams ? "Ocultar parámetros" : "Parámetros DICF"}
                  </button>
                </div>
              )}
              {showDicfParams && dicfData?.periodoMes && token && deltaForecastPlanta && (
                <div className="mb-3 p-3 rounded border border-slate-700 bg-slate-800/50 text-sm">
                  <h4 className="font-semibold text-slate-300 mb-2">Parámetros editables (mes {dicfData.periodoMes})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    <label className="text-slate-400 flex flex-col gap-0.5">
                      Días de ventana (historial)
                      <input type="number" min={1} max={365} value={dicfParamsWindowDays} onChange={(e) => setDicfParamsWindowDays(e.target.value)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200 w-full" />
                    </label>
                    <label className="text-slate-400 flex flex-col gap-0.5">
                      Tolerancia (días)
                      <input type="number" min={0} step={0.5} value={dicfParamsToleranciaDias} onChange={(e) => setDicfParamsToleranciaDias(e.target.value)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200 w-full" />
                    </label>
                    <label className="text-slate-400 flex flex-col gap-0.5">
                      Umbral MXN
                      <input type="number" min={0} value={dicfParamsUmbralMxn} onChange={(e) => setDicfParamsUmbralMxn(e.target.value)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200 w-full" />
                    </label>
                    <label className="text-slate-400 flex flex-col gap-0.5">
                      Umbral % negativo
                      <input type="number" min={0} max={1} step={0.01} value={dicfParamsUmbralPctNeg} onChange={(e) => setDicfParamsUmbralPctNeg(e.target.value)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200 w-full" />
                    </label>
                    <label className="text-slate-400 flex flex-col gap-0.5">
                      Umbral % positivo
                      <input type="number" min={0} max={1} step={0.01} value={dicfParamsUmbralPctPos} onChange={(e) => setDicfParamsUmbralPctPos(e.target.value)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200 w-full" />
                    </label>
                    <label className="text-slate-400 flex flex-col gap-0.5">
                      Mín. kg historial
                      <input type="number" min={0} value={dicfParamsMinKgHist} onChange={(e) => setDicfParamsMinKgHist(e.target.value)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200 w-full" />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={dicfParamsSaving}
                    onClick={async () => {
                      if (!token || !deltaForecastPlanta || !dicfData?.periodoMes) return;
                      const [y, m] = dicfData.periodoMes.split("-").map(Number);
                      if (!Number.isFinite(y) || !Number.isFinite(m)) return;
                      const wd = Math.max(1, Math.min(365, parseInt(dicfParamsWindowDays, 10) || 60));
                      const td = Math.max(0, parseFloat(dicfParamsToleranciaDias) || 2);
                      const umxn = Math.max(0, parseFloat(dicfParamsUmbralMxn) || 50000);
                      const upn = Math.max(0, Math.min(1, parseFloat(dicfParamsUmbralPctNeg) || 0.15));
                      const upp = Math.max(0, Math.min(1, parseFloat(dicfParamsUmbralPctPos) || 0.15));
                      const mkg = Math.max(0, parseFloat(dicfParamsMinKgHist) || 0);
                      setDicfParamsSaving(true);
                      try {
                        await postDicfConfig(token, { planta: deltaForecastPlanta, year: y, month: m, window_days: wd, tolerancia_dias: td, umbral_mxn: umxn, umbral_pct_neg: upn, umbral_pct_pos: upp, min_kg_hist: mkg });
                        setDicfConfig((c) => (c ? { ...c, window_days: wd, tolerancia_dias: td, umbral_mxn: umxn, umbral_pct_neg: upn, umbral_pct_pos: upp, min_kg_hist: mkg } : null));
                      } finally {
                        setDicfParamsSaving(false);
                      }
                    }}
                    className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
                  >
                    {dicfParamsSaving ? "Guardando…" : "Guardar parámetros"}
                  </button>
                  <p className="text-xs text-slate-500 mt-1">Al guardar, vuelve a ejecutar &quot;Delta Ingreso Cliente Forecast&quot; para aplicar los cambios.</p>
                </div>
              )}
              {(() => {
                const CANAL_ORDER = ["Casa", "Comisionista"];
                const SUBCANAL_ORDER = ["Autotanque", "Carburación", "Portátil"];
                const parseMxn = (s: string) => {
                  if (!s || typeof s !== "string") return 0;
                  const n = parseFloat(s.replace(/[$,]\s*/g, "").trim());
                  return Number.isFinite(n) ? n : 0;
                };
                const byCategoria = (dicfData?.byCategoria ?? deltaForecastData?.byCategoria) ?? [];
                const sorted = [...byCategoria].sort((a, b) => {
                  const canalA = CANAL_ORDER.indexOf((a.canal || "").trim());
                  const canalB = CANAL_ORDER.indexOf((b.canal || "").trim());
                  const ic = (canalA === -1 ? 999 : canalA) - (canalB === -1 ? 999 : canalB);
                  if (ic !== 0) return ic;
                  const subA = SUBCANAL_ORDER.indexOf((a.subcanal || "").trim());
                  const subB = SUBCANAL_ORDER.indexOf((b.subcanal || "").trim());
                  const is = (subA === -1 ? 999 : subA) - (subB === -1 ? 999 : subB);
                  if (is !== 0) return is;
                  return (a.subcanal || "").localeCompare(b.subcanal || "");
                });
                const sumDejaron = sorted.reduce((s, c) => s + parseMxn(c.dejaron?.totalDeltaIngresoStr ?? ""), 0);
                const sumDisminuyeron = sorted.reduce((s, c) => s + parseMxn(c.disminuyeron?.totalDeltaIngresoStr ?? ""), 0);
                const sumAumentaron = sorted.reduce((s, c) => s + parseMxn(c.aumentaron?.totalDeltaIngresoStr ?? ""), 0);
                const sumNuevos = sorted.reduce((s, c) => s + parseMxn(c.nuevos?.totalDeltaIngresoStr ?? ""), 0);
                const fmtSum = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 });
                return (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-600 bg-slate-800/80 text-xs">
                    <th className="text-left py-2 px-2 font-semibold text-slate-300">Canal</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-300">Subcanal</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-300">Dejaron</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-300">Disminuyeron</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-300">Aumentaron</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-300">Nuevos</th>
                  </tr>
                  <tr className="border-b border-slate-600 bg-slate-800/60 text-xs">
                    <th className="text-left py-1 px-2 font-normal text-slate-500" colSpan={2}>Total impacto</th>
                    <th className="text-right py-1 px-2 font-medium text-slate-300 tabular-nums">{fmtSum(sumDejaron)}</th>
                    <th className="text-right py-1 px-2 font-medium text-red-400 tabular-nums">{fmtSum(sumDisminuyeron)}</th>
                    <th className="text-right py-1 px-2 font-medium text-emerald-400 tabular-nums">{fmtSum(sumAumentaron)}</th>
                    <th className="text-right py-1 px-2 font-medium text-slate-300 tabular-nums">{fmtSum(sumNuevos)}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c, i) => (
                    <tr key={i} className="border-b border-slate-700/80">
                      <td className="py-2 px-2 text-slate-300">{c.canal}</td>
                      <td className="py-2 px-2 text-slate-300">{c.subcanal}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-slate-300">
                        <button
                          type="button"
                          className={`inline-flex items-center justify-end rounded px-2 py-1 text-xs font-medium w-full border ${
                            deltaCanalFilter &&
                            deltaCanalFilter.tipo === "dejaron" &&
                            deltaCanalFilter.canal === c.canal &&
                            deltaCanalFilter.subcanal === c.subcanal
                              ? "border-amber-400 bg-amber-900/40 text-amber-100 ring-1 ring-amber-400/70"
                              : "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                          }`}
                          onClick={() =>
                            setDeltaCanalFilter((prev) =>
                              prev &&
                              prev.tipo === "dejaron" &&
                              prev.canal === c.canal &&
                              prev.subcanal === c.subcanal
                                ? null
                                : { tipo: "dejaron", canal: c.canal, subcanal: c.subcanal }
                            )
                          }
                        >
                          {c.dejaron.count} ({c.dejaron.totalDeltaKgStr != null ? `${c.dejaron.totalDeltaKgStr} Ton · ` : ""}{c.dejaron.totalDeltaIngresoStr})
                        </button>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-red-400">
                        <button
                          type="button"
                          className={`inline-flex items-center justify-end rounded px-2 py-1 text-xs font-medium w-full border ${
                            deltaCanalFilter &&
                            deltaCanalFilter.tipo === "disminuyeron" &&
                            deltaCanalFilter.canal === c.canal &&
                            deltaCanalFilter.subcanal === c.subcanal
                              ? "border-red-300 bg-red-900/60 text-red-100 ring-1 ring-red-300/80"
                              : "border-red-500/60 bg-red-900/20 text-red-300 hover:bg-red-800/40"
                          }`}
                          onClick={() =>
                            setDeltaCanalFilter((prev) =>
                              prev &&
                              prev.tipo === "disminuyeron" &&
                              prev.canal === c.canal &&
                              prev.subcanal === c.subcanal
                                ? null
                                : { tipo: "disminuyeron", canal: c.canal, subcanal: c.subcanal }
                            )
                          }
                        >
                          {c.disminuyeron.count} ({c.disminuyeron.totalDeltaKgStr != null ? `${c.disminuyeron.totalDeltaKgStr} Ton · ` : ""}{c.disminuyeron.totalDeltaIngresoStr})
                        </button>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-emerald-400">
                        <button
                          type="button"
                          className={`inline-flex items-center justify-end rounded px-2 py-1 text-xs font-medium w-full border ${
                            deltaCanalFilter &&
                            deltaCanalFilter.tipo === "aumentaron" &&
                            deltaCanalFilter.canal === c.canal &&
                            deltaCanalFilter.subcanal === c.subcanal
                              ? "border-emerald-300 bg-emerald-900/60 text-emerald-100 ring-1 ring-emerald-300/80"
                              : "border-emerald-500/60 bg-emerald-900/20 text-emerald-300 hover:bg-emerald-800/40"
                          }`}
                          onClick={() =>
                            setDeltaCanalFilter((prev) =>
                              prev &&
                              prev.tipo === "aumentaron" &&
                              prev.canal === c.canal &&
                              prev.subcanal === c.subcanal
                                ? null
                                : { tipo: "aumentaron", canal: c.canal, subcanal: c.subcanal }
                            )
                          }
                        >
                          {c.aumentaron.count} ({c.aumentaron.totalDeltaKgStr != null ? `${c.aumentaron.totalDeltaKgStr} Ton · ` : ""}{c.aumentaron.totalDeltaIngresoStr})
                        </button>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-slate-300">
                        <button
                          type="button"
                          className={`inline-flex items-center justify-end rounded px-2 py-1 text-xs font-medium w-full border ${
                            deltaCanalFilter &&
                            deltaCanalFilter.tipo === "nuevos" &&
                            deltaCanalFilter.canal === c.canal &&
                            deltaCanalFilter.subcanal === c.subcanal
                              ? "border-amber-400 bg-amber-900/40 text-amber-100 ring-1 ring-amber-400/70"
                              : "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                          }`}
                          onClick={() =>
                            setDeltaCanalFilter((prev) =>
                              prev &&
                              prev.tipo === "nuevos" &&
                              prev.canal === c.canal &&
                              prev.subcanal === c.subcanal
                                ? null
                                : { tipo: "nuevos", canal: c.canal, subcanal: c.subcanal }
                            )
                          }
                        >
                          {c.nuevos.count} ({c.nuevos.totalDeltaKgStr != null ? `${c.nuevos.totalDeltaKgStr} Ton · ` : ""}{c.nuevos.totalDeltaIngresoStr})
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                );
              })()}
              {(dicfData || (showDeltaCliente && deltaForecastData)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-400 mb-1">Dejaron de comprar</h4>
                  <ul className="space-y-0.5 text-slate-300 max-h-96 overflow-y-auto">
                  {(dicfData?.dejaron?.clientes ?? deltaForecastData?.dejaron?.clientes ?? [])
                    .filter((c) =>
                      !deltaCanalFilter || deltaCanalFilter.tipo !== "dejaron"
                        ? true
                        : (c.canal || "") === deltaCanalFilter.canal && (c.subcanal || "") === deltaCanalFilter.subcanal
                    )
                    .filter((c) => {
                      const q = (dicfClienteQuery || "").trim().toLowerCase();
                      if (!q) return true;
                      return (c.cliente || "").toLowerCase().includes(q);
                    })
                    .slice(0, 15)
                    .map((c, i) => (
                      <li key={i} className="border-b border-slate-800/50 pb-1 mb-0.5">
                        <button
                          type="button"
                          onClick={() => setDeltaClienteSel({ grupo: "Dejaron de comprar", cliente: c })}
                          className="w-full text-left hover:text-amber-300"
                        >
                          <span className="font-medium">{c.cliente}</span>: {c.deltaKgStr != null ? `${c.deltaKgStr} Ton · ` : ""}{c.ingresoAStr}
                        </button>
                        <p className="text-[0.65rem] text-slate-500 pl-0.5 mt-0.5">
                          Frec.: {c.freqDays != null && c.freqDays < 9000 ? `cada ${c.freqDays.toFixed(0)} d` : "N/A"} · Última: {c.lastPurchaseDate ? `${c.lastPurchaseDate} (${c.daysSinceLastReal ?? "?"} d)` : (typeof c.daysSinceLast === "number" ? `${c.daysSinceLast} d` : "N/D")} · {c.estado ?? "—"}
                        </p>
                      </li>
                    ))}
                    {(dicfData?.dejaron?.clientes?.length ?? deltaForecastData?.dejaron?.clientes?.length ?? 0) > 15 && <li className="text-slate-500">… y más</li>}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-400 mb-1">Disminuyeron</h4>
                  <ul className="space-y-0.5 text-slate-300 max-h-96 overflow-y-auto">
                  {(dicfData?.disminuyeron?.clientes ?? deltaForecastData?.disminuyeron?.clientes ?? [])
                    .filter((c) =>
                      !deltaCanalFilter || deltaCanalFilter.tipo !== "disminuyeron"
                        ? true
                        : (c.canal || "") === deltaCanalFilter.canal && (c.subcanal || "") === deltaCanalFilter.subcanal
                    )
                    .filter((c) => {
                      const q = (dicfClienteQuery || "").trim().toLowerCase();
                      if (!q) return true;
                      return (c.cliente || "").toLowerCase().includes(q);
                    })
                    .slice(0, 15)
                    .map((c, i) => (
                      <li key={i} className="border-b border-slate-800/50 pb-1 mb-0.5">
                        <button
                          type="button"
                          onClick={() => setDeltaClienteSel({ grupo: "- Ingreso", cliente: c })}
                          className="w-full text-left hover:text-amber-300"
                        >
                          <span className="font-medium">{c.cliente}</span>: {c.deltaKgStr != null ? `${c.deltaKgStr} Ton · ` : ""}{c.deltaIngresoStr}
                        </button>
                        <p className="text-[0.65rem] text-slate-500 pl-0.5 mt-0.5">
                          Frec.: {c.freqDays != null && c.freqDays < 9000 ? `cada ${c.freqDays.toFixed(0)} d` : "N/A"} · Última: {typeof c.daysSinceLast === "number" ? `${c.daysSinceLast} d` : "N/D"} · {c.estado ?? "—"}
                        </p>
                      </li>
                    ))}
                    {(dicfData?.disminuyeron?.clientes?.length ?? deltaForecastData?.disminuyeron?.clientes?.length ?? 0) > 15 && <li className="text-slate-500">… y más</li>}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-400 mb-1">Aumentaron</h4>
                  <ul className="space-y-0.5 text-slate-300 max-h-96 overflow-y-auto">
                  {(dicfData?.aumentaron?.clientes ?? deltaForecastData?.aumentaron?.clientes ?? [])
                    .filter((c) =>
                      !deltaCanalFilter || deltaCanalFilter.tipo !== "aumentaron"
                        ? true
                        : (c.canal || "") === deltaCanalFilter.canal && (c.subcanal || "") === deltaCanalFilter.subcanal
                    )
                    .filter((c) => {
                      const q = (dicfClienteQuery || "").trim().toLowerCase();
                      if (!q) return true;
                      return (c.cliente || "").toLowerCase().includes(q);
                    })
                    .slice(0, 15)
                    .map((c, i) => (
                      <li key={i} className="border-b border-slate-800/50 pb-1 mb-0.5">
                        <button
                          type="button"
                          onClick={() => setDeltaClienteSel({ grupo: "+ Ingreso", cliente: c })}
                          className="w-full text-left hover:text-amber-300"
                        >
                          <span className="font-medium">{c.cliente}</span>: {c.deltaKgStr != null ? `${c.deltaKgStr} Ton · ` : ""}{c.deltaIngresoStr}
                        </button>
                        <p className="text-[0.65rem] text-slate-500 pl-0.5 mt-0.5">
                          Frec.: {c.freqDays != null && c.freqDays < 9000 ? `cada ${c.freqDays.toFixed(0)} d` : "N/A"} · Última: {typeof c.daysSinceLast === "number" ? `${c.daysSinceLast} d` : "N/D"} · {c.estado ?? "—"}
                        </p>
                      </li>
                    ))}
                    {(dicfData?.aumentaron?.clientes?.length ?? deltaForecastData?.aumentaron?.clientes?.length ?? 0) > 15 && <li className="text-slate-500">… y más</li>}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-400 mb-1" title="Clientes sin compras el mes anterior y con proyección a cierre este mes">Nuevos</h4>
                  <ul className="space-y-0.5 text-slate-300 max-h-96 overflow-y-auto">
                  {(dicfData?.nuevos?.clientes ?? deltaForecastData?.nuevos?.clientes ?? [])
                    .filter((c) =>
                      !deltaCanalFilter || deltaCanalFilter.tipo !== "nuevos"
                        ? true
                        : (c.canal || "") === deltaCanalFilter.canal && (c.subcanal || "") === deltaCanalFilter.subcanal
                    )
                    .filter((c) => {
                      const q = (dicfClienteQuery || "").trim().toLowerCase();
                      if (!q) return true;
                      return (c.cliente || "").toLowerCase().includes(q);
                    })
                    .slice(0, 15)
                    .map((c, i) => (
                      <li key={i} className="border-b border-slate-800/50 pb-1 mb-0.5">
                        <button
                          type="button"
                          onClick={() => setDeltaClienteSel({ grupo: "Nuevos", cliente: c })}
                          className="w-full text-left hover:text-amber-300"
                        >
                          <span className="font-medium">{c.cliente}</span>: {c.deltaKgStr != null ? `${c.deltaKgStr} Ton · ` : ""}{c.ingresoBStr}
                        </button>
                        <p className="text-[0.65rem] text-slate-500 pl-0.5 mt-0.5">
                          Frec.: {c.freqDays != null && c.freqDays < 9000 ? `cada ${c.freqDays.toFixed(0)} d` : "N/A"} · Última: {typeof c.daysSinceLast === "number" ? `${c.daysSinceLast} d` : "N/D"} · {c.estado ?? "—"}
                        </p>
                      </li>
                    ))}
                    {(dicfData?.nuevos?.clientes?.length ?? deltaForecastData?.nuevos?.clientes?.length ?? 0) > 15 && <li className="text-slate-500">… y más</li>}
                  </ul>
                </div>
              </div>
              )}
            </div>
          )}
        </section>
        {deltaClienteSel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDeltaClienteSel(null)}>
            <div
              className="w-full max-w-5xl max-h-[85vh] min-h-[40vh] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-8 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-700 pb-3">
                <h3 className="text-xl font-semibold text-slate-200">
                  Delta Ingreso Cliente Forecast · {deltaForecastPlanta} · {dicfData?.periodoMes ?? deltaForecastPeriodoB}
                </h3>
                <button
                  type="button"
                  onClick={() => setDeltaClienteSel(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <p>
                  <span className="font-semibold">{deltaClienteSel.cliente.cliente}</span>{" "}
                  <span className="text-slate-400">· {deltaClienteSel.grupo}</span>
                </p>
                <p>
                  Ingreso A: <span className="font-mono">{deltaClienteSel.cliente.ingresoAStr ?? "$0"}</span> · Ingreso B forecast:{" "}
                  <span className="font-mono">{deltaClienteSel.cliente.ingresoBStr ?? "$0"}</span> · Delta:{" "}
                  <span className="font-mono">{deltaClienteSel.cliente.deltaIngresoStr ?? "$0"}</span>
                </p>
                {(() => {
                  const clienteNombre = (deltaClienteSel.cliente?.cliente || "").trim();
                  const grupo = (deltaClienteSel.grupo || "").toLowerCase();
                  const tipo =
                    grupo.includes("dejaron") ? "dejaron"
                      : grupo.includes("nuevos") ? "nuevos"
                        : grupo.includes("aument") ? "aumentaron"
                          : (grupo.includes("dismin") || grupo.includes("- ingreso")) ? "disminuyeron"
                            : grupo.includes("+ ingreso") ? "aumentaron"
                              : "?";
                  const canal = (deltaClienteSel.cliente?.canal || "").trim();
                  const subcanal = (deltaClienteSel.cliente?.subcanal || "").trim();
                  const cacheKey = `${deltaForecastPlanta}||${tipo}||${canal}||${subcanal}||${clienteNombre}`.toLowerCase();
                  const st = dicfMesRowsByCliente[cacheKey];
                  const fmtTon = (n: number | null) => (n != null && Number.isFinite(n) ? n.toLocaleString("es-MX", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : "—");
                  const fmtKg = (n: number | null) => (n != null && Number.isFinite(n) ? n.toLocaleString("es-MX", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : "—");
                  const fmtMxn0 = (n: number | null) => (n != null && Number.isFinite(n) ? n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "—");
                  const excelCliente = dicfData?.excelData?.clientes?.find(
                    (x) => (x.cliente || "").trim().toLowerCase() === clienteNombre.toLowerCase()
                  );
                  const realTonForecast = excelCliente?.kg_mes_real != null && Number.isFinite(Number(excelCliente.kg_mes_real))
                    ? Number(excelCliente.kg_mes_real) / 1000
                    : null;
                  return (
                    <div className="mt-2 rounded border border-slate-700 bg-slate-800/40 p-3">
                      <h4 className="mb-2 text-base font-semibold text-slate-300">Venta y descuento por mes (Enero → Forecast)</h4>
                      {st?.loading && <p className="text-sm text-slate-400">Cargando datos del Excel…</p>}
                      {st?.error && <p className="text-sm text-red-300">No se pudo leer el Excel: {st.error}</p>}
                      {!st?.loading && !st?.error && st?.rows && st.rows.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[40rem] border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-slate-700 text-slate-400">
                                <th className="py-1 pr-2 text-left">Mes</th>
                                <th className="py-1 pr-2 text-right">Venta (Ton)</th>
                                <th className="py-1 text-right">Descuento ($/Kg)</th>
                                <th className="py-1 text-right">Ingreso (MXN)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {st.rows.map((r, idx) => (
                                <tr key={idx} className="border-b border-slate-800">
                                  <td className="py-1 pr-2">
                                    {r.mes}
                                  </td>
                                  <td className="py-1 pr-2 text-right tabular-nums">
                                    {fmtTon(r.ventaTon)}
                                    {realTonForecast != null && /forecast/i.test(r.mes) ? ` (${fmtTon(realTonForecast)})` : ""}
                                  </td>
                                  <td className="py-1 text-right tabular-nums">{fmtKg(r.descKg)}</td>
                                  <td className="py-1 text-right tabular-nums">{fmtMxn0(r.ingresoMxn)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {!st?.loading && !st?.error && (!st?.rows || st.rows.length === 0) && (
                        <p className="text-sm text-slate-500">Sin datos por mes.</p>
                      )}
                      <p className="mt-2 text-[0.7rem] text-slate-500">
                        Nota: Descuento $/Kg = Descuento MXN / Venta kg del mismo mes.
                      </p>
                    </div>
                  );
                })()}
                <p>
                  Frecuencia estimada:{" "}
                  {deltaClienteSel.cliente.freqDays != null && deltaClienteSel.cliente.freqDays < 9000
                    ? `cada ${deltaClienteSel.cliente.freqDays.toFixed(1)} días`
                    : (deltaClienteSel.cliente.freqDays != null && deltaClienteSel.cliente.freqDays >= 9000
                      ? "sin compras en la ventana"
                      : "sin datos")}{" "}
                  · Estado: {deltaClienteSel.cliente.estado || "N/D"}
                </p>
                <p>
                  Días desde última compra (en ventana):{" "}
                  {typeof deltaClienteSel.cliente.daysSinceLast === "number"
                    ? `${deltaClienteSel.cliente.daysSinceLast} días`
                    : "N/D"}
                  {deltaClienteSel.cliente.lastPurchaseDate && (
                    <> · Última compra real: {deltaClienteSel.cliente.lastPurchaseDate}{typeof deltaClienteSel.cliente.daysSinceLastReal === "number" ? ` (hace ${deltaClienteSel.cliente.daysSinceLastReal} días)` : ""}</>
                  )}
                </p>
                <div className="mt-2">
                  <h4 className="mb-2 text-base font-semibold text-slate-400">Compras últimas 4 semanas</h4>
                  {deltaClienteSel.cliente.historyLast4Weeks && deltaClienteSel.cliente.historyLast4Weeks.length > 0 ? (
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                          <th className="py-1 pr-2 text-left">Fecha</th>
                          <th className="py-1 text-right">Volumen (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deltaClienteSel.cliente.historyLast4Weeks.map((h, idx) => (
                          <tr key={idx} className="border-b border-slate-800">
                            <td className="py-1 pr-2">{h.fecha}</td>
                            <td className="py-1 text-right tabular-nums">
                              {h.kg.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-slate-500">Sin compras en las últimas 4 semanas.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {plantaFilter ? <div className="flex-1 min-h-[35vh] mt-6" aria-hidden /> : null}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-4"><p className="text-slate-400">Cargando…</p></div>}>
      <KpiContent />
    </Suspense>
  );
}
