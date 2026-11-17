"use strict";
// "Sprint 3 Report" sheet for the IKL workbook: what was planned, what is now done, where to see it.
// Same layout as the Sprint 1 and 2 reports. `status` is the status after Sprint 3 (Done or Partial).
// Statuses are deliberately honest: a function that is built but waits for IT / IKL / the website stays Partial.

const DONE_NOW_S3 = {
  "CRM-3.4": { was: "Pending", status: "Done", where: "Programs > a program > Roster; Registrations (left menu)", note: "Delivered in Sprint 3. Register one person or a company nomination for a batch; the person is matched by email so everyone stays one record. Seats per batch are enforced (a full batch refuses more people; no waiting list). Fee, payment status, amount received and invoice reference are recorded.", how: "Open the batch roster and press Register participant (name, email) or Company nomination (pick the company, paste one person per line). A report shows who was registered and who was refused and why. The Registrations screen lists everyone with filters.", demo: "Programs > a program > Roster > Register participant; then Company nomination with three names on a batch with two seats left." },
  "CRM-3.5": { was: "Pending", status: "Done", where: "Programs > a program > Roster; Registrations", note: "Delivered in Sprint 3. Each batch has a participant list with seats used, attended, completed, feedback average and fees.", how: "The roster shows every registered person with company, attendance, payment, completion and feedback; the program page shows the totals per batch.", demo: "Open a roster and point at the tiles (seats, attended, completed, feedback, fees)." },
  "CRM-3.6": { was: "Pending", status: "Done", where: "Roster > Attendance column; Deal > Training & TNA (in-house)", note: "Delivered in Sprint 3. Attendance Registered / Attended / No Show, one by one or for a selection; also for in-house participants on a deal.", how: "Change the Attendance drop-down on a row, or tick several rows and use Mark selected Attended / No Show.", demo: "Tick two rows on the roster and press Mark selected Attended." },
  "CRM-1.7": { was: "Pending", status: "Done", where: "Roster > Complete; contact header (Alumnus badge)", note: "Delivered in Sprint 3. Rule: a person becomes an alumnus when a registration is marked Completed (the person must have attended), or when an in-house participant attended an engagement that is Completed. Undoing a completion recalculates the flag. The CRM only records the certificate (number, date, issued); it does not produce certificate documents.", how: "On the roster press the certificate icon on an attended person, enter the certificate number and date. Close batch completes everyone who attended.", demo: "Mark a person Attended, complete them with a certificate number; the contact shows the Alumnus badge." },
  "CRM-3.8": { was: "Pending", status: "Done", where: "Roster > Feedback; program page", note: "Delivered in Sprint 3. Feedback score 1 to 5 and comments per registration, entered by staff or arriving from the website feedback form; averages are shown per batch.", how: "Press the feedback icon on a roster row. The batch tile and the program page show the average.", demo: "Record a score of 5 with a comment and show the batch average." },
  "CRM-3.7": { was: "Partial", status: "Done", where: "Contact > Program history; Company > Program history", note: "Delivered in Sprint 3. A person's history lists the batches registered for (attendance, completion, certificate, feedback), in-house trainings attended and program inquiries. A client company shows its nominees' registrations and in-house engagements.", how: "Open any contact or company and the Program history tab.", demo: "Open the alumnus contact and the nominating company and show the Program history tab." },
  "MIR-5.3": { was: "Pending", status: "Done", where: "Contacts > All programs filter", note: "Delivered in Sprint 3. Filter contacts by program: interested, registered, attended, completed (alumni) or made an inquiry.", how: "Pick a program in the contacts filter bar, then choose the relationship.", demo: "Filter contacts by a program and Completed." },
  "MIR-5.6": { was: "Partial", status: "Done", where: "Deals > filter bar", note: "Delivered in Sprint 3. The deals board can be searched (name or reference) and filtered by program, organization, owner, status and created dates.", how: "Use the filter bar above the pipeline; Clear filters resets it.", demo: "Filter the board by a program and a date range." },
  "MIR-1.8": { was: "Partial", status: "Done", where: "Automations (Marketing role)", note: "Delivered in Sprint 3. Workflows now run by themselves: trigger, wait, condition (opened the last email, clicked, replied on WhatsApp, is registered), send email, send WhatsApp, create task, notify the owner, change status. A person enters a workflow once, leaves it if they unsubscribe, and every step is logged. Emails inside a workflow are delivered for real once the email service is connected (MIR-1.5).", how: "Create an automation, add steps one after another, press Activate. A scheduler wakes people when their wait is over.", demo: "Create 'website form received > send email > wait > if opened create a task', activate it, submit a website enquiry and show the log." },
  "CRM-2.2": { was: "Partial", status: "Done", where: "Settings > Lead scoring; contact lead score", note: "Delivered in Sprint 3. Lead score now follows real activity: email opened and clicked, WhatsApp reply, website form, meeting completed. The fake demo shortcut no longer adds points. Reaching the threshold marks the lead Qualified.", how: "Rules and threshold are in Settings > Lead scoring. Each score change appears on the person's timeline.", demo: "Submit a website form and show the score and timeline of the new lead." },
  "CRM-2.9": { was: "Partial", status: "Partial", where: "Notifications; Tasks > Team follow-ups", note: "Built in Sprint 3: the owner gets a notification and an email 24 hours before a task or meeting is due; managers get one digest notification when follow-ups stay overdue for more than a day and see a Team follow-ups table. Email reminders become real when the email account is connected; WhatsApp reminders to staff are not built (decision for IKL).", how: "Reminders go out by themselves. The Tasks page shows the Team follow-ups table to managers.", demo: "Create a task due tomorrow and show the reminder notification; show the Team follow-ups table as the Head." },
  "WA-1": { was: "Pending", status: "Partial", where: "Campaigns > New > Channel WhatsApp", note: "Built in Sprint 3 and running in demo mode: WhatsApp campaigns to a list or segment with the same audiences, scheduling and counters as email; people without a number, who unsubscribed or opted out are skipped. Real sending needs the WhatsApp API and approved templates from the IT department, and IKL's confirmation of the consent rule.", how: "Choose WhatsApp as the channel, write the message ({{firstName}} etc.), choose the audience, send or schedule.", demo: "Create and send a WhatsApp campaign to a small segment; show delivered counts." },
  "WA-2": { was: "Partial", status: "Partial", where: "WhatsApp (left menu); contact history", note: "Built in Sprint 3: replies arrive through a secured webhook, land in the shared inbox and on the person's history, raise the lead score, notify the owner, count as a reply for the campaign and can start an automation; delivery receipts update the status. Waiting for the real WhatsApp service from the IT department.", how: "The WhatsApp service posts replies to the CRM; staff answer from the inbox.", demo: "Post a test reply to the webhook and show it in the inbox, the history and the campaign reply count." },
  "MIR-2.1": { was: "Pending", status: "Partial", where: "Website forms (left menu)", note: "CRM side built and tested in Sprint 3: the enquiry form endpoint creates the lead (or matches the existing person), assigns an owner and logs the submission. It goes live when the IKL website sends the form (website team) and IKL confirms the form fields (Q20).", how: "The website posts to /api/public/forms/enquiry with the IKL key; see the Website forms screen.", demo: "Send a test enquiry and show the new lead and the Website forms screen." },
  "MIR-2.2": { was: "Pending", status: "Partial", where: "Website forms", note: "CRM side built and tested in Sprint 3: brochure download submissions create or match the person, record the program interest and the download. Waiting for the website to send the form.", how: "The website posts to /api/public/forms/brochure.", demo: "Send a brochure test and show the program interest on the contact." },
  "MIR-2.3": { was: "Pending", status: "Partial", where: "Website forms; Registrations", note: "CRM side built and tested in Sprint 3: a registration submitted on the website creates the registration in the chosen batch (seat limit respected; a full batch is refused with a clear message). Waiting for the website to send the form.", how: "The website posts to /api/public/forms/registration with the batch code; the catalogue endpoint lists open batches.", demo: "Send a registration test and show it on the roster with source Website." },
  "MIR-2.4": { was: "Pending", status: "Partial", where: "Website forms; roster feedback", note: "CRM side built and tested in Sprint 3: a feedback form matches the person's registration and records score and comments. Waiting for the website to send the form.", how: "The website posts to /api/public/forms/feedback.", demo: "Send a feedback test and show the score on the roster." },
  "MIR-2.5": { was: "Pending", status: "Done", where: "API & Webhooks (administrator); documentation", note: "Delivered in Sprint 3. A secure channel for the website: an API key linked to the IKL department (stored hashed, shown once), limited to 120 requests a minute and 50 KB, with a hidden spam-trap field. The key is used from the website's server only. Instructions for the website team are in docs/website-forms.md.", how: "The administrator creates the key in API & Webhooks (department IKL); the website team stores it as a server secret.", demo: "Show the key creation and a rejected call with a wrong key." },
  "MIR-2.6": { was: "Pending", status: "Done", where: "Website forms; contact; notifications", note: "Delivered in Sprint 3. Captured leads are tagged with the source Website, matched by email so no duplicate is created, assigned to an owner (the manager unless IKL names someone) who receives a notification.", how: "Automatic on every form.", demo: "Send the same enquiry twice: one contact, two submissions, one notification each time." },
  "MIR-2.7": { was: "Pending", status: "Partial", where: "Contact timeline", note: "Built in Sprint 3: every form triggers an acknowledgement email to the sender with default wording that IKL can replace (Q20). In demo mode the email is recorded as prepared, not delivered; it becomes real when the email account is connected (MIR-1.5).", how: "Automatic on every form; the contact timeline shows it.", demo: "Show the timeline entry 'Acknowledgement email prepared' on the new lead." },
};

