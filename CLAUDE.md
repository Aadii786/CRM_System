@AGENTS.md

# CLAUDE.md - University CRM: project memory

> **Read this first in every new session.** It is the shared memory between the product owner and Claude. If chat history or Claude's memory is lost, this file (plus `docs/requirements/`) lets work resume exactly where it stopped, with no need to re-explain the project.
>
> **Update rule (mandatory):** after every feature, fix, decision or change of plan, update the sections "Current status", "Pending / next" and add one line to the "Changelog" at the bottom. If a decision changes, edit the decision, do not just append. Keep it accurate over long.
>
> Last updated: **2026-11-04** (Sprint 1 delivered; Sprint 2 built except the real email provider, see section 9; code pushed to GitHub).

---

## 1. People and how to work with them

- **The user** is the Business Developer / Product Manager / Business Analyst. They collect requirements from university departments, run the demos and talk to the client, and hand the build to Claude. Their team has **2 developers** and a paid Claude subscription (AI-assisted development). They want Claude to act as CRM expert, BA and architect: **push back honestly, do not just agree**.
- **Language:** reply in **Roman Urdu mixed with English technical terms**, short and structured. Documents for departments/clients are in **plain professional English**.
- **Voice dictation:** the user speaks, so words arrive garbled. Known mappings: CNM = CRM, IQL / ICL / Haiku = IKL, Reactor / Director = Rector (the word Rector stays), "Michael department" = IKL, Life X = LiveX, "OTE department" = most likely the IT department that provides email/WhatsApp services (not confirmed; ask if it matters), "Supreme" = sprint. Interpret by context; ask only when it changes the outcome.
- **Be honest about status.** Verify against the code before claiming something is done. State what was tested and what was not. "Delivered" is not "Accepted by IKL".
- **Outward-facing actions need explicit permission** (editing the client-shared Google file, sending email, publishing). Never put passwords, tokens or keys in docs or chat.
- **Commit/push only when the user asks.** (Asked and done on 2026-11-04 for Sprint 1+2.) Commit message ends with the Co-Authored-By line given by the harness.

## 2. The project in one paragraph

A **centralized University CRM** used by many departments, with **server-enforced role-based access**, built so that a new department can be added without developer work. Today the first and only real client is **IKL** (corporate training, B2B + open-enrollment programs). **OUD** (fundraising/donor) and **LiveX** (enrollment funnel) are the next departments; their requirements are collected but **not being built until IKL is done**. **Hard deadline for IKL: 30 November 2026.**

## 3. Business vision (agreed with the user)

- **Hierarchy:** Rector/President (read-only, university-wide + per-department progress) > **Super Admin** (manages everything) > **Departments** (IKL, OUD, LiveX, later e.g. PND) > **Department Head (HOD)** > **Marketing** and **Sales** work areas.
- When the Super Admin creates a department they choose whether it gets **Marketing, Sales or both**. The Head decides whether **one person holds both roles** (sees both, one combined dashboard) or **two people** hold one each. The Head can add as many team members as needed (already built).
- **One shared dataset per department**, tagged Sales vs Marketing; each person gets their own dashboard/view. Marketing and Sales see the same company/group/folder data. Nothing is duplicated per role.
- **Rector sees aggregated numbers** by default; record-level access is a per-department switch (OUD donor data, LiveX data ownership are sensitive).
- New departments should appear on the Rector dashboard automatically (department templates, module checklist, KPI cards: count, sum, ratio, stage conversion, time measure). **This platform layer is designed but NOT built** (see section 12).
- Each department has its own **email sender, WhatsApp number and ad accounts** (settings structure documented; only email sender identity exists in the app).
- **Fresh start:** the old 58,002 "Marketing & Lead Department" demo contacts were deleted on 2026-10-19 (backup JSON was kept only in a temporary scratchpad, treat as gone). IKL's own demo data (4,292 contacts, ~224 deals, 122 companies) still exists and is removed in Sprint 4 (function GO-4). IKL's 17 pipeline stages are real, not demo.

