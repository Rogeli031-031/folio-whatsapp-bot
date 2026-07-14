"use client";

import { useMemo, useState } from "react";
import type { KanbanBoard as KanbanBoardType, FolioCard } from "@/lib/api";
import * as XLSX from "xlsx";

interface Props {
  data: KanbanBoardType | null;
  selectedPlantaId?: number;
  onOpenFolio?: (id: number) => void;
}

type MesCargo = string;
type Categoria = string;
type Subcategoria = string;

interface AggRow {
  mes_cargo: MesCargo;
  categoria: Categoria;
  subcategoria: Subcategoria;
  total: number;
  folios: FolioCard[];
}

function flattenCardsFromKanban(data: KanbanBoardType | null, selectedPlantaId?: number): FolioCard[] {
  if (!data?.board) return [];
  const cards: FolioCard[] = [];
  const etapaLabel = (col: (typeof data.board)[0]) => col.etapa_label || col.etapa || "";
  for (const col of data.board) {
    const label = etapaLabel(col);
    for (const p of col.plantas || []) {
      if (selectedPlantaId != null && p.planta_id !== selectedPlantaId) continue;
      const porCat = p.porCategoria || {};
      for (const key of Object.keys(porCat)) {
        const arr = porCat[key] || [];
        for (const c of arr) {
          if (c.mes_cargo != null && String(c.mes_cargo).trim() !== "")
            cards.push({ ...c, etapa_label: label || c.etapa_label || null });
        }
      }
    }
  }
  return cards;
}

function formatMesCargo(mes: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(String(mes).trim());
  if (!match) return mes;
  const [, y, m] = match;
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const idx = parseInt(m, 10) - 1;
  return `${meses[idx] ?? m} ${y}`;
}

