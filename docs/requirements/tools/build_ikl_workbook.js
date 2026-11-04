"use strict";
// IKL-facing workbook v2: 4 sprints, deadline 30 Nov 2026, no separate non-functional sheet
const path = require("path");
const { DONE_NOW, addSprint1Report } = require("./sprint1_sheet");
const ExcelJS = require("exceljs");

const SRC = "E:/download/IKL CRM Progress Report Answered-1.xlsx";
const OUT = process.argv[2] || path.join(__dirname, "IKL_CRM_Progress_Report_and_Sprint_Plan_v4.xlsx");
const NAVY = "FF1F2A44", INK = "FF1F2937", GREY = "FF6B7280", BAND = "FFF5F7FA", LINE = "FFD9DEE7", WHITE = "FFFFFFFF";
const D = (m, d) => new Date(Date.UTC(2026, m - 1, d));
const DEADLINE = D(11, 30);

// ---- sprint calendar (delivery = the Tuesday demo, final = Monday 30 Nov)
const CAL = {
  1: { start: D(10, 20), end: D(10, 27) },
  2: { start: D(10, 28), end: D(11, 10) },
  3: { start: D(11, 11), end: D(11, 24) },
  4: { start: D(11, 25), end: D(11, 30) },
};
const SPRINT_FN = {
  1: ["CRM-1.11", "CRM-5.6", "CRM-1.14", "CRM-2.6", "CRM-2.10", "MIR-3.6", "SET-3"],
  2: ["MIR-3.1", "MIR-3.4", "MIR-5.2", "MIR-5.4", "CRM-4.7", "MIR-1.5", "MIR-1.4", "MIR-1.7", "MIR-1.6", "MIR-3.2", "CRM-3.1", "CRM-1.8", "CRM-3.2", "CRM-3.3", "CRM-1.6", "GO-1"],
  3: ["CRM-3.4", "CRM-3.5", "CRM-3.6", "CRM-1.7", "CRM-3.8", "CRM-3.7", "MIR-5.3", "MIR-5.6", "MIR-1.8", "CRM-2.2", "CRM-2.9", "WA-1", "WA-2", "MIR-2.1", "MIR-2.2", "MIR-2.3", "MIR-2.4", "MIR-2.5", "MIR-2.6", "MIR-2.7"],
  4: ["CRM-4.8", "CRM-4.9", "MIR-3.5", "MIR-5.8", "MIR-3.7", "MIR-3.8", "MIR-3.9", "CRM-5.4", "CRM-5.5", "MIR-4.4", "GO-2", "GO-3", "GO-4", "GO-5"],
};
const STRETCH = ["MIR-4.4"];
const NOTE_OVERRIDE = {
  "MIR-1.1": "Campaigns are created and sent by the Marketing role only (see the Roles sheet). Sales can see the results.",
  "MIR-3.6": "The reports are built, but invoice and payment details cannot be entered yet. Invoices are issued in IKL's finance system; the CRM records only the reference entered by the sales team (invoice number, date, amount, payment status, amount received). IKL users also cannot open this report today; access is added in Sprint 1.",
  "MIR-1.5": "Sending runs in demo mode. Real sending will use the third-party email service provided by the IT department (Mailchimp expected). IKL's own address stays the visible sender. More than 500 emails a day are expected.",
  "MIR-1.6": "Screens and counters are built. Real figures (delivered, opened, clicked, bounced, unsubscribed) are read back from the email service once real sending is connected.",
  "CRM-5.5": "Required by IKL. Covers the text of PDF, Word and Excel files. Scanned images need OCR, which is not included.",
  "CRM-2.6": "Proposals are displayed on the deal, but there is no screen to create or update one. Sprint 1 adds create, update, status tracking and manager approval.",
};
const EXTRA = [ // functions added so that nothing lives outside the functional checklist
  ["SET-1", "SET", "1 - Critical", "IKL workspace with its own roles: CRM administrator, IKL management / approver and business development users (a user may hold more than one role)", "Done", "Users; Roles", "Each department sees only its own records and every action is checked on the server. Named IKL users are created once IKL sends the list (Q14). Covers BRD NFR 1."],
  ["SET-2", "SET", "1 - Critical", "University-wide dashboard, integrations catalogue and API screens are not visible to IKL users", "Done", "Menu and permissions", "Per IKL answer Q13."],
  ["SET-3", "SET", "1 - Critical", "Reset the password of an existing user (by the CRM administrator or the department head)", "Pending", "", "A password can be set only when a user is created. Covers BRD NFR 1."],
  ["SET-4", "SET", "1 - Critical", "Set the IKL sender name, sender address and reply-to address used for campaigns", "Done", "Departments > sender identity", "Settings only; the actual sending is MIR-1.5. IKL's own address (info@ikl.com.pk) stays the visible sender."],
  ["GO-1", "GO", "1 - Critical", "The CRM is available to IKL users at an agreed web address during working hours", "Pending", "", "Needed for real email tracking and the website forms. Covers BRD NFR 2."],
  ["GO-2", "GO", "1 - Critical", "Regular database backup and a tested restore", "Pending", "", "Covers BRD NFR 5."],
  ["GO-3", "GO", "1 - Critical", "Response-time check of search, filters and common screens with IKL-sized data", "Pending", "", "Covers BRD NFR 3 and NFR 8."],
  ["GO-4", "GO", "1 - Critical", "Demo banner and sample data removed; only IKL's own data remains", "Pending", "", "Per IKL answer Q13. The 58,000 sample contacts of another department are already removed."],
  ["GO-5", "GO", "1 - Critical", "User acceptance test and short training for IKL users", "Pending", "", "Covers BRD NFR 9. IKL nominates the acceptance person and the attendees."],
  ["WA-1", "WA", "2 - High", "Send WhatsApp campaigns to a list or segment", "Pending", "", "Added request (not in the BRD). Uses the WhatsApp service provided by the IT department; needs the API details and approved message templates."],
  ["WA-2", "WA", "2 - High", "Receive WhatsApp replies in the shared inbox and on the contact's history", "Partial", "Conversations", "Added request (not in the BRD). Screens exist in demo mode; real messages need the same WhatsApp API."],
];
const SPRINTS = {
  1: { title: "Sales workspace", ready: [
    "IKL roles: CRM administrator, IKL management / approver, business development users",
    "University-wide dashboard, integrations catalogue and API screens hidden from IKL users",
    "IKL sender name, address and reply-to settings"],
    items: [
    "Password reset for existing users",
    "Free-text notes on leads, clients and deals, searchable",
    "Duplicate check for corporate clients",
    "Proposals: create, update, track status; the department head approves a proposal before it can be sent (a deal still needs the manager's release from the Approval stage)",
    "One-click conversion of a lead into an opportunity; contact status updates when a deal is won or lost",
    "Invoice and payment references entered against client, deal and program (number, date, amount, payment status; invoices themselves are issued in IKL's finance system); revenue report available to IKL",
    "Role permissions set up as in the Roles sheet (can be changed after IKL's review)"],
    demo: "Log in with the IKL roles; add a note; a duplicate company is blocked; create a proposal and approve it as the manager; convert a lead; record an invoice and a payment.",
    need: "Q14 roles and first users; Q17 invoice reference format" },
  2: { title: "Live email, IKL data and program catalogue", ready: [], items: [
    "Real email through the third-party service provided by the IT department: campaigns to real recipients, scheduled sending, unsubscribe link and opt-out page",
    "Real tracking read back from the service: delivered, opened, clicked, bounced; campaign panel on the dashboard",
    "IKL dashboard: leads panel and contact-to-converted funnel; filters by organization and date range",
    "Import of corporate clients from Excel; first load of IKL's contacts and companies",
    "Program catalogue with categories; program interests on leads and contacts",
    "Scheduled batches (dates, venue, trainer, seats, fee); inquiries linked to programs",
    "One person record carrying lead, participant and alumnus statuses",
    "The CRM available to IKL users at an agreed web address"],
    demo: "IKL's own contacts and companies in the system; a real test campaign arrives and unsubscribe works; programs and a batch are created.",
    need: "Q15 consent; Q16 Excel files and focal person; Q18 program catalogue; Q19 registration rules. From the IT department: email service access" },
  3: { title: "Registrations, tracking and website", ready: [], items: [
    "Registrations (individual and company nominations), participant lists, attendance per program",
    "Completion, certificate details and alumni rule; program feedback entry",
    "Program history on the person and client; program filters on contacts and deals",
    "Automated follow-up workflows; lead scoring on real activity; email reminders with manager visibility",
    "WhatsApp: campaigns to lists and segments, and replies in the shared inbox (needs the WhatsApp API from the IT department by 3 Nov)",
    "Website: secure channel, enquiry, brochure, registration and feedback forms, source tagging, duplicate check, owner notified, automatic acknowledgement"],
    demo: "Register a participant and a company nomination, mark attendance and completion; a form submitted on the website arrives as a lead and the sender gets an acknowledgement.",
    need: "Q20 website forms; Q21 existing forms; Q22 remaining Excel files; Q23 report list. From the IT department: WhatsApp API" },
  4: { title: "Reports, data migration and go-live", ready: [], items: [
    "Migration of participants, alumni, registrations, feedback and usable history, checked record by record with the IKL focal person",
    "Registration reports; reports by program, source and date; team performance; date range on every dashboard; export to Excel and PDF",
    "Document search by name, title, type, client, program and date, and search inside the text of PDF, Word and Excel files",
    "Backup and restore check; response-time check; demo banner and sample data removed",
    "User acceptance test, short training and go-live",
    "If time allows (otherwise right after go-live): recording of one-to-one emails"],
    demo: "Final demonstration and hand-over on Monday 30 November. Acceptance sign-off.",
    need: "IKL nominates the acceptance person and training attendees; focal person available for data checks" },
};
const TUESDAYS = [
  [D(10, 27), "Sprint 1", "Sprint 1 delivery: sales workspace (notes, duplicate check, proposals with approval, lead conversion, invoices and payments)."],
  [D(11, 3), "Sprint 2", "Progress demo: IKL data loaded, dashboard panels, first real test email."],
  [D(11, 10), "Sprint 2", "Sprint 2 delivery: live email with tracking, IKL data, program catalogue, batches, person record."],
  [D(11, 17), "Sprint 3", "Progress demo: registrations, attendance, campaign tracking."],
  [D(11, 24), "Sprint 3", "Sprint 3 delivery: registrations, alumni, feedback, automation, WhatsApp, website forms."],
  [D(11, 30), "Sprint 4", "Final demonstration, acceptance and go-live (Monday)."],
];
const ROUND2 = [
  ["Roles and first users", "Please review the Roles sheet (role names and what each role can do) and mark each line Agree or Change, or add a new role. Then list the first users: name, email and role (Head of Department, Marketing, Sales; one person may hold both). Please also name the person who approves proposals and any value limit.", "The Head of Department adds the Marketing and Sales team members. The Roles sheet is what the system will be configured to.", "NFR 1, CRM 2.6", D(10, 21), "Sprint 1: roles, users and proposal approval."],
  ["Consent", "Do existing contacts have consent for email marketing? Is there a record of opt-in, or should all existing contacts be treated as unconfirmed?", "Decides which contacts may be emailed from the first campaign.", "MIR 1.7", D(11, 3), "Sprint 2: opt-out handling and the first campaign list."],
  ["Excel files and focal person", "Please send the Excel files for contacts and corporate clients now (company, group and folder structure included) and name the IKL focal person who will check the loaded data.", "Contacts and companies are loaded in Sprint 2; everything else in Sprint 4.", "CRM 4", D(10, 23), "Sprint 2: first load. Sprint 4: full migration."],
  ["Invoice references", "Invoices are issued in IKL's finance system, so the CRM will only record a reference against a deal. Please confirm: which finance system is used, the invoice number format, and whether the sales team will type the invoice number, amount and payment status, or IKL prefers a periodic import from the finance system.", "Follow-up to Q11. The CRM does not create invoices or calculate tax.", "MIR 3.6", D(10, 22), "Sprint 1: invoice and payment references."],
  ["Program catalogue", "Please send the open-enrollment calendar and program catalogue: title, category, duration, fee.", "Needed to create the catalogue and test registrations with real programs.", "CRM 3", D(10, 27), "Sprint 2: program catalogue."],
  ["Registration rules", "Are there seat limits or a waiting list? What fee and payment details are recorded at registration? What are the completion criteria for each program type? Should the CRM only record the certificate (number, date, issued) or also produce the certificate document?", "Follow-up to Q2-Q4. Producing certificate documents is not in the BRD and would be a change request.", "CRM 3, CRM 1.7", D(11, 3), "Sprint 3: registrations and completion."],
  ["Website forms", "Which forms on ikl.com.pk must feed the CRM (enquiry, brochure download, registration, feedback, others)? For each, please give the fields and the wording, and the acknowledgement message the sender should receive.", "The website is built in-house, so the project team will connect the forms. We need the list and the wording.", "MIR 2", D(11, 10), "Sprint 3: website capture."],
  ["Existing forms", "Please share the forms IKL already uses: program feedback form(s) in Excel, training evaluation form, registration or nomination form, attendance sheet, certificate template, and any other form or template.", "We will mirror these in the CRM instead of inventing new ones.", "CRM 3.8, CRM 3.4, CRM 3.6", D(11, 3), "Sprint 3: registrations, attendance, feedback."],
  ["Remaining Excel files", "Please send the Excel files for participants, alumni, registrations and feedback, with record counts.", "Needed for the Sprint 4 migration and for testing the program structures.", "CRM 4.8", D(11, 10), "Sprint 4: migration."],
  ["Report list", "Please confirm the final list of reports (from Q8) with the layout, the users and how often each is used.", "Follow-up to Q8; lets us build the report pack.", "MIR 3, MIR 5", D(11, 10), "Sprint 4: reports."],
];
const BEYOND_DECISION = [
  ["Keep", "Per answer to Q13: each department sees only its own records."],
  ["Hide from IKL", "Per answer to Q13: hidden from IKL users unless specifically authorized."],
  ["Keep", "Per answer to Q13."],
  ["Keep", "Per answer to Q13."],
  ["Keep", "Per answer to Q13: kept within IKL's authorized workspace."],
  ["Keep", "Per answer to Q13; approver and thresholds to be confirmed (Q14)."],
  ["Hide from IKL", "Per answer to Q13: hidden until real integrations are available."],
  ["Remove", "Per answer to Q13: removed before go-live (Sprint 4). The 58,000 sample contacts of another department are already removed."],
];
const USE = {
  Q1: "Sprint 2-3: catalogue, batches and client engagements as separate record types.", Q2: "Sprint 3: individual and company registrations.", Q3: "Sprint 3: attendance per program; completion and certificate details.",
  Q4: "Sprint 3: alumni rule.", Q5: "Sprint 2: one master person record.", Q6: "Sprint 2: interests and categories.", Q7: "Sprint 2 (contacts, companies) and Sprint 4 (all other data). Files requested in Q16 and Q22.",
  Q8: "Sprint 2 (dashboard) and Sprint 4 (reports and export). Report list to be confirmed (Q23).", Q9: "Sprint 4: search by name, title, type, client, program, date, and inside document text.", Q10: "Sprint 1: roles and proposal approval.",
  Q11: "Sprint 1: invoice and payment references entered in the CRM; invoices stay in the finance system (Q17).", Q12: "Sprint 2 (in-system), Sprint 3 (email).", Q13: "Already applied (SET-2); demo data removed in Sprint 4.",
};

