// Plain JS/ESM, no server-only imports and no DOM APIs - this module (and
// the rest of src/lib/emailDesign) is shared verbatim between the client
// (live canvas editing + preview) and the server (canonical HTML snapshot
// generated on save), so both sides render an element identically.

export const ELEMENT_TYPES = ["text", "image", "button", "divider", "spacer"];

export const CANVAS_WIDTH = 640;

let counter = 0;
/** Client-only id generator (crypto.randomUUID isn't available in every environment this runs in during SSR-less client code, so keep it simple and monotonic). */
export function nextElementId() {
  counter += 1;
  return `el_${Date.now().toString(36)}_${counter}`;
}

const DEFAULTS = {
  text: {
    width: 560,
    height: 80,
    props: { content: "Write something here...", fontSize: 16, color: "#1f2937", align: "left", bold: false },
  },
  image: {
    width: 300,
    height: 180,
    props: { src: "", alt: "Image", align: "left" },
  },
  button: {
    width: 180,
    height: 44,
    props: { label: "Click Here", href: "https://university.edu.pk", bgColor: "#4f46e5", textColor: "#ffffff", align: "left" },
  },
  divider: {
    width: 560,
    height: 8,
    props: { color: "#e5e7eb" },
  },
  spacer: {
    width: 560,
    height: 32,
    props: {},
  },
};

/** Builds a new element of `type` positioned so its top-left corner is (x, y). */
export function createElement(type, x = 20, y = 20) {
  const def = DEFAULTS[type];
  if (!def) throw new Error(`Unknown email builder element type: ${type}`);
  return {
    id: nextElementId(),
    type,
    x: Math.max(0, Math.round(x)),
    y: Math.max(0, Math.round(y)),
    width: def.width,
    height: def.height,
    props: { ...def.props },
  };
}

export const ELEMENT_LABELS = {
  text: "Text",
  image: "Image",
  button: "Button",
  divider: "Divider",
  spacer: "Spacer",
};
