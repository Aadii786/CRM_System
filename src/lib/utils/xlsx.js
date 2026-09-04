import * as XLSX from "xlsx";

/**
 * Parses an .xlsx/.xls workbook's first sheet into the same {headers, rows}
 * shape parseCsv() returns, so ImportWizard can treat both formats
 * identically after this point. Client-side only (SheetJS reads an
 * ArrayBuffer, no upload needed before we can see the data).
 */
export function parseXlsx(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[firstSheetName];
  // header:1 -> array-of-arrays (not object-per-row), so column order is
  // exactly the sheet's own left-to-right order, matching parseCsv().
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" });

  const nonEmpty = grid
    .map((row) => row.map((cell) => (cell == null ? "" : String(cell))))
    .filter((row) => row.some((cell) => cell.trim() !== ""));
  const [headers, ...rows] = nonEmpty;
  return { headers: headers || [], rows };
}
