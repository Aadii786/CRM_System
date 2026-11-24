"use strict";
// "Project Scope" sheet for the IKL workbook: one printable document that explains the purpose, the scope
// (in and out), the users, the flow, the plan, the dependencies and the current status. It is meant to be
// shown to someone who has not seen the project: plain wording, no jargon, A4 portrait, page breaks between topics.
// Figures next to each area are live formulas on the Functional Checklist (cached values are written too).

const W = [20, 40, 40, 16]; // column widths; total 116 characters = one A4 portrait page at about 85 percent
const TOTAL_W = W.reduce((a, b) => a + b, 0);

const AREAS = [
  ["CRM 1", "Central database", "One database of leads, corporate clients, participants and alumni.",
    "Record people and companies with full details; classify them (lead, prospect, customer, partner); link a person to a company; see everything about a client on one screen; notes, calls, meetings and documents (up to 15 MB); duplicates are prevented; program interests."],
  ["CRM 2", "Leads and pipeline", "From the first enquiry to a won or lost deal.",
    "Lead status and a lead score with a qualification threshold; an opportunity with a reference number (for example IKL-2026-0001); a 17-stage drag-and-drop pipeline; manager approval before a deal moves into execution; proposals; tasks, meetings and reminders; an owner for every lead and deal; conversion tracking."],
  ["CRM 3", "Programs and participants", "The training programs and the people who attend them.",
    "Program catalogue; batches with dates, venue, trainer, seats and fee; enquiries linked to programs; registrations (one person or a company nomination) with a seat limit; attendance; completion with certificate record; alumni; feedback; program history on every person and client."],
  ["CRM 4", "Data migration", "Moving IKL's existing Excel data into the CRM.",
    "Import contacts and companies from CSV or Excel with column mapping, duplicate detection and an import history (built). Import of programs, batches, participants, registrations and past history from one Excel template, with a check before every import (built). The one-time migration itself is done with IKL's files and the focal person's record-by-record check in the go-live week."],
  ["CRM 5", "Search", "Finding information quickly.",
    "Keyword search across contacts, companies, deals, campaigns, tasks and conversations; search in notes; a document repository linked to records; a Documents screen that searches file names, titles, descriptions and the text inside PDF, Word, Excel and PowerPoint files (scanned images need OCR, which is not included)."],
  ["MIR 1", "Email campaigns", "Marketing by email that can be measured.",
    "Design and send campaigns to a list or a segment; schedule them; unsubscribe link and opt-out handling; tracking of delivery, opens, clicks, bounces and unsubscribes; performance of each campaign; automated follow-ups (trigger, wait, condition, action). Real sending starts when the IT department hands over IKL's email account."],
  ["MIR 2", "Website forms", "Leads and registrations arriving from the IKL website.",
    "A secure channel for the website; enquiry, brochure-download, registration and feedback forms; every lead tagged with the source 'Website'; no duplicates; the owner is notified; the sender receives an acknowledgement. The CRM side is built; it goes live when the IKL website sends its forms."],
  ["MIR 3", "Dashboards and reports", "The management view.",
    "Leads, campaigns and sales-pipeline dashboards; conversion report; revenue report (invoiced, paid, outstanding); registration, program, source, monthly and team-performance reports; a date range on every dashboard and report; export to Excel or PDF."],
  ["MIR 4", "Activity history", "A complete record of what happened and who did it.",
    "One timeline of all activity per person, client and deal; campaign engagement of each lead; an audit log of who changed what and when. One-to-one emails are logged by hand on the person or deal; recording them automatically (a CRM mailbox in Bcc) is built and starts when the IT department routes the mailbox."],
  ["MIR 5", "Filters and focused reports", "Looking at the data from any angle.",
    "Filter by status, source, engagement, organization, program and date; save filters as reusable segments; search and filter deals; export lists to CSV; reports by program, source and date."],
  ["SET", "IKL workspace and access", "IKL's own protected space.",
    "Roles for the Head of Department, Marketing and Sales (one person may hold more than one); IKL users see only IKL data; the university-wide dashboard and integration screens are hidden from IKL; password reset; IKL sender name and address."],
  ["GO", "Ready for go-live", "Everything needed to use the CRM for real work.",
    "An agreed web address during working hours; regular backup and a tested restore; a response-time check with IKL-sized data; demo banner and sample data removed; user acceptance test and short training for IKL users."],
  ["WA", "WhatsApp (added request)", "Not in the BRD; requested by IKL later.",
    "WhatsApp campaigns to a list or segment and replies in a shared inbox. Built and tested in demo mode; real sending needs the WhatsApp service and approved message templates from the IT department."],
];