function fmtMxn(n: number): string {
  if (n == null || Number.isNaN(n)) return "N/A";
  return `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}

export default function ResumenCategoriasMesCargo({ data, selectedPlantaId, onOpenFolio }: Props) {
  const cards = useMemo(() => flattenCardsFromKanban(data, selectedPlantaId), [data, selectedPlantaId]);
  const prestamosCards = useMemo(
    () => cards.filter((c) => c.prestamo_a_planta),
    [cards]
  );
  const prestamosSiguienteMesCards = useMemo(
    () => cards.filter((c) => !!c.prestamo_siguiente_mes),
    [cards]
  );

  const { byMes, byMesCat, byMesCatSub, detalleList } = useMemo(() => {
    const byMes: Record<MesCargo, number> = {};
    const byMesCat: Record<string, number> = {};
    const byMesCatSub: Record<string, number> = {};
    const detalleMap: Record<string, FolioCard[]> = {};

    for (const c of cards) {
      const mes = String(c.mes_cargo || "").trim();
      const cat = (c.categoria || "").trim() || "—";
      const subRaw = (c.subcategoria || c.unidad || "").trim();
      const sub = subRaw || "—";
      const imp = Number(c.importe) || 0;

      byMes[mes] = (byMes[mes] || 0) + imp;
      const keyCat = `${mes}\t${cat}`;
      byMesCat[keyCat] = (byMesCat[keyCat] || 0) + imp;
      const keySub = `${mes}\t${cat}\t${sub}`;
      byMesCatSub[keySub] = (byMesCatSub[keySub] || 0) + imp;
      if (!detalleMap[keySub]) detalleMap[keySub] = [];
      detalleMap[keySub].push(c);
    }

    const detalleList: AggRow[] = [];
    for (const key of Object.keys(detalleMap)) {
      const [mes_cargo, categoria, subcategoria] = key.split("\t");
      const total = byMesCatSub[key] || 0;
      detalleList.push({ mes_cargo, categoria, subcategoria, total, folios: detalleMap[key] });
    }
    detalleList.sort((a, b) => {
      const c = a.mes_cargo.localeCompare(b.mes_cargo);
      if (c !== 0) return c;
      const d = a.categoria.localeCompare(b.categoria);
      if (d !== 0) return d;
      return a.subcategoria.localeCompare(b.subcategoria);
    });

    return { byMes, byMesCat, byMesCatSub, detalleList };
  }, [cards]);

  const [selectedMes, setSelectedMes] = useState<MesCargo | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
  const [selectedSubcategoria, setSelectedSubcategoria] = useState<Subcategoria | null>(null);

  const mesesOrdenados = useMemo(() => Object.keys(byMes).sort(), [byMes]);
  const categoriasEnMes = useMemo(() => {
    if (!selectedMes) return [];
    const out: { categoria: string; total: number }[] = [];
    const seen = new Set<string>();
    for (const key of Object.keys(byMesCat)) {
      const [mes, cat] = key.split("\t");
      if (mes !== selectedMes) continue;
      if (seen.has(cat)) continue;
      seen.add(cat);
      out.push({ categoria: cat, total: byMesCat[key] || 0 });
    }
    out.sort((a, b) => b.total - a.total);
    return out;
  }, [selectedMes, byMesCat]);
  const subcategoriasEnMesCat = useMemo(() => {
    if (!selectedMes || !selectedCategoria) return [];
    const out: { subcategoria: string; total: number }[] = [];
    for (const key of Object.keys(byMesCatSub)) {
      const [mes, cat, sub] = key.split("\t");
      if (mes !== selectedMes || cat !== selectedCategoria) continue;
      out.push({ subcategoria: sub, total: byMesCatSub[key] || 0 });
    }
    out.sort((a, b) => b.total - a.total);
    return out;
  }, [selectedMes, selectedCategoria, byMesCatSub]);
  const foliosEnSub = useMemo(() => {
    if (!selectedMes || !selectedCategoria || !selectedSubcategoria) return [];
    const key = `${selectedMes}\t${selectedCategoria}\t${selectedSubcategoria}`;
    return detalleList.filter((r) => r.mes_cargo === selectedMes && r.categoria === selectedCategoria && r.subcategoria === selectedSubcategoria).flatMap((r) => r.folios);
  }, [selectedMes, selectedCategoria, selectedSubcategoria, detalleList]);

  const handleExportExcel = () => {
    const aoaResumen: (string | number)[][] = [["Mes de cargo", "Categoría", "Subcategoría", "Total (MXN)"]];
    for (const r of detalleList) {
      aoaResumen.push([formatMesCargo(r.mes_cargo), r.categoria, r.subcategoria, r.total]);
    }
    const aoaDetalle: (string | number)[][] = [["Mes de cargo", "Categoría", "Subcategoría", "Etapa", "Número folio", "Importe", "Beneficiario", "Descripción", "Identificación"]];
    for (const r of detalleList) {
      for (const f of r.folios) {
        const ben = f.beneficiario ?? "";
        const identificacion = f.prestamo_siguiente_mes
          ? "préstamos siguiente mes"
          : f.prestamo_a_planta
            ? `préstamo a planta: ${f.prestamo_a_planta}`
            : "";
        aoaDetalle.push([
          formatMesCargo(r.mes_cargo),
          r.categoria,
          r.subcategoria,
          f.etapa_label ?? "—",
          f.numero_folio || f.folio_codigo || "",
          f.importe ?? 0,
          ben,
          (f.descripcion || "").slice(0, 200),
          identificacion,
        ]);
      }
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaResumen), "Resumen");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaDetalle), "Detalle");
    XLSX.writeFile(wb, "resumen_categorias_mes_cargo.xlsx");
  };

  const handleExportPrestamosExcel = () => {
    const aoa: (string | number)[][] = [
      ["Número folio", "Planta origen (A)", "Cargado a planta (B)", "Mes cargo", "Importe (MXN)", "Concepto"],
    ];
    for (const f of prestamosCards) {
      const prestamo = f.prestamo_a_planta || "";
      aoa.push([
        f.numero_folio || f.folio_codigo || "",
        (f.planta_nombre || "").trim() || "—",
        prestamo,
        formatMesCargo(String(f.mes_cargo || "").trim()) || "—",
        f.importe ?? 0,
        (f.descripcion || "").slice(0, 500),
      ]);
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Préstamos A a B");
    XLSX.writeFile(wb, "prestamos_a_planta.xlsx");
  };

  const handleExportPrestamosSiguienteMesExcel = () => {
    const aoa: (string | number)[][] = [
      ["Identificación", "Número folio", "Planta", "Mes cargo", "Importe (MXN)", "Etapa", "Beneficiario", "Concepto"],
    ];
    for (const f of prestamosSiguienteMesCards) {
      aoa.push([
        "préstamos siguiente mes",
        f.numero_folio || f.folio_codigo || "",
        (f.planta_nombre || "").trim() || "—",
        formatMesCargo(String(f.mes_cargo || "").trim()) || "—",
        f.importe ?? 0,
        f.etapa_label ?? "—",
        f.beneficiario ?? "",
        (f.descripcion || "").slice(0, 500),
      ]);
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Préstamos siguiente mes");
    XLSX.writeFile(wb, "prestamos_siguiente_mes.xlsx");
  };

  const showDetalle = selectedMes != null && selectedCategoria != null && selectedSubcategoria != null;
  const showSubcategorias = selectedMes != null && selectedCategoria != null && !showDetalle;
  const showCategorias = selectedMes != null && !selectedCategoria;
  const showMeses = !selectedMes;

  if (!data) return null;
  if (mesesOrdenados.length === 0) {
    return (
      <div className="mx-4 mt-3 rounded border border-slate-600 bg-slate-800/60 px-4 py-3">
        <p className="text-sm text-slate-400">No hay folios con mes de cargo asignado para mostrar en el resumen.</p>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3 rounded border border-slate-600 bg-slate-800/60 px-4 py-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-200">Resumen por categoría y mes de cargo</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportPrestamosExcel}
            disabled={prestamosCards.length === 0}
            title={prestamosCards.length === 0 ? "No hay folios marcados como préstamo a planta" : "Exportar folios que son préstamos de planta A a planta B"}
            className="rounded bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Exportar préstamos A→B ({prestamosCards.length})
          </button>
          <button
            type="button"
            onClick={handleExportPrestamosSiguienteMesExcel}
            disabled={prestamosSiguienteMesCards.length === 0}
            title={
              prestamosSiguienteMesCards.length === 0
                ? "No hay folios marcados como préstamo siguiente mes"
                : "Exportar folios identificados como préstamos siguiente mes"
            }
            className="rounded bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Exportar préstamo siguiente mes ({prestamosSiguienteMesCards.length})
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Exportar a Excel
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        {(selectedMes || selectedCategoria || selectedSubcategoria) && (
          <button
            type="button"
            onClick={() => { setSelectedMes(null); setSelectedCategoria(null); setSelectedSubcategoria(null); }}
            className="rounded border border-slate-500 px-2 py-1 text-slate-300 hover:bg-slate-700"
          >
            ← Todo
          </button>
        )}
        {selectedMes && (
          <>
            <span className="text-slate-500">|</span>
            <button
              type="button"
              onClick={() => { setSelectedCategoria(null); setSelectedSubcategoria(null); }}
              className="rounded border border-slate-500 px-2 py-1 text-slate-300 hover:bg-slate-700"
            >
              {formatMesCargo(selectedMes)}
            </button>
          </>
        )}
        {selectedCategoria && (
          <>
            <span className="text-slate-500">|</span>
            <button
              type="button"
              onClick={() => setSelectedSubcategoria(null)}
              className="rounded border border-slate-500 px-2 py-1 text-slate-300 hover:bg-slate-700"
            >
              {selectedCategoria}
            </button>
          </>
        )}
        {selectedSubcategoria && <span className="text-slate-300">{selectedSubcategoria}</span>}
      </div>

      {showMeses && (
        <ul className="mt-2 space-y-1">
          {mesesOrdenados.map((mes) => (
            <li key={mes}>
              <button
                type="button"
                onClick={() => setSelectedMes(mes)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-700/80"
              >
                <span>{formatMesCargo(mes)}</span>
                <span className="font-medium text-slate-300">{fmtMxn(byMes[mes])}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showCategorias && categoriasEnMes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {categoriasEnMes.map(({ categoria, total }) => (
            <li key={categoria}>
              <button
                type="button"
                onClick={() => setSelectedCategoria(categoria)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-700/80"
              >
                <span>{categoria}</span>
                <span className="font-medium text-slate-300">{fmtMxn(total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showSubcategorias && subcategoriasEnMesCat.length > 0 && (
        <ul className="mt-2 space-y-1">
          {subcategoriasEnMesCat.map(({ subcategoria, total }) => (
            <li key={subcategoria}>
              <button
                type="button"
                onClick={() => setSelectedSubcategoria(subcategoria)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-700/80"
              >
                <span>{subcategoria}</span>
                <span className="font-medium text-slate-300">{fmtMxn(total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showDetalle && foliosEnSub.length > 0 && (
        <ul className="mt-2 space-y-1">
          {foliosEnSub.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onOpenFolio?.(f.id)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-700/80"
              >
                <span className="truncate">{f.numero_folio || f.folio_codigo || `#${f.id}`}</span>
                <span className="ml-2 shrink-0 font-medium text-slate-300">{fmtMxn(f.importe ?? 0)}</span>
              </button>
              {(f.descripcion || (f as FolioCard & { beneficiario?: string }).beneficiario) && (
                <p className="ml-4 mt-0.5 truncate text-xs text-slate-500">
                  {f.beneficiario || ""}
                  {f.beneficiario && f.descripcion ? " · " : ""}
                  {(f.descripcion || "").slice(0, 80)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
