"use strict";
const ExcelJS = require("exceljs");
const [a, b] = process.argv.slice(2);
const val = (c) => {
  const v = c.value;
  if (v && typeof v === "object") {
    if (v.formula) return "=" + v.formula;
    if (v.richText) return v.richText.map((t) => t.text).join("");
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (v.text) return v.text;
    return JSON.stringify(v);
  }
  return v == null ? "" : String(v);
};
(async () => {
  const A = new ExcelJS.Workbook(), B = new ExcelJS.Workbook();
  await A.xlsx.readFile(a); await B.xlsx.readFile(b);
  console.log("sheets A:", A.worksheets.map((w) => w.name).join(" | "));
  console.log("sheets B:", B.worksheets.map((w) => w.name).join(" | "));
  let total = 0;
  for (const wa of A.worksheets) {
    const wb = B.getWorksheet(wa.name);
    if (!wb) { console.log("missing in B:", wa.name); continue; }
    const rows = Math.max(wa.rowCount, wb.rowCount), cols = Math.max(wa.columnCount, wb.columnCount);
    let n = 0;
    for (let r = 1; r <= rows; r++) for (let c = 1; c <= cols; c++) {
      const x = val(wa.getCell(r, c)), y = val(wb.getCell(r, c));
      if (x !== y && !(x.startsWith("=") && y.startsWith("="))) {
        n++; total++;
        if (n <= 12) console.log(`  ${wa.name}!R${r}C${c}: A="${x.slice(0, 70)}"  B="${y.slice(0, 70)}"`);
      }
    }
    console.log(wa.name, "differences:", n);
  }
  console.log("TOTAL differences:", total);
})();
