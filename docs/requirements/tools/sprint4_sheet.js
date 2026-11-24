"use strict";
// "Sprint 4 Report" sheet for the IKL workbook: reports, migration tools, document search and go-live readiness.
// Same layout as the Sprint 1 to 3 reports. `status` is the status after Sprint 4 (Done or Partial).
// Statuses are deliberately honest: a function that is built but waits for the IT department, for IKL's files or for the
// go-live day itself stays Partial.

const DONE_NOW_S4 = {
  "MIR-3.9": { was: "Partial", status: "Done", where: "Every dashboard and report: Period selector at the top", note: "Delivered in Sprint 4. The IKL dashboard, the Revenue report, the department dashboard and every new report can be limited to a period: last 7, 30 or 90 days, this month, this year, or your own dates. Totals such as contacts, open deals and pipeline value stay today's figures; won deals, proposals, money, leads and campaigns follow the period.", how: "Choose the period in the bar at the top of the page. The address keeps the period, so a bookmark or a shared link shows the same view.", demo: "Open the IKL dashboard, choose Last 30 days, then a custom range, and watch the won, proposals and leads figures change while the totals stay." },
  "MIR-3.5": { was: "Pending", status: "Done", where: "Reports > Registrations by batch; Registration list", note: "Delivered in Sprint 4. Per batch: registered, attended, no-show, completed, certificates, fees, received and feedback; and a list with one line per registration (person, company, source, attendance, payment, completion, certificate, feedback). Cancelled registrations are not counted.", how: "Reports > Registrations by batch (or Registration list), choose a period, then Excel or PDF.", demo: "Open Registrations by batch for this year and download the Excel file." },
  "MIR-5.8": { was: "Pending", status: "Done", where: "Reports > Report by program; Report by source; Report by date (monthly)", note: "Delivered in Sprint 4. By program: inquiries, interested people, registrations, completion, fees received, feedback. By source: leads, qualified, converted, deals, won value and registrations. By date: month by month new contacts, deals, wins, registrations, completions and payments.", how: "Reports hub: pick the report and the period.", demo: "Open Report by source for the last 90 days and compare Website with Referral." },
  "MIR-3.7": { was: "Partial", status: "Done", where: "Reports > Team performance (Head of Department)", note: "Delivered in Sprint 4. Per team member: leads owned and converted, follow-ups done, open and overdue, meetings held, calls logged, deals, deals won and won value, for the chosen period. Visible to the Head of Department only.", how: "Reports > Team performance, choose a period.", demo: "Open Team performance as the Head and show one salesperson's row." },
  "MIR-3.8": { was: "Pending", status: "Done", where: "Every report: Excel and PDF buttons (Head of Department and Marketing)", note: "Delivered in Sprint 4. Each report downloads as an Excel file (numbers kept as numbers, widths set) or a PDF (A4 landscape, repeated header, page numbers). The file shows the period and department and carries the same figures as the screen. Sales can view reports but not export, as in the agreed Roles sheet. Non-Latin letters (for example Urdu names) are shown as ? in the PDF; the Excel file keeps them.", how: "Open a report and press Excel or PDF. Every export is recorded in the Audit Log.", demo: "Download the Registrations report as Excel and as PDF and open both." },
  "CRM-5.4": { was: "Pending", status: "Done", where: "Documents (left menu)", note: "Delivered in Sprint 4. Find attached documents by file name, title and description, and narrow them by type (PDF, Word, Excel, PowerPoint, image, text), client, program and upload date. A document can have an optional title when it is attached. Results show the record each file belongs to.", how: "Documents > type words > Search; use the filters under the search box.", demo: "Search a client's name in Documents and filter to PDF files." },
  "CRM-5.5": { was: "Pending", status: "Done", where: "Documents > Search inside the files", note: "Delivered in Sprint 4. The words inside PDF, Word (.docx), Excel, PowerPoint (.pptx), text and CSV files are read when the file is attached and can be searched; results show the sentence around the word. Older .doc and .ppt files are read on a best-effort basis. Scanned images and PDFs that are only pictures have no text to read; reading pictures (OCR) is not part of the project.", how: "Attach a file; Documents > Inside the files only > type a word. Files attached before Sprint 4 are read with the Read documents button.", demo: "Attach a Word file, then search a word that is only inside it." },
  "CRM-4.8": { was: "Pending", status: "Done", where: "Programs > Import program data", note: "Delivered in Sprint 4. One Excel template with sheets for Programs, Batches, Participants, Registrations (attendance, payment, completion, certificate, feedback) and History. A Check step tries everything and saves nothing; Import then writes it. It can be repeated safely: people are matched by email, programs by code, batches by program and code, registrations by batch and person. People who completed a program become alumni.", how: "Programs > Import program data: Download the template, fill it, Check the file, fix the rows listed, Import. Every import is recorded in the Audit Log.", demo: "Import a small file with one program, one batch, two people and one registration, then repeat it and show that nothing is duplicated." },
  "CRM-4.9": { was: "Pending", status: "Partial", where: "Contacts > Import; Companies > Import; Programs > Import program data; docs/go-live-runbook.md", note: "The tools for the one-time migration are built and tested (contacts, companies, programs, batches, participants, registrations, history, with a check before every import). The migration itself needs IKL's Excel files and the IKL focal person to check the loaded data record by record; it is done in the go-live week.", how: "Follow step 1 of the go-live runbook with the focal person.", demo: "Load a sample file, show the check report and the loaded records." },
  "MIR-4.4": { was: "Pending", status: "Partial", where: "Contact and Deal > Log Email; /api/email/capture", note: "Staff can log an email they sent or received on a contact or a deal (direction, date, subject, text); it appears on the history. The automatic way is built too: a CRM mailbox in Bcc, routed by the IT department to /api/email/capture, records the mail on the right person without duplicates. That part waits for the IT department's mailbox.", how: "Press Log Email on a contact or deal. For the automatic way see docs/email-delivery.md.", demo: "Log a received email and show it on the history; post a test message to the capture address." },
  "GO-2": { was: "Pending", status: "Partial", where: "npm run db:backup, db:restore, db:backup:verify; docs/go-live-runbook.md", note: "Backup (database and attached files) and restore are built, and the restore was tested: a backup was restored into a scratch database and every table matched (58 tables, 8,157 rows). What is left is on the host: the daily schedule, a persistent disk for attached documents, and running the check once on the production database.", how: "npm run db:backup:verify prints RESTORE CHECK PASSED when a fresh backup restores to identical row counts.", demo: "Run the restore check and show the result." },
  "GO-3": { was: "Pending", status: "Done", where: "npm run perf:check; docs/performance-check.md", note: "Delivered in Sprint 4. Twenty common screens (lists, search, filters, dashboards, reports, documents) were timed on a production build with 4,296 contacts and 224 deals: all are far under the targets (screens 2 seconds, search 1 second); the slowest is the deals board at about 0.1 second on the same computer. The check can be repeated on the live address; hosting adds network time.", how: "npm run perf:check -- --url <address> --cookie <session>; results in docs/performance-check.md.", demo: "Run the check and show the table." },
  "GO-4": { was: "Pending", status: "Partial", where: "APP_MODE=live; npm run golive:cleanup", note: "Built: a live switch (APP_MODE=live) that removes the demo banner, the one-click demo logins and the Demo Center, and a cleanup that deletes the demo data and keeps the set-up (departments, roles, permissions, stages, settings, users). It shows a dry run first, takes a backup, and needs the database name typed to confirm. The dry run was tested; the real deletion has not been run because it is done on the go-live day, after IKL's data is checked.", how: "npm run golive:cleanup (dry run); then with --confirm-database <name>; then set APP_MODE=live.", demo: "Show the dry run list and the login screen in live mode." },
  "GO-5": { was: "Pending", status: "Partial", where: "docs/IKL_UAT_and_Training_Plan.html; Guide page and welcome tour", note: "The acceptance scenarios for each role (25), the training plan (three sessions, about 3 hours) and the sign-off page are ready, together with the in-system Guide and the welcome tour. The acceptance test and the training sessions themselves need IKL's nominated tester and staff.", how: "Print the plan, run the scenarios with the tester, hold the sessions.", demo: "Walk through one scenario per role." },
};