const ROLES = [
  ["Head of Department (approver)", "Runs the IKL workspace; adds team members and resets passwords; approves proposals and moves deals into execution; sees all IKL data and every report; deletes records.", "Cannot see other departments' data."],
  ["Marketing", "Builds lists and segments; creates, schedules and sends email and WhatsApp campaigns; builds automations; runs the shared WhatsApp inbox; imports and exports contact lists; sees reports.", "Cannot approve or change deals; cannot delete records."],
  ["Sales (business development)", "Works leads, companies and the pipeline; proposals; invoice and payment references; programs, registrations, attendance and completion; tasks, calls and meetings; documents.", "Cannot send campaigns or import contacts; cannot approve a deal."],
  ["One person with both roles", "Gets both sets of access and one combined dashboard.", "Cannot see other departments' data."],
  ["CRM Administrator (project team)", "Looks after the platform, departments and users. Not an IKL role.", "Not part of IKL's daily work."],
];

const FLOW = [
  ["1. Leads come in", "From the website forms, an Excel import, a WhatsApp or email reply, or typed in by hand. Each person is matched by email so there is one record per person; the source is tagged; an owner is assigned and notified.", "Contacts, Website forms, Import"],
  ["2. Sales works them", "Lead status and score, follow-up tasks and meetings, an opportunity with a reference number, a proposal that the Head approves, then won or lost. Invoice and payment references are recorded against the deal.", "Deals, Tasks, Companies"],
  ["3. Programs run", "A program has batches (dates, venue, trainer, seats, fee). A person or a company nomination is registered; the seat limit is enforced; attendance is marked.", "Programs, Registrations"],
  ["4. People complete", "Completion and the certificate number and date are recorded; the person becomes an alumnus; feedback (score and comments) is captured; the history stays on the person and the client.", "Roster, Contact > Program history"],
  ["5. Marketing follows up", "Lists and segments, email and WhatsApp campaigns, unsubscribe, tracking of opens, clicks and replies, automations that wait and decide by themselves. Activity raises the lead score and brings people back to step 2.", "Campaigns, Automations, WhatsApp"],
  ["6. Management sees", "Dashboards, reports, filters by program, source and date, the audit log, and (Sprint 4) export to Excel and PDF.", "Dashboard, Reports"],
];

const OUT_OF_SCOPE = [
  ["Certificate documents", "The CRM records the certificate (number, date, issued). It does not design or print certificate documents. Can be added through change control."],
  ["Waiting lists", "The seat limit of a batch is enforced; a full batch refuses more registrations. A waiting list is not included."],
  ["Invoices and tax", "Invoices are issued in IKL's finance system. The CRM keeps a reference only (number, date, amount, payment status). It does not create invoices or calculate tax."],
  ["Finance-system integration", "No automatic link to a finance system. References are typed in by the sales team or the finance person."],
  ["Reading scanned images", "Document search reads the text of PDF, Word and Excel files. Scanned images need OCR, which is not included."],
  ["WhatsApp reminders to staff", "Staff reminders are sent as notifications and email. Reminders by WhatsApp are not built (a decision for IKL)."],
  ["Complex escalation rules", "Managers receive a digest of overdue follow-ups. Rule-based escalation chains are not included."],
  ["Other departments' data", "The university-wide dashboard and other departments' records are hidden from IKL users."],
  ["Email and WhatsApp services, web address, scheduler", "Provided by the IT department. The CRM connects to them; it does not replace them."],
  ["Building the website forms", "The IKL website is built in-house. The CRM provides the secure channel and instructions; the website team sends the forms."],
];

