import ExcelJS from "exceljs";

/** Coloca una hoja al inicio del libro (orderNo = 1). */
export function moveWorksheetFirst(wb: ExcelJS.Workbook, sheetName: string): void {
  const ws = wb.getWorksheet(sheetName);
  if (!ws) return;
  type SheetOrder = ExcelJS.Worksheet & { orderNo?: number };
  (ws as SheetOrder).orderNo = 1;
  let order = 2;
  for (const sheet of wb.worksheets) {
    if (sheet.id === ws.id) continue;
    (sheet as SheetOrder).orderNo = order++;
  }
}

/**
 * Añade al final la primera hoja de un .xlsx (p. ej. EVIDENCIAS del Action Register),
 * copiando celdas e imágenes embebidas.
 */
export async function appendWorkbookSheetFromBuffer(
  targetWb: ExcelJS.Workbook,
  sourceBuffer: ArrayBuffer,
  desiredName: string
): Promise<void> {
  const srcWb = new ExcelJS.Workbook();
  await srcWb.xlsx.load(sourceBuffer);
  const srcSheet = srcWb.worksheets[0];
  if (!srcSheet) return;

  const existing = targetWb.getWorksheet(desiredName);
  if (existing) targetWb.removeWorksheet(existing.id);

  const destSheet = targetWb.addWorksheet(desiredName);

  if (srcSheet.columns) {
    srcSheet.columns.forEach((col, i) => {
      if (col?.width) destSheet.getColumn(i + 1).width = col.width;
    });
  }

  srcSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const destRow = destSheet.getRow(rowNumber);
    destRow.height = row.height;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const destCell = destRow.getCell(colNumber);
      destCell.value = cell.value;
      if (cell.style) destCell.style = JSON.parse(JSON.stringify(cell.style)) as ExcelJS.Style;
    });
  });

  if (srcSheet.views) {
    destSheet.views = JSON.parse(JSON.stringify(srcSheet.views)) as ExcelJS.WorksheetView[];
  }

  const images = srcSheet.getImages();
  for (const img of images) {
    const imageIdNum = typeof img.imageId === "string" ? parseInt(img.imageId, 10) : Number(img.imageId);
    if (!Number.isFinite(imageIdNum)) continue;
    const srcImg = srcWb.getImage(imageIdNum);
    if (!srcImg?.buffer) continue;
    const newId = targetWb.addImage({
      buffer: srcImg.buffer,
      extension: srcImg.extension,
    });
    destSheet.addImage(newId, img.range);
  }
}