// ---------------------------------------------------------------- helpers
const solid = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const thin = { style: "thin", color: { argb: LINE } };
const box = { top: thin, bottom: thin, left: thin, right: thin };
const F = (o = {}) => ({ name: "Calibri", size: 10, color: { argb: INK }, ...o });
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dshort = (d, y) => String(d.getUTCDate()).padStart(2, "0") + " " + MON[d.getUTCMonth()] + (y ? " " + d.getUTCFullYear() : "");
const fmtDate = "ddd dd mmm yyyy";
function titleBlock(ws, title, sub, lastCol) {
  ws.mergeCells(1, 1, 1, lastCol); ws.mergeCells(2, 1, 2, lastCol);
  const a = ws.getCell(1, 1); a.value = title; a.font = F({ bold: true, size: 16, color: { argb: NAVY } }); a.alignment = { vertical: "middle" }; ws.getRow(1).height = 26;
  const b = ws.getCell(2, 1); b.value = sub; b.font = F({ color: { argb: GREY } }); b.alignment = { vertical: "middle", wrapText: true }; ws.getRow(2).height = 32;
}
function headerRow(ws, rowNo, labels) {
  const r = ws.getRow(rowNo); r.height = 30;
  labels.forEach((l, i) => { const c = r.getCell(i + 1); c.value = l; c.fill = solid(NAVY); c.font = F({ bold: true, color: { argb: WHITE } }); c.alignment = { horizontal: "left", vertical: "middle", wrapText: true }; c.border = box; });
}
function styleCell(c, o = {}) { c.border = box; c.alignment = { vertical: "top", wrapText: true, ...(o.align || {}) }; c.font = F(o.font || {}); if (o.fill) c.fill = solid(o.fill); }
const est = (lines) => Math.max(18, 13.5 * lines + 6);
const linesFor = (t, w) => String(t || "").split("\n").reduce((a, l) => a + Math.max(1, Math.ceil(l.length / Math.max(1, w * 1.15))), 0);
const statusRules = (tl) => [["Done", "FFD1FAE5", "FF065F46"], ["Partial", "FFFEF3C7", "FF92400E"], ["Pending", "FFFEE2E2", "FF991B1B"]]
  .map(([v, bg, fg], i) => ({ type: "expression", priority: i + 1, formulae: [`${tl}="${v}"`], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: bg } }, font: { bold: true, color: { argb: fg } } } }));

