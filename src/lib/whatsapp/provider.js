import "server-only";

/**
 * WhatsApp provider layer (same idea as lib/email/provider.js). The CRM never calls a WhatsApp
 * API directly: it asks a *driver* to send one message and gets a result back.
 *
 *  - "simulated" (default): nothing leaves the system; the message is stored as sent/delivered.
 *  - "http": a generic adapter for the third-party WhatsApp API the IT department provides.
 *            Configure WHATSAPP_API_URL (+ WHATSAPP_API_TOKEN). It POSTs JSON
 *            { to, text, template, language, variables, metadata } with "Authorization: Bearer <token>"
 *            and reads the message id from the response (WHATSAPP_RESPONSE_ID_FIELD, default "id").
 *            When IT hands over the real API, only this driver (request shape) needs adjusting.
 *
 * Inbound messages and delivery receipts arrive at /api/whatsapp/webhook in the normalized format
 * described there.
 *
 * driver.send(message) -> { ok, providerMessageId?, status?, error? }
 * message = { to (digits, country code first), text, template?, language?, variables?, metadata }
 */

export class WhatsAppNotConfiguredError extends Error {
  constructor(name, hint) {
    super(`The WhatsApp provider "${name}" is not set up yet. ${hint}`);
    this.name = "WhatsAppNotConfiguredError";
  }
}

const simulated = {
  name: "simulated",
  simulated: true,
  async send(message) {
    return { ok: true, status: "delivered", providerMessageId: `wa-sim-${message.metadata?.contactId || "x"}-${Date.now().toString(36)}` };
  },
};

function pick(obj, path) {
  return String(path || "id").split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

const http = {
  name: "http",
  simulated: false,
  async send(message) {
    const url = process.env.WHATSAPP_API_URL;
    if (!url) throw new WhatsAppNotConfiguredError("http", "Set WHATSAPP_API_URL (and WHATSAPP_API_TOKEN) to the API the IT department provides.");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.WHATSAPP_API_TOKEN ? { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}` } : {}) },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(15000),
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) return { ok: false, error: `The WhatsApp API answered ${res.status}${body?.error ? `: ${typeof body.error === "string" ? body.error : JSON.stringify(body.error)}` : ""}`.slice(0, 250) };
    return { ok: true, status: "sent", providerMessageId: String(pick(body, process.env.WHATSAPP_RESPONSE_ID_FIELD) || "") || null };
  },
};

const DRIVERS = { simulated, http };

export function whatsappProviderName() {
  return (process.env.WHATSAPP_PROVIDER || "simulated").toLowerCase();
}

export function getWhatsAppProvider(name = whatsappProviderName()) {
  const driver = DRIVERS[name];
  if (!driver) throw new WhatsAppNotConfiguredError(name, `Unknown provider. Known: ${Object.keys(DRIVERS).join(", ")}.`);
  return driver;
}

export function isSimulatedWhatsApp() {
  return Boolean(DRIVERS[whatsappProviderName()]?.simulated);
}

/** Digits only, country code first. Pakistan-friendly: 0300... and 300... become 92300... */
export function normalizePhone(raw, defaultCountry = "92") {
  let d = String(raw || "").replace(/[^\d]/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = defaultCountry + d.slice(1);
  else if (d.length === 10) d = defaultCountry + d;
  return d.length >= 10 && d.length <= 15 ? d : null;
}
