import type { DeltaIngresoForecastCliente, DicfResult } from "@/lib/api";
import { dicfClienteEsComisionista } from "@/lib/arr-categoria";

export type ArrExportSubcategoriaResumenRow = {
  subcategoria: string;
  ventaTon: number;
  comisionProyectadaMxn: number;
  esTotal?: boolean;
};

export type ArrExportMovimientoClienteRow = {
  movimiento: string;
  cliente: string;
  categoria: "CASA" | "COMISIONISTA";
  subcategoria: string;
  deltaTon: string;
  deltaIngreso: string;
  ultimaCompra: string;
  estado: string;
  frecuenciaDias: string;
  origen?: "dicf" | "plan";
};

export type ArrExportPlanNuevoMovimiento = {
  nombre: string;
  categoria: "CASA" | "COMISIONISTA";
  kg: number;
  subcategoria?: string;
};

function filtraPorCategoria(
  list: DeltaIngresoForecastCliente[],
  want: "CASA" | "COMISIONISTA"
): DeltaIngresoForecastCliente[] {
  return list.filter((c) =>
    want === "COMISIONISTA" ? dicfClienteEsComisionista(c) : !dicfClienteEsComisionista(c)
  );
}

function fmtUltimaCompra(c: DeltaIngresoForecastCliente): string {
  if (c.lastPurchaseDate) {
    const d = c.daysSinceLastReal ?? "?";
    return `${c.lastPurchaseDate} (${d} d)`;
  }
  if (typeof c.daysSinceLast === "number") return `${c.daysSinceLast} d`;
  return "N/D";
}

function fmtFrecuencia(c: DeltaIngresoForecastCliente): string {
  if (c.freqDays != null && c.freqDays < 9000) return `cada ${c.freqDays.toFixed(0)} d`;
  return "N/A";
}

function rowFromDicf(
  movimiento: string,
  c: DeltaIngresoForecastCliente,
  categoria: "CASA" | "COMISIONISTA",
  grupo: "dejaron" | "disminuyeron" | "aumentaron" | "nuevos"
): ArrExportMovimientoClienteRow {
  const ingreso = grupo === "dejaron" ? c.ingresoAStr : c.deltaIngresoStr;
  const deltaTon =
    c.deltaKgStr != null && String(c.deltaKgStr).trim() !== ""
      ? `${c.deltaKgStr} Ton`
      : "";
  return {
    movimiento,
    cliente: String(c.cliente || "").trim(),
    categoria,
    subcategoria: (c.subcanal || "").trim(),
    deltaTon,
    deltaIngreso: ingreso ?? "",
    ultimaCompra: fmtUltimaCompra(c),
    estado: (c.estado || "").trim() || "—",
    frecuenciaDias: fmtFrecuencia(c),
    origen: "dicf",
  };
}

function appendGrupo(
  out: ArrExportMovimientoClienteRow[],
  movimiento: string,
  list: DeltaIngresoForecastCliente[],
  categoria: "CASA" | "COMISIONISTA",
  grupo: "dejaron" | "disminuyeron" | "aumentaron" | "nuevos"
) {
  for (const c of filtraPorCategoria(list, categoria)) {
    out.push(rowFromDicf(movimiento, c, categoria, grupo));
  }
}

/** Filas de movimiento por hoja CASA / COMISIONISTA (misma lógica que el modal DICF). */
export function buildArrExportMovimientoClienteRows(
  dicf: DicfResult,
  planNuevos: ArrExportPlanNuevoMovimiento[]
): { casa: ArrExportMovimientoClienteRow[]; comisionista: ArrExportMovimientoClienteRow[] } {
  const casa: ArrExportMovimientoClienteRow[] = [];
  const comisionista: ArrExportMovimientoClienteRow[] = [];

  const grupos: Array<{
    movimiento: string;
    list: DeltaIngresoForecastCliente[];
    key: "dejaron" | "disminuyeron" | "aumentaron" | "nuevos";
  }> = [
    { movimiento: "Dejaron de comprar", list: dicf.dejaron?.clientes ?? [], key: "dejaron" },
    { movimiento: "Disminuyeron", list: dicf.disminuyeron?.clientes ?? [], key: "disminuyeron" },
    { movimiento: "Aumentaron", list: dicf.aumentaron?.clientes ?? [], key: "aumentaron" },
    { movimiento: "Nuevos", list: dicf.nuevos?.clientes ?? [], key: "nuevos" },
  ];

  for (const g of grupos) {
    appendGrupo(casa, g.movimiento, g.list, "CASA", g.key);
    appendGrupo(comisionista, g.movimiento, g.list, "COMISIONISTA", g.key);
  }

  for (const n of planNuevos) {
    const kg = Number(n.kg);
    const row: ArrExportMovimientoClienteRow = {
      movimiento: "Nuevos",
      cliente: n.nombre,
      categoria: n.categoria,
      subcategoria: (n.subcategoria || "").trim(),
      deltaTon: Number.isFinite(kg) && kg > 0 ? `${(kg / 1000).toFixed(2)} Ton` : "",
      deltaIngreso: "",
      ultimaCompra: "Plan manual",
      estado: "Activo",
      frecuenciaDias: "—",
      origen: "plan",
    };
    if (n.categoria === "COMISIONISTA") comisionista.push(row);
    else casa.push(row);
  }

  return { casa, comisionista };
}
