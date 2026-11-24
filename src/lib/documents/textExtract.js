import "server-only";
import zlib from "zlib";
import * as XLSX from "xlsx";

/**
 * Reads the text out of an uploaded file so documents can be searched by what they say (CRM-5.5).
 * Written without extra packages: Word / PowerPoint are zip files of XML, Excel goes through the "xlsx"
 * package the CRM already has, and PDF text is read straight from the file (fonts with a ToUnicode map
 * included). Scanned images and PDFs that are only pictures have no text; they are marked "empty"
 * because reading pictures (OCR) is not part of the project.
 */

const MAX_TEXT = 400000; // characters kept per document
const MAX_UNZIPPED = 40 * 1024 * 1024;

// ---------------------------------------------------------------- helpers
function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&");
}
function tidy(text) {
  return String(text || "").replace(/\u0000/g, "").replace(/[ \t ]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_TEXT);
}

// ---------------------------------------------------------------- zip (docx, pptx)
function unzip(buf) {
  const files = new Map();
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) { if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) throw new Error("Not a zip file");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  let total = 0;
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), comp = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (!/^(word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml|ppt\/(slides\/slide\d+|notesSlides\/notesSlide\d+)\.xml)$/.test(name)) continue;
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataStart, dataStart + comp);
    const data = method === 0 ? raw : method === 8 ? zlib.inflateRawSync(raw, { maxOutputLength: MAX_UNZIPPED }) : null;
    if (!data) continue;
    total += data.length;
    if (total > MAX_UNZIPPED) throw new Error("File is too large to read");
    files.set(name, data.toString("utf8"));
  }
  return files;
}

function xmlText(xml, paragraphTag) {
  return decodeEntities(
    xml.replace(new RegExp(`</${paragraphTag}>`, "g"), "\n").replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>|<a:br\/>/g, "\n").replace(/<[^>]+>/g, "")
  );
}