function addSprint3Report(wb, h) {
  const { F, styleCell, headerRow, titleBlock, est, linesFor, solid, NAVY, BAND, GREY, box, SPRINT4_ITEMS, counts } = h;
  const ws = wb.addWorksheet("Sprint 3 Report", { views: [{ state: "frozen", ySplit: 6, showGridLines: false }] });
  [10, 52, 11, 11, 36, 60, 56, 24].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const refs = Object.keys(DONE_NOW_S3);
  const nDone = refs.filter((r) => DONE_NOW_S3[r].status === "Done").length;
  const nPart = refs.length - nDone;
  titleBlock(ws, "Sprint 3 report - delivered",
    `Sprint 3 ran 11 to 24 November 2026: registrations and attendance, completion and alumni, feedback, automation, WhatsApp and the website forms. ${nDone} of ${refs.length} planned functions are fully built and tested in the running system; ${nPart} are built and tested but wait for the IT department (real email and WhatsApp services) or for the IKL website to send its forms. Status Partial is used on purpose for those.`, 8);

  ws.mergeCells("A4:H5");
  const banner = ws.getCell("A4");
  banner.value = `SPRINT 3:   ${refs.length} planned   |   ${nDone} delivered   |   ${nPart} built, waiting for IT / website        Coverage ${counts.before} -> ${counts.after}        Sprint 4 starts 25 Nov`;
  banner.font = F({ bold: true, size: 14, color: { argb: "FF065F46" } });
  banner.fill = solid("FFD1FAE5");
  banner.alignment = { horizontal: "center", vertical: "middle" };
  banner.border = box;
  ws.getRow(4).height = 18; ws.getRow(5).height = 18;

  headerRow(ws, 6, ["Ref", "Function", "Before", "Now", "Where to find it", "How it works", "How to show it (demo steps)", "IKL sign-off (name, date)"]);
  return { ws, refs, DONE_NOW_S3, fillRows(fnText) {
    refs.forEach((ref, i) => {
      const d = DONE_NOW_S3[ref], r = 7 + i, row = ws.getRow(r);
      row.values = [ref, fnText[ref], d.was, d.status, d.where, d.how, d.demo, ""];
      for (let c = 1; c <= 8; c++) styleCell(row.getCell(c), { fill: i % 2 ? BAND : undefined });
      row.getCell(1).font = F({ bold: true, color: { argb: NAVY } });
      row.getCell(3).alignment = { horizontal: "center", vertical: "top" }; row.getCell(4).alignment = { horizontal: "center", vertical: "top" };
      const was = d.was === "Pending" ? ["FFFEE2E2", "FF991B1B"] : ["FFFEF3C7", "FF92400E"];
      row.getCell(3).fill = solid(was[0]); row.getCell(3).font = F({ bold: true, color: { argb: was[1] } });
      const now = d.status === "Done" ? ["FFD1FAE5", "FF065F46"] : ["FFFEF3C7", "FF92400E"];
      row.getCell(4).fill = solid(now[0]); row.getCell(4).font = F({ bold: true, color: { argb: now[1] } });
      row.height = est(Math.max(linesFor(fnText[ref], 52), linesFor(d.how, 60), linesFor(d.demo, 56), linesFor(d.where, 36), linesFor(d.note, 60)));
    });
    let r = 7 + refs.length + 1;
    const section = (title) => { ws.getCell(r, 1).value = title; ws.getCell(r, 1).font = F({ bold: true, size: 11, color: { argb: NAVY } }); r += 1; };
    const bullets = (items) => items.forEach((t) => {
      ws.mergeCells(r, 1, r, 8); const c = ws.getCell(r, 1); c.value = "• " + t; c.font = F(); c.alignment = { wrapText: true, vertical: "top" };
      ws.getRow(r).height = est(linesFor(t, 200)); r += 1;
    });
    section("What the status 'Partial' means in this sprint");
    bullets(refs.filter((x) => DONE_NOW_S3[x].status === "Partial").map((x) => `${x}: ${DONE_NOW_S3[x].note}`));
    r += 1;
    section("Also delivered in Sprint 3 (not separate checklist items)");
    bullets([
      "Welcome tour on first login and a Guide page in the left menu: step-by-step for the Head, Sales, Marketing and the Rector, with a glossary of the terms used in the CRM.",
      "A background scheduler that runs scheduled campaigns, automation waits, overdue tasks and reminders by itself.",
      "Notifications are clickable and open the related screen.",
      "Registrations and Website forms are in the left menu; the WhatsApp campaign appears next to email in the campaign wizard.",
      "One-page overview of the whole system (what works, what waits) for the team.",
    ]);
    r += 1;
    section("Still needed (please confirm what has been sent)");
    bullets([
      "From the IT department: the WhatsApp API details and approved message templates; the email account and sending-domain verification; the permanent web address and a scheduler (cron) call every few minutes.",
      "From IKL: the website forms (fields and the wording of the acknowledgement emails, Q20); your existing feedback, attendance and nomination forms (Q21); confirmation that people may receive WhatsApp messages and which consent we rely on; the answer on waiting lists (seat limits are enforced; waiting lists are out of scope unless approved).",
      "From the website team: send the four forms to the CRM (instructions in docs/website-forms.md).",
      "Decisions to confirm: attendance is required before completion; the owner of a new web lead is the department manager unless IKL names someone else.",
    ]);
    r += 1;
    section("Next: Sprint 4 starts 25 November, final delivery Monday 30 November");
    bullets(SPRINT4_ITEMS);
  } };
}

module.exports = { DONE_NOW_S3, addSprint3Report };
