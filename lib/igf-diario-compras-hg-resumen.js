"use strict";

// AL contains a recalculable narrative. Physical inventory needs measured balances;
// HG is read independently, never inferred from purchases minus sales.
function setupColumn(ws) {
  ws.getColumn(38).width = 58;
  ws.getColumn(38).hidden = false;
  for (const row of [4, 5]) {
    const cell = ws.getCell(row, 38);
    cell.value = "COMPRAS, VENTA Y HG";
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: row === 5 ? "FFFFFFFF" : "FF000000" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: row === 5 ? "FF2F2F2F" : "FFFFFFFF" } };
    cell.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
  }
}

function writeDay(h, ws, row, day, ctx) {
  const compraRow = ctx.compraRows.get(day.fecha);
  const source = (col) => compraRow && col ? h.ref(ctx.supports.compras, col, compraRow) : '""';
  const compra = source(ctx.cols.compraKg);
  const hg = source(ctx.cols.hgKg);
  const venta = `B${row}`;
  const numeric = (addr) => `IFERROR(ISNUMBER(${addr}),FALSE)`;
  const kg = (addr) => `IF(${numeric(addr)},TEXT(${addr},"#,##0.00")&" kg","sin dato")`;
  const projected = Boolean(ctx.corte) && day.fecha >= ctx.corte;
  const title = projected ? '"PROYECTADO"&CHAR(10)&' : "";
  const purchaseLabel = projected ? "Compras previstas" : (ctx.corte ? "Compras recibidas" : "Compras en la hoja");
  const hgLabel = projected ? "HG proyectado" : (ctx.corte ? "HG registrado" : "HG en la hoja");
  const balance = `IF(AND(${numeric(compra)},${numeric(venta)}),TEXT(${compra}-${venta},"+#,##0.00;-#,##0.00;0.00")&" kg","sin dato")`;
  const percentage = `IF(AND(${numeric(hg)},${numeric(venta)}),IF(${venta}>0,TEXT(${hg}/${venta},"0.00%"),"sin base de venta positiva"),"sin dato")`;
  ws.getCell(row, 38).value = {
    formula: `${title}"${purchaseLabel}: "&${kg(compra)}&CHAR(10)&"Venta total: "&${kg(venta)}&CHAR(10)&"Saldo compras menos ventas: "&${balance}&CHAR(10)&"${hgLabel}: "&${kg(hg)}&CHAR(10)&"HG / venta total: "&${percentage}`,
  };
  ws.getCell(row, 38).font = { name: "Calibri", size: 11 };
  ws.getCell(row, 38).alignment = { wrapText: true, vertical: "top" };
  // Six lines plus a wrapped long balance line at the exported column width.
  ws.getRow(row).height = Math.max(ws.getRow(row).height || 0, projected ? 120 : 105);
}

module.exports = { setupColumn, writeDay };
