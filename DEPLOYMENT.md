# Deploying a test link (Vercel + Railway)

**Vercel** hosts the Next.js app, **Railway** hosts the MySQL database. The code is
already on GitHub (`Aadii786/CRM_System`, branch `main`) and `npm run build` passes.

Never put real passwords in this file or in git; enter them only in the Vercel / Railway dashboards.

## 1. Database on Railway

1. railway.app -> sign in -> **New Project -> Provision MySQL**.
2. Open the MySQL service -> **Variables**. You need the **public** (TCP proxy) host and port,
   not the internal one: Vercel connects from outside Railway. Note `MYSQLHOST`, `MYSQLPORT`,
   `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD` (they map to `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).

## 2. Create the tables and demo data (from your own PC)

Copy `.env.local` to a backup, then temporarily set the five `DB_*` values to the Railway ones
(keep `SEED_CONTACT_COUNT=500`), and run:

```bash
npm run db:migrate
npm run db:seed
```

Then restore your local `.env.local`. All 38 migrations must run without errors.

## 3. App on Vercel

1. vercel.com/new -> import the `CRM_System` repo (framework: Next.js, default build settings).
2. Add these Environment Variables **before** deploying:

| Key | Value |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Railway values from step 1 |
| `DB_DIALECT` | `mysql` |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` | same values used when seeding |
| `DEMO_USER_PASSWORD` | same value used when seeding (the demo-login buttons use it) |
| `DEMO_LOGIN_MODE` | leave empty (login shows only the Rector and the IKL team) |
| `EMAIL_PROVIDER` | `simulated` (no real email is sent) |
| `CRON_SECRET`, `EMAIL_WEBHOOK_SECRET` | any long random strings |
| `APP_URL` | the final Vercel URL (add after the first deploy, then **Redeploy**) |

3. Deploy, then open the URL and sign in as the Rector and as the IKL users.

## Known limits of the test link

- `vercel.json` crons run **once a day** (reminders 08:00, campaign scheduler 09:00 UTC) because the free
  Hobby plan does not allow more often. Scheduled campaigns therefore start up to a day late; on a Pro plan
  change the campaign schedule back to `*/5 * * * *`.
- Uploaded files are saved to local disk (`src/lib/services/fileStorage.js`), which on Vercel is temporary,
  so document uploads will not persist. Fine for a demo; use object storage for production.
- Emails are simulated; nothing is sent until IT picks a provider (see `docs/email-delivery.md`).
- Central Admin one-click login is hidden from the login screen by default; keep `DEMO_LOGIN_MODE` empty.
