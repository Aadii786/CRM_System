"use strict";
// "Sprint 2 Report" sheet for the IKL workbook: what was planned, what is now done, where to see it.
// Same layout as the Sprint 1 report. `status` is the status after Sprint 2 (Done or Partial).

const DONE_NOW_S2 = {
  "CRM-3.1": { was: "Pending", status: "Done", where: "Programs (left menu)", note: "Delivered in Sprint 2. The IKL program catalogue: title, code, category (IKL's 14 categories), type (open enrollment, certificate, in-house), duration and standard fee. Programs can be archived instead of deleted.", how: "Programs lists the catalogue with search and filters. New program adds one; the program page shows its details and batches.", demo: "Programs > New program > fill title, category, type, fee > Save; open it from the list." },
  "CRM-3.2": { was: "Partial", status: "Done", where: "Programs > a program > Batches; Deal > Training & TNA", note: "Delivered in Sprint 2. Batches of an open-enrollment program with dates, venue, trainer, seats, fee and status. In-house engagements for a client are created, edited and deleted on the deal.", how: "Add batch on a program records when and where it runs, the trainer, the seats and the fee. For a client's in-house training, the deal has an Add engagement action.", demo: "Programs > open a program > Batches > Add batch. Then Deals > open a deal > Training & TNA > Add engagement." },
  "CRM-3.3": { was: "Partial", status: "Done", where: "Deal form and deal page; Convert to opportunity", note: "Delivered in Sprint 2. Every inquiry (deal) can be linked to a program and a batch, from the deal form, the Convert window and the deal summary.", how: "Pick the program (and batch) the client asked about; it is shown on the deal and can be changed later.", demo: "Deals > open a deal > change the program on the Deal Summary; or Contact > Convert to opportunity > choose a program." },
  "CRM-1.8": { was: "Pending", status: "Done", where: "Contact > Programs & organizations", note: "Delivered in Sprint 2. A lead or contact can record several programs, or whole categories, they are interested in.", how: "On the contact, Add interest lets you pick programs or categories; the list shows what the person asked about.", demo: "Contacts > open a contact > Programs & organizations > Add interest." },
  "CRM-1.6": { was: "Pending", status: "Done", where: "Contact > Programs & organizations; deal > Training & TNA > participants", note: "Delivered in Sprint 2 for in-house engagements: participants are added to an engagement and are matched to, or created as, the one person record (by email). A person can show lead, participant and alumnus markers and belong to more than one organization. Participants of open-enrollment programs arrive with registrations in Sprint 3.", how: "Add participant on an engagement looks the person up by email; if the person already exists the same record is used. The contact page shows the lifecycle markers and every organization.", demo: "Deal > Training & TNA > engagement > Add participant (use an existing contact's email), then open that contact." },
  "CRM-4.7": { was: "Pending", status: "Done", where: "Companies > Import", note: "Delivered in Sprint 2. Import corporate clients from Excel or CSV with automatic column matching, a duplicate preview before anything is saved and an import history. The contact import can link or create the company by name.", how: "Upload the file, check the matched columns and the duplicate preview, then confirm. The history lists every import.", demo: "Companies > Import > choose an Excel file > review the preview > Import." },
  "MIR-5.2": { was: "Partial", status: "Done", where: "Contacts > All organizations filter", note: "Delivered in Sprint 2. The contact list can be filtered by organization, including people linked to a second organization.", how: "Choose an organization in the filter row above the contact list.", demo: "Contacts > All organizations > pick a company." },
  "MIR-5.4": { was: "Pending", status: "Done", where: "Contacts > Created from / Last activity from", note: "Delivered in Sprint 2. Filter contacts by the date they were created and by the date of their last activity, with a from and to date.", how: "Set the created and last-activity date ranges above the contact list; the list and count update.", demo: "Contacts > Created from > pick a date range." },
  "MIR-3.1": { was: "Partial", status: "Done", where: "IKL dashboard (Dashboard in the left menu) > Leads", note: "Delivered in Sprint 2. The IKL dashboard shows total leads, new in the last 30 days, active, inactive and qualified.", how: "The Leads panel sits under the headline figures; each figure opens the matching contact list where one exists.", demo: "Log in as the Head of Department or Sales > Dashboard > Leads." },
  "MIR-3.4": { was: "Partial", status: "Done", where: "IKL dashboard > From contact to converted", note: "Delivered in Sprint 2. A funnel shows how many contacts reached each step: engaged, qualified and converted into a client, for IKL only.", how: "The funnel counts distinct people at every step from IKL's own data.", demo: "Dashboard > From contact to converted." },
  "MIR-3.2": { was: "Partial", status: "Done", where: "IKL dashboard > Campaigns (Marketing role)", note: "Delivered in Sprint 2. Campaigns, emails sent and the open, click, bounce and unsubscribe rates, for IKL only. The figures stay simulated until real sending is connected (MIR-1.5).", how: "The Campaigns panel appears for users who may see campaigns; the rates come from the recorded email events.", demo: "Log in as Marketing > Dashboard > Campaigns." },
  "MIR-1.7": { was: "Pending", status: "Done", where: "Every campaign email; public unsubscribe page", note: "Delivered in Sprint 2. Every email carries an unsubscribe link and the standard one-click unsubscribe header. The public page marks the contact Unsubscribed and Opted Out, and the contact is skipped in later campaigns.", how: "The recipient clicks Unsubscribe, confirms on a simple page and is removed from future sends. It works even if the campaign was deleted later.", demo: "Campaigns > a sent campaign > Simulate engagement (demo): unsubscribes are recorded through the same path as a real click, and the contact's status changes to Unsubscribed." },
  "MIR-1.4": { was: "Partial", status: "Partial", where: "Campaign wizard > Schedule", note: "Built in Sprint 2: a scheduled campaign starts by itself when its time passes (a scheduler checks regularly and continues large sends). It runs once the scheduler is switched on at the final web address (GO-1), so it stays Partial until then.", how: "Choose a date and time when scheduling; at that time the system queues the eligible contacts and sends.", demo: "Campaigns > create > Schedule for a time a few minutes ahead > wait; the status changes to Sending, then Sent." },
  "MIR-1.5": { was: "Pending", status: "Partial", where: "Campaigns > Send Now / Schedule", note: "Built in Sprint 2 and running in demo mode: the whole delivery pipeline (eligible contacts only, personalised messages, tracking links, unsubscribe, event intake) works end to end with a simulated sender, so no real email leaves the system. The one missing piece is the link to IKL's email account (IKL's UMT-domain Mailchimp account, with domain verification by the IT department), added as soon as the account details arrive.", how: "Send Now queues one message per eligible contact and records every result. Switching to the real service replaces only the sender.", demo: "Campaigns > a campaign > Send Now; then Simulate engagement (demo) to see opens, clicks and unsubscribes." },
  "MIR-1.6": { was: "Partial", status: "Partial", where: "Campaign detail; dashboards", note: "Built in Sprint 2: opens, clicks, bounces and unsubscribes are collected through one tracked path (open pixel, signed click links and the email service's notifications) and the counters come from that history. Real figures appear once real sending is connected (MIR-1.5).", how: "Counters count each person once even if they open several times.", demo: "Campaign detail after Simulate engagement (demo): delivered, opened, clicked, bounced and unsubscribed update." },
  "GO-1": { was: "Pending", status: "Partial", where: "Technical", note: "Started in Sprint 2: the CRM runs at a temporary online test address for IKL demonstrations and has a health check. The agreed permanent web address and hosting are still with the IT department; real email tracking and the website forms need it.", how: "IKL users open the test address in a browser and sign in.", demo: "Open the test address on any device and sign in." },
};

