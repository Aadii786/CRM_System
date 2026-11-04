"use strict";
// "Sprint 1 Report" sheet for the IKL workbook: what was planned, what is now done, where to see it.

const DONE_NOW = {
  "CRM-1.11": { was: "Pending", where: "Notes tab on every contact, company and deal", note: "Delivered in Sprint 1. Write a note, see who wrote it and when, delete your own notes.", how: "Add a free-text note on a contact, company or deal. Notes show newest first with the author and time.", demo: "Open a deal > Deal Summary > Notes > type and Save note." },
  "CRM-5.6": { was: "Pending", where: "Search bar (top of every screen) > Notes", note: "Delivered in Sprint 1. The search box now also finds text inside notes and opens the record the note belongs to.", how: "The global search box also searches the text of notes, limited to records the user may see.", demo: "Type a word from a note in the search box at the top." },
  "CRM-1.14": { was: "Pending", where: "Companies > New company / Edit company", note: "Delivered in Sprint 1. A company with the same name (ignoring Ltd, Pvt and punctuation) or the same website is blocked, with a link to the existing one.", how: "Creating or renaming a company is blocked when the same client already exists; a link opens the existing company.", demo: "Companies > New company > type 'The Crescent Logistics (Pvt.) Ltd' > Create." },
  "CRM-2.6": { was: "Partial", where: "Deal > Proposals tab", note: "Delivered in Sprint 1. Draft, submit for approval, the department head approves or asks for changes, mark as sent, record the client's answer. Only an approved proposal can be sent.", how: "Sales drafts a proposal and submits it; the head approves or sends it back with a reason; then it is marked sent and the client's answer is recorded.", demo: "Deal > Proposals > New proposal > Submit for approval > (as head) Approve > Mark as sent." },
  "CRM-2.10": { was: "Partial", where: "Contact > Convert to opportunity; Deals", note: "Delivered in Sprint 1. One click turns a lead into an opportunity in the first pipeline stage and marks the lead Qualified. Winning the deal marks the contact Converted and the company Active.", how: "Convert to opportunity opens a deal for the lead. When the deal is won, the contact becomes a Converted customer and the company Active, without manual editing.", demo: "Contact > Convert to opportunity > Convert; then move the deal to Completed." },
  "MIR-3.6": { was: "Partial", where: "Deal > Financial tab; Reports > Revenue", note: "Delivered in Sprint 1. Invoice and payment references are recorded against a deal (invoices stay in the finance system). The revenue report is now open to IKL users and shows IKL's own figures.", how: "Record the invoice number, amount and dates from the finance system, then payments received; status becomes Partial, Paid or Overdue by itself.", demo: "Deal > Financial > Record invoice > Record payment; then Reports > Revenue." },
  "SET-3": { was: "Pending", where: "Users > key icon (Reset password)", note: "Delivered in Sprint 1. The CRM administrator or the department head sets a new password for a team member who forgot theirs.", how: "The department head or CRM administrator sets a new password (with a Generate button); it is shown once and the change is audited.", demo: "Users > key icon on a team member > Generate > Reset password." },
};

function addSprint1Report(wb, h) {
  const { F, styleCell, headerRow, titleBlock, est, linesFor, solid, NAVY, BAND, GREY, box, SPRINT2_ITEMS } = h;
  const ws = wb.addWorksheet("Sprint 1 Report", { views: [{ state: "frozen", ySplit: 6, showGridLines: false }] });
  [10, 52, 11, 11, 36, 60, 56, 24].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  titleBlock(ws, "Sprint 1 report - delivered",
    "Sprint 1 ran 20 to 27 October 2026: the IKL sales workspace. All 7 planned functions are built and were tested in the running system. IKL's demonstration and sign-off are the next step.", 8);

  // scoreboard
  ws.mergeCells("A4:H5");
  const banner = ws.getCell("A4");
  banner.value = "SPRINT 1:   7 planned   |   7 delivered   |   0 open        Coverage 51% -> 56%        Sprint 2 starts 28 Oct";
  banner.font = F({ bold: true, size: 14, color: { argb: "FF065F46" } });
  banner.fill = solid("FFD1FAE5");
  banner.alignment = { horizontal: "center", vertical: "middle" };
  banner.border = box;
  ws.getRow(4).height = 18; ws.getRow(5).height = 18;

  headerRow(ws, 6, ["Ref", "Function", "Before", "Now", "Where to find it", "How it works", "How to show it (demo steps)", "IKL sign-off (name, date)"]);
  const refs = Object.keys(DONE_NOW);
  return { ws, DONE_NOW, refs, fillRows(fnText, statusOf) {
    refs.forEach((ref, i) => {
      const d = DONE_NOW[ref], r = 7 + i, row = ws.getRow(r);
      row.values = [ref, fnText[ref], d.was, "Done", d.where, d.how, d.demo, ""];
      for (let c = 1; c <= 8; c++) styleCell(row.getCell(c), { fill: i % 2 ? BAND : undefined });
      row.getCell(1).font = F({ bold: true, color: { argb: NAVY } });
      row.getCell(3).alignment = { horizontal: "center", vertical: "top" }; row.getCell(4).alignment = { horizontal: "center", vertical: "top" };
      const was = d.was === "Pending" ? ["FFFEE2E2", "FF991B1B"] : ["FFFEF3C7", "FF92400E"];
      row.getCell(3).fill = solid(was[0]); row.getCell(3).font = F({ bold: true, color: { argb: was[1] } });
      row.getCell(4).fill = solid("FFD1FAE5"); row.getCell(4).font = F({ bold: true, color: { argb: "FF065F46" } });
      row.height = est(Math.max(linesFor(fnText[ref], 52), linesFor(d.how, 60), linesFor(d.demo, 56), linesFor(d.where, 36)));
    });
    let r = 7 + refs.length + 1;
    const section = (title) => { ws.getCell(r, 1).value = title; ws.getCell(r, 1).font = F({ bold: true, size: 11, color: { argb: NAVY } }); r += 1; };
    const bullets = (items) => items.forEach((t) => {
      ws.mergeCells(r, 1, r, 8); const c = ws.getCell(r, 1); c.value = "• " + t; c.font = F(); c.alignment = { wrapText: true, vertical: "top" };
      ws.getRow(r).height = est(linesFor(t, 200)); r += 1;
    });
    section("Also delivered in Sprint 1 (not separate checklist items)");
    bullets([
      "The department head is notified when a proposal waits for approval, and the author is told the decision.",
      "Roles now follow the Roles sheet: Head and Sales can handle proposals and invoice references; Marketing can send campaigns, run automations and export.",
      "Revenue report is limited to the user's own department; the CRM administrator and Rector still see all departments.",
      "A user who may edit a record can delete notes on it; notes are searchable.",
    ]);
    r += 1;
    section("Still needed from IKL for the next sprints (please confirm what has been sent)");
    bullets([
      "Q14: review of the Roles sheet and the first users with their roles and the proposal approver.",
      "Q16: Excel files for contacts and companies, and the focal person for data checks (first data load is in Sprint 2).",
      "Q17: invoice reference format and finance system (invoices are issued there; the CRM records only the reference).",
      "Q18: program calendar and catalogue, needed before the program work in Sprint 2 starts on 28 October.",
    ]);
    r += 1;
    section("Next: Sprint 2 starts 28 October, delivery Tuesday 10 November");
    bullets(SPRINT2_ITEMS);
  } };
}

module.exports = { DONE_NOW, addSprint1Report };