## 4. Tech stack

| Area | Choice |
|---|---|
| Framework | **Next.js 16.3.2** App Router (Turbopack), **React 19.2.8** with **React Compiler**, JavaScript/JSX (no TypeScript) |
| Styling | Tailwind CSS v4, `lucide-react` icons, `recharts`, `framer-motion`, `@dnd-kit` (Kanban) |
| Database | **MySQL 8** (`crm_platform`), **Sequelize 6** + `mysql2`, migrations via `sequelize-cli` |
| Auth | JWT session cookie (`jose`), `bcryptjs`; session holds only the user id, user is re-fetched each request |
| Other libs | `xlsx` (contact import), `server-only` |
| Hosting plan | Vercel (+ cron) and Railway MySQL are described in `DEPLOYMENT.md`; **production hosting is not decided/built yet** (the user said "we will manage later") |
| Repo | `github.com/Aadii786/CRM_System` (**private**; `gh` CLI is not installed; pushes use Git Credential Manager), branch `main`, working dir `C:\Users\22732\Desktop\news_letter\CRM` (Windows 11; use PowerShell/Git Bash) |

**IMPORTANT (from AGENTS.md):** this Next.js has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing framework code.

### Commands
```bash
npm run dev            # dev server on :3000 (config name "crm-dev" in .claude/launch.json)
npm run lint           # eslint src  (keep it clean)
npm run db:migrate     # run pending migrations (latest: 037)
npm run db:seed        # seeders 001-014 (demo data)
npm run db:setup       # create + migrate + seed;  db:reset drops everything first
```
`.env.local` (git-ignored) holds DB_*, SESSION_SECRET, DEMO_USER_PASSWORD, SEED_CONTACT_COUNT. `.env.example` documents every variable. Never commit secrets.

## 5. Repository map

```
src/app/(app)/...        pages: dashboard, department, executive, marketing, ikl-hsm, contacts, companies, deals,
                         campaigns, segments, lists, folders, conversations, tasks, meetings, activities, reports,
                         users, roles, departments, settings, audit-logs, integrations, api-webhooks, demo-center
src/app/api/             contacts, cron/reminders (hourly), cron/campaigns (scheduler, every 5 min), t/o|c|u (email tracking),
                         email/webhook (provider events), health, documents, lists, search;  src/app/unsubscribe/[token] (public page)
src/lib/email/           provider.js (provider drivers, default "simulated"), render.js (personalise + track + unsubscribe), tokens.js (signed links)
src/actions/             "use server" actions, one file per area (notes, proposals, finance, deals, companies, admin, ...)
src/lib/services/        ALL business logic + authorization (noteService, proposalService, financeService, dealService,
                         companyService, contactService, userService, reportingService, searchService, ...)
src/lib/db/models/       Sequelize models (loaded statically in models/index.js);  migrations/ 001-037;  seeders/ 001-014
src/lib/constants/       roles.js, permissions.js, navigation.js, departments.js, demoUsers.js, crm.js (lists), moduleColors.js
src/lib/permissions/rbac.js   requirePermission, requireDepartmentAccess, hasPermission, getAccessibleDepartmentKeys
src/components/          ui/ (Button, Modal, Field, Badge, Tabs, ...), common/, deals/, contacts/, companies/, admin/, ...
docs/requirements/       the IKL workbook (latest master) + generator scripts (see its README)
docs/email-delivery.md   how campaign email works and how to plug in the real provider
```