const DEPENDENCIES = [
  ["IT department", "IKL's email account (UMT domain) and verification of the sending domain", "Real email: campaigns, acknowledgements, reminders, automations", "Requested"],
  ["IT department", "WhatsApp service details and approved message templates", "Real WhatsApp campaigns and replies", "Requested"],
  ["IT department", "The agreed web address and a scheduler that calls the CRM every few minutes", "Real tracking, scheduled campaigns, website forms, go-live", "Requested"],
  ["IT department", "A persistent disk for attached documents and a daily backup schedule", "Documents survive deployments; recovery after a failure (GO-2)", "Requested"],
  ["IT department (optional)", "A CRM mailbox routed to the capture address", "Automatic recording of one-to-one emails (MIR-4.4)", "Optional"],
  ["IKL website team", "The website sends its four forms to the CRM (instructions provided)", "Leads and registrations from the website", "Open"],
  ["IKL", "Form fields and acknowledgement wording; existing feedback, attendance and nomination forms", "Website forms and program forms (Q20, Q21)", "Open"],
  ["IKL", "Excel files for participants, alumni, registrations and feedback, and the final report list", "Data migration (Q22) and the final report list (Q23)", "Partly received"],
  ["IKL", "A focal person to check the loaded data; the person who accepts each delivery; staff to be trained", "Migration, acceptance and training", "Open"],
];

const GLOSSARY = [
  ["Lead", "A person who has shown interest but has not yet bought a program."],
  ["Contact / person", "One record for one person. The same record can be a lead, a participant and an alumnus."],
  ["Organization", "A corporate client or company. A person can be linked to one or more."],
  ["Opportunity (deal)", "A possible sale, tracked on the pipeline from New Inquiry to Completed."],
  ["Proposal", "The offer sent to a client for a deal; the Head approves it before it is sent."],
  ["Program", "A training course in IKL's catalogue (title, type, duration, fee)."],
  ["Batch", "One scheduled run of a program: dates, venue, trainer, seats and fee."],
  ["Registration", "A person signed up for a batch. A company nomination registers several people at once."],
  ["In-house engagement", "Training delivered for one client company, agreed with that client."],
  ["Alumnus", "A person who has completed at least one program."],
  ["List and segment", "A list is a fixed group of contacts; a segment is a saved filter that updates itself."],
  ["Campaign", "A message sent to a list or segment by email or WhatsApp, with tracking."],
  ["Automation", "A set of steps that runs by itself: trigger, wait, condition, then an email, a task or a message."],
  ["Lead score", "Points a person earns from real activity (opens, clicks, replies, form, meeting) to show how warm they are."],
  ["Audit log", "A record of who changed what and when."],
];

const SHEETS = [
  ["Summary", "Figures at a glance: done, partial, pending, coverage by requirement and by sprint."],
  ["Sprint 1 / 2 / 3 Report", "For each delivered sprint: what was planned, what is now working, where to find it and how to show it."],
  ["Sprint Plan", "The four sprints with dates, content, the demo and what IKL must provide; the Tuesday demonstrations."],
  ["Functional Checklist", "Every function with status, place in the system, notes, sprint and IKL review."],
  ["Roles", "The IKL roles and what each can do; IKL's review."],
  ["Open Questions", "Questions for IKL, IKL's answers and how the plan uses them."],
  ["Decisions & Services", "What the project team decided and what other teams provide."],
  ["Beyond BRD", "Features present in the system but not asked for in the BRD, and IKL's decision on each."],
];