function docxText(buf) {
  const files = unzip(buf);
  const names = [...files.keys()].sort((a, b) => (a === "word/document.xml" ? -1 : b === "word/document.xml" ? 1 : a.localeCompare(b)));
  return names.map((n) => xmlText(files.get(n), "w:p")).join("\n");
}
function pptxText(buf) {
  const files = unzip(buf);
  const names = [...files.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return names.map((n) => xmlText(files.get(n), "a:p")).join("\n");
}

// ---------------------------------------------------------------- Excel, CSV, text
function excelText(buf) {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  const parts = [];
  for (const name of wb.SheetNames.slice(0, 30)) {
    parts.push(name, XLSX.utils.sheet_to_csv(wb.Sheets[name], { FS: " | ", blankrows: false }));
    if (parts.join("\n").length > MAX_TEXT) break;
  }
  return parts.join("\n");
}

// Old binary .doc / .ppt: no clean parser, so read the readable runs (best effort).
function binaryRuns(buf) {
  const out = [];
  const ascii = buf.toString("latin1").match(/[\x20-\x7e\xa0-\xff]{6,}/g) || [];
  out.push(...ascii.filter((r) => /[a-z]{3}/i.test(r)));
  const u16 = buf.toString("utf16le").match(/[\x20-\x7e -ɏ؀-ۿ]{6,}/g) || [];
  out.push(...u16.filter((r) => /[\p{L}]{3}/u.test(r)));
  return [...new Set(out)].join("\n");
}

// ---------------------------------------------------------------- PDF
function parseValue(s, i) {
  const ws = /[\s\0]*/y;
  const skip = () => { for (;;) { ws.lastIndex = i; ws.exec(s); i = ws.lastIndex; if (s[i] === "%") { while (i < s.length && s[i] !== "\n" && s[i] !== "\r") i++; } else break; } };
  skip();
  if (s.startsWith("<<", i)) {
    i += 2; const d = {};
    for (;;) {
      skip();
      if (i >= s.length) break;
      if (s.startsWith(">>", i)) { i += 2; break; }
      if (s[i] !== "/") { i++; continue; }
      const m = /\/([^\s/<>[\]()%]*)/y; m.lastIndex = i; const km = m.exec(s); if (!km) { i++; continue; }
      i = m.lastIndex;
      const [v, ni] = parseValue(s, i); d[km[1]] = v; i = ni;
    }
    return [d, i];
  }
  if (s[i] === "[") {
    i++; const a = [];
    for (;;) { skip(); if (i >= s.length) break; if (s[i] === "]") { i++; break; } const [v, ni] = parseValue(s, i); if (ni === i) { i++; continue; } a.push(v); i = ni; }
    return [a, i];
  }
  if (s[i] === "/") { const m = /\/([^\s/<>[\]()%]*)/y; m.lastIndex = i; const r = m.exec(s); i = m.lastIndex; return [{ name: r ? r[1] : "" }, i]; }
  if (s[i] === "(") { let depth = 0, j = i; for (; j < s.length; j++) { if (s[j] === "\\") { j++; continue; } if (s[j] === "(") depth++; else if (s[j] === ")") { depth--; if (depth === 0) break; } } return [{ str: s.slice(i, j + 1) }, j + 1]; }
  if (s[i] === "<") { const j = s.indexOf(">", i); return [{ hex: s.slice(i + 1, j) }, j + 1]; }
  const ref = /(\d+)\s+(\d+)\s+R(?![A-Za-z])/y; ref.lastIndex = i; const rm = ref.exec(s);
  if (rm) return [{ ref: Number(rm[1]) }, ref.lastIndex];
  const num = /[+-]?(\d+\.?\d*|\.\d+)/y; num.lastIndex = i; const nm = num.exec(s);
  if (nm) return [Number(nm[0]), num.lastIndex];
  const kw = /[A-Za-z]+/y; kw.lastIndex = i; const km2 = kw.exec(s);
  if (km2) return [km2[0], kw.lastIndex];
  return [null, i + 1];
}

function inflate(buf) {
  try { return zlib.inflateSync(buf, { finishFlush: zlib.constants.Z_SYNC_FLUSH, maxOutputLength: MAX_UNZIPPED }); }
  catch { try { return zlib.inflateRawSync(buf, { finishFlush: zlib.constants.Z_SYNC_FLUSH, maxOutputLength: MAX_UNZIPPED }); } catch { return null; } }
}

function readPdfObjects(buf) {
  const src = buf.toString("latin1");
  const objs = new Map(); // id -> { dict, text, data }
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;
  while ((m = re.exec(src))) {
    const id = Number(m[1]), start = re.lastIndex;
    const end = src.indexOf("endobj", start);
    const sIdx = src.indexOf("stream", start);
    let dict, data = null;
    if (sIdx !== -1 && (end === -1 || sIdx < end) && !/endstream/.test(src.slice(start, sIdx))) {
      dict = parseValue(src, start)[0];
      let ds = sIdx + 6; if (src[ds] === "\r") ds++; if (src[ds] === "\n") ds++;
      let de = -1;
      const len = dict && typeof dict === "object" && typeof dict.Length === "number" ? dict.Length : null;
      if (len !== null && src.startsWith("endstream", ds + len) || (len !== null && /^\s*endstream/.test(src.slice(ds + len, ds + len + 12)))) de = ds + len;
      if (de < 0) de = src.indexOf("endstream", ds);
      if (de < 0) de = end;
      let raw = buf.subarray(ds, de);
      const filter = dict?.Filter;
      const filters = (Array.isArray(filter) ? filter : filter ? [filter] : []).map((f) => f?.name);
      if (filters.length === 0) data = raw;
      else if (filters.length === 1 && filters[0] === "FlateDecode") data = inflate(raw);
      else if (filters[0] === "FlateDecode" && filters.length > 1) data = null; // chained filters: skip
      objs.set(id, { dict, data, body: "" });
      if (end !== -1) re.lastIndex = Math.max(re.lastIndex, de);
    } else {
      const body = src.slice(start, end === -1 ? undefined : end);
      objs.set(id, { dict: parseValue(body, 0)[0], data: null, body });
    }
  }
  // objects packed inside object streams
  for (const [, o] of [...objs.entries()]) {
    if (o.dict && o.dict.Type?.name === "ObjStm" && o.data) {
      const text = o.data.toString("latin1");
      const n = o.dict.N, first = o.dict.First;
      const head = text.slice(0, first).trim().split(/\s+/).map(Number);
      for (let k = 0; k < n; k++) {
        const oid = head[2 * k], off = head[2 * k + 1];
        const next = k + 1 < n ? head[2 * k + 3] : text.length - first;
        const body = text.slice(first + off, first + next);
        if (!objs.has(oid)) objs.set(oid, { dict: parseValue(body, 0)[0], data: null, body });
      }
    }
  }
  return objs;
}

function parseCMap(text) {
  const map = new Map();
  let bytes = 2;
  const cs = /begincodespacerange\s*<([0-9a-fA-F]+)>/.exec(text);
  if (cs) bytes = Math.max(1, Math.round(cs[1].length / 2));
  const u16 = (hex) => { let out = ""; for (let i = 0; i + 3 < hex.length + 1; i += 4) out += String.fromCharCode(parseInt(hex.slice(i, i + 4).padEnd(4, "0"), 16)); return out; };
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const e of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) map.set(parseInt(e[1], 16), u16(e[2]));
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const e of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(\[[^\]]*\]|<[0-9a-fA-F]*>)/g)) {
      const lo = parseInt(e[1], 16), hi = Math.min(parseInt(e[2], 16), lo + 65535);
      if (e[3].startsWith("[")) { const items = [...e[3].matchAll(/<([0-9a-fA-F]*)>/g)].map((x) => u16(x[1])); items.forEach((t, k) => { if (lo + k <= hi) map.set(lo + k, t); }); }
      else { const base = e[3].slice(1, -1); const first = u16(base); for (let c = lo; c <= hi; c++) { const cps = first.slice(0, -1) + String.fromCharCode(first.charCodeAt(first.length - 1) + (c - lo)); map.set(c, cps); } }
    }
  }
  return { map, bytes };
}