### Patterns to follow
- **Authorization lives in services**, never only in the UI: every service function calls `requirePermission` and `requireDepartmentAccess`; department scope is derived from the user's own `departmentId`, never from client input.
- UI pattern for a write: client component with `useTransition` -> server action returning `{ success }` or `{ error }` -> `router.refresh()` + toast. Modals use `components/ui/Modal`.
- Server components must pass **plain objects** to client components (`.get({ plain: true })`), no functions or Sequelize instances.
- Activity timeline entries go in the `activities` table; important actions call `recordAudit`.
- New permission grants for existing roles must be **migrations** (role permissions live in the DB table `role_permissions`; `constants/roles.js` only seeds fresh databases). Keep both in sync.

## 6. Roles and access

- Permission-based RBAC. A user can hold several roles; permissions are the union (`authService.serializeUser`).
- **Generic department roles** (work in any department): `DEPARTMENT_HEAD`, `TEAM_MEMBER`, `DEPARTMENT_MARKETING`, `DEPARTMENT_SALES`. A department-scoped manager (Head) may only assign `TEAM_MEMBER`, `DEPARTMENT_MARKETING`, `DEPARTMENT_SALES`.
- **Pilot roles** (hand-built for the first two departments): `MARKETING_MANAGER/EXECUTIVE`, `IKL_HSM_MANAGER/EXECUTIVE`. University-level: `RECTOR` (read-only), `CENTRAL_CRM_ADMINISTRATOR` (all permissions).
- The agreed **Roles sheet** (HOD / Marketing / Sales capability matrix, in the IKL workbook) was applied by migrations 033/034 and `constants/roles.js`. Campaign sending, automations and exports are Marketing; proposals, invoice references, programs are Sales; approval and user management are HOD. IKL has not yet confirmed the sheet (Q14).
- **Known drift:** extra grants (`contacts.delete/import/export`) on IKL pilot roles and `contacts.delete/export` on `MARKETING_EXECUTIVE`, left on purpose. Check the `/roles` matrix if a permission error looks strange.
- **Login screen (since 2026-11-04) shows only the Rector and the IKL team** (Head of Department = Sana Malik, Sales = Usman Tariq, Marketing = Mahnoor Chaudhry), so IKL is not confused by other departments. Central Admin and the Marketing / Admissions demo users are hidden. Set `DEMO_LOGIN_MODE=all` in `.env.local` to bring every demo user back (users carry `visibleOnLogin` in `constants/demoUsers.js`; `loginDemoUsers()` is used by both the page and `demoLoginAction`, so hidden users cannot be signed in by a crafted request). The email/password form is collapsed under "Staff sign-in with email and password". Demo users (full list; password comes from `DEMO_USER_PASSWORD`/seed): rector, central-admin, marketing-manager/-executive/-sales, **ikl-manager (Sana Malik, HOD/approver)**, **ikl-executive (Usman Tariq, sales)**, **ikl-marketing (Mahnoor Chaudhry)**, department-head/-marketing/-sales (Admissions template). Emails look like `ikl.manager@university.edu.pk`.

## 7. Departments in the database

`university` (executive scope), `marketing` (legacy "Marketing & Lead Department", no contacts now), `ikl-hsm` (**the real client**, reference prefix `IKL-2026-0001`), `admissions` (test department created through Settings with generic roles). OUD and LiveX are not created yet.

## 8. IKL engagement (the current work)

**Client:** IKL, corporate training. Requirements: BRD `IKL-CRM-BRD-001 v0.1` (85 functions in 5 CRM + 5 MIR groups). IKL has answered the first 13 open questions. Programs are both **open-enrollment (catalogue, batches, registrations, fees, certificates)** and **in-house/corporate engagements** (client-specific). One master person record across lead / participant / alumnus. Alumnus = completed at least one program. Reports on screen with Excel/PDF export. Documents searchable including text inside PDF/Word/Excel (scanned images need OCR, not included). Proposal approval by the designated IKL manager. Hide the university-wide dashboard and integrations from IKL users; remove demo data/banner before go-live.

