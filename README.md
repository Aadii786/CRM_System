# University CRM & Marketing Platform (Demo)

A centralized university CRM — Marketing/lead nurturing, IKL/HSM B2B CRM, WhatsApp
communication, automation, reporting and an executive (Rector) dashboard — built on
the Brevo evaluation requirements. This is a real, database-backed application:
authentication, RBAC, contacts, companies, deals, campaigns, automation and every
other module read and write to MySQL through Sequelize. **It is not the official
Brevo product** — it's a demonstration of how the university could operate the
requirements described in the source document.

> **DEMO ENVIRONMENT.** No real emails or WhatsApp messages are ever sent, and no
> external APIs are actually called — every "send" is simulated and clearly logged
> as such. See `src/lib/services/*` for where a real provider would plug in later.

## 1. Requirements

- Node.js 20.9+ (LTS)
- npm 10+
- MySQL 8.x (or a MySQL-compatible server) running locally or reachable over the network
- A `mysql` user with permission to create databases (for `npm run db:create`) — or a
  DBA can create an empty database for you and you can skip that step

## 2. Environment setup

Copy the example env file and fill in real values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=crm_platform
DB_USER=root
DB_PASSWORD=your_database_password   # never commit this file
DB_DIALECT=mysql

SESSION_SECRET=<generate a long random string>
DEFAULT_ADMIN_EMAIL=admin@university.edu.pk
DEFAULT_ADMIN_PASSWORD=<pick a real password>
DEMO_USER_PASSWORD=<shared password for the 6 demo accounts>
SEED_CONTACT_COUNT=58000
```

Generate a `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`.env.local` is git-ignored and must never be committed. `.env.example` (tracked)
documents every variable without real values. Nothing in `.env.local` is ever sent
to the browser — database credentials only exist in server-only code
(`src/lib/db/**`, files marked `import "server-only"`).

## 3. Install dependencies

```bash
npm install
```

## 4. Database setup

```bash
npm run db:create    # creates the MySQL database (skip if a DBA already made it)
npm run db:migrate    # creates every table via versioned migrations
npm run db:seed       # seeds departments, roles, permissions, the 6 demo users,
                       # ~58,000 Marketing + ~4,280 IKL/HSM contacts, companies,
                       # deals, campaigns, automations, conversations, training/
                       # financial records, notifications and audit logs
```

Or run all three in one go:

```bash
npm run db:setup
```

To start over from a clean database (destructive — drops the database first):

```bash
npm run db:reset
```

Seeding ~58,000 contacts uses batched `bulkCreate` calls rather than one INSERT per
row, so it stays fast even on modest hardware. Lower `SEED_CONTACT_COUNT` in
`.env.local` before seeding if you want a smaller demo dataset.

Other useful commands:

```bash
npm run db:migrate:undo   # roll back the most recent migration
npm run db:seed:undo      # undo all seeders
```

## 5. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to
`/login`.

## 6. Production build

```bash
npm run lint
npm run build
npm run start
```

## 7. Demo accounts

The login page has one-click buttons for all six seeded users — the actual
password is never exposed to the browser (a server action resolves it from
`DEMO_USER_PASSWORD` / `DEFAULT_ADMIN_PASSWORD`). To sign in manually with
email + password instead:

| Role                        | Email                                | Password             |
| ---------------------------- | ------------------------------------- | --------------------- |
| Rector                       | `rector@university.edu.pk`            | `DEMO_USER_PASSWORD`  |
| Central CRM Administrator    | `DEFAULT_ADMIN_EMAIL` (env)           | `DEFAULT_ADMIN_PASSWORD` |
| Marketing Manager            | `marketing.manager@university.edu.pk` | `DEMO_USER_PASSWORD`  |
| Marketing Executive          | `marketing.exec@university.edu.pk`    | `DEMO_USER_PASSWORD`  |
| IKL/HSM Manager              | `ikl.manager@university.edu.pk`       | `DEMO_USER_PASSWORD`  |
| IKL/HSM Executive            | `ikl.exec@university.edu.pk`          | `DEMO_USER_PASSWORD`  |

Passwords are bcrypt-hashed in the database; the values above are whatever you set
in `.env.local` before seeding.

## 8. RBAC structure

