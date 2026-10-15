"use strict";
const ExcelJS = require("exceljs");
const igf = require("../../lib/igf-diario-puebla");
function workbook(extra = {}) {
  const wb = new ExcelJS.Workbook();
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  venta.addRow(["DIA", "PUEBLA CASA", "PUEBLA COMISIONISTA"]);
  const cd = wb.addWorksheet("Provincia Comisiones"); cd.addRow(["DIA", "C&D"]);
  const price = wb.addWorksheet("PRECIO"); price.addRow(["FECHA", "PRECIO"]);
  const buys = wb.addWorksheet("CONTROL DE COMPRAS");
  buys.getCell("B4").value = "CONSOLIDADO"; buys.getCell("B5").value = "COSTO KG";
  buys.getCell("C4").value = "CONSOLIDADO"; buys.getCell("C5").value = "TARIFA";
  buys.getCell("D4").value = "HG"; buys.getCell("D5").value = "IMPORTE";
  for (let d = 1; d <= 31; d++) {
    venta.addRow([d, 10, 20]); cd.addRow([d, -3.5]);
    const date = new Date(Date.UTC(2026, 9, d));
    price.addRow([date, 20]); buys.addRow([date, 12, 1, -3000]);
  }
  igf.fillIgfDiarioPuebla(wb, {
    year: 2026, month: 10, sheetLabel: "Puebla", humanName: "Puebla", corteYmd: "2026-10-15",
    corporativos: 810000, operativos: 1620000,
    dailyInsights: { byDate: { "2026-10-01": { comentario: "Comentario de muestra.", ventas: "NUEVO: CLIENTE MUESTRA - 500 kg", descuentosPlain: "Descuento de muestra", descuentos: "Descuento de muestra" } } },
    ...extra,
  });
  return wb;
}
function channel(canal) {
  return {
    ok: true, empresa: "Puebla", plant_code: "Puebla", canal, range: "1m", top_limit: 15,
    fecha_desde: "2026-09-15", fecha_hasta: "2026-10-14", fecha_prev_desde: "2026-08-16", fecha_prev_hasta: "2026-09-14",
    points: Array.from({ length: 30 }, (_, i) => ({ fecha: new Date(Date.UTC(2026, 8, 15 + i)).toISOString().slice(0, 10), venta_ton: (canal === "casa" ? 8 : 36) + Math.sin(i) * 3 + i / 10 })),
    clientes_top: Array.from({ length: 15 }, (_, i) => ({ cliente: `CLIENTE DE MUESTRA ${String(i + 1).padStart(2, "0")}`, venta_ton_prev: 45, venta_ton_actual: 45 + (15 - i) * (i % 2 ? -1 : 1), delta_ton: (15 - i) * (i % 2 ? -1 : 1), tipo: i % 2 ? "disminucion" : "aumento", comentarios: i % 3 ? [] : [{ body: "Comentario ilustrativo del cliente.", author_name: "Usuario de muestra", created_at: "2026-10-14T12:00:00Z" }] })),
  };
}
module.exports = { workbook, channel };
