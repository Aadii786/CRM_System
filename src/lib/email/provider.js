import "server-only";

/**
 * Email provider layer. The CRM never talks to an email service directly: it
 * asks a *provider* to send one message at a time and gets back a result. The
 * default "simulated" provider sends nothing (demo mode). When IKL's IT
 * department decides on the real service (Mailchimp Transactional, Amazon
 * SES, SendGrid, SMTP ...), add one driver here and set EMAIL_PROVIDER; no
 * other code changes. See docs/email-delivery.md.
 *
 * A driver is:  { name, simulated?: boolean, send(message) -> Promise<{ ok, providerMessageId?, status?, error? }> }
 * message = { to, toName, from, fromName, replyTo, subject, html, text, headers, metadata: { campaignId, contactId } }
 *
 * status "delivered" in the result means the driver already knows it was
 * delivered (only the simulated driver does); real drivers return "sent" and
 * report delivered / opened / clicked / bounced later through the webhook
 * (/api/email/webhook) or our own tracking links.
 */

export class ProviderNotConfiguredError extends Error {
  constructor(name, hint) {
    super(`The email provider "${name}" is not set up yet. ${hint}`);
    this.name = "ProviderNotConfiguredError";
  }
}

const simulated = {
  name: "simulated",
  simulated: true,
  async send(message) {
    // Nothing leaves the system. Pretend it was accepted and delivered.
    return { ok: true, status: "delivered", providerMessageId: `sim-${message.metadata?.campaignId}-${message.metadata?.contactId}-${Date.now().toString(36)}` };
  },
};

const notReady = (name, hint) => ({
  name,
  simulated: false,
  async send() {
    throw new ProviderNotConfiguredError(name, hint);
  },
});

const DRIVERS = {
  simulated,
  // Placeholders: replace the body with the real API call once the service is chosen.
  mailchimp: notReady("mailchimp", "Add the Mailchimp Transactional (Mandrill) API key and implement the driver in src/lib/email/provider.js."),
  ses: notReady("ses", "Add the Amazon SES credentials and implement the driver in src/lib/email/provider.js."),
};

export function providerName() {
  return (process.env.EMAIL_PROVIDER || "simulated").toLowerCase();
}

export function getEmailProvider(name = providerName()) {
  const driver = DRIVERS[name];
  if (!driver) throw new ProviderNotConfiguredError(name, `Unknown provider. Known: ${Object.keys(DRIVERS).join(", ")}.`);
  return driver;
}

export function isSimulatedProvider() {
  return Boolean(DRIVERS[providerName()]?.simulated);
}