function addSprint2Report(wb, h) {
  const { F, styleCell, headerRow, titleBlock, est, linesFor, solid, NAVY, BAND, GREY, box, SPRINT3_ITEMS, counts } = h;
  const ws = wb.addWorksheet("Sprint 2 Report", { views: [{ state: "frozen", ySplit: 6, showGridLines: false }] });
  [10, 52, 11, 11, 36, 60, 56, 24].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const refs = Object.keys(DONE_NOW_S2);
  const nDone = refs.filter((r) => DONE_NOW_S2[r].status === "Done").length;
  const nPart = refs.length - nDone;
  titleBlock(ws, "Sprint 2 report - delivered",
    `Sprint 2 ran 28 October to 10 November 2026: the program catalogue, IKL data and the email delivery engine. ${nDone} of ${refs.length} planned functions are fully built and tested in the running system; ${nPart} are built but wait for an input from the IT department (the email account and the final web address). IKL's demonstration and sign-off are the next step.`, 8);

  ws.mergeCells("A4:H5");
  const banner = ws.getCell("A4");
  banner.value = `SPRINT 2:   ${refs.length} planned   |   ${nDone} delivered   |   ${nPart} built, waiting for IT        Coverage ${counts.before} -> ${counts.after}        Sprint 3 starts 11 Nov`;
  banner.font = F({ bold: true, size: 14, color: { argb: "FF065F46" } });
  banner.fill = solid("FFD1FAE5");
  banner.alignment = { horizontal: "center", vertical: "middle" };
  banner.border = box;
  ws.getRow(4).height = 18; ws.getRow(5).height = 18;

  headerRow(ws, 6, ["Ref", "Function", "Before", "Now", "Where to find it", "How it works", "How to show it (demo steps)", "IKL sign-off (name, date)"]);
  return { ws, refs, DONE_NOW_S2, fillRows(fnText) {
    refs.forEach((ref, i) => {
      const d = DONE_NOW_S2[ref], r = 7 + i, row = ws.getRow(r);
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
    bullets(refs.filter((x) => DONE_NOW_S2[x].status === "Partial").map((x) => `${x}: ${DONE_NOW_S2[x].note}`));
    r += 1;
    section("Also delivered in Sprint 2 (not separate checklist items)");
    bullets([
      "The IKL dashboard is named after the person looking at it (IKL Head, IKL Sales or IKL Marketing Dashboard); the Dashboard item in the left menu is highlighted on every role's own dashboard.",
      "Read-only users (the Rector) no longer see Create buttons or edit actions they cannot use; the Create menu shows only what the signed-in person may create.",
      "The login screen shows only the Rector and the IKL team, so IKL is not confused by other departments.",
      "The department is shown as IKL everywhere (the internal 'HSM' name is gone from every screen).",
      "Finance figures on the IKL dashboard are shown only to users who may record invoices.",
      "A temporary online test address is available for demonstrations (see GO-1).",
    ]);
    r += 1;
    section("Still needed to close Sprint 2 and for the next sprints (please confirm what has been sent)");
    bullets([
      "The email account details for real sending (IKL's UMT-domain Mailchimp account) and domain verification by the IT department, so MIR-1.5 and MIR-1.6 can be switched from demo to real.",
      "The agreed permanent web address and hosting from the IT department (GO-1); it also switches on scheduled sending (MIR-1.4).",
      "The Excel files you shared on Google Drive (Q16 and Q22): we will load IKL's own contacts and companies and check them with your focal person. Please also confirm which Excel file is used for mass mailing today.",
      "Q18: the 2026 program calendar as well as the 2027 one, if you want programs created for both years.",
      "Q15: whether the existing mailing list carries consent (opt-in) for email marketing.",
    ]);
    r += 1;
    section("Next: Sprint 3 starts 11 November, delivery Tuesday 24 November");
    bullets(SPRINT3_ITEMS);
  } };
}

module.exports = { DONE_NOW_S2, addSprint2Report };