**Decisions made with the user (do not re-litigate):**
- Delivery in **4 sprints, final delivery 30 Nov 2026**, each signed off by IKL before the next one builds on it; **progress demo every Tuesday**. Everything (including old "non-functional" items) lives in the **Functional Checklist** (SET-/GO-/WA- rows). No separate non-functional sheet.
- **Email:** campaigns go through a **third-party email service provided by the IT department** (Mailchimp expected); IKL's own address (info@ikl.com.pk) stays the visible sender; more than 500 emails/day; delivered/opened/clicked/bounced are read back into the CRM. **Open technical risk:** normal Mailchimp Marketing is not built for per-contact sending from another system; Mailchimp Transactional (Mandrill, separate add-on) or SES/SendGrid fits better. IT must confirm the exact product/plan before Sprint 2 sending is designed.
- **WhatsApp:** IKL will use it, including campaigns; the IT department supplies a third-party API. It is **not in the BRD** (added request WA-1/WA-2, Sprint 3, depends on API by 3 Nov and approved templates).
- **Campaigns are created and sent by the Marketing role only.** Sales sees results.
- **Invoices are issued in IKL's finance system.** The CRM only records a *reference* (invoice number, date, amount, payment status, payments received). No tax calculation, no invoice documents.
- **Website:** `ikl.com.pk`, built in-house with Next.js; our team connects the forms (secure API-key/webhook channel).
- **Document text search is required** (Sprint 4). One-to-one email recording (MIR-4.4) is "if time allows".
- Proposal approval is a record that gates *sending* the proposal. It does **not** block a deal's stage; the existing rule (only a manager with `deals.approve` can move a deal out of the "Approval" stage) is unchanged.
- Certificates: CRM records completion + certificate details; **generating certificate documents, waiting lists, escalation rules and finance-system integration are out of scope** unless approved through change control.
- Hosting/server: deferred by the user, but **the CRM must be reachable from the internet by ~10 Nov** for email tracking and website forms (function GO-1).

## 9. Current status (2026-10-26)

**Coverage (Done + half Partial, of 96 listed functions): about 66% by the code** (Done 59, Partial 9, Pending 28 once the workbook is updated; the shared workbook still shows the Sprint 1 state, 56%). Was 51% before Sprint 1. The workbook/Google file has NOT been updated for Sprint 2: the user will ask for that.

### Sprint 1: DELIVERED 2026-10-26 (code complete, tested in the running app, commit `99d18d6`); IKL demo/sign-off pending
| Ref | What it does | Where |
|---|---|---|
| CRM-1.11 | Notes on contacts, companies, deals (add, delete, author + time) | `noteService`, `NotesPanel`, Notes tab |
| CRM-5.6 | Global search also finds notes | `searchService`, `GlobalSearch` |
| CRM-1.14 | Company duplicate check (name ignoring Ltd/Pvt/punctuation, or same website) | `companyService`, `CompanyForm` |
| CRM-2.6 | Proposals: draft > submit > head approves / requests changes > mark sent > client accepted/declined; migration 033 adds approval columns | `proposalService`, `ProposalsPanel` |
| CRM-2.10 | "Convert to opportunity" on a contact; winning a deal sets contact Converted/Customer and company Active | `dealService.convertContactToDeal`, `ConvertToOpportunityButton` |
| MIR-3.6 | Invoice and payment references on a deal; Revenue report open to `reports.view` and scoped per department | `financeService`, `FinancePanel`, `reportingService.getRevenueDashboard(user)` |
| SET-3 | Head/admin resets a team member's password | `userService.resetUserPassword`, `ResetPasswordButton` |

Already built before Sprint 1 and counted Done: IKL roles, executive/integrations/API screens hidden from IKL, department sender identity form (name/address/reply-to; settings only), pipeline of 17 stages with manager gate, deals Kanban, contacts/companies/lists/folders/segments, tasks, meetings, call log, documents (attach/download), email campaign builder (demo mode), import of contacts from Excel/CSV, audit log, lead scoring (demo events), generic department dashboard, executive (Rector) dashboard (still hard-coded to marketing + ikl-hsm).

