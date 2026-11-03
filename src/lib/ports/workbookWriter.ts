export type WorkbookCellValue = string | number;

export type WorkbookSheet = { sheetName: string; rows: WorkbookCellValue[][] };

export type WorkbookWriter = (sheets: WorkbookSheet[]) => ArrayBuffer;