function literalBytes(str) { // "(...)" with escapes -> bytes
  const out = []; const s = str.slice(1, -1);
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c !== "\\") { out.push(s.charCodeAt(i) & 255); continue; }
    const n = s[++i];
    if (n === "n") out.push(10); else if (n === "r") out.push(13); else if (n === "t") out.push(9); else if (n === "b") out.push(8); else if (n === "f") out.push(12);
    else if (n === "\r" || n === "\n") { if (n === "\r" && s[i + 1] === "\n") i++; }
    else if (/[0-7]/.test(n)) { let o = n; while (o.length < 3 && /[0-7]/.test(s[i + 1] || "")) o += s[++i]; out.push(parseInt(o, 8) & 255); }
    else out.push(n.charCodeAt(0) & 255);
  }
  return Buffer.from(out);
}
function hexBytes(hex) { const h = hex.replace(/\s+/g, ""); return Buffer.from(h.length % 2 ? h + "0" : h, "hex"); }

function decodeShown(bytes, font) {
  if (font?.cmap) {
    const { map, bytes: w } = font.cmap; let out = "";
    for (let i = 0; i + w <= bytes.length; i += w) { let code = 0; for (let k = 0; k < w; k++) code = (code << 8) | bytes[i + k]; const t = map.get(code); if (t !== undefined) out += t; else if (w === 1 && code >= 32) out += String.fromCharCode(code); }
    return out;
  }
  if (font?.type0) return ""; // composite font with no map: cannot be read
  return bytes.toString("latin1");
}