**Not tested in the UI after Sprint 1:** search results for notes in the overlay, and Usman (IKL executive) recording an invoice (permission granted by migration 034).

### Sprint 2: BUILT 2026-10-26, tested in the running app (uncommitted; migrations 035-037); real email provider deliberately left out
The user said: build everything in Sprint 2 **except choosing/connecting the third-party email service** (IT will decide, Mailchimp or Amazon SES; the user will send the details).
| Ref | What it does | Where |
|---|---|---|
| CRM-3.1 | Program catalogue: title, code, category (IKL's 14 categories), type (open enrollment / certificate / in-house), duration, standard fee, archive | `/programs`, `programService`, `constants/programs.js`, new permission `programs.view` (`training.manage` to edit) |
| CRM-3.2 | Batches of a program: dates, venue, trainer, seats, fee, status. Also in-house **engagements** on a deal (create/edit/delete) | `/programs/[id]` `BatchesPanel`; deal "Training & TNA" tab `EngagementsPanel`, `trainingService` |
| CRM-3.3 | Inquiry (deal) linked to a program and batch (deal form, Convert modal, deal summary) | `dealService.setDealProgram`, `ProgramSelect`, `DealProgramControl` |
| CRM-1.8 | Program interests on a contact (several programs or whole categories) | contact tab "Programs & organizations" `ContactProgramsPanel` |
| CRM-1.6 | One person record: lifecycle chips (Lead / Participant / Alumnus flags), extra organizations (`contact_companies`), participants added to an engagement are matched/created as contacts by email | `programService`, `trainingService.addParticipant` |
| MIR-5.2, MIR-5.4 | Contacts list: organization filter (main or extra link), created and last-activity date ranges | `contactService.getContacts`, `UrlDateInput` |
| MIR-3.1, 3.4, 3.2 | IKL dashboard: leads panel, contact-to-converted funnel, campaign panel (campaign panel only for `campaigns.view`) | `reportingService.getIklDashboard`, `/ikl-hsm` |
| CRM-4.7 | Company import from Excel/CSV (auto column matching, duplicate preview, history); contact import can link/create the company by name | `/companies/import`, `companyImportService`, `importService.resolveCompanies`, migration 036 |
| MIR-1.4 | Scheduled campaigns start automatically (scheduler endpoint every 5 min) | `/api/cron/campaigns`, `emailDeliveryService.runDueCampaigns` |
| MIR-1.7 | Unsubscribe link in every email, public page, one-click header; sets Unsubscribed/Opted Out | `/unsubscribe/[token]`, `/api/t/u/[token]` |
| MIR-1.6 (path built) | Open pixel + signed click links + provider webhook feed one event path; counters from event history | `/api/t/*`, `/api/email/webhook`, `recordEmailEvent` |
| GO-1 (readiness only) | `GET /api/health`, `APP_URL` documented. **The public hosting itself is still the IT department's job.** | `/api/health`, `DEPLOYMENT.md` |

**Still open from Sprint 2 (not code we can finish alone):** MIR-1.5 real sending (needs the provider: set up via `docs/email-delivery.md`), MIR-1.6 shows real numbers only once real mail is sent, GO-1 public hosting, and the first load of IKL's real contacts/companies (needs IKL's Excel files, Q16). Scheduled sending only works while something calls `/api/cron/campaigns` (Vercel cron or any cron).
**Honest notes:** open-enrollment registrations/attendance are Sprint 3 (participants today are added to in-house engagements only); the "alumnus" flag exists but is set in Sprint 3; the simulated email driver is slow (about 40 ms per recipient); "Simulate engagement (demo)" exists only while the provider is "simulated".
**Test side effects (demo data):** running the email tests set 3 seeded Marketing campaigns back to Scheduled after the scheduler wrongly marked them Failed (the Marketing department has no contacts any more), and reset the engagement status of a few hundred IKL contacts to Inactive; no real data was touched.