const FONT = { name: "Calibri", size: 10, color: { argb: "FF1F2937" } };
const rich = (head, body) => ({ richText: [{ text: head + "\n", font: { ...FONT, bold: true } }, { text: body, font: FONT }] });

function addScopeSheet(wb, h) {
  const { F, styleCell, solid, est, linesFor, NAVY, BAND, GREY, box, fnRows, CAL, dshort, SPRINTS } = h;
  const ws = wb.addWorksheet("Project Scope", { views: [{ showGridLines: false }] });
  W.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const N = fnRows.length;
  const E = "'Functional Checklist'!$E$2:$E$500", B = "'Functional Checklist'!$B$2:$B$500";
  const cnt = (st) => fnRows.filter((r) => r[4] === st).length;
  const done = cnt("Done"), part = cnt("Partial"), pend = cnt("Pending");
  let r = 1;
  const merge = (row, a, b) => { if (b > a) ws.mergeCells(row, a, row, b); };
  const widthOf = (a, b) => W.slice(a - 1, b).reduce((x, y) => x + y, 0);

  // ---- title
  merge(r, 1, 4);
  const t = ws.getCell(r, 1); t.value = "IKL CRM - project scope, purpose and plan"; t.font = F({ bold: true, size: 20, color: { argb: NAVY } }); t.alignment = { vertical: "middle" }; ws.getRow(r).height = 34; r += 1;
  merge(r, 1, 4);
  const st = ws.getCell(r, 1);
  st.value = "One document that explains what the CRM is for, what is included and what is not, who uses it, how it works, how it is delivered and what is still needed. Written in plain words so that it can be shown to anyone. Reference: BRD IKL-CRM-BRD-001 v0.1.";
  st.font = F({ color: { argb: GREY }, size: 10 }); st.alignment = { wrapText: true, vertical: "top" }; ws.getRow(r).height = est(linesFor(st.value, TOTAL_W)); r += 1;
  ws.getRow(r).height = 6; r += 1;

  const bar = (title) => {
    merge(r, 1, 4);
    const c = ws.getCell(r, 1); c.value = title; c.fill = solid(NAVY); c.font = F({ bold: true, size: 11, color: { argb: "FFFFFFFF" } }); c.alignment = { vertical: "middle", indent: 1 };
    ws.getRow(r).height = 22; r += 1;
  };
  const gap = () => { ws.getRow(r).height = 8; r += 1; };
  const para = (text, o = {}) => {
    merge(r, 1, 4);
    const c = ws.getCell(r, 1); c.value = text; c.font = F({ size: 10.5, ...(o.font || {}) }); c.alignment = { wrapText: true, vertical: "top" };
    if (o.fill) c.fill = solid(o.fill);
    ws.getRow(r).height = est(linesFor(text, TOTAL_W * 0.93)); r += 1;
  };
  const bullets = (items) => items.forEach((x) => para("•  " + x));
  // table: spans maps each logical column to a range of sheet columns
  const table = (headers, rows, spans, o = {}) => {
    const sp = spans || headers.map((_, i) => [i + 1, i + 1]);
    const hr = ws.getRow(r); hr.height = 24;
    headers.forEach((l, i) => {
      const [a, b] = sp[i]; merge(r, a, b);
      for (let c = a; c <= b; c++) { const cell = ws.getCell(r, c); cell.fill = solid(BAND); cell.border = box; }
      const cell = ws.getCell(r, a); cell.value = l; cell.font = F({ bold: true, color: { argb: NAVY } }); cell.alignment = { vertical: "middle", wrapText: true };
    });
    r += 1;
    rows.forEach((row, idx) => {
      let lines = 1;
      row.forEach((v, i) => {
        const [a, b] = sp[i]; merge(r, a, b);
        for (let c = a; c <= b; c++) styleCell(ws.getCell(r, c), {});
        const cell = ws.getCell(r, a); cell.value = v;
        cell.alignment = { vertical: "top", wrapText: true, horizontal: o.center && o.center.includes(i) ? "center" : "left" };
        cell.font = F(i === 0 ? { bold: true, color: { argb: NAVY } } : {});
        const txt = v && typeof v === "object" ? (v.richText ? v.richText.map((p) => p.text).join("") : String(v.result || "")) : v;
        lines = Math.max(lines, linesFor(txt, widthOf(a, b) * (i === 0 ? 0.75 : 0.95)));
      });
      ws.getRow(r).height = est(lines);
      if (o.breakAfter === idx) ws.getRow(r).addPageBreak(); // keep a long table in two balanced pages
      r += 1;
    });
  };
  const pageBreak = () => { ws.getRow(r - 1).addPageBreak(); };

  // ---- key facts
  const facts = [
    ["Client", "IKL - corporate training and open-enrollment programs"],
    ["The project", "One CRM (customer relationship management) system for IKL, replacing separate Excel files, mailing lists and personal inboxes"],
    ["Delivery", "Four sprints (20 October to 30 November 2026), a progress demonstration every Tuesday, final delivery and acceptance on Monday 30 November 2026"],
    ["Document date", "24 November 2026 (development complete)"],
    ["Prepared by", "The CRM project team"],
  ];
  facts.forEach(([a, b]) => {
    merge(r, 2, 4); styleCell(ws.getCell(r, 1), { fill: BAND }); [2, 3, 4].forEach((c) => styleCell(ws.getCell(r, c), {}));
    ws.getCell(r, 1).value = a; ws.getCell(r, 1).font = F({ bold: true, color: { argb: NAVY } });
    ws.getCell(r, 2).value = b; ws.getRow(r).height = est(linesFor(b, widthOf(2, 4) * 0.95)); r += 1;
  });
  merge(r, 2, 4); styleCell(ws.getCell(r, 1), { fill: BAND }); [2, 3, 4].forEach((c) => styleCell(ws.getCell(r, c), {}));
  ws.getCell(r, 1).value = "Status today"; ws.getCell(r, 1).font = F({ bold: true, color: { argb: NAVY } });
  const statusText = `${N} functions listed: ${done} done, ${part} partial, ${pend} pending. Coverage ${Math.round(((done + 0.5 * part) / N) * 100)}% (done plus half of partial).`;
  ws.getCell(r, 2).value = { formula: `COUNTA('Functional Checklist'!$A$2:$A$500)&" functions listed: "&COUNTIF(${E},"Done")&" done, "&COUNTIF(${E},"Partial")&" partial, "&COUNTIF(${E},"Pending")&" pending. Coverage "&TEXT((COUNTIF(${E},"Done")+0.5*COUNTIF(${E},"Partial"))/COUNTA('Functional Checklist'!$A$2:$A$500),"0%")&" (done plus half of partial)."`, result: statusText };
  ws.getCell(r, 2).font = F({ bold: true }); ws.getRow(r).height = 30; ws.getCell(r, 2).alignment = { vertical: "top", wrapText: true }; r += 1;
  gap();

  // ---- 1 purpose
  bar("1.  Purpose: why IKL needs this system");
  para("IKL sells corporate training, runs open-enrollment programs and keeps in touch with participants and alumni. The information about leads, clients, participants and alumni is spread over separate Excel files, mailing lists and individual inboxes. That makes it hard to see the full history of one person or client, to follow up on time, to run marketing that can be measured, and to report to management.");
  gap();
  para("The CRM gives IKL one place to find and win training business, to run its programs from registration to completion, to stay in touch with participants and alumni, and to report on what works.", { font: { bold: true, color: { argb: NAVY } } });
  gap();

  // ---- 2 objectives
  bar("2.  Objectives: what IKL gets");
  table(["Objective", "What it means in practice"], [
    ["One record per person and client", "A lead, a participant and an alumnus are the same person record. People are matched by email, so there are no duplicates and the whole history is in one place."],
    ["A managed sales pipeline", "Every enquiry becomes an opportunity with an owner, a stage, follow-up tasks and a proposal that the Head approves. Invoice and payment references are kept against the deal."],
    ["Programs run from one screen", "Catalogue, batches, registrations (single or company nomination), seat limit, attendance, completion, certificate record and feedback."],
    ["Marketing that can be measured", "Lists, segments, email and WhatsApp campaigns, unsubscribe, tracking of opens, clicks and replies, automations and a lead score based on real activity."],
    ["Leads from the website", "Enquiry, brochure, registration and feedback forms reach the CRM by themselves, tagged with their source, without duplicates, with the owner notified and an acknowledgement sent."],
    ["Visibility for management", "Dashboards, reports by program, source and date, filters, an audit log and export to Excel and PDF."],
    ["Safe and controlled", "Each role sees and does only what it is allowed to; every action is checked on the server; IKL sees only IKL data; backups are tested before go-live."],
  ], [[1, 1], [2, 4]]);
  pageBreak();

  // ---- 3 scope
  bar("3.  Scope: what is included");
  para("The scope follows the agreed requirements (BRD IKL-CRM-BRD-001 v0.1, five CRM groups and five MIR groups), plus the workspace and go-live items needed to use the system for real work and one request added later (WhatsApp). The last column counts the functions of each area from the Functional Checklist and updates when a status there changes.");
  gap();
  const rows3 = AREAS.map(([code, name, what, detail]) => {
    const sub = fnRows.filter((x) => x[1] === code);
    const d = sub.filter((x) => x[4] === "Done").length;
    return [`${code}\n${name}`, rich(what, detail), { formula: `COUNTIFS(${B},"${code}",${E},"Done")&" of "&COUNTIF(${B},"${code}")&" done"`, result: `${d} of ${sub.length} done` }];
  });
  // layout: area | what it covers (B:C merged) | status
  table(["Area", "What it covers and what users can do", "Functions"], rows3, [[1, 1], [2, 3], [4, 4]], { center: [2], breakAfter: 5 });
  pageBreak();

  // ---- 4 users
  bar("4.  Who uses the CRM");
  para("Every department has a Head of Department who adds as many Marketing and Sales team members as needed. Marketing and Sales work on the same shared IKL data (companies, groups and folders); records are tagged so that each team also has its own view. The Roles sheet in this workbook lists the full permissions and IKL's review.");
  gap();
  table(["Role", "What the person does", "Limits"], ROLES, [[1, 1], [2, 2], [3, 4]]);
  gap();

  // ---- 5 flow
  bar("5.  How the system works from start to finish");
  table(["Step", "What happens", "Where in the CRM"], FLOW, [[1, 1], [2, 3], [4, 4]]);
  pageBreak();

  // ---- 6 out of scope
  bar("6.  Not included");
  para("These items are outside the agreed scope. Anything outside the scope goes through the change process described in the BRD: IKL and the project team agree the change, the effort and the date before work starts.");
  gap();
  table(["Item", "What it means"], OUT_OF_SCOPE, [[1, 1], [2, 4]]);
  gap();

  // ---- 7 dependencies
  bar("7.  What the project depends on");
  para("The CRM itself is built by the project team. Some functions can only be switched on when another party provides a service or information. Until then they run in demonstration mode and stay marked Partial.");
  gap();
  table(["Provided by", "What is needed", "What it unlocks", "Status"], DEPENDENCIES, [[1, 1], [2, 2], [3, 3], [4, 4]], { center: [3] });
  pageBreak();

  // ---- 8 plan
  bar("8.  Delivery plan");
  para("Each sprint ends with a working delivery that IKL tests and signs off before the next sprint builds on it. A progress demonstration is held every Tuesday. Sprint 4 was built by 24 November; the final demonstration, acceptance and go-live are on Monday 30 November. The Sprint Plan sheet has the full detail and the Tuesday calendar.");
  gap();
  const planRows = [1, 2, 3, 4].map((s) => {
    const items = s === 1 ? "IKL roles and access, notes, duplicate check for companies, proposals with Head approval, lead conversion, invoice and payment references, password reset."
      : s === 2 ? "Unsubscribe and opt-out, email delivery engine and tracking (simulated sender), IKL dashboard, company import, program catalogue and batches, one person record."
      : s === 3 ? "Registrations and nominations, attendance, completion and alumni, feedback, program history, automations, lead score, reminders, WhatsApp, website forms channel, welcome tour and Guide."
      : "Reports with a date range and Excel/PDF export, document search inside files, Excel import tools, one-to-one email log, backup and restore (tested), response-time check, live switch and demo-data cleanup, acceptance and training material.";
    return [`Sprint ${s}\n${dshort(CAL[s].start)} - ${dshort(CAL[s].end)}`, rich(SPRINTS[s].title, items), { formula: `'Sprint Plan'!I${4 + s}`, result: "Delivered" }];
  });
  table(["Sprint and dates", "Theme and content", "Status"], planRows, [[1, 1], [2, 3], [4, 4]], { center: [2] });
  gap();

  // ---- 9 status
  bar("9.  Where we are today");
  para(statusText, { font: { bold: true, color: { argb: NAVY } } });
  gap();
  para("WORKING NOW (built and tested in the running system):", { font: { bold: true } });
  bullets([
    "Contacts, companies, notes, documents, duplicate checks and Excel import; the deals pipeline with proposals, Head approval and invoice and payment references.",
    "Program catalogue and batches; registrations and company nominations with a seat limit; attendance, completion, certificate record, alumni, feedback and program history.",
    "Email campaigns with unsubscribe and tracking (simulated sender), WhatsApp campaigns and inbox (demonstration mode), automations that run by themselves, lead score from real activity, reminders.",
    "Dashboards with a date range; seven reports (registrations, programs, sources, months, team, revenue) with Excel and PDF export; filters, audit log, roles and permissions.",
    "Documents found by name, title and the words inside PDF, Word, Excel and PowerPoint files; calls and emails logged on the history; Excel import of programs, participants, registrations and history with a check first.",
    "Backup and restore (restore tested), response-time check (all screens within target), a live switch and a demo-data cleanup, acceptance scenarios, training plan and go-live runbook; website forms channel, welcome tour and Guide.",
  ]);
  gap();
  para("BUILT, WAITING FOR OTHERS (status Partial):", { font: { bold: true } });
  bullets([
    "Real email delivery, scheduled campaigns, tracking read-back, acknowledgements and email reminders: IKL's email account and domain verification from the IT department (MIR-1.4, 1.5, 1.6, 2.7, CRM-2.9).",
    "Real WhatsApp sending and replies: WhatsApp service and approved templates from the IT department (WA-1, WA-2).",
    "The four website forms: the IKL website must send them (MIR-2.1 to 2.4). The agreed web address: GO-1.",
    "Automatic recording of one-to-one emails: the IT department's mailbox (MIR-4.4).",
    "Migration of IKL's own data: IKL's Excel files and the focal person's check (CRM-4.9). Backup schedule and persistent disk: IT (GO-2). Cleanup and live switch: run on the go-live day (GO-4). Acceptance test and training: IKL's tester and staff (GO-5).",
  ]);
  gap();
  para("NO MORE DEVELOPMENT IS PLANNED. What is left is connection and go-live work:", { font: { bold: true } });
  bullets([
    "The IT department connects email, WhatsApp, the web address, the scheduler, a persistent disk and the backup schedule.",
    "With IKL: load the real data, run the cleanup, switch to live mode, run the acceptance test and train the staff (the order is in the go-live runbook).",
  ]);
  pageBreak();

  // ---- 10 acceptance
  bar("10.  How we know the work is done");
  bullets([
    "Every function is listed in the Functional Checklist with a status: Done, Partial or Pending. The figures on the Summary sheet are calculated from it.",
    "Each sprint is shown to IKL on a Tuesday and signed off on the Sprint Report sheet before the next sprint builds on it.",
    "Go-live needs five things: an agreed web address, a tested backup and restore, a response-time check with IKL-sized data, demo data removed, and a user acceptance test with short training (GO-1 to GO-5).",
    "IKL names the person who accepts each delivery and the staff to be trained.",
  ]);
  gap();

  // ---- 11 risks
  bar("11.  Assumptions and risks");
  table(["Risk or assumption", "If it does not hold", "How we handle it"], [
    ["IT services arrive in time (email account, WhatsApp, web address, scheduler)", "Real email and WhatsApp stay in demonstration mode; the related functions stay Partial at go-live.", "Everything is built and tested with simulated services, so switching on is a connection, not new development."],
    ["IKL sends its Excel files and a focal person checks the loaded data", "Migration in Sprint 4 shrinks or moves.", "Contacts and companies can already be imported; the remaining data is loaded as soon as the files arrive."],
    ["The IKL website team sends the four forms", "Website leads are not captured automatically.", "Leads can still be entered by hand or imported; instructions for the website team are ready."],
    ["WhatsApp message templates are approved quickly", "WhatsApp campaigns start later than email.", "Request the templates now; replies and the inbox work without templates."],
    ["The go-live week is short (25 to 30 November)", "Loading data, acceptance and training may not all fit.", "Everything is built and tested; the runbook lists the steps in order, and the migration can be repeated safely after corrections."],
    ["The scope stays as agreed", "New requests change effort and dates.", "Change process: agree the change, the effort and the date before work starts."],
  ], [[1, 1], [2, 2], [3, 4]]);
  pageBreak();

  // ---- 12 glossary
  bar("12.  Words used in the CRM");
  table(["Term", "Meaning"], GLOSSARY, [[1, 1], [2, 4]]);
  gap();

  // ---- 13 where to find
  bar("13.  Where to find more");
  table(["Sheet in this workbook", "What it shows"], SHEETS, [[1, 1], [2, 4]]);
  gap();
  para("Inside the CRM: a short welcome tour opens at the first login, and the Guide page in the left menu explains every screen step by step for each role. A one-page overview of the whole system is available as a separate document.");
  gap();

  // ---- 14 sign-off
  bar("14.  Confirmation of scope");
  para("By signing, the parties confirm that this document describes the scope, the exclusions and the plan of the IKL CRM project. Changes follow the change process.");
  gap();
  const signHead = ws.getRow(r); signHead.height = 22;
  ["For", "Name", "Signature", "Date"].forEach((l, i) => { const c = signHead.getCell(i + 1); c.value = l; c.fill = solid(BAND); c.font = F({ bold: true, color: { argb: NAVY } }); c.border = box; c.alignment = { vertical: "middle" }; });
  r += 1;
  ["IKL (Head of Department / approver)", "CRM project team"].forEach((who) => {
    const row = ws.getRow(r); row.height = 38;
    for (let c = 1; c <= 4; c++) styleCell(row.getCell(c), {});
    row.getCell(1).value = who; row.getCell(1).font = F({ bold: true, color: { argb: NAVY } }); r += 1;
  });

  const lastRow = r - 1;
  ws.pageSetup = {
    paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    horizontalCentered: true, printArea: `A1:D${lastRow}`,
    margins: { left: 0.5, right: 0.5, top: 0.7, bottom: 0.7, header: 0.3, footer: 0.3 },
  };
  ws.headerFooter = {
    oddHeader: "&L&\"Calibri,Bold\"&9IKL CRM - project scope, purpose and plan&R&9Status as of 24 November 2026",
    oddFooter: "&L&9BRD IKL-CRM-BRD-001 v0.1&C&9Page &P of &N&R&9Final delivery: 30 November 2026",
  };
  return { ws, lastRow };
}

module.exports = { addScopeSheet };