function contentText(content, fonts) {
  let out = "", font = null, lastY = null;
  const stack = [];
  const re = /\s*(\((?:\\[\s\S]|[^\\()]|\((?:\\[\s\S]|[^\\()])*\))*\)|<[0-9a-fA-F\s]*>|\[|\]|\/[^\s/<>[\]()%]*|[+-]?(?:\d+\.?\d*|\.\d+)|[A-Za-z'"*]+)/y;
  const space = () => { if (out && !/\s$/.test(out)) out += " "; };
  const nl = () => { if (out && !out.endsWith("\n")) out += "\n"; };
  let arr = null;
  let i = 0;
  while (i < content.length) {
    re.lastIndex = i;
    const m = re.exec(content);
    if (!m) { i++; continue; }
    i = re.lastIndex;
    const t = m[1];
    if (t === "[") { arr = []; continue; }
    if (t === "]") { if (arr) { stack.push(arr); arr = null; } continue; }
    let val;
    if (t[0] === "(") val = { bytes: literalBytes(t) };
    else if (t[0] === "<") val = { bytes: hexBytes(t.slice(1, -1)) };
    else if (t[0] === "/") val = { name: t.slice(1) };
    else if (/^[+-]?[\d.]/.test(t)) val = Number(t);
    else val = { op: t };
    if (!(val && val.op)) { (arr || stack).push(val); continue; }
    const op = val.op;
    if (op === "BI") { const e = content.indexOf("EI", i); i = e < 0 ? content.length : e + 2; stack.length = 0; continue; }
    if (op === "Tf") { const nm = stack[stack.length - 2]; font = fonts[nm?.name] || null; }
    else if (op === "Tj") { const s = stack[stack.length - 1]; if (s?.bytes) out += decodeShown(s.bytes, font); }
    else if (op === "'" || op === '"') { nl(); const s = stack[stack.length - 1]; if (s?.bytes) out += decodeShown(s.bytes, font); }
    else if (op === "TJ") { const a = stack[stack.length - 1]; if (Array.isArray(a)) for (const el of a) { if (el?.bytes) out += decodeShown(el.bytes, font); else if (typeof el === "number" && el < -250) space(); } }
    else if (op === "Td" || op === "TD") { const ty = stack[stack.length - 1]; if (typeof ty === "number" && Math.abs(ty) > 0.5) nl(); else space(); }
    else if (op === "T*") nl();
    else if (op === "Tm") { const y = stack[stack.length - 1]; if (lastY !== null && typeof y === "number" && Math.abs(y - lastY) > 1) nl(); else space(); if (typeof y === "number") lastY = y; }
    else if (op === "ET") nl();
    stack.length = 0;
  }
  return out;
}

function pdfText(buf) {
  const objs = readPdfObjects(buf);
  const get = (v) => (v && typeof v === "object" && "ref" in v ? objs.get(v.ref) : null);
  const dictOf = (v) => (v && typeof v === "object" && "ref" in v ? objs.get(v.ref)?.dict : v);
  const fontCache = new Map();
  const loadFont = (ref) => {
    if (fontCache.has(ref)) return fontCache.get(ref);
    const f = objs.get(ref)?.dict; let font = null;
    if (f && typeof f === "object") {
      font = { type0: f.Subtype?.name === "Type0" };
      const tu = f.ToUnicode; const so = tu && get(tu);
      if (so?.data) font.cmap = parseCMap(so.data.toString("latin1"));
    }
    fontCache.set(ref, font); return font;
  };
  // pages in reading order: walk the page tree from the catalog, else by object number
  const pageIds = [];
  const walk = (id, seen = new Set()) => {
    if (seen.has(id)) return; seen.add(id);
    const d = objs.get(id)?.dict; if (!d || typeof d !== "object") return;
    if (d.Type?.name === "Pages" && Array.isArray(d.Kids)) d.Kids.forEach((k) => k?.ref && walk(k.ref, seen));
    else if (d.Type?.name === "Page") pageIds.push(id);
  };
  const rootRef = /\/Root\s+(\d+)\s+\d+\s+R/.exec(buf.toString("latin1").slice(-4096)) || (() => { for (const [, o] of objs) if (o.dict?.Type?.name === "XRef" && o.dict.Root?.ref) return [null, o.dict.Root.ref]; return null; })();
  const catalog = rootRef && objs.get(Number(rootRef[1]))?.dict;
  if (catalog?.Pages?.ref) walk(catalog.Pages.ref);
  if (!pageIds.length) for (const [id, o] of objs) if (o.dict?.Type?.name === "Page") pageIds.push(id);

  const resourcesOf = (d, depth = 0) => {
    if (!d || depth > 20) return null;
    if (d.Resources) return dictOf(d.Resources);
    const parent = d.Parent && dictOf(d.Parent);
    return parent ? resourcesOf(parent, depth + 1) : null;
  };
  const pages = [];
  for (const id of pageIds) {
    const d = objs.get(id).dict;
    const res = resourcesOf(d) || {};
    const fontDict = dictOf(res.Font) || {};
    const fonts = {};
    for (const [name, v] of Object.entries(fontDict)) if (v?.ref) fonts[name] = loadFont(v.ref);
    const contents = Array.isArray(d.Contents) ? d.Contents : d.Contents ? [d.Contents] : [];
    const streams = contents.map((c) => get(c)?.data).filter(Boolean).map((b) => b.toString("latin1"));
    if (streams.length) pages.push(contentText(streams.join("\n"), fonts));
  }
  return pages.join("\n\n");
}

// ---------------------------------------------------------------- entry point
/** Returns { text, status } where status is "indexed", "empty", "unsupported" or "failed". */
export function extractText(buffer, filename) {
  const ext = (String(filename).split(".").pop() || "").toLowerCase();
  try {
    let text = "";
    if (["txt", "csv"].includes(ext)) text = buffer.toString("utf8");
    else if (["xlsx", "xls"].includes(ext)) text = excelText(buffer);
    else if (ext === "docx") text = docxText(buffer);
    else if (ext === "pptx") text = pptxText(buffer);
    else if (ext === "pdf") text = pdfText(buffer);
    else if (["doc", "ppt"].includes(ext)) text = binaryRuns(buffer);
    else return { text: "", status: "unsupported" };
    text = tidy(text);
    return { text, status: text.length >= 3 ? "indexed" : "empty" };
  } catch (err) {
    console.error("[documents] could not read text from", filename, err.message);
    return { text: "", status: "failed" };
  }
}
