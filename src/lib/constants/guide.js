"use strict";

// In-app guide: the welcome tour (first login) and the /guide page share this content.
// Plain words, written for the people who use the CRM every day.

const GLOSSARY = [
  ["Contact", "One person: a lead, a participant or an alumnus. Every person has exactly one record, found by email."],
  ["Company", "A corporate client (an organization). People can belong to a company."],
  ["Deal / Inquiry", "A sales opportunity, for example a company asking for in-house training. It moves through the pipeline stages."],
  ["Program", "A course in IKL's catalogue (code, category, fee)."],
  ["Batch", "One dated run of a program: dates, venue, trainer, seats, fee."],
  ["Registration", "A person's place in a batch. Has attendance, payment reference, completion and feedback."],
  ["Nomination", "A company registers several of its people for one batch at once."],
  ["Alumnus", "A person who completed at least one program. Set automatically when completion is recorded."],
  ["Lead score", "0 to 100 points that grow with real activity: email opens and clicks, WhatsApp replies, website forms, meetings."],
  ["Campaign", "A mass email or WhatsApp message to a list or segment. Created and sent by Marketing."],
  ["Segment / List", "A group of contacts: a segment follows rules (for example source = Website), a list is picked by hand or by import."],
  ["Automation", "A follow-up that runs by itself: when something happens, wait, then send, create a task or check a condition."],
  ["Website forms", "Enquiry, brochure, registration and feedback forms on ikl.com.pk that arrive in the CRM automatically."],
  ["Date range", "Dashboards and reports can be limited to a period (last 7, 30 or 90 days, this month, this year, or your own dates). Totals such as open deals are always today's figures."],
  ["Report export", "Reports can be downloaded as an Excel file or a PDF (Head of Department and Marketing)."],
  ["Document search", "The Documents screen finds attached files by name, title, description and the words inside PDF, Word, Excel, PowerPoint and text files."],
  ["Demo mode", "Emails and WhatsApp messages are recorded but not really delivered until IT connects the real services."],
];

const ROLES = {
  head: {
    label: "Head of Department",
    intro: "You run IKL: you see everything, approve proposals, manage the team and read the reports.",
    steps: [
      { title: "Start on your dashboard", body: "The IKL dashboard shows leads, the funnel from contact to converted, campaign results and the work of your team.", href: "/ikl" },
      { title: "Approve proposals", body: "Open a deal, go to Proposals. When a salesperson submits one, you approve it or ask for changes. Only then can it be marked sent.", href: "/deals" },
      { title: "Look after the team", body: "Tasks shows Team follow-ups: who has what open and who is overdue. You also get one notification when follow-ups stay overdue for more than a day.", href: "/tasks" },
      { title: "Add users and reset passwords", body: "Users: add team members and assign their role. You can reset a password if someone is locked out.", href: "/users" },
      { title: "Programs and registrations", body: "Programs holds the catalogue and batches. Open a batch's Roster to register people, mark attendance, close the batch and see feedback.", href: "/programs" },
      { title: "Watch what arrives from the website", body: "Website forms lists every enquiry, brochure download, registration and feedback form, and who it was assigned to.", href: "/website-forms" },
      { title: "Reports and the date range", body: "Reports has registrations by batch, by program, by source, by month, team performance and revenue. Choose a period at the top (the dashboards have the same selector) and download Excel or PDF.", href: "/reports" },
      { title: "Find a document", body: "Documents searches every attached file by name, title, description and the words inside it. Narrow by type, client, program or date.", href: "/documents" },
      { title: "Move IKL's Excel data in", body: "Programs > Import program data: download the template, fill programs, batches, participants, registrations and past history, press Check (nothing is saved), fix any rows listed, then Import. Contacts and companies have their own import screens.", href: "/programs/import" },
    ],
  },
  sales: {
    label: "Sales",
    intro: "You work the leads, companies and deals, record registrations and keep your follow-ups on time.",
    steps: [
      { title: "Your contacts and companies", body: "Search and filter contacts (by program, organization, dates). Importing from Excel is under Contacts > Import. A duplicate company is blocked automatically.", href: "/contacts" },
      { title: "Turn a lead into an inquiry", body: "On a contact press Convert to opportunity. Move the deal through the stages; winning it marks the person and company as customers.", href: "/deals" },
      { title: "Proposals, invoices and payments", body: "On a deal: create a proposal and submit it for approval. Record the invoice number and payments received (invoices themselves are issued in IKL's finance system).", href: "/deals" },
      { title: "Register people for a program", body: "Programs > a program > Roster. Register one person, or use Company nomination to paste many people (name, email, designation, phone). Seats are limited per batch.", href: "/programs" },
      { title: "Attendance, completion and feedback", body: "On the roster set Attended or No Show, then Complete with the certificate number. Completing makes the person an alumnus. Record the feedback score and comments.", href: "/registrations" },
      { title: "Tasks and reminders", body: "Create follow-up tasks. You are reminded 24 hours before one is due. Everything you do is also on the person's history tab.", href: "/tasks" },
      { title: "Keep emails and calls on the timeline", body: "On a contact or a deal press Log Call or Log Email to record what was said, so the whole history stays in one place. Staff can also copy a CRM mailbox on an email once IT sets it up.", href: "/contacts" },
      { title: "Find a document and see your reports", body: "Documents finds attached files by name or by the words inside them. Reports shows registrations, programs, sources and months for a period you choose.", href: "/documents" },
    ],
  },
  marketing: {
    label: "Marketing",
    intro: "You build audiences, run email and WhatsApp campaigns and set up automatic follow-ups.",
    steps: [
      { title: "Lists and segments", body: "Lists are groups you pick or import. Segments follow rules (status, source, score). Both can be the audience of a campaign.", href: "/segments" },
      { title: "Create a campaign", body: "Campaigns > New: choose Email or WhatsApp, the audience, the content, then send now or schedule. People who unsubscribed, bounced or opted out are skipped automatically.", href: "/campaigns" },
      { title: "Read the results", body: "A campaign shows delivered, opened/read, clicked/replied and unsubscribed. Opens, clicks and replies also raise each person's lead score.", href: "/campaigns" },
      { title: "WhatsApp inbox", body: "Replies from contacts land in WhatsApp. Answer from there; the conversation is also on the person's history.", href: "/conversations" },
      { title: "Automations", body: "Automations > New: pick a trigger (for example a website form is received), add steps (wait, send, task, condition) and press Activate. It then runs by itself.", href: "/automations" },
      { title: "Website forms", body: "See everything that came from the website and who it was assigned to.", href: "/website-forms" },
      { title: "Reports, date range and export", body: "Reports has registrations, programs, sources by month and more. Choose a period and download Excel or PDF to share with management.", href: "/reports" },
      { title: "Find a document", body: "Documents searches attached files by name and by the words inside them.", href: "/documents" },
    ],
  },
  rector: {
    label: "Rector / Executive (read-only)",
    intro: "You see the university and each department's progress. You can look at everything but you cannot change anything.",
    steps: [
      { title: "Executive dashboard", body: "Department progress side by side, with trends.", href: "/executive" },
      { title: "Departments", body: "Open a department to see its own dashboard, programs and registrations.", href: "/departments" },
      { title: "Reports", body: "Revenue and performance reports, with a date range on every dashboard.", href: "/reports" },
      { title: "Programs and registrations", body: "Read-only view of the catalogue, batches, rosters and feedback.", href: "/programs" },
    ],
  },
};

module.exports = { GLOSSARY, ROLES };
