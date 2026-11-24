import "server-only";
import * as XLSX from "xlsx";

/**
 * Turns a report from reportService into an Excel file or a PDF file (MIR-3.8). Both are written here
 * without any extra package: Excel through the "xlsx" package the CRM already uses for imports, and PDF
 * with a small writer (A4 landscape, Helvetica, table with repeated header and page numbers).
 */

const fmtNumber = (v) => (v === null || v === undefined || v === "" ? "" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 }));
const fmtDecimal = (v) => (v === null || v === undefined || v === "" ? "" : Number(v).toFixed(2));
const fmtPercent = (v) => (v === null || v === undefined || v === "" ? "" : `${Number(v).toFixed(1)}%`);

function label(c) { return c.type === "currency" ? `${c.label} (PKR)` : c.label; }

/** The text of one cell as shown in the PDF (and used for column widths). */
export function cellText(c, v) {
  if (v === null || v === undefined) return "";
  if (c.type === "currency" || c.type === "number") return fmtNumber(v);
  if (c.type === "decimal") return fmtDecimal(v);
  if (c.type === "percent") return fmtPercent(v);
  return String(v);
}

export function reportFileName(report, ext) {
  const slug = report.key.replace(/[^a-z0-9-]/gi, "-");
  return `IKL-${slug}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

// ---------------------------------------------------------------- Excel
export function toXlsx(report) {
  const aoa = [];
  aoa.push([report.title]);
  aoa.push([`Period: ${report.period}`, `Department: ${report.department}`, `Created: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`]);
  aoa.push([]);
  const headerRow = aoa.length;
  aoa.push(report.columns.map(label));
  for (const r of report.rows) aoa.push(report.columns.map((c) => (r[c.key] === undefined ? null : r[c.key])));
  if (report.totals) aoa.push(report.columns.map((c, i) => (i === 0 ? "Total" : report.totals[c.key] === undefined ? null : report.totals[c.key])));
  if (report.summary?.length) { aoa.push([]); for (const s of report.summary) aoa.push([s.label, s.value]); }
  if (report.notes?.length) { aoa.push([]); for (const n of report.notes) aoa.push([n]); }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = report.columns.map((c) => {
    const longest = Math.max(label(c).length, ...report.rows.slice(0, 300).map((r) => cellText(c, r[c.key]).length), 6);
    return { wch: Math.min(48, longest + 2) };
  });
  const z = { currency: "#,##0", number: "#,##0", decimal: "0.00", percent: '0.0"%"' };
  const first = headerRow + 1;
  const last = first + report.rows.length + (report.totals ? 1 : 0);
  for (let r = first; r < last; r++) {
    report.columns.forEach((c, ci) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c: ci })];
      if (cell && typeof cell.v === "number" && z[c.type]) cell.z = z[c.type];
    });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, report.title.slice(0, 31).replace(/[\\/?*[\]:]/g, " "));
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

// ---------------------------------------------------------------- PDF
// Helvetica character widths (1/1000 em) for ASCII 32..126.
const W = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];

const REPLACE = { "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "...", "•": "-", " ": " ", "→": "->" };
function clean(s) {
  return String(s ?? "").replace(/[‘’“”–—…• →]/g, (m) => REPLACE[m]).replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7e\xa1-\xff]/g, "?");
}
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const cw = (ch, bold) => ((ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126 ? W[ch.charCodeAt(0) - 32] : 556) * (bold ? 1.07 : 1));
function width(s, size, bold) { let w = 0; for (const ch of s) w += cw(ch, bold); return (w * size) / 1000; }

function wrap(text, maxW, size, bold) {
  const words = clean(text).split(" ").filter(Boolean);
  const lines = []; let line = "";
  const pushLong = (word) => { // a word wider than the column is cut by character
    let part = "";
    for (const ch of word) { if (width(part + ch, size, bold) > maxW && part) { lines.push(part); part = ""; } part += ch; }
    return part;
  };
  for (const word of words) {
    if (width(word, size, bold) > maxW) { if (line) { lines.push(line); line = ""; } line = pushLong(word); continue; }
    const next = line ? `${line} ${word}` : word;
    if (width(next, size, bold) <= maxW) line = next; else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export function toPdf(report) {
  const PW = 842, PH = 595, M = 28, FS = 7.5, HS = 7.5, LH = 9.5, PAD = 3;
  const avail = PW - 2 * M;
  const cols = report.columns;
  const rowsAll = report.totals ? [...report.rows, { __total: true }] : report.rows;
  const text = (c, r) => (r.__total ? (c === cols[0] ? "Total" : report.totals[c.key] === undefined ? "" : cellText(c, report.totals[c.key])) : cellText(c, r[c.key]));

  // column widths: wide enough for the header words and most of the content, then scaled to the page
  const want = cols.map((c) => {
    const headerWord = Math.max(...clean(label(c)).split(" ").map((w) => width(w, HS, true)), 0);
    const content = Math.max(...rowsAll.slice(0, 200).map((r) => width(clean(text(c, r)), FS, false)), 0);
    return Math.max(headerWord + 2 * PAD + 2, Math.min(content, c.type === "text" ? 150 : 90) + 2 * PAD + 2, 30);
  });
  const total = want.reduce((a, b) => a + b, 0);
  const widths = total > avail ? want.map((w) => Math.max(26, (w * avail) / total)) : want.map((w) => w + (avail - total) / cols.length);

  const pages = [];
  let ops = [], y = 0;
  const newPage = () => { ops = []; pages.push(ops); y = PH - M; };
  const t = (s, x, yy, size, bold, rgb = "0.1 0.13 0.2") => ops.push(`BT ${rgb} rg /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td (${esc(clean(s))}) Tj ET`);
  const rect = (x, yy, w, h, rgb) => ops.push(`${rgb} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  const line = (x1, y1, x2, y2) => ops.push(`0.82 0.85 0.9 RG 0.4 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);

  const drawHeader = () => {
    const lines = cols.map((c, i) => wrap(label(c), widths[i] - 2 * PAD, HS, true));
    const h = Math.max(...lines.map((l) => l.length)) * LH + 2 * PAD;
    rect(M, y - h, avail, h, "0.12 0.16 0.27");
    let x = M;
    cols.forEach((c, i) => {
      lines[i].forEach((l, k) => {
        const tw = width(l, HS, true);
        const tx = c.type === "text" || c.type === "date" ? x + PAD : x + widths[i] - PAD - tw;
        t(l, tx, y - PAD - HS - k * LH + 1, HS, true, "1 1 1");
      });
      x += widths[i];
    });
    y -= h;
  };

  newPage();
  t(report.title, M, y - 14, 15, true, "0.12 0.16 0.27"); y -= 22;
  t(`Period: ${report.period}    Department: ${report.department || "-"}    Created: ${new Date().toISOString().slice(0, 10)}`, M, y - 8, 8.5, false, "0.4 0.43 0.5"); y -= 16;
  for (const s of report.summary || []) { t(`${s.label}: ${s.type === "currency" ? "PKR " : ""}${fmtNumber(s.value)}`, M, y - 9, 9, true); y -= 13; }
  y -= 4;
  drawHeader();

  rowsAll.forEach((r, ri) => {
    const cells = cols.map((c, i) => wrap(text(c, r), widths[i] - 2 * PAD, FS, Boolean(r.__total)));
    const h = Math.max(...cells.map((l) => l.length)) * LH + 2 * PAD;
    if (y - h < M + 14) { newPage(); drawHeader(); }
    if (r.__total) rect(M, y - h, avail, h, "0.92 0.94 0.97"); else if (ri % 2) rect(M, y - h, avail, h, "0.97 0.98 0.99");
    let x = M;
    cols.forEach((c, i) => {
      cells[i].forEach((l, k) => {
        const tw = width(l, FS, Boolean(r.__total));
        const tx = c.type === "text" || c.type === "date" ? x + PAD : x + widths[i] - PAD - tw;
        t(l, tx, y - PAD - FS - k * LH + 1, FS, Boolean(r.__total));
      });
      x += widths[i];
    });
    line(M, y - h, M + avail, y - h);
    y -= h;
  });
  if (!report.rows.length) { t("No records for this period.", M, y - 14, 9, false, "0.4 0.43 0.5"); y -= 24; }

  y -= 8;
  for (const n of report.notes || []) {
    for (const l of wrap(n, avail, 7.5, false)) { if (y - LH < M + 14) { newPage(); } t(l, M, y - 8, 7.5, false, "0.4 0.43 0.5"); y -= LH; }
  }
  pages.forEach((p, i) => { ops = p; t(`IKL CRM  |  ${report.title}  |  Page ${i + 1} of ${pages.length}`, M, 16, 7, false, "0.5 0.53 0.6"); });

  // ---- assemble the file
  const objs = [];
  const add = (body) => { objs.push(body); return objs.length; };
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("PAGES");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const kids = [];
  for (const p of pages) {
    const stream = Buffer.from(p.join("\n"), "latin1");
    const contentId = add({ stream });
    const pageId = add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    kids.push(`${pageId} 0 R`);
  }
  objs[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${kids.length} >>`;

  const chunks = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  const offsets = [];
  let pos = chunks[0].length;
  objs.forEach((o, i) => {
    offsets.push(pos);
    const head = Buffer.from(`${i + 1} 0 obj\n`, "latin1");
    const body = typeof o === "string" ? Buffer.from(`${o}\n`, "latin1") : Buffer.concat([Buffer.from(`<< /Length ${o.stream.length} >>\nstream\n`, "latin1"), o.stream, Buffer.from("\nendstream\n", "latin1")]);
    const tail = Buffer.from("endobj\n", "latin1");
    chunks.push(head, body, tail);
    pos += head.length + body.length + tail.length;
  });
  const xref = [`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
  chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`, "latin1"));
  return Buffer.concat(chunks);
}
