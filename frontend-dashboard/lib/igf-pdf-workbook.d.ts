import type ExcelJS from "exceljs";
export type DailyWorkbookData = { sheet: string; year: number; month: number; rows: Array<Array<string | number | null>> };
export function extractDailyWorkbook(workbook: ExcelJS.Workbook, options: { year: number; month: number }): DailyWorkbookData;