- **Departments** are data-driven (`departments` table) — currently `university`
  (executive scope), `marketing`, `ikl-hsm`. Adding a future department is a data
  change, not a code change (see requirements #67-#68).
- **Permissions** are fine-grained keys like `contacts.view`, `campaigns.send`,
  `deals.move_stage` — the full catalog lives in
  `src/lib/constants/permissions.js`.
- **Roles** (`RECTOR`, `CENTRAL_CRM_ADMINISTRATOR`, `MARKETING_MANAGER`,
  `MARKETING_EXECUTIVE`, `IKL_HSM_MANAGER`, `IKL_HSM_EXECUTIVE`) map to permission
  sets in `src/lib/constants/roles.js` and are editable at runtime from
  **Roles & Permissions** (`/roles`) by anyone with `roles.manage`.
- **Enforcement is server-side**, not just hidden buttons: every service function
  in `src/lib/services/*` calls `requirePermission()` / `requireDepartmentAccess()`
  from `src/lib/permissions/rbac.js` before touching the database, and a
  department-scoped user's queries are always intersected with their accessible
  department IDs — a department key or ID sent from the client is never trusted
  directly.
- Session cookies are signed, httpOnly JWTs (`src/lib/auth/session.js`); roles and
  permissions are re-read from the database on every request, so a permission
  change from the Roles screen takes effect on the very next request, not at next
  login.

## 9. Database architecture

- **ORM**: Sequelize 6 + `mysql2`, models in `src/lib/db/models/*.model.js` (47
  models), loaded via a static require list in `src/lib/db/models/index.js`
  (Turbopack can't bundle a fully dynamic `fs.readdirSync`-based loader, so every
  new model must be added to that list explicitly).
- **Migrations**: `src/lib/db/migrations/*.js`, applied in numeric/dependency
  order — departments → permissions/roles → users → ... → custom objects/settings.
- **Seeders**: `src/lib/db/seeders/*.js`. Deterministic (seeded PRNG) so re-running
  against a fresh database produces the same demo dataset every time.
- **Service layer**: `src/lib/services/*.js` is the only code that talks to
  Sequelize models directly. Server Actions (`src/actions/*.js`) and Server
  Components call services — never raw models — so authorization and audit logging
  stay centralized. Swapping the underlying data source later (a real Brevo API,
  a university SIS, etc.) means changing a service function, not every page that
  calls it.
- `next.config.mjs` marks `sequelize`, `mysql2` and `bcryptjs` as
  `serverExternalPackages` — Sequelize's dialect files reference driver packages
  for every SQL dialect at module-eval time, which otherwise fails to bundle since
  only `mysql2` is installed.

## 10. Project structure

```
src/
  app/
    login/                  public
    (app)/                  everything behind requireUser() — contacts, companies,
                             deals, campaigns, segments, automations, conversations,
                             tasks, meetings, marketing, ikl-hsm, executive, reports,
                             users, roles, integrations, api-webhooks, audit-logs,
                             settings, demo-center
    api/                     route handlers (global search, CSV export)
  actions/                   Server Actions - the only way client components mutate data
  components/
    ui/                      Button, Badge, Card, DataTable, Modal, Drawer, Toast, ...
    layout/                  Sidebar, Header, AppShell, GlobalSearch, ...
    charts/                  recharts wrappers (line/bar/donut) + a plain funnel
    contacts/ companies/ deals/ campaigns/ segments/ automation/ conversations/
    tasks/ meetings/ admin/ demo/
  lib/
    auth/                    session cookies, login/logout, requireUser()
    permissions/              rbac.js - the single source of truth for authorization
    services/                 all Sequelize access + business logic
    db/
      models/ migrations/ seeders/ config/
    constants/                departments, permissions, roles, demo users, CRM vocab
    utils/                    formatting, CSV parsing
```

## 11. Testing checklist

Manually verified during development: login + demo user switching, permission-aware
sidebar per role, contacts list/detail/create/edit/CSV import, segments builder,
campaign wizard + simulated send + funnel, automation node-tree visualization + "Run
Demo Automation", companies + deals + Kanban pipeline with stage-move dropdowns, deal
detail (training/TNA/proposals/invoices), WhatsApp inbox + simulated inbound reply,
tasks/meetings, Executive/Marketing/IKL-HSM dashboards, department performance and
revenue reports, users/roles permission matrix, integrations/API keys/audit logs,
settings, Demo Center's four mandatory scenarios, 403/404/error pages, responsive
layout down to mobile. `npm run lint` and `npm run build` both pass clean.

**Not independently verified**: this sandbox has no MySQL server, so migrations and
seeders have not been run against a live database here — review them once against
your own MySQL instance before treating the dataset as final.

## 12. Security notes

- Passwords are bcrypt-hashed; the default scope on the `User` model excludes
  `passwordHash` from every query unless `User.scope('withPassword')` is used
  explicitly (only in the login path).
- API keys are stored as bcrypt hashes; the raw key is shown exactly once, at
  creation, and never persisted or retrievable again.
- `SESSION_SECRET`, `DB_PASSWORD` and all other secrets live only in `.env.local`
  (git-ignored) and are read via `process.env` in server-only files.
