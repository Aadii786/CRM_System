import "server-only";
import { signToken } from "./tokens";

const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function unsubscribeUrl(campaignId, contactId) {
  return `${appUrl()}/unsubscribe/${signToken({ t: "u", c: campaignId, u: contactId })}`;
}

const SKIP_LINK = /^(mailto:|tel:|sms:|#|javascript:)/i;

/**
 * Turns the campaign's HTML into the message for ONE recipient:
 *  - fills {{firstName}} {{lastName}} {{fullName}} {{email}} {{company}}
 *  - wraps every web link in a signed click-tracking redirect
 *  - adds the open-tracking pixel
 *  - guarantees an unsubscribe link (uses {{unsubscribeUrl}} if the design has it, else appends a footer)
 */
export function renderForRecipient(campaign, contact, companyName = "") {
  const base = appUrl();
  const unsub = unsubscribeUrl(campaign.id, contact.id);
  const values = {
    firstName: contact.firstName || "",
    lastName: contact.lastName || "",
    fullName: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
    email: contact.email || "",
    company: companyName || "",
  };

  let html = String(campaign.bodyHtml || "<p></p>");
  html = html.replace(/\{\{\s*(firstName|lastName|fullName|email|company)\s*\}\}/g, (_, k) => escapeHtml(values[k]));
  const hadPlaceholder = /\{\{\s*unsubscribeUrl\s*\}\}/.test(html);
  html = html.replace(/\{\{\s*unsubscribeUrl\s*\}\}/g, unsub);

  html = html.replace(/href=(["'])(.*?)\1/gi, (match, quote, url) => {
    const target = url.replace(/&amp;/g, "&").trim();
    if (!/^https?:\/\//i.test(target) || SKIP_LINK.test(target) || target.startsWith(`${base}/unsubscribe/`)) return match;
    const token = signToken({ t: "c", c: campaign.id, u: contact.id, url: target });
    return `href=${quote}${base}/api/t/c/${token}${quote}`;
  });

  const openToken = signToken({ t: "o", c: campaign.id, u: contact.id });
  const pixel = `<img src="${base}/api/t/o/${openToken}" width="1" height="1" alt="" style="display:none;border:0" />`;
  const footer = hadPlaceholder
    ? ""
    : `<p style="font-size:12px;line-height:1.5;color:#6b7280;text-align:center;margin:24px 0 8px">You receive this email from ${escapeHtml(campaign.senderName || "us")}. <a href="${unsub}" style="color:#6b7280">Unsubscribe</a></p>`;
  const tail = `${footer}${pixel}`;
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${tail}</body>`) : `${html}${tail}`;

  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_, href, label) => `${label.replace(/<[^>]+>/g, "")} (${href})`)
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    subject: String(campaign.subject || "").replace(/\{\{\s*(firstName|lastName|fullName)\s*\}\}/g, (_, k) => values[k]),
    html,
    text,
    headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}
