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

function writeWeek(h, ws, row, days, ctx) {
  if (!days.length || ctx.end == null) return;
  const sourceRows = days.map(day => ctx.compraRows.get(day.fecha));
  const mapped = sourceRows.every(r => r != null);
  const refs = cols => mapped
    ? sourceRows.flatMap(r => (cols || []).map(c => h.ref(ctx.supports.compras, c, r)))
    : [];
  const purchaseRefs = refs(ctx.cols.compraKg ? [ctx.cols.compraKg] : []);
  const hgRefs = refs(ctx.cols.hgKg ? [ctx.cols.hgKg] : []);
  const sumKnown = addresses => addresses.length
    ? `IF(COUNT(${addresses.join(",")})=0,"",SUM(${addresses.join(",")}))` : '""';
  const purchase = `AO${row}`, hg = `AP${row}`, tuxpan = `AQ${row}`, tepeji = `AR${row}`, sale = `B${row}`;
  const sourceTotal = cols => {
    const addresses = refs(cols);
    return `IF(ISNUMBER(${purchase}),${addresses.length ? `SUM(${addresses.join(",")})` : "0"},"")`;
  };
  // Dedicated helpers follow the existing AM/AN financial flags. Reference daily
  // rows, not cached purchase subtotals, so editing source cells recalculates AL.
  for (const [col, label, formula] of [
    [41, "Compras semanales (kg)", sumKnown(purchaseRefs)],
    [42, "HG semanal (kg)", sumKnown(hgRefs)],
    [43, "Compras Tuxpan (kg)", sourceTotal(ctx.cols.tuxpanKg)],
    [44, "Compras Tepeji (kg)", sourceTotal(ctx.cols.tepejiKg)],
  ]) {
    ws.getColumn(col).hidden = true;
    ws.getCell(5, col).value = label;
    ws.getCell(row, col).value = { formula };
  }
  const kg = addr => `IF(ISNUMBER(${addr}),TEXT(${addr},"#,##0.00")&" kg","sin dato")`;
  const pct = (num, den) => `IF(AND(ISNUMBER(${num}),ISNUMBER(${den})),IF(${den}>0,TEXT(${num}/${den},"0.00%"),"sin base positiva"),"sin dato")`;
  const coverage = hgRefs.length
    ? `IF(OR(COUNT(${hgRefs.join(",")})<${days.length},COUNT(B${ctx.start}:B${ctx.end})<${days.length}),"HG / venta: datos parciales"&CHAR(10),"")&`
    : '"HG: sin datos"&CHAR(10)&';
  const projected = Boolean(ctx.corte) && days.some(day => day.fecha >= ctx.corte);
  const title = projected ? '"Incluye proyección"&CHAR(10)&' : "";
  const summary = ws.getCell(row, 38);
  summary.value = { formula: `${title}${coverage}"%HG Semanal = "&${pct(hg, sale)}&CHAR(10)&"HG en kilos: "&${kg(hg)}&CHAR(10)&"Total de compras: "&${kg(purchase)}&CHAR(10)&"Tuxpan: "&${pct(tuxpan, purchase)}&"  Tepeji: "&${pct(tepeji, purchase)}&CHAR(10)&"Total de venta: "&${kg(sale)}` };
  // Reuse the existing spacer below the subtotal for a numeric, colorable balance.
  // This colors only the difference, without inserting rows or changing formulas.
  const balance = ws.getCell(row + 1, 38);
  balance.value = { formula: `IF(AND(ISNUMBER(${purchase}),ISNUMBER(${sale})),${purchase}-${sale},"Diferencia (Compras - Venta): sin dato")` };
  balance.numFmt = '"Diferencia (Compras - Venta): "+#,##0.00" kg";"Diferencia (Compras - Venta): "-#,##0.00" kg";"Diferencia (Compras - Venta): "0.00" kg";@';
  for (const cell of [summary, balance]) {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
    cell.alignment = { wrapText: true, vertical: "middle", horizontal: "left" };
  }
  ws.getRow(row).height = Math.max(ws.getRow(row).height || 0, projected ? 112 : 98);
  ws.getRow(row + 1).height = Math.max(ws.getRow(row + 1).height || 0, 30);
  ws.addConditionalFormatting({ ref: balance.address, rules: [
    { type: "expression", formulae: [`AND(ISNUMBER(${balance.address}),${balance.address}<0)`], style: { font: { color: { argb: "FFFF0000" } } } },
    { type: "expression", formulae: [`AND(ISNUMBER(${balance.address}),${balance.address}>0)`], style: { font: { color: { argb: "FF008000" } } } },
  ] });
}

module.exports = { setupColumn, writeDay, writeWeek };
