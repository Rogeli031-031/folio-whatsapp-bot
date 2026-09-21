"use strict";

const ExcelJS = require("exceljs");

const MESES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];

const BLACK = "FF000000";
const HEADER = "FF2F2F2F";
const CAPTURE = "FFD9D9D9";
const DATE_CAP = "FFB8CCE4";
const WHITE = "FFFFFFFF";

function border() {
  const t = { style: "thin", color: { argb: "FF000000" } };
  return { top: t, left: t, bottom: t, right: t };
}

function paint(cell, fill, font) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  cell.font = Object.assign({ name: "Calibri", size: 9, color: { argb: "FF000000" } }, font || {});
  cell.border = border();
}

function paintTitle(cell) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
  cell.font = { bold: true, name: "Calibri", size: 11, color: { argb: BLACK } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = { bottom: { style: "thin", color: { argb: BLACK } } };
}

function paintMetric(cell) {
  paint(cell, HEADER, { bold: true, color: { argb: WHITE }, size: 8 });
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

function setNum(cell, value, fmt, fill, bold, blankIfZero) {
  paint(cell, fill, { bold: Boolean(bold) });
  cell.alignment = { horizontal: "right", vertical: "middle" };
  const n = Number(value);
  if (!Number.isFinite(n) || (blankIfZero && n === 0)) {
    cell.value = null;
    return;
  }
  cell.value = n;
  cell.numFmt = fmt;
}

function blockStarts(providerCount) {
  const starts = [];
  let col = 2;
  for (let i = 0; i < providerCount + 1; i += 1) {
    starts.push(col);
    col += 4;
  }
  return starts;
}

async function buildComprasWorkbook(payload, opts = {}) {
  const plantName = String((opts && opts.plantName) || "").trim();
  const year = Number(payload.year);
  const month = Number(payload.month);
  const providers = payload.providers || [];
  const dayByYmd = new Map((payload.grid && payload.grid.days ? payload.grid.days : []).map((d) => [d.ymd, d]));
  const weekByNum = new Map((payload.grid && payload.grid.weeks ? payload.grid.weeks : []).map((w) => [w.week, w]));
  const starts = blockStarts(providers.length);
  const lastCol = starts[starts.length - 1] + 2;

  const wb = new ExcelJS.Workbook();
  wb.creator = "folio-whatsapp-bot";
  const ws = wb.addWorksheet("CONTROL DE COMPRAS", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 5 }],
  });

  ws.getColumn(1).width = 12;
  for (let c = 2; c <= lastCol + 1; c += 1) {
    const isGap = (c - 2) % 4 === 3;
    ws.getColumn(c).width = isGap ? 2.2 : 12;
  }

  ws.mergeCells(1, 1, 1, 4);
  ws.getCell(1, 1).value = "CONTROL DE COMPRAS";
  ws.getCell(1, 1).font = { bold: true, name: "Calibri", size: 20, color: { argb: BLACK } };

  ws.getCell(1, lastCol).value = year;
  ws.getCell(1, lastCol).font = { bold: true, name: "Calibri", size: 18 };
  ws.getCell(1, lastCol).alignment = { horizontal: "center" };

  ws.getCell(2, 1).value = plantName ? `PLANTA ${plantName.toUpperCase()}` : "PLANTA";
  ws.getCell(2, 1).font = { name: "Calibri", size: 10 };
  ws.getCell(2, lastCol - 1).value = "MES";
  ws.getCell(2, lastCol - 1).alignment = { horizontal: "right" };
  ws.getCell(2, lastCol).value = MESES[month - 1] || "";
  ws.getCell(2, lastCol).font = { bold: true };
  ws.getCell(2, lastCol).alignment = { horizontal: "center" };

  const titleRow = 4;
  const metricRow = 5;
  const fecha = ws.getCell(titleRow, 1);
  fecha.value = "FECHA";
  paint(fecha, HEADER, { bold: true, color: { argb: WHITE } });
  ws.mergeCells(titleRow, 1, metricRow, 1);
  paint(ws.getCell(metricRow, 1), HEADER, { bold: true, color: { argb: WHITE } });
  ws.getCell(titleRow, 1).alignment = { horizontal: "center", vertical: "middle" };

  const titles = providers.map((p) => String(p.nombre || "").toUpperCase()).concat(["CONSOLIDADO"]);
  titles.forEach((name, i) => {
    const start = starts[i];
    ws.mergeCells(titleRow, start, titleRow, start + 2);
    const t = ws.getCell(titleRow, start);
    t.value = name;
    paintTitle(t);
    paintTitle(ws.getCell(titleRow, start + 1));
    paintTitle(ws.getCell(titleRow, start + 2));
    ["COMPRA KG", "COSTO KG", "IMPORTE"].forEach((label, j) => {
      const h = ws.getCell(metricRow, start + j);
      h.value = label;
      paintMetric(h);
    });
  });

  function writeProviderTriple(row, startCol, cell, blankIfZero, consolidado) {
    const kgFill = consolidado ? WHITE : CAPTURE;
    const impFill = consolidado ? WHITE : CAPTURE;
    setNum(ws.getCell(row, startCol), cell && cell.kg, "#,##0.0", kgFill, false, blankIfZero);
    setNum(ws.getCell(row, startCol + 1), cell && cell.costo_kg, "0.000", WHITE, Boolean(cell && cell.costo_kg), blankIfZero);
    setNum(ws.getCell(row, startCol + 2), cell && cell.importe, "#,##0.00", impFill, false, blankIfZero);
  }

  let r = 6;
  for (const row of payload.grid.rows || []) {
    if (row.type === "day") {
      const day = dayByYmd.get(row.ymd);
      const dateCell = ws.getCell(r, 1);
      const [yy, mm, dd] = row.ymd.split("-");
      dateCell.value = `${dd}/${mm}/${yy}`;
      paint(dateCell, day && day.captured ? DATE_CAP : WHITE, { bold: false });
      dateCell.alignment = { horizontal: "left", vertical: "middle" };
      providers.forEach((p, i) => {
        const cell = (day && (day.cells[p.id] || day.cells[String(p.id)])) || { kg: 0, importe: 0, costo_kg: null };
        writeProviderTriple(r, starts[i], cell, true, false);
      });
      writeProviderTriple(r, starts[providers.length], (day && day.consolidado) || { kg: 0, importe: 0, costo_kg: null }, true, true);
      r += 1;
    } else {
      const week = weekByNum.get(row.week);
      const label = ws.getCell(r, 1);
      label.value = `Semana ${row.week}`;
      paint(label, BLACK, { bold: true, color: { argb: WHITE } });
      label.alignment = { horizontal: "left", vertical: "middle" };
      providers.forEach((p, i) => {
        const cell = (week && (week.providers[p.id] || week.providers[String(p.id)])) || { kg: 0, importe: 0, costo_kg: null };
        writeProviderTriple(r, starts[i], cell, false, false);
        ["", "", ""].forEach((_, j) => {
          const c = ws.getCell(r, starts[i] + j);
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
          c.font = { bold: true, name: "Calibri", size: 9 };
        });
      });
      writeProviderTriple(r, starts[providers.length], (week && week.consolidado) || { kg: 0, importe: 0, costo_kg: null }, false, true);
      ["", "", ""].forEach((_, j) => {
        const c = ws.getCell(r, starts[providers.length] + j);
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
        c.font = { bold: true, name: "Calibri", size: 9 };
      });
      r += 1;
      r += 1;
    }
  }

  const monthRow = payload.grid && payload.grid.month;
  const tot = ws.getCell(r, 1);
  tot.value = "TOTAL MES";
  paint(tot, BLACK, { bold: true, color: { argb: WHITE } });
  tot.alignment = { horizontal: "left" };
  providers.forEach((p, i) => {
    const cell = (monthRow && (monthRow.providers[p.id] || monthRow.providers[String(p.id)])) || { kg: 0, importe: 0, costo_kg: null };
    writeProviderTriple(r, starts[i], cell, false, false);
    for (let j = 0; j < 3; j += 1) {
      const c = ws.getCell(r, starts[i] + j);
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
      c.font = { bold: true, name: "Calibri", size: 9 };
    }
  });
  writeProviderTriple(r, starts[providers.length], (monthRow && monthRow.consolidado) || { kg: 0, importe: 0, costo_kg: null }, false, true);

  return wb;
}

module.exports = { buildComprasWorkbook, MESES, blockStarts };
