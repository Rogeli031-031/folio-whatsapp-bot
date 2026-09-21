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

const BLACK = "FF2F2F2F";
const GRAY = "FFD9D9D9";
const WEEK = "FFBFBFBF";
const TOTAL = "FFA6A6A6";
const YELLOW = "FFFFFF99";
const WHITE = "FFFFFFFF";

function border() {
  const t = { style: "thin", color: { argb: "FF000000" } };
  return { top: t, left: t, bottom: t, right: t };
}

function paintHeader(cell) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } };
  cell.font = { bold: true, color: { argb: WHITE }, name: "Calibri", size: 9 };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = border();
}

function paintBody(cell, fill, bold) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill || WHITE } };
  cell.font = { bold: Boolean(bold), name: "Calibri", size: 9, color: { argb: "FF000000" } };
  cell.alignment = { horizontal: "right", vertical: "middle" };
  cell.border = border();
}

function setNum(cell, value, fmt, fill, bold, blankIfZero) {
  paintBody(cell, fill, bold);
  const n = Number(value);
  if (!Number.isFinite(n) || (blankIfZero && n === 0)) {
    cell.value = null;
    return;
  }
  cell.value = n;
  cell.numFmt = fmt;
}

async function buildComprasWorkbook(payload, opts = {}) {
  const plantName = String((opts && opts.plantName) || "").trim();
  const year = Number(payload.year);
  const month = Number(payload.month);
  const providers = payload.providers || [];
  const dayByYmd = new Map((payload.grid && payload.grid.days ? payload.grid.days : []).map((d) => [d.ymd, d]));
  const weekByNum = new Map((payload.grid && payload.grid.weeks ? payload.grid.weeks : []).map((w) => [w.week, w]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "folio-whatsapp-bot";
  const ws = wb.addWorksheet("CONTROL DE COMPRAS", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 5 }],
  });

  const blocks = providers.length + 1;
  const lastCol = 1 + blocks * 3;
  const colLetter = (n) => ws.getColumn(n).letter;

  ws.getColumn(1).width = 12;
  for (let c = 2; c <= lastCol; c += 1) ws.getColumn(c).width = 12;

  ws.mergeCells(1, 1, 1, 4);
  const title = ws.getCell(1, 1);
  title.value = "CONTROL DE COMPRAS";
  title.font = { bold: true, name: "Calibri", size: 18, color: { argb: "FF000000" } };

  const yearCell = ws.getCell(1, lastCol);
  yearCell.value = year;
  yearCell.font = { bold: true, name: "Calibri", size: 16 };
  yearCell.alignment = { horizontal: "center" };

  ws.getCell(2, 1).value = plantName ? `PLANTA ${plantName.toUpperCase()}` : "PLANTA";
  ws.getCell(2, 1).font = { name: "Calibri", size: 10 };
  ws.getCell(2, lastCol - 1).value = "MES";
  ws.getCell(2, lastCol - 1).alignment = { horizontal: "right" };
  ws.getCell(2, lastCol).value = MESES[month - 1] || "";
  ws.getCell(2, lastCol).font = { bold: true };
  ws.getCell(2, lastCol).alignment = { horizontal: "center" };

  const headRow = 4;
  const subRow = 5;
  ws.getCell(headRow, 1).value = "FECHA";
  paintHeader(ws.getCell(headRow, 1));
  ws.mergeCells(headRow, 1, subRow, 1);
  paintHeader(ws.getCell(subRow, 1));

  providers.forEach((p, i) => {
    const start = 2 + i * 3;
    ws.mergeCells(headRow, start, headRow, start + 2);
    const cell = ws.getCell(headRow, start);
    cell.value = String(p.nombre || "").toUpperCase();
    paintHeader(cell);
    paintHeader(ws.getCell(headRow, start + 1));
    paintHeader(ws.getCell(headRow, start + 2));
    ["COMPRA KG", "COSTO KG", "IMPORTE"].forEach((label, j) => {
      const h = ws.getCell(subRow, start + j);
      h.value = label;
      paintHeader(h);
    });
  });

  const consStart = 2 + providers.length * 3;
  ws.mergeCells(headRow, consStart, headRow, consStart + 2);
  const cons = ws.getCell(headRow, consStart);
  cons.value = "CONSOLIDADO";
  paintHeader(cons);
  paintHeader(ws.getCell(headRow, consStart + 1));
  paintHeader(ws.getCell(headRow, consStart + 2));
  ["COMPRA KG", "COSTO KG", "IMPORTE"].forEach((label, j) => {
    const h = ws.getCell(subRow, consStart + j);
    h.value = label;
    paintHeader(h);
  });

  function writeTriple(row, startCol, cell, fill, blankIfZero) {
    setNum(ws.getCell(row, startCol), cell && cell.kg, "#,##0.0", fill, !blankIfZero, blankIfZero);
    setNum(ws.getCell(row, startCol + 1), cell && cell.costo_kg, "0.000", fill, !blankIfZero, blankIfZero);
    setNum(ws.getCell(row, startCol + 2), cell && cell.importe, "#,##0.00", fill, !blankIfZero, blankIfZero);
  }

  let r = 6;
  for (const row of payload.grid.rows || []) {
    if (row.type === "day") {
      const day = dayByYmd.get(row.ymd);
      const dateCell = ws.getCell(r, 1);
      const [yy, mm, dd] = row.ymd.split("-");
      dateCell.value = `${dd}/${mm}/${yy}`;
      paintBody(dateCell, day && day.captured ? YELLOW : WHITE, false);
      dateCell.alignment = { horizontal: "left" };
      providers.forEach((p, i) => {
        const cell = (day && (day.cells[p.id] || day.cells[String(p.id)])) || { kg: 0, importe: 0, costo_kg: null };
        writeTriple(r, 2 + i * 3, cell, WHITE, true);
      });
      writeTriple(r, consStart, (day && day.consolidado) || { kg: 0, importe: 0, costo_kg: null }, WHITE, true);
    } else {
      const week = weekByNum.get(row.week);
      const label = ws.getCell(r, 1);
      label.value = `Semana ${row.week}`;
      paintBody(label, WEEK, true);
      label.alignment = { horizontal: "left" };
      providers.forEach((p, i) => {
        const cell = (week && (week.providers[p.id] || week.providers[String(p.id)])) || { kg: 0, importe: 0, costo_kg: null };
        writeTriple(r, 2 + i * 3, cell, WEEK, false);
      });
      writeTriple(r, consStart, (week && week.consolidado) || { kg: 0, importe: 0, costo_kg: null }, WEEK, false);
    }
    r += 1;
  }

  const monthRow = payload.grid && payload.grid.month;
  const tot = ws.getCell(r, 1);
  tot.value = "TOTAL MES";
  paintBody(tot, TOTAL, true);
  tot.alignment = { horizontal: "left" };
  providers.forEach((p, i) => {
    const cell = (monthRow && (monthRow.providers[p.id] || monthRow.providers[String(p.id)])) || { kg: 0, importe: 0, costo_kg: null };
    writeTriple(r, 2 + i * 3, cell, TOTAL, false);
  });
  writeTriple(r, consStart, (monthRow && monthRow.consolidado) || { kg: 0, importe: 0, costo_kg: null }, TOTAL, false);

  void colLetter;
  return wb;
}

module.exports = { buildComprasWorkbook, MESES };