function addSprint4Report(wb, h) {
  const { F, styleCell, headerRow, titleBlock, est, linesFor, solid, NAVY, BAND, GREY, box, counts } = h;
  const ws = wb.addWorksheet("Sprint 4 Report", { views: [{ state: "frozen", ySplit: 6, showGridLines: false }] });
  [10, 52, 11, 11, 36, 60, 56, 24].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const refs = Object.keys(DONE_NOW_S4);
  const nDone = refs.filter((r) => DONE_NOW_S4[r].status === "Done").length;
  const nPart = refs.length - nDone;
  titleBlock(ws, "Sprint 4 report - development complete",
    `Sprint 4 ran 25 to 30 November 2026 (built by 24 November): reports and export, date range on every dashboard, document search, migration tools, one-to-one emails, backup and restore, response-time check, go-live switch and cleanup, acceptance and training material. ${nDone} of ${refs.length} planned functions are fully built and tested; ${nPart} are built but wait for the IT department, for IKL's files and people, or for the go-live day itself. Status Partial is used on purpose for those.`, 8);

  ws.mergeCells("A4:H5");
  const banner = ws.getCell("A4");
  banner.value = `SPRINT 4:   ${refs.length} planned   |   ${nDone} delivered   |   ${nPart} built, waiting for IT / IKL / go-live day        Coverage ${counts.before} -> ${counts.after}        Final delivery Mon 30 Nov`;
  banner.font = F({ bold: true, size: 14, color: { argb: "FF065F46" } });
  banner.fill = solid("FFD1FAE5");
  banner.alignment = { horizontal: "center", vertical: "middle" };
  banner.border = box;
  ws.getRow(4).height = 18; ws.getRow(5).height = 18;

  headerRow(ws, 6, ["Ref", "Function", "Before", "Now", "Where to find it", "How it works", "How to show it (demo steps)", "IKL sign-off (name, date)"]);
  return { ws, refs, DONE_NOW_S4, fillRows(fnText) {
    refs.forEach((ref, i) => {
      const d = DONE_NOW_S4[ref], r = 7 + i, row = ws.getRow(r);
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
    bullets(refs.filter((x) => DONE_NOW_S4[x].status === "Partial").map((x) => `${x}: ${DONE_NOW_S4[x].note}`));
    r += 1;
    section("Also delivered in Sprint 4 (not separate checklist items)");
    bullets([
      "Reports hub with seven reports (registrations by batch, registration list, by program, by source, by month, team performance, revenue summary), each with a period and Excel and PDF download.",
      "Documents screen in the left menu; documents can carry a title; attached files are read for search when they are attached.",
      "Log Email next to Log Call on contacts and deals; \"copy to CRM\" capture address for the IT department.",
      "Fix: attached files larger than 1 MB could not be uploaded through the form; the limit now matches the 15 MB rule. Attached files need a persistent disk on the host (UPLOAD_DIR).",
      "Go-live runbook (docs/go-live-runbook.md), response-time results (docs/performance-check.md), acceptance and training plan (docs/IKL_UAT_and_Training_Plan.html), refreshed one-page overview and in-system Guide.",
    ]);
    r += 1;
    section("What is left (nothing here needs more development)");
    bullets([
      "IT department: the email account and sending-domain verification; the WhatsApp service and approved templates; the permanent web address; the scheduler; a persistent disk for attached documents; the daily backup schedule; the \"copy to CRM\" mailbox (optional).",
      "IKL: the Excel files for the migration and the focal person to check the loaded data; the person who accepts and the staff to train; the website forms (fields and wording).",
      "Go-live day (project team with IKL): load IKL's data, run the restore check on the production database, run the cleanup and set APP_MODE=live, then acceptance test and training. The order is in docs/go-live-runbook.md.",
    ]);
  } };
}

module.exports = { DONE_NOW_S4, addSprint4Report };
