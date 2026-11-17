import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { applyScoreEvent } from "./leadScoringService";
import { createNotification } from "./notificationService";
import { fireTrigger } from "./automationEngine";
import { sendOperationalEmail } from "./emailDeliveryService";
import { createRegistrationRecord, validateFeedback } from "./registrationService";
import { normalizePhone } from "@/lib/whatsapp/provider";

const { Contact, Company, Program, ProgramBatch, ContactInterest, Registration, Activity, FormSubmission, Setting, Department } = db;

/**
 * Website forms (IKL Sprint 3, MIR-2.1 to 2.7). The website (built in-house with Next.js) posts each
 * form from its own server to /api/public/forms/<type> with an API key. Every call is stored in
 * form_submissions, matched to one person (no duplicates), tagged with the source "Website",
 * handed to an owner who is notified, scored, offered to automations and acknowledged by email.
 *
 * Types: enquiry | brochure | registration | feedback
 */

export const FORM_TYPES = ["enquiry", "brochure", "registration", "feedback"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class FormError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

const str = (v, max = 255) => (v === undefined || v === null ? "" : String(v).trim().slice(0, max));

const DEFAULT_ACK = {
  enquiry: {
    subject: "We received your enquiry",
    body: "Dear {{firstName}},\n\nThank you for contacting us. We have received your enquiry{{programLine}} and a member of our team will get back to you shortly.\n\nKind regards,\n{{senderName}}",
  },
  brochure: {
    subject: "Your brochure download",
    body: "Dear {{firstName}},\n\nThank you for your interest{{programLine}}. We have recorded your request and our team will be happy to answer any questions you have.\n\nKind regards,\n{{senderName}}",
  },
  registration: {
    subject: "We received your registration",
    body: "Dear {{firstName}},\n\nThank you for registering{{programLine}}. Your place has been recorded and our team will contact you with the next steps and payment details.\n\nKind regards,\n{{senderName}}",
  },
  feedback: {
    subject: "Thank you for your feedback",
    body: "Dear {{firstName}},\n\nThank you for taking the time to share your feedback{{programLine}}. It helps us improve our programs.\n\nKind regards,\n{{senderName}}",
  },
};

/** IKL's wording can replace the defaults: Settings category "website_forms", key "ack_<type>", value { subject, body }. */
async function ackTemplate(type) {
  const row = await Setting.findOne({ where: { category: "website_forms", key: `ack_${type}` } });
  const v = row?.value;
  if (v?.subject && v?.body) return v;
  return DEFAULT_ACK[type];
}

/** Who looks after a new web lead: the department's chosen user, else a manager, else any active user. */
async function pickOwner(departmentId) {
  const chosen = await Setting.findOne({ where: { category: "website_forms", key: "default_owner_user_id" } });
  if (chosen?.value) {
    const u = await db.User.findOne({ where: { id: Number(chosen.value), departmentId, status: "active" }, attributes: ["id"] });
    if (u) return u.id;
  }
  for (const permission of ["deals.approve", "contacts.update"]) {
    const [rows] = await db.sequelize.query(
      `SELECT u.id FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE u.department_id = :d AND u.status = 'active' AND p.\`key\` = :k
       ORDER BY u.id ASC LIMIT 1`,
      { replacements: { d: departmentId, k: permission } }
    );
    if (rows.length) return rows[0].id;
  }
  const any = await db.User.findOne({ where: { departmentId, status: "active" }, order: [["id", "ASC"]], attributes: ["id"] });
  return any?.id || null;
}

function splitName(p) {
  const first = str(p.firstName, 100);
  const last = str(p.lastName, 100);
  if (first) return { first, last: last || "" };
  const parts = str(p.name || p.fullName, 200).split(/\s+/).filter(Boolean);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") };
}

async function resolveProgram(departmentId, p) {
  const code = str(p.programCode, 40);
  const id = Number(p.programId) || null;
  if (!code && !id) return null;
  const program = await Program.findOne({ where: { departmentId, ...(id ? { id } : { code }) } });
  if (!program) throw new FormError("That program was not found in the catalogue.", 404);
  return program;
}

async function resolveBatch(departmentId, p, program) {
  const id = Number(p.batchId) || null;
  const code = str(p.batchCode, 60);
  if (!id && !code) return null;
  const batch = await ProgramBatch.findOne({
    where: { ...(id ? { id } : { code }) },
    include: [{ model: Program, as: "program", where: { departmentId, ...(program ? { id: program.id } : {}) }, required: true }],
  });
  if (!batch) throw new FormError("That batch was not found.", 404);
  return batch;
}

async function resolveCompany(departmentId, name, ownerId) {
  const n = str(name, 200);
  if (!n) return null;
  const existing = await Company.findOne({ where: { departmentId, name: n } });
  if (existing) return existing;
  return Company.create({ name: n, departmentId, ownerId, leadSource: "Website", status: "Prospect" });
}

/** Finds the person by email or creates a lead from the form. Never creates a second record for the same email. */
async function matchOrCreateLead(departmentId, p) {
  const email = str(p.email, 190).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new FormError("A valid email address is required.");
  let contact = await Contact.findOne({ where: { departmentId, email } });
  if (contact) {
    const patch = {};
    if (!contact.phone && str(p.phone, 40)) patch.phone = str(p.phone, 40);
    if (!contact.jobTitle && str(p.designation || p.jobTitle, 150)) patch.jobTitle = str(p.designation || p.jobTitle, 150);
    if (!contact.whatsappNumber && normalizePhone(p.whatsapp)) patch.whatsappNumber = str(p.whatsapp, 40);
    if (!contact.companyId && str(p.company)) {
      const company = await resolveCompany(departmentId, p.company, contact.ownerId);
      if (company) patch.companyId = company.id;
    }
    patch.lastActivityAt = new Date();
    await contact.update(patch);
    return { contact, created: false };
  }
  const { first, last } = splitName(p);
  if (!first) throw new FormError("Your name is required.");
  const ownerId = await pickOwner(departmentId);
  const company = await resolveCompany(departmentId, p.company, ownerId);
  contact = await Contact.create({
    firstName: first, lastName: last, email, phone: str(p.phone, 40) || null, whatsappNumber: normalizePhone(p.whatsapp) ? str(p.whatsapp, 40) : null,
    jobTitle: str(p.designation || p.jobTitle, 150) || null, city: str(p.city, 100) || null, companyId: company?.id || null,
    departmentId, ownerId, source: "Website", contactType: "Lead", status: "New", engagementStatus: "Inactive", leadScore: 0,
    optIn: p.consent === true || p.consent === "true" || p.consent === "on" ? "Opted In" : "Unknown", lastActivityAt: new Date(),
  });
  return { contact, created: true };
}

async function addInterest(contact, program) {
  if (!program) return;
  await ContactInterest.findOrCreate({ where: { contactId: contact.id, programId: program.id }, defaults: { category: null } });
}

function renderAck(template, contact, program, senderName) {
  const values = {
    firstName: contact.firstName || "there",
    programLine: program ? ` for ${program.title}` : "",
    senderName: senderName || "The team",
  };
  const fillIn = (t) => String(t).replace(/\{\{\s*(firstName|programLine|senderName)\s*\}\}/g, (_, k) => values[k]);
  return { subject: fillIn(template.subject), text: fillIn(template.body) };
}

/** Core handler. Returns { status, body } for the API route; also writes the submission log. */
export async function processSubmission({ apiKey, formType, payload, sourcePage = null }) {
  if (!FORM_TYPES.includes(formType)) return { status: 404, body: { error: `Unknown form. Use one of: ${FORM_TYPES.join(", ")}.` } };
  if (!apiKey.departmentId) return { status: 403, body: { error: "This API key is not linked to a department. Ask the CRM administrator to create a website key for IKL." } };
  const departmentId = apiKey.departmentId;
  const p = payload && typeof payload === "object" ? payload : {};

  // Honeypot: real visitors never fill the hidden field; bots do. Accept silently, store nothing.
  if (str(p.website_url || p.hp || p._hp)) return { status: 200, body: { ok: true } };

  const log = { departmentId, formType, sourcePage: str(sourcePage, 255) || null, apiKeyId: apiKey.id, payload: redact(p) };
  let contact = null;
  try {
    const program = await resolveProgram(departmentId, p);
    let created = false;
    let registration = null;
    let activityTitle;

    if (formType === "feedback") {
      const email = str(p.email, 190).toLowerCase();
      if (!EMAIL_RE.test(email)) throw new FormError("A valid email address is required.");
      contact = await Contact.findOne({ where: { departmentId, email } });
      if (!contact) throw new FormError("We could not find a registration for that email address.", 404);
      const batch = await resolveBatch(departmentId, p, program);
      const where = { contactId: contact.id, status: { [Op.ne]: "Cancelled" }, ...(batch ? { batchId: batch.id } : program ? { programId: program.id } : {}) };
      registration = await Registration.findOne({ where, order: [["batchId", "DESC"]] });
      if (!registration) throw new FormError("We could not find a registration for that email address and program.", 404);
      const f = validateFeedback({ score: p.score ?? p.rating, comments: p.comments ?? p.message });
      await registration.update({ ...f, feedbackAt: new Date() });
      activityTitle = `Submitted program feedback (${f.feedbackScore}/5) via the website`;
    } else {
      ({ contact, created } = await matchOrCreateLead(departmentId, p));
      if (formType === "registration") {
        const batch = await resolveBatch(departmentId, p, program);
        if (!batch) throw new FormError("Choose the batch you are registering for (batchId or batchCode).");
        const company = await resolveCompany(departmentId, p.company, contact.ownerId);
        try {
          registration = await createRegistrationRecord({
            batch, program: batch.program, contact, companyId: company?.id || contact.companyId || null, source: "Website", createdBy: null,
          });
        } catch (err) {
          // Seats full, batch closed, already registered: tell the website so it can show a clear message.
          throw new FormError(err.message, 409);
        }
        await fireTrigger("registration_created", contact, { programId: batch.programId, batchId: batch.id });
        activityTitle = `Registered for ${batch.program.title} via the website`;
      } else if (formType === "brochure") {
        await addInterest(contact, program);
        activityTitle = `Downloaded brochure${program ? `: ${program.title}` : ""}`;
      } else {
        await addInterest(contact, program);
        activityTitle = `Submitted a website enquiry${program ? ` about ${program.title}` : ""}`;
      }
    }

    // The registration itself already wrote "Registered for ..." on the person's history.
    if (formType !== "registration") await Activity.create({ type: "system", title: activityTitle, description: str(p.message || p.comments, 1000) || null, contactId: contact.id, companyId: contact.companyId, occurredAt: new Date() });
    await contact.update({ lastActivityAt: new Date() });
    await applyScoreEvent(contact, "Form submission");

    // Owner is told (MIR-2.6).
    const ownerId = contact.ownerId || (await pickOwner(departmentId));
    if (!contact.ownerId && ownerId) await contact.update({ ownerId });
    if (ownerId) {
      const label = { enquiry: "enquiry", brochure: "brochure download", registration: "registration", feedback: "feedback" }[formType];
      await createNotification({
        userId: ownerId, type: "website_form", title: `New website ${label}`,
        body: `${contact.firstName} ${contact.lastName}${created ? " (new lead)" : ""}${program ? ` · ${program.title}` : ""}`, link: `/contacts/${contact.id}`,
      });
    }

    await fireTrigger("form_submitted", contact, { formType, programId: program?.id });

    // Acknowledgement (MIR-2.7). Failure to email never loses the submission.
    const dept = await Department.findByPk(departmentId, { attributes: ["id", "senderName"] });
    const ack = renderAck(await ackTemplate(formType), contact, program, dept?.senderName);
    const mail = await sendOperationalEmail({
      departmentId, to: contact.email, toName: `${contact.firstName} ${contact.lastName}`.trim(), subject: ack.subject, text: ack.text,
      metadata: { contactId: contact.id, formType },
    });
    await Activity.create({
      type: "system", title: mail.ok ? `Acknowledgement email ${mail.simulated ? "prepared (demo mode, not delivered)" : "sent"}` : "Acknowledgement email could not be sent",
      description: mail.ok ? ack.subject : mail.error, contactId: contact.id, occurredAt: new Date(),
    });

    await FormSubmission.create({ ...log, status: created ? "New lead" : "Matched", contactId: contact.id, registrationId: registration?.id || null, isNewContact: created });
    return {
      status: 200,
      body: { ok: true, contactId: contact.id, newContact: created, registrationId: registration?.id || null, acknowledged: mail.ok },
    };
  } catch (err) {
    const status = err instanceof FormError ? err.status : 500;
    await FormSubmission.create({ ...log, status: "Rejected", contactId: contact?.id || null, error: String(err.message || err).slice(0, 250) }).catch(() => {});
    if (status === 500) console.error("[website-form] failed:", err);
    return { status, body: { ok: false, error: status === 500 ? "We could not save this form. Please try again later." : err.message } };
  }
}

/** Keep the log useful without storing anything that looks like a secret. */
function redact(p) {
  const out = {};
  for (const [k, v] of Object.entries(p)) {
    if (/password|token|secret|card/i.test(k)) continue;
    out[k] = typeof v === "string" ? v.slice(0, 1000) : v;
  }
  return out;
}

/** The public catalogue the website needs to build its registration form. */
export async function publicCatalogue(departmentId) {
  const today = new Date().toISOString().slice(0, 10);
  const programs = await Program.findAll({
    where: { departmentId, status: "Active" },
    include: [{ model: ProgramBatch, as: "batches", required: false, where: { status: { [Op.in]: ["Open for registration", "Planned", "Running"] }, startDate: { [Op.gte]: today } } }],
    order: [["title", "ASC"], [{ model: ProgramBatch, as: "batches" }, "startDate", "ASC"]],
  });
  return programs.map((p) => ({
    id: p.id, code: p.code, title: p.title, category: p.category, type: p.programType, duration: p.durationText || (p.durationDays ? `${p.durationDays} day(s)` : null), fee: Number(p.defaultFee) || null,
    batches: (p.batches || []).map((b) => ({ id: b.id, code: b.code, startDate: b.startDate, endDate: b.endDate, venue: b.venue, seats: b.capacity, fee: b.fee != null ? Number(b.fee) : null, status: b.status })),
  }));
}

// ------------------------------------------------------------- staff screens

export async function listFormSubmissions(departmentIds, { type, status, page = 1, limit = 25 } = {}) {
  const where = { departmentId: { [Op.in]: departmentIds } };
  if (type) where.formType = type;
  if (status) where.status = status;
  const { rows, count } = await FormSubmission.findAndCountAll({
    where, include: [{ model: Contact, as: "contact", attributes: ["id", "firstName", "lastName", "email"] }],
    order: [["createdAt", "DESC"]], limit, offset: (page - 1) * limit,
  });
  return { data: rows.map((r) => r.get({ plain: true })), pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 } };
}

