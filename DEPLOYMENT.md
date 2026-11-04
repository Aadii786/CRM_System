# Test link on Railway (app + MySQL)

The test deployment runs entirely on **Railway**: one service for the Next.js app (built from
`Aadii786/CRM_System`, branch `main`, auto-deploys on every push) and one MySQL service in the same project.
Never put real passwords in this file or in git; secrets live only in Railway's Variables tab.

Live address: `https://crmsystem-production-e882.up.railway.app` (Railway project `spectacular-truth`, environment `production`).

## How it is set up

| Item | Setting |
| --- | --- |
| App service | GitHub repo `CRM_System`, builder Railpack, public domain with target port `8080` |
| Database | Railway MySQL service; the app reads it through reference variables `DB_HOST=${{MySQL.MYSQLHOST}}`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (so no password is ever copied by hand) |
| Variables | `DB_*`, `DB_DIALECT=mysql`, `PORT=8080`, `APP_URL` (the public address above), `SESSION_SECRET`, `CRON_SECRET`, `EMAIL_WEBHOOK_SECRET`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `DEMO_USER_PASSWORD`, `SEED_CONTACT_COUNT=500`, `EMAIL_PROVIDER=simulated` |
| Pre-deploy command | `npm run db:migrate` (runs new migrations before each deploy; never put `db:seed` here, the data seeders would duplicate rows) |
| `DEMO_LOGIN_MODE` | not set, so the login screen shows only the Rector and the IKL team |

Do **not** add `NODE_ENV` as a variable (a "development" value breaks the build).

## First-time database setup (already done)

The first deploy ran `npm run db:migrate && npm run db:seed` as the pre-deploy command, then the command was
reduced to `db:migrate`. To rebuild the demo data from scratch: delete and re-create the MySQL service (or
drop its tables), temporarily set the pre-deploy command back to `npm run db:migrate && npm run db:seed`,
redeploy once, then restore it.

The seeders `001-departments` and `002-permissions-roles` are idempotent because later migrations insert their
own roles and permissions; a fresh "migrate, then seed" database used to fail with "Validation error".

## Changing the demo password

Edit `DEMO_USER_PASSWORD` in Railway **and** re-seed (or change the passwords inside the app), because the
hash is stored in the database at seed time.

## Known limits of the test link

- Uploaded files are written to the container disk (`src/lib/services/fileStorage.js`), which is wiped on every
  deploy. Fine for a demo; move to object storage (Railway Bucket) before real use.
- Railway has no cron: `/api/cron/campaigns` and `/api/cron/reminders` are not called automatically, so scheduled
  campaigns do not start by themselves (reminders also run when the app is used). Use an external scheduler
  that calls them with `Authorization: Bearer <CRON_SECRET>` when this matters. `vercel.json` is only used if the
  app is ever moved to Vercel (its crons run once a day on the free plan).
- Emails are simulated; nothing is sent until IT picks a provider (see `docs/email-delivery.md`).
- Railway's trial gives about 30 days or US$5 of credit; add a plan before it runs out.
