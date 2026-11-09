"use strict";
const ExcelJS = require("exceljs");
const igf = require("../../lib/igf-diario-puebla");
const { appendComprasWorksheet } = require("../../lib/compras-excel");
const { aggregatePurchases } = require("../../lib/compras-dashboard");

async function weeklyFixture(plant = "Tehuacán", month = 11) {
  const wb = new ExcelJS.Workbook();
  const supports = { venta: "Venta prueba", compras: "Compras prueba", precio: "Precio prueba", comisiones: "Comisiones prueba" };
  const venta = wb.addWorksheet(supports.venta);
  venta.addRow(["DÍA", `${plant} CASA`, `${plant} COMISIONISTA`]);
  // Synthetic daily distribution totals the user's 177,136 kg weekly example.
  const sales = [2930.4, 22479.44, 40244.8, 18571.04, 31459.38, 12259.6, 49191.34];
  const hg = [21, 2368, 5758, 3161, 1834, 388, 2055];
  const kg = [0, 23670, 47460, 0, 23620, 23670, 0];
  const mm = String(month).padStart(2, "0");
  const ymd = d => `2026-${mm}-${String(d).padStart(2, "0")}`;
  // Reordered purchase blocks, extra provider and later freight copies exercise
  // header discovery rather than fixed column numbers or double-counting freight.
  const providers = ["TOMZA TEPEJI", "OTRO", "TOMZA TUXPAN", "PEMEX TUXPAN"].map((nombre, i) => ({ id: i + 1, nombre }));
  const purchases = [];
  for (let day = 1; day <= new Date(2026, month, 0).getDate(); day++) {
    venta.addRow([day, (sales[day - 1] || 0) / 2000, (sales[day - 1] || 0) / 2000]);
    if (kg[day - 1]) purchases.push({ id: day, fecha: ymd(day), proveedor_id: day === 5 ? 3 : 4, kg: kg[day - 1], importe: kg[day - 1] * 13 });
  }
  const grid = aggregatePurchases(purchases, providers, 2026, month);
  await appendComprasWorksheet(wb, { year: 2026, month, providers, grid }, { plantName: plant, corteYmd: ymd(8), sheetName: supports.compras });
  const compras = wb.getWorksheet(supports.compras);
  const hgCol = compras.getRow(5).values.indexOf("HG EN KILOS");
  compras.eachRow(row => {
    const value = row.getCell(1).value;
    if (value instanceof Date) row.getCell(hgCol).value = hg[value.getUTCDate() - 1] || 0;
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(value))) row.getCell(hgCol).value = hg[Number(value.slice(0, 2)) - 1] || 0;
  });
  const fold = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const ws = igf.fillIgfDiarioPuebla(wb, { year: 2026, month, sheetLabel: plant, humanName: plant, supports, corteYmd: ymd(8), plantEquivalent: label => fold(label) === fold(plant) });
  return { wb, ws, compras, supports, sales, hg, kg };
}
module.exports = { weeklyFixture };
