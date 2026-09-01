import { CANVAS_WIDTH } from "./elements";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replace(/\n/g, " ");
}

function renderElementHtml(el) {
  const { type, x, y, width, height, props } = el;
  const box = `position:absolute;left:${x}px;top:${y}px;width:${width}px;${height ? `min-height:${height}px;` : ""}`;

  if (type === "text") {
    const lines = escapeHtml(props.content || "").split("\n").join("<br/>");
    return `<div style="${box}font-size:${props.fontSize || 16}px;color:${props.color || "#1f2937"};text-align:${props.align || "left"};font-weight:${props.bold ? "700" : "400"};font-family:Arial,Helvetica,sans-serif;line-height:1.5;">${lines}</div>`;
  }
  if (type === "image") {
    const src = props.src || "https://placehold.co/600x300?text=Image";
    return `<div style="${box}text-align:${props.align || "left"};"><img src="${escapeAttr(src)}" alt="${escapeAttr(props.alt || "")}" style="max-width:100%;height:auto;display:inline-block;border-radius:6px;"/></div>`;
  }
  if (type === "button") {
    return `<div style="${box}text-align:${props.align || "left"};"><a href="${escapeAttr(props.href || "#")}" style="display:inline-block;padding:12px 22px;background:${props.bgColor || "#4f46e5"};color:${props.textColor || "#ffffff"};text-decoration:none;border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;">${escapeHtml(props.label || "Click Here")}</a></div>`;
  }
  if (type === "divider") {
    return `<div style="${box}"><hr style="border:none;border-top:${Math.max(1, Math.round((height || 8) / 4))}px solid ${props.color || "#e5e7eb"};margin:0;"/></div>`;
  }
  if (type === "spacer") {
    return `<div style="${box}"></div>`;
  }
  return "";
}

/**
 * Renders the builder's element tree to a self-contained HTML string used
 * for the stored campaign body, the in-app preview and the simulated-send
 * detail view. DEMO-SCOPE NOTE: elements are absolutely positioned, which
 * matches what the canvas editor shows but is not something real-world
 * email clients (Outlook, Gmail, etc.) render reliably - a production
 * integration would need a table-based re-layout export instead. Since this
 * platform only ever simulates sends, absolute positioning keeps the
 * editor's WYSIWYG canvas and the stored/preview HTML pixel-identical.
 */
export function renderEmailDesignToHtml(elements = [], { subject = "" } = {}) {
  if (!elements.length) {
    return `<h1>${escapeHtml(subject)}</h1><p>(empty email)</p>`;
  }
  const maxY = Math.max(...elements.map((el) => el.y + (el.height || 0)));
  const canvasHeight = Math.max(200, maxY + 40);
  const body = elements.map(renderElementHtml).join("\n");
  return `<div style="position:relative;width:${CANVAS_WIDTH}px;min-height:${canvasHeight}px;margin:0 auto;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">\n${body}\n</div>`;
}