### Platform facts that are still true
- WhatsApp is **simulated** and email goes through the **simulated provider** ("DEMO ENVIRONMENT" banner; the full delivery pipeline exists, see docs/email-delivery.md). Real crons: hourly overdue tasks, campaign scheduler.
- Reports and dashboards cannot be exported; only contact lists export to CSV.
- No inbound lead capture endpoint yet (API keys/webhook records exist, nothing consumes them).
- Programs, batches, engagements and participants (in-house) now have screens (Sprint 2). **Registrations (individual/company nominations), attendance, completion/alumni, feedback and TNA entry still have no screens** (Sprint 3).
- Pipelines/stages are seeded only; contact status/type/source lists are fixed constants; `custom_fields` table is unused.

## 10. Pending / next (sprint plan to 30 Nov 2026)

Function refs refer to the Functional Checklist in the workbook (`docs/requirements/...xlsx`). Sprint dates: S1 20-27 Oct, **S2 28 Oct - Tue 10 Nov** (demos 3 & 10 Nov), **S3 11 - Tue 24 Nov** (demos 17 & 24 Nov), **S4 25 - Mon 30 Nov** (final acceptance/go-live).

- **Sprint 2:** built (section 9). **Remaining for Sprint 2:** connect the real email provider (MIR-1.5, waiting for IT's decision and credentials: follow docs/email-delivery.md), public hosting (GO-1, IT), first load of IKL's contacts/companies (Excel files from IKL), then update the workbook/Google file when the user asks.
- **Sprint 3 (registrations, tracking, website, WhatsApp):** CRM-3.4/3.5 registrations (individual + company nominations, fee, payment status), CRM-3.6 attendance per program, CRM-1.7 completion/alumni rule, CRM-3.8 feedback, CRM-3.7 program history, MIR-5.3/5.6 program filters, MIR-1.8 automations run by a scheduler, CRM-2.2 scoring from real activity, CRM-2.9 email reminders with manager visibility (in-system reminders first), WA-1 WhatsApp campaigns, WA-2 WhatsApp inbox replies, MIR-2.1 to 2.7 website capture (enquiry, brochure, registration, feedback forms, source tag, duplicate check, owner notified, acknowledgement email).
- **Sprint 4 (reports, migration, go-live):** CRM-4.8/4.9 migration of participants/alumni/registrations/feedback/history with the IKL focal person, MIR-3.5 registration reports, MIR-5.8 reports by program/source/date, MIR-3.7 team performance, MIR-3.8 export to Excel/PDF, MIR-3.9 date range on every dashboard, CRM-5.4 document search by name/title/type/client/program/date, CRM-5.5 text-in-document search, MIR-4.4 one-to-one email recording (**stretch**), GO-2 backup + restore test, GO-3 response-time check, GO-4 remove demo data/banner, GO-5 UAT + training.

**Open questions still to IKL (Q14-Q23, need-by dates in the workbook; reply status unknown as of 26 Oct, ask the user):** Q14 Roles sheet review + first users + proposal approver, Q15 email consent status, Q16 Excel files (contacts, companies) + focal person, Q17 invoice reference format/finance system, Q18 program catalogue, Q19 registration rules (seats, waiting list, fees, completion, certificates), Q20 website forms + wording, Q21 existing forms (feedback, evaluation, nomination, attendance sheet, certificate template), Q22 remaining Excel files, Q23 final report list. Also pending from the IT department: email service access + sending domain, WhatsApp API, public web address.

**Risks:** IKL inputs arriving late (email service, Excel files, catalogue, website); Sprint 3 is the heaviest (22 functions); WhatsApp template approval time; hosting not ready by ~10 Nov; Mailchimp product choice; two developers only.

## 11. Shared files and artefacts

- **Latest workbook (master copy):** `docs/requirements/IKL_CRM_Progress_Report_and_Sprint_Plan.xlsx`; generator scripts and how to rebuild/publish: `docs/requirements/README.md`, `docs/requirements/tools/`.
- **Shared with IKL (Google Drive, file id `1BBme4ntDDqX6hvvcJ101W8e1LEPydzgx`)**, an uploaded `.xlsx`, still named `..._v3.xlsx`. Updated to the Sprint 1 version on 2026-10-26 by uploading a new version (Drive > Manage versions). **Never edit it inside Google Sheets** (conditional formatting would be dropped). After each sprint: rebuild the workbook, upload as a new version, say so here.
- Source documents (outside the repo, on the user's PC): IKL BRD, `E:\download\IKL CRM Progress Report Answered-1.xlsx` (IKL's answers Q1-Q13), OUD requirements `E:\download\CRM Functional Requirements - OUD (1).docx`, LiveX `C:\Users\22732\Desktop\bee\LiveX Funnel and Tracking System.pdf`. A combined master workbook for IKL + OUD + LiveX (`CRM_Requirements_Master_IKL_OUD_LiveX_v2.xlsx`) and a "Platform Concept and Rules" Word draft (module catalog, department templates, Rector KPI cards) were created earlier; they live in the user's `Desktop\news_letter\oric2` folder / session scratchpad. **The master workbook contains OUD donor-sensitive requirements: never share it with a department; give each only its own sheets.**
- Old plans were superseded and moved to `Desktop\news_letter\oric2\superseded` (12-week plan, phased Word plan).
- An email to IKL announcing the sprint plan was drafted in chat (not sent by Claude).

## 12. Later (not started): other departments and the platform layer

- **OUD (fundraising):** donor/contact categories, fundraising pipeline, gifts/pledges, restricted fields visible only to named people, KPIs (high-level meeting, major donor, recurring donor). 12 open questions (OUD-Q1..Q12).
- **LiveX (enrollment funnel):** phone-first identity (conflicts with email-required contact model), 8 funnel stages + 2 off-ramps, lead capture (website, Meta lead forms), webinars, WhatsApp, payments. 10 open questions (LX-Q1..Q10). Its 17 Oct interim-sheet deadline is ignored for now.
- **Platform concept (designed, agreed in principle, not built):** department templates (Sales-only, Marketing-only, both, Fundraising, Enrollment funnel, B2B training), per-department module on/off ("role permission AND module enabled"), configurable fields/pipelines/lists, identity/duplicate rules, department-agnostic Rector dashboard with KPI cards (count, sum, ratio, stage conversion, time measure; each with target and period), per-department integration settings (sender email, WhatsApp number, ad accounts), "configuration vs development" boundary. Start after IKL Phase 2 at the earliest.

## 13. Gotchas learned the hard way

- **After a migration that changes a model, restart the dev server.** Sequelize models are cached on a global; the old process kept stale models and pages hung on the loading skeleton.
- **Run `npm run db:migrate` on every machine** after pulling (latest 034).
- Windows Git Bash heredocs in the agent shell **swallow double backslashes** (regex like `\\s` breaks). Create scripts with the Write tool instead.
- The in-app browser pane stops painting when the window is hidden: call `tabs_select` and act inside one `browser_batch`. Clicks by coordinate inside modals can misfire; prefer refs.
- Do not default date inputs from the browser clock (can differ from the server); let the server default dates.
- `DATEONLY` columns and +05:00 timezone can shift a day in raw SQL output; trust the app, not raw UTC.
- Excel files that are open in Excel cannot be overwritten (EBUSY): save under a new name.
- Excel `COUNTA` counts empty strings; use `COUNTIF(range,"?*")`.
- **The C: drive was completely full (0 GB free) on 2026-10-26**: npm failed with ENOSPC. Freed 6 GB by clearing the npm download cache (`npm cache clean --force`, safe). If MySQL or npm misbehave, check free space first. `.next` is about 2 GB and can be deleted when the dev server is stopped.
- Create test data through the app or scripts, then **delete it**; use a temporary API route (verify with the logged-in session, then delete the route) to exercise services that import `server-only`.
- Campaign status transitions are validated (`STATUS_CHANGES` in campaignService); a Scheduled campaign whose audience is empty at send time is marked Failed.
- Upload to Drive "Upload new version" through the Chrome extension: patch `HTMLInputElement.prototype.click` to append the file input to the page, then use `file_upload` on it.

## 14. Changelog (newest first; one line per change)

- 2026-11-04 - "HSM" dropped from everything the user sees: the department is **IKL** (display names changed by migration 038; internal keys `ikl-hsm` / `IKL_HSM_*` unchanged), pilot roles renamed IKL Head of Department / IKL Sales, dashboard moved from `/ikl-hsm` to `/ikl` (old URL redirects). Sidebar: a department-scoped user's own dashboard is the **Dashboard** item (highlighted there); the "Departments" section now appears only for university-wide users (Rector/admin), the Rector's duplicate "Executive Dashboard" item is hidden, and the department-edit page is labelled "Email sender" for non-admins. `homeDashboardPath(user)` in `constants/navigation.js` mirrors the `/dashboard` redirect logic.
- 2026-11-04 - Login screen reduced to Rector + IKL team (Head/Sales/Marketing labels), other demo departments and Central Admin hidden (`DEMO_LOGIN_MODE=all` restores), email form collapsed, stale text ("58,000+ contacts", "Brevo") removed from the login page and page metadata.
- 2026-11-04 - Pre-push cleanup: dead-code scan found no unreferenced files and no debug/TODO/commented-out code; removed 5 unused Next.js template SVGs, 3 unused service functions (`listProposals`, `paymentMethods`, `updateInvoice`), and lowered the seed default from 58,000 to 500 contacts. Out-of-scope features (Marketing pilot, Rector dashboard, integrations, demo center) were **kept on purpose**: they are hidden from IKL by permissions and belong to the platform vision. Sprint 1 + 2 committed and pushed to GitHub.
- 2026-10-26 - Sprint 2 built (migrations 035-037): program catalogue + batches, program interests, one-person record, inquiry-program link, in-house engagements and participants, contact filters (organization, dates), IKL dashboard panels (leads, funnel, campaigns), company import + contact import company linking, email delivery pipeline (provider layer, scheduler, tracking, unsubscribe, webhook) with a simulated provider, /api/health. Real provider, hosting and IKL's data files pending. Workbook not yet updated.
- 2026-10-26 - Sprint 1 delivered and verified (commit 99d18d6). Shared IKL Google file updated to the Sprint 1 workbook. `docs/requirements/` and this CLAUDE.md added.
- 2026-10-26 - Proposal wording corrected: approval gates sending the proposal, not the deal stage.
- 2026-10-22 - Open questions revised after the user's answers (email via IT department/Mailchimp expected, WhatsApp via IT API, invoices stay in finance system, website in-house Next.js, document text search required, roles sheet added). Workbook v3.
- 2026-10-19 - Deadline fixed at 30 Nov 2026, 4 sprints, Tuesday demos; 12-week plan dropped; non-functional sheet folded into the functional checklist. 58,002 Marketing demo contacts deleted.
- 2026-10-14 to 19 - Vision agreed (hierarchy, shared data, Rector view); requirement workbooks for IKL, OUD, LiveX; IKL answered Q1-Q13; Marketing/Sales generic roles, multi-role users, generic department dashboard, demo logins for Head/Marketing/Sales (commits 6f04344 .. 35a2393).
- Before 2026-10-14 - Base platform: MySQL/Sequelize app with RBAC, contacts, companies, deals, campaigns (simulated), automation, conversations (simulated), reports, executive dashboard, 14 seeders, 32 migrations.