(async () => {
  const src = new ExcelJS.Workbook();
  await src.xlsx.readFile(SRC);
  const val = (c) => (c && typeof c === "object" ? (c.result ?? c.text ?? (c.richText ? c.richText.map((t) => t.text).join("") : "")) : c ?? "");
  const rowsOf = (name, from = 2) => { const out = []; src.getWorksheet(name).eachRow((r, i) => { if (i >= from) out.push(r.values.slice(1).map(val)); }); return out; };
  const baseFn = rowsOf("Functional Checklist");
  const fnRows = baseFn.concat(EXTRA.map((e) => [e[0], e[1], e[2], e[3], e[4], e[5], e[6], "", ""]));
  fnRows.forEach((r) => {
    const d = DONE_NOW[r[0]];
    if (d) { r.was = r[4]; r[4] = "Done"; r[5] = d.where; r[6] = d.note; }
  });
  const qRows = rowsOf("Open Questions");
  const beyondRows = rowsOf("Beyond BRD", 4);

  const sprintOf = {}; Object.entries(SPRINT_FN).forEach(([s, refs]) => refs.forEach((r) => { sprintOf[r] = +s; }));
  const open = fnRows.filter((r) => r[4] !== "Done").map((r) => r[0]);
  const bad = open.filter((k) => !sprintOf[k]).concat(Object.keys(sprintOf).filter((k) => !open.includes(k) && !DONE_NOW[k]));
  if (bad.length) throw new Error("plan mismatch " + bad);

  const wb = new ExcelJS.Workbook(); wb.creator = "CRM Project Team";
  const sm = wb.addWorksheet("Summary", { views: [{ showGridLines: false }] });
  const sp = wb.addWorksheet("Sprint Plan", { views: [{ state: "frozen", ySplit: 4, showGridLines: false }] });
  const fc = wb.addWorksheet("Functional Checklist", { views: [{ state: "frozen", xSplit: 2, ySplit: 1, showGridLines: false }] });
  const rl = wb.addWorksheet("Roles", { views: [{ state: "frozen", ySplit: 4, showGridLines: false }] });
  const oq = wb.addWorksheet("Open Questions", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  const ds = wb.addWorksheet("Decisions & Services", { views: [{ state: "frozen", ySplit: 3, showGridLines: false }] });
  const bb = wb.addWorksheet("Beyond BRD", { views: [{ state: "frozen", ySplit: 3, showGridLines: false }] });

  // ================================================= Sprint Plan
  titleBlock(sp, "Sprint plan - four sprints, final delivery 30 November 2026",
    "Each sprint ends with a working delivery that IKL tests and signs off before the next sprint builds on it. A progress demonstration is also held every Tuesday. Dates assume IKL provides the inputs listed against each sprint (see Open Questions); changes go through change control.", 10);
  sp.getCell("A3").value = "Project deadline:"; sp.getCell("A3").font = F({ bold: true, color: { argb: NAVY } }); sp.mergeCells("A3:B3");
  const dl = sp.getCell("C3"); dl.value = DEADLINE; dl.numFmt = fmtDate; dl.font = F({ bold: true, color: { argb: "FF991B1B" } }); dl.fill = solid("FFFEE2E2"); dl.border = box; dl.alignment = { horizontal: "left" };
  headerRow(sp, 4, ["Sprint", "Name", "Starts", "Delivery / demo", "What will be delivered", "Functions closed (Functional Checklist)", "What you will see at the demo", "What we need from IKL (see Open Questions)", "Status", "IKL sign-off (name, date)"]);
  [8, 26, 15, 16, 70, 24, 42, 40, 13, 30].forEach((w, i) => { sp.getColumn(i + 1).width = w; });
  for (let s = 1; s <= 4; s++) {
    const r = s + 4, t = SPRINTS[s], row = sp.getRow(r);
    let deliver = t.title.toUpperCase() + "\n";
    if (t.ready.length) deliver += "READY NOW (already built):\n" + t.ready.map((x) => "✓ " + x).join("\n") + "\nNEW IN THIS SPRINT:\n";
    deliver += t.items.map((x) => "• " + x).join("\n");
    const refs = SPRINT_FN[s].join(", ");
    row.getCell(1).value = s; row.getCell(2).value = t.title;
    row.getCell(3).value = CAL[s].start; row.getCell(4).value = CAL[s].end;
    row.getCell(5).value = deliver; row.getCell(6).value = refs; row.getCell(7).value = t.demo; row.getCell(8).value = t.need;
    row.getCell(9).value = s === 1 ? "Delivered" : "Planned";
    row.getCell(10).value = s === 1 ? "Built and tested 26 Oct. IKL demonstration and sign-off to follow." : "";
    for (let c = 1; c <= 10; c++) styleCell(row.getCell(c), { fill: s === 1 ? "FFECFDF5" : s % 2 ? undefined : BAND });
    [1, 3, 4, 9].forEach((c) => { row.getCell(c).alignment = { horizontal: "center", vertical: "top", wrapText: true }; });
    row.getCell(1).font = F({ bold: true, color: { argb: NAVY }, size: 12 }); row.getCell(2).font = F({ bold: true, color: { argb: NAVY } });
    row.getCell(3).numFmt = fmtDate; row.getCell(4).numFmt = fmtDate; row.getCell(4).font = F({ bold: true });
    row.height = est(Math.max(linesFor(deliver, 70), linesFor(t.demo, 42), linesFor(t.need, 40), linesFor(refs, 24)));
    row.getCell(9).dataValidation = { type: "list", allowBlank: false, formulae: ['"Planned,In progress,Delivered,Accepted"'] };
  }
  sp.addConditionalFormatting({ ref: "I5:I8", rules: [
    { type: "cellIs", operator: "equal", priority: 1, formulae: ['"Accepted"'], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFD1FAE5" } }, font: { bold: true, color: { argb: "FF065F46" } } } },
    { type: "cellIs", operator: "equal", priority: 2, formulae: ['"Delivered"'], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFDBEAFE" } }, font: { color: { argb: "FF1E40AF" } } } },
    { type: "cellIs", operator: "equal", priority: 3, formulae: ['"In progress"'], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFEF3C7" } }, font: { color: { argb: "FF92400E" } } } },
  ] });
  sp.getCell("A10").value = "Tuesday demonstrations"; sp.getCell("A10").font = F({ bold: true, size: 11, color: { argb: NAVY } });
  headerRow(sp, 11, ["#", "Sprint", "Date", "", "What is shown", "", "", "", "Held?", "Feedback / decisions"]);
  sp.mergeCells("E11:H11"); sp.mergeCells("C11:D11");
  TUESDAYS.forEach((t, i) => {
    const r = 12 + i, row = sp.getRow(r);
    row.getCell(1).value = i + 1; row.getCell(2).value = t[1]; row.getCell(3).value = t[0]; sp.mergeCells(`C${r}:D${r}`);
    row.getCell(5).value = t[2]; sp.mergeCells(`E${r}:H${r}`); row.getCell(9).value = ""; row.getCell(10).value = "";
    for (let c = 1; c <= 10; c++) styleCell(row.getCell(c), { fill: i % 2 ? BAND : undefined });
    [1, 2, 3, 9].forEach((c) => { row.getCell(c).alignment = { horizontal: "center", vertical: "top", wrapText: true }; });
    row.getCell(3).numFmt = fmtDate; row.getCell(3).font = F({ bold: true });
    row.getCell(9).dataValidation = { type: "list", allowBlank: true, formulae: ['"Yes,No,Moved"'] };
    row.height = 30;
  });

  // ================================================= Functional Checklist
  headerRow(fc, 1, ["Ref", "BRD ID", "Priority", "Function (what the user can do)", "Status", "Where in the system", "What is missing / notes", "Sprint", "Planned delivery", "IKL Review", "IKL Comments", "Changed since last version"]);
  [10, 9, 11, 58, 11, 30, 58, 8, 17, 17, 34, 30].forEach((w, i) => { fc.getColumn(i + 1).width = w; });
  fnRows.forEach((r, i) => {
    const rr = i + 2, ref = r[0], s = sprintOf[ref];
    const row = fc.getRow(rr);
    const stripQ = (t) => String(t || "").replace(/\s*\((?:see )?Open Questions? Q\d+[^)]*\)/gi, "").replace(/\s+\./g, ".").trim();
    let note = (DONE_NOW[ref] && DONE_NOW[ref].note) || NOTE_OVERRIDE[ref] || stripQ(r[6]);
    if (STRETCH.includes(ref)) note += (note ? " " : "") + "If time allows before 30 November; otherwise right after go-live.";
    row.values = [ref, r[1], r[2], stripQ(r[3]), r[4], r[5], note, s || "-",
      s ? { formula: `INDEX('Sprint Plan'!$D$5:$D$8,H${rr})`, result: CAL[s].end } : "-", r[7] || "", r[8] || ""];
    const updated = Boolean(DONE_NOW[ref]);
    for (let c = 1; c <= 12; c++) styleCell(row.getCell(c), { fill: updated ? "FFECFDF5" : i % 2 === 0 ? BAND : undefined });
    row.getCell(12).value = updated ? `Done in Sprint 1 (was ${r.was})` : "";
    row.getCell(12).font = F({ bold: true, color: { argb: "FF065F46" } });
    row.getCell(1).font = F({ bold: true, color: { argb: NAVY } });
    [5, 8, 9].forEach((c) => { row.getCell(c).alignment = { horizontal: "center", vertical: "top", wrapText: true }; });
    row.getCell(9).numFmt = "ddd dd mmm";
    row.getCell(5).dataValidation = { type: "list", allowBlank: false, formulae: ['"Done,Partial,Pending"'] };
    row.getCell(10).dataValidation = { type: "list", allowBlank: true, formulae: ['"Agreed,Needs change,Discuss"'] };
    row.height = est(Math.max(linesFor(r[3], 58), linesFor(r[5], 30), linesFor(note, 58)));
  });
  fc.autoFilter = { from: "A1", to: `L${fnRows.length + 1}` };
  fc.addConditionalFormatting({ ref: "E2:E500", rules: statusRules("E2") });

  // ================================================= Open Questions
  headerRow(oq, 1, ["#", "Topic", "Question for IKL", "Why we are asking", "Affects", "IKL Answer", "How the plan uses it", "Needed by"]);
  [7, 20, 62, 46, 18, 80, 36, 17].forEach((w, i) => { oq.getColumn(i + 1).width = w; });
  let n = 0;
  qRows.forEach((r) => { oq.getRow(++n + 1).values = [r[0], r[1], r[2], r[3], r[4], r[5], USE[r[0]] || "", ""]; });
  ROUND2.forEach((q, i) => { oq.getRow(n + i + 2).values = [`Q${14 + i}`, q[0], q[1], q[2], q[3], "", q[5], q[4]]; });
  const lastQ = n + ROUND2.length + 1;
  for (let r = 2; r <= lastQ; r++) {
    const row = oq.getRow(r), round2 = r > n + 1;
    for (let c = 1; c <= 8; c++) styleCell(row.getCell(c), { fill: round2 ? "FFFFFBEB" : undefined });
    row.getCell(1).font = F({ bold: true, color: { argb: NAVY } }); row.getCell(2).font = F({ bold: true, color: { argb: NAVY } });
    row.getCell(8).numFmt = "ddd dd mmm"; row.getCell(8).alignment = { horizontal: "center", vertical: "top", wrapText: true };
    if (round2) row.getCell(8).font = F({ bold: true, color: { argb: "FF991B1B" } });
    row.height = est(Math.max(linesFor(row.getCell(3).value, 62), linesFor(row.getCell(4).value, 46), linesFor(row.getCell(6).value, 80), linesFor(row.getCell(7).value, 36)));
  }

  // ================================================= Beyond BRD
  titleBlock(bb, "Already in the system but not asked for in the BRD", "The BRD's Out of Scope section says anything outside the agreed scope goes through the change process. IKL's decisions below follow its answer to Q13.", 5);
  headerRow(bb, 3, ["Feature", "What it is", "Our suggestion", "IKL Decision", "IKL Comments"]);
  [38, 70, 46, 22, 46].forEach((w, i) => { bb.getColumn(i + 1).width = w; });
  beyondRows.forEach((r, i) => {
    const row = bb.getRow(i + 4);
    row.values = [r[0], r[1], r[2], BEYOND_DECISION[i][0], BEYOND_DECISION[i][1]];
    for (let c = 1; c <= 5; c++) styleCell(row.getCell(c), { fill: i % 2 ? BAND : undefined });
    row.getCell(1).font = F({ bold: true });
    row.getCell(4).alignment = { horizontal: "center", vertical: "top" }; row.getCell(4).font = F({ bold: true });
    row.getCell(4).dataValidation = { type: "list", allowBlank: true, formulae: ['"Keep,Hide from IKL,Remove,Discuss"'] };
    row.height = est(Math.max(linesFor(r[1], 70), linesFor(r[2], 46), linesFor(BEYOND_DECISION[i][1], 46)));
  });

  // ================================================= Roles
  titleBlock(rl, "Roles in the IKL workspace", "Every department has a Head of Department. The Head adds as many Marketing and Sales team members as needed; one person may hold both roles and then sees both. Marketing and Sales work on the same shared IKL data (companies, groups and folders); records are tagged so each team also has its own view. Please mark each line Agree or Change, or add a role.", 6);
  rl.getColumn(1).width = 44; [16, 16, 16].forEach((w, i) => { rl.getColumn(i + 2).width = w; }); rl.getColumn(5).width = 36; rl.getColumn(6).width = 17; rl.getColumn(7).width = 40;
  const ROLEHEAD = ["Role", "", "", "", "What it is", "IKL Review", "IKL Comments"];
  headerRow(rl, 4, ["Role", "Name(s) at IKL", "", "", "What it is for", "IKL Review", "IKL Comments"]);
  rl.mergeCells("B4:D4");
  const ROLES = [
    ["CRM Administrator", "Central CRM team", "Manages the platform, departments and users. Not an IKL role."],
    ["Head of Department (approver)", "To be named by IKL", "Runs the IKL workspace, adds team members, approves proposals and deals, sees all IKL data and reports."],
    ["Marketing", "To be named by IKL", "Builds lists and segments, creates and sends email and WhatsApp campaigns, manages automations, runs the shared inbox."],
    ["Sales (business development)", "To be named by IKL", "Works leads, companies, pipeline, proposals, invoice references, programs, registrations, tasks and meetings."],
    ["One person with both Marketing and Sales", "To be named by IKL", "Gets both sets of access and one combined dashboard."],
    ["New role requested by IKL (1)", "", ""], ["New role requested by IKL (2)", "", ""], ["New role requested by IKL (3)", "", ""],
  ];
  ROLES.forEach((r, i) => {
    const rr = 5 + i, row = rl.getRow(rr);
    row.getCell(1).value = r[0]; row.getCell(2).value = r[1]; rl.mergeCells(rr, 2, rr, 4); row.getCell(5).value = r[2]; row.getCell(6).value = ""; row.getCell(7).value = "";
    for (let c = 1; c <= 7; c++) styleCell(row.getCell(c), { fill: i % 2 ? BAND : undefined });
    row.getCell(1).font = F({ bold: true, color: { argb: NAVY } });
    row.getCell(6).dataValidation = { type: "list", allowBlank: true, formulae: ['"Agree,Change,New role"'] };
    row.height = est(Math.max(2, linesFor(r[2], 36)));
  });
  const MX0 = 5 + ROLES.length + 2;
  rl.getCell(MX0, 1).value = "What each role can do"; rl.getCell(MX0, 1).font = F({ bold: true, size: 11, color: { argb: NAVY } });
  headerRow(rl, MX0 + 1, ["Capability", "Head of Department", "Marketing", "Sales", "Planned change from today", "IKL Review", "IKL Comments"]);
  const Y = "Yes", N_ = "No", V = "View only";
  const MATRIX = [
    ["See the IKL dashboard", Y, Y, Y, ""],
    ["See the shared IKL contact data (company, group and folder views)", Y, Y, Y, ""],
    ["Create and edit contacts", Y, Y, Y, ""],
    ["Import contacts from Excel", Y, Y, N_, ""],
    ["Export contact lists", Y, Y, N_, "Marketing: new"],
    ["Delete contacts", Y, N_, N_, ""],
    ["Create and edit companies", Y, V, Y, "Marketing: view added"],
    ["Delete companies", Y, N_, N_, ""],
    ["Lists and folders: create and edit", Y, Y, Y, ""],
    ["Lists and folders: delete", Y, N_, N_, ""],
    ["Segments: create and edit", Y, Y, V, "Sales: view added"],
    ["See the pipeline and deals", Y, V, Y, "Marketing: view added"],
    ["Create and edit deals, move stages", Y, N_, Y, ""],
    ["Approve a deal into execution", Y, N_, N_, ""],
    ["Proposals: create, update, track", Y, N_, Y, "New"],
    ["Invoice and payment references: enter", Y, N_, Y, "New"],
    ["Programs, batches, registrations, attendance", Y, V, Y, "New"],
    ["Create and edit campaigns (email and WhatsApp)", Y, Y, V, "Sales: view added"],
    ["Send or schedule campaigns", Y, Y, N_, "Marketing: new"],
    ["Automations: create and run", Y, Y, V, "Marketing: new"],
    ["WhatsApp shared inbox: read and reply", Y, Y, Y, ""],
    ["Assign conversations", Y, N_, N_, ""],
    ["Tasks, calls and meetings", Y, Y, Y, "Delete: Head only"],
    ["Documents: upload, download and search", Y, Y, Y, ""],
    ["Reports: view", Y, Y, Y, ""],
    ["Reports: export to Excel / PDF", Y, Y, N_, "Marketing: new"],
    ["Add team members, give them Marketing, Sales or both", Y, N_, N_, ""],
    ["Reset a team member's password", Y, N_, N_, "New"],
    ["See other departments' data", N_, N_, N_, "Per Q13"],
    ["University-wide dashboard, integrations and API screens", N_, N_, N_, "Per Q13"],
  ];
  MATRIX.forEach((m, i) => {
    const rr = MX0 + 2 + i, row = rl.getRow(rr);
    row.values = [m[0], m[1], m[2], m[3], m[4], "", ""];
    for (let c = 1; c <= 7; c++) styleCell(row.getCell(c), { fill: i % 2 ? BAND : undefined });
    row.getCell(1).font = F({ bold: true });
    [2, 3, 4].forEach((c) => { row.getCell(c).alignment = { horizontal: "center", vertical: "top" }; });
    row.getCell(6).dataValidation = { type: "list", allowBlank: true, formulae: ['"Agree,Change"'] };
    row.height = est(Math.max(1, linesFor(m[0], 44)));
  });
  const MXL = MX0 + 1 + MATRIX.length;
  rl.addConditionalFormatting({ ref: `B${MX0 + 2}:D${MXL}`, rules: [
    { type: "cellIs", operator: "equal", priority: 20, formulae: ['"Yes"'], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFD1FAE5" } }, font: { bold: true, color: { argb: "FF065F46" } } } },
    { type: "cellIs", operator: "equal", priority: 21, formulae: ['"View only"'], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFEF3C7" } }, font: { color: { argb: "FF92400E" } } } },
    { type: "cellIs", operator: "equal", priority: 22, formulae: ['"No"'], style: { font: { color: { argb: "FF9CA3AF" } } } },
  ] });

  // ================================================= Decisions & Services
  titleBlock(ds, "Decisions and services", "What the project team has already decided or arranged, and what other teams provide. Nothing here needs an answer from IKL unless it says so.", 6);
  headerRow(ds, 3, ["Topic", "Decision / what will be done", "Provided by", "Needed by", "Status", "Notes"]);
  [26, 90, 24, 17, 14, 44].forEach((w, i) => { ds.getColumn(i + 1).width = w; });
  const DEC = [
    ["Email delivery", "Campaigns are sent through a third-party email service provided by the IT department (Mailchimp expected). IKL's own address (info@ikl.com.pk) stays the visible sender. More than 500 emails a day are expected. Delivered, opened, clicked and bounced figures are read back from the service into the CRM.", "IT department", D(10, 23), "Requested", "Needed: access to the service, a verified sending domain, and the exact product and plan."],
    ["Who runs campaigns", "Campaigns are created and sent by the Marketing role only. Sales sees the results. Marketing and Sales work on the same shared IKL data (companies, groups and folders), tagged by team.", "Project team", null, "Confirmed", ""],
    ["WhatsApp", "IKL will use WhatsApp, including campaigns to lists. The IT department provides a third-party WhatsApp API that is connected to the CRM. This is an added request (not in the BRD) and is planned in Sprint 3.", "IT department", D(11, 3), "Requested", "Campaign messages need approved templates; approval takes time."],
    ["Website", "ikl.com.pk is built in-house (Next.js). The project team connects the website forms to the CRM; IKL provides the list of forms and wording (Q20).", "Project team", null, "Confirmed", ""],
    ["Invoices", "Invoices are issued in IKL's finance system. The CRM records a reference only: invoice number, date, amount and payment status, entered by the sales team (Q17). The CRM does not create invoices or calculate tax.", "IKL finance", D(10, 22), "Requested", ""],
    ["Document search", "Search covers names, titles, types, clients, programs, dates and the text inside PDF, Word and Excel files. Scanned images need OCR, which is not included.", "Project team", null, "Confirmed", ""],
    ["Acceptance and training", "IKL nominates the person who accepts each delivery and the staff to be trained. The project team schedules the training before go-live.", "IKL", D(11, 17), "Requested", "Training uses the forms and templates IKL shares (Q21)."],
    ["Web address", "The CRM is reachable by IKL users at an agreed web address. Real email tracking and the website forms need this.", "IT department", D(11, 10), "Requested", ""],
  ];
  DEC.forEach((d, i) => {
    const row = ds.getRow(4 + i);
    row.values = [d[0], d[1], d[2], d[3] || "-", d[4], d[5]];
    for (let c = 1; c <= 6; c++) styleCell(row.getCell(c), { fill: i % 2 ? BAND : undefined });
    row.getCell(1).font = F({ bold: true, color: { argb: NAVY } });
    row.getCell(4).numFmt = "ddd dd mmm"; [4, 5].forEach((c) => { row.getCell(c).alignment = { horizontal: "center", vertical: "top", wrapText: true }; });
    row.getCell(5).dataValidation = { type: "list", allowBlank: false, formulae: ['"Requested,Received,Confirmed,Late"'] };
    row.height = est(Math.max(linesFor(d[1], 90), linesFor(d[5], 44)));
  });
  ds.addConditionalFormatting({ ref: "E4:E20", rules: [
    { type: "cellIs", operator: "equal", priority: 30, formulae: ['"Confirmed"'], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFD1FAE5" } } } },
    { type: "cellIs", operator: "equal", priority: 31, formulae: ['"Received"'], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFD1FAE5" } } } },
    { type: "cellIs", operator: "equal", priority: 32, formulae: ['"Late"'], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFEE2E2" } }, font: { bold: true, color: { argb: "FF991B1B" } } } },
  ] });

  // ================================================= Summary
  const N = fnRows.length;
  const E = "'Functional Checklist'!$E$2:$E$500", B = "'Functional Checklist'!$B$2:$B$500", C = "'Functional Checklist'!$C$2:$C$500", H = "'Functional Checklist'!$H$2:$H$500", A = "'Functional Checklist'!$A$2:$A$500";
  const cntS = (st, f = () => true) => fnRows.filter((r) => r[4] === st && f(r)).length;
  const done = cntS("Done"), part = cntS("Partial"), pend = cntS("Pending");
  sm.getColumn(1).width = 12; sm.getColumn(2).width = 58; sm.getColumn(3).width = 14; [4, 5, 6, 7].forEach((c) => { sm.getColumn(c).width = 11; }); sm.getColumn(8).width = 13;
  titleBlock(sm, "IKL CRM - progress and sprint plan", "Against BRD IKL-CRM-BRD-001 v0.1. Status as of 26 Oct 2026: Sprint 1 delivered. Final delivery: 30 November 2026, in four sprints. Figures recalculate when a status in 'Functional Checklist' is changed.", 8);
  const sec = (r, t) => { const c = sm.getCell(r, 1); c.value = t; c.font = F({ bold: true, size: 11, color: { argb: NAVY } }); };
  sec(4, "Key figures");
  [
    ["Functions listed", { formula: `COUNTA(${A})`, result: N }],
    ["Done", { formula: `COUNTIF(${E},"Done")`, result: done }],
    ["Partial", { formula: `COUNTIF(${E},"Partial")`, result: part }],
    ["Pending", { formula: `COUNTIF(${E},"Pending")`, result: pend }],
    ["Coverage* (Done + half of Partial)", { formula: "(C6+0.5*C7)/C5", result: (done + 0.5 * part) / N }],
    ["Fully done (Done only)", { formula: "C6/C5", result: done / N }],
  ].forEach(([l, v], i) => {
    const r = 5 + i; sm.getCell(r, 2).value = l; sm.getCell(r, 2).font = F();
    const c = sm.getCell(r, 3); c.value = v; c.font = F({ bold: true }); c.alignment = { horizontal: "right" }; if (i >= 4) c.numFmt = "0%";
  });
  sm.getCell("B11").value = "Days left to the deadline (30 Nov 2026)"; sm.getCell("B11").font = F();
  sm.getCell("C11").value = { formula: "DATE(2026,11,30)-TODAY()", result: 0 }; sm.getCell("C11").font = F({ bold: true, color: { argb: "FF991B1B" } }); sm.getCell("C11").alignment = { horizontal: "right" };

  sec(13, "Coverage by requirement");
  headerRow(sm, 14, ["BRD ID", "Requirement", "Priority", "Functions", "Done", "Partial", "Pending", "Coverage*"]);
  const REQ = [
    ["CRM 1", "Centralized database (leads, clients, participants, alumni)", "1 - Critical"], ["CRM 2", "Lead qualification and pipeline management", "1 - Critical"],
    ["CRM 3", "Programs, inquiries, registrations, participants, attendance", "1 - Critical"], ["CRM 4", "Migration of existing Excel data", "1 - Critical"],
    ["CRM 5", "Keyword search of documents and information", "2 - High"], ["MIR 1", "Email campaigns: create, segment, schedule, automate, track", "1 - Critical"],
    ["MIR 2", "Website forms integration", "1 - Critical"], ["MIR 3", "Dashboards and reports", "1 - Critical"],
    ["MIR 4", "Campaign, lead and customer activity history", "2 - High"], ["MIR 5", "Filtering and reporting by program, source, status, organization, date", "2 - High"],
    ["SET", "IKL workspace, roles, access and sender settings", "1 - Critical"], ["GO", "Go-live readiness: availability, backup, performance, acceptance, training", "1 - Critical"],
    ["WA", "WhatsApp campaigns and inbox (added request, not in the BRD)", "2 - High"],
  ];
  const R0 = 15;
  REQ.forEach((q, i) => {
    const r = R0 + i, sub = fnRows.filter((x) => x[1] === q[0]);
    const d = sub.filter((x) => x[4] === "Done").length, p = sub.filter((x) => x[4] === "Partial").length, pe = sub.filter((x) => x[4] === "Pending").length;
    const row = sm.getRow(r);
    row.getCell(1).value = q[0]; row.getCell(2).value = q[1]; row.getCell(3).value = q[2];
    row.getCell(4).value = { formula: `COUNTIF(${B},A${r})`, result: sub.length };
    row.getCell(5).value = { formula: `COUNTIFS(${B},A${r},${E},"Done")`, result: d };
    row.getCell(6).value = { formula: `COUNTIFS(${B},A${r},${E},"Partial")`, result: p };
    row.getCell(7).value = { formula: `COUNTIFS(${B},A${r},${E},"Pending")`, result: pe };
    row.getCell(8).value = { formula: `(E${r}+0.5*F${r})/D${r}`, result: (d + 0.5 * p) / sub.length };
    for (let c = 1; c <= 8; c++) styleCell(row.getCell(c), {});
    row.getCell(1).font = F({ bold: true, color: { argb: NAVY } }); [3, 4, 5, 6, 7, 8].forEach((c) => { row.getCell(c).alignment = { horizontal: "center", vertical: "middle", wrapText: true }; });
    row.getCell(8).numFmt = "0%"; row.height = 22;
  });
  const RL = R0 + REQ.length - 1, RT = RL + 1;
  const tr = sm.getRow(RT); tr.getCell(1).value = "Total";
  ["D", "E", "F", "G"].forEach((c, i) => { tr.getCell(4 + i).value = { formula: `SUM(${c}${R0}:${c}${RL})`, result: [N, done, part, pend][i] }; });
  tr.getCell(8).value = { formula: `(E${RT}+0.5*F${RT})/D${RT}`, result: (done + 0.5 * part) / N };
  for (let c = 1; c <= 8; c++) { styleCell(tr.getCell(c), { fill: BAND, font: { bold: true } }); if (c >= 4) tr.getCell(c).alignment = { horizontal: "center" }; }
  tr.getCell(8).numFmt = "0%";
  try { sm.addConditionalFormatting({ ref: `H${R0}:H${RL}`, rules: [{ type: "dataBar", priority: 6, cfvo: [{ type: "num", value: 0 }, { type: "num", value: 1 }], color: { argb: "FF5EEAD4" } }] }); } catch (e) { /* optional */ }

  const P0 = RT + 2;
  sec(P0, "Delivery plan at a glance");
  headerRow(sm, P0 + 1, ["Sprint", "Name", "Delivery", "Functions", "Tuesday demos", "", "", "Planned coverage*"]);
  sm.mergeCells(P0 + 1, 5, P0 + 1, 7);
  let cum = done + 0.5 * part;
  const demoTxt = { 1: "Delivered", 2: "3 Nov, 10 Nov", 3: "17 Nov, 24 Nov", 4: "30 Nov (final)" };
  for (let s = 1; s <= 4; s++) {
    const r = P0 + 1 + s, inS = fnRows.filter((x) => sprintOf[x[0]] === s);
    inS.forEach((x) => { cum += x[4] === "Pending" ? 1 : x[4] === "Partial" ? 0.5 : 0; });
    const row = sm.getRow(r);
    row.getCell(1).value = `Sprint ${s}`; row.getCell(2).value = SPRINTS[s].title;
    row.getCell(3).value = { formula: `'Sprint Plan'!D${4 + s}`, result: CAL[s].end };
    row.getCell(4).value = { formula: `COUNTIF(${H},${s})`, result: inS.length };
    row.getCell(5).value = demoTxt[s]; sm.mergeCells(r, 5, r, 7);
    row.getCell(8).value = cum / N;
    for (let c = 1; c <= 8; c++) styleCell(row.getCell(c), { fill: s === 1 ? "FFECFDF5" : undefined });
    if (s === 1) { row.getCell(1).value = "Sprint 1 \u2713"; }
    row.getCell(1).font = F({ bold: true, color: { argb: NAVY } }); [3, 4, 5, 8].forEach((c) => { row.getCell(c).alignment = { horizontal: "center", vertical: "middle", wrapText: true }; });
    row.getCell(3).numFmt = "dd mmm yyyy"; row.getCell(8).numFmt = "0%"; row.height = 22;
  }
  const NR = P0 + 7;
  sm.getCell(NR, 2).value = "* Coverage = Done + half of Partial. Planned coverage assumes every function listed for the sprint is delivered. The live figure in Key figures changes as statuses are updated in Functional Checklist.";
  sm.getCell(NR, 2).font = F({ italic: true, size: 9, color: { argb: GREY } }); sm.mergeCells(NR, 2, NR, 8); sm.getCell(NR, 2).alignment = { wrapText: true, vertical: "top" }; sm.getRow(NR).height = 28;

  const G0 = NR + 2;
  sec(G0, "Where the gaps are (Priority 1) and when they close");
  [
    ["MIR 2", "Website forms integration - nothing is captured from the IKL website yet (0 of 7 functions). Closes in Sprint 3."],
    ["CRM 3", "Programs, registrations, participants and attendance - the weakest area; training is recorded per client engagement, not as a program catalogue with registrations. Closes in Sprints 2-3."],
    ["MIR 1", "Email campaigns are fully built, but sending is demo-mode: no real email is delivered and scheduled campaigns do not send on their own. Closes in Sprints 2-3."],
    ["CRM 4", "Excel migration works for contacts only. Companies and contacts are loaded in Sprint 2; everything else in Sprint 4. Needs IKL's Excel files (Q16, Q22)."],
    ["MIR 3", "Invoice and payment references and the revenue report are done (Sprint 1). Reports still cannot be exported; registration, team and program reports and the date range follow in Sprint 4."],
  ].forEach((g, i) => {
    const r = G0 + 1 + i; sm.getCell(r, 1).value = g[0]; sm.getCell(r, 1).font = F({ bold: true, color: { argb: NAVY } }); sm.getCell(r, 1).alignment = { vertical: "top" };
    sm.getCell(r, 2).value = g[1]; sm.mergeCells(r, 2, r, 8); sm.getCell(r, 2).alignment = { wrapText: true, vertical: "top" }; sm.getCell(r, 2).font = F(); sm.getRow(r).height = 30;
  });

  const fnText = Object.fromEntries(fnRows.map((r) => [r[0], r[3]]));
  const s1 = addSprint1Report(wb, { F, styleCell, headerRow, titleBlock, est, linesFor, solid, NAVY, BAND, GREY, box, SPRINT2_ITEMS: SPRINTS[2].items });
  s1.fillRows(fnText);
  s1.ws.orderNo = sm.orderNo + 0.5;
  s1.ws.properties.tabColor = { argb: "FF059669" };

  const doneBefore = done - fnRows.filter((r) => r.was).length;
  const partBefore = part + fnRows.filter((r) => r.was === "Partial").length;
  const pendBefore = pend + fnRows.filter((r) => r.was === "Pending").length;
  const covBefore = (doneBefore + 0.5 * partBefore) / N;
  sm.getColumn(10).width = 28; [11, 12].forEach((c) => { sm.getColumn(c).width = 11; }); sm.getColumn(13).width = 12;
  sm.getCell("J4").value = "Since the last report (19 Oct)"; sm.getCell("J4").font = F({ bold: true, size: 11, color: { argb: NAVY } });
  ["Measure", "19 Oct", "Now", "Change"].forEach((l, i) => {
    const c = sm.getCell(5, 10 + i); c.value = l; c.fill = solid(NAVY); c.font = F({ bold: true, color: { argb: "FFFFFFFF" } }); c.border = box; c.alignment = { horizontal: i ? "center" : "left" };
  });
  const cmp = [
    ["Done", doneBefore, { formula: "C6", result: done }, { formula: "L6-K6", result: done - doneBefore }, "good"],
    ["Partial", partBefore, { formula: "C7", result: part }, { formula: "L7-K7", result: part - partBefore }, "down"],
    ["Pending", pendBefore, { formula: "C8", result: pend }, { formula: "L8-K8", result: pend - pendBefore }, "down"],
    ["Coverage*", covBefore, { formula: "C9", result: (done + 0.5 * part) / N }, { formula: "L9-K9", result: (done + 0.5 * part) / N - covBefore }, "good"],
    ["Sprint 1 functions done", 0, 7, 7, "good"],
  ];
  cmp.forEach((r, i) => {
    const row = 6 + i;
    r.slice(0, 4).forEach((v, k) => {
      const c = sm.getCell(row, 10 + k); c.value = v; c.border = box; c.font = F({ bold: k === 0 || k === 3 });
      c.alignment = { horizontal: k ? "center" : "left" };
      if (row === 9) c.numFmt = k === 3 ? "+0%;-0%;0%" : "0%"; else if (k === 3) c.numFmt = "+0;-0;0";
    });
    // green = progress (more Done, less Partial / Pending)
    sm.getCell(row, 13).fill = solid("FFD1FAE5"); sm.getCell(row, 13).font = F({ bold: true, color: { argb: "FF065F46" } });
  });

  wb.views = [{ activeTab: 0 }];
  wb.calcProperties = { fullCalcOnLoad: true };
  for (const ws of wb.worksheets) ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  await wb.xlsx.writeFile(OUT);
  const per = [1, 2, 3, 4].map((s) => fnRows.filter((x) => sprintOf[x[0]] === s).length);
  let c2 = done + 0.5 * part; const covs = [];
  for (let s = 1; s <= 4; s++) { fnRows.filter((x) => sprintOf[x[0]] === s).forEach((x) => { c2 += x[4] === "Pending" ? 1 : 0.5; }); covs.push(Math.round((c2 / N) * 100) + "%"); }
  console.log("wrote", OUT, { N, done, part, pend, per, now: Math.round(((done + 0.5 * part) / N) * 100) + "%", covs });
})();
