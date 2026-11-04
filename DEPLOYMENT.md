# Deploying to the Internet (Vercel + Railway)

This is the easiest free path: **Vercel** hosts the Next.js app, **Railway**
hosts a managed MySQL database. Both let you sign in with GitHub/Google in
under a minute, no payment method required to start.

---

## Step 1 - Push this repo to GitHub

The project is already a git repo with one commit (`a7cc2cb`). You just need
a remote to push it to:

1. Go to [github.com/new](https://github.com/new) and create a new repository
   (e.g. `university-crm`). Leave it empty — don't add a README/gitignore,
   we already have those.
2. Back in your terminal:

```bash
cd C:\Users\22732\Desktop\news_letter\CRM
git remote add origin https://github.com/<your-username>/university-crm.git
git branch -M main
git push -u origin main
```

---

## Step 2 - Create a MySQL database on Railway

1. Go to [railway.app](https://railway.app) and sign in (GitHub login is
   fastest).
2. **New Project → Provision MySQL**. Railway spins up a MySQL instance in
   seconds.
3. Click into the MySQL service → **Variables** (or **Connect**) tab. You'll
   see connection details — note these down:
   - `MYSQLHOST`
   - `MYSQLPORT` (usually `3306` or a custom port Railway assigns)
   - `MYSQLDATABASE`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`

   These map directly to `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
   `DB_PASSWORD` in this project's `.env`.

---

## Step 3 - Deploy the app to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. **Import** the `university-crm` repo you just pushed.
3. Vercel auto-detects Next.js — leave build settings as default
   (`npm run build`, output detected automatically).
4. Before clicking Deploy, open **Environment Variables** and add:

   | Key | Value |
   | --- | --- |
   | `DB_HOST` | (Railway `MYSQLHOST`) |
   | `DB_PORT` | (Railway `MYSQLPORT`) |
   | `DB_NAME` | (Railway `MYSQLDATABASE`) |
   | `DB_USER` | (Railway `MYSQLUSER`) |
   | `DB_PASSWORD` | (Railway `MYSQLPASSWORD`) |
   | `DB_DIALECT` | `mysql` |
   | `NODE_ENV` | `production` |
   | `APP_URL` | your Vercel URL, e.g. `https://university-crm.vercel.app` (fill in after first deploy, then redeploy) |
   | `SESSION_SECRET` | a long random string — generate with the command below |
   | `DEFAULT_ADMIN_EMAIL` | e.g. `admin@university.edu.pk` |
   | `DEFAULT_ADMIN_PASSWORD` | pick a real password |
   | `DEMO_USER_PASSWORD` | password shared by the 6 demo accounts |
   | `SEED_CONTACT_COUNT` | `5000` (lower than 58,000 - see note below) |

   Generate `SESSION_SECRET` locally:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

5. Click **Deploy**. First build takes a couple of minutes.

> **Note on `SEED_CONTACT_COUNT`**: free-tier database plans have limited
> storage/compute. 58,000 contacts will work but takes longer to seed and
> uses more of your free quota. Start with `5000` for a snappy public demo,
> bump it later once you've confirmed everything works.

---

## Step 4 - Initialize the production database

Vercel doesn't run one-off shell commands for you, so run migrations/seed
**from your own machine**, pointed at the Railway database:

1. Temporarily edit your local `.env.local` (or make a copy as
   `.env.production.local`) with the Railway `DB_*` values from Step 2.
2. Run:

```bash
npm run db:create    # skip if Railway already created the database
npm run db:migrate
npm run db:seed
```

This connects over the internet to Railway's MySQL and creates every
table + demo data there — Vercel's app will read from the same database on
every request.

3. Restore your local `.env.local` back to your local MySQL settings
   afterward if you still want to run the app locally too.

---

## Step 5 - Verify

Visit your Vercel URL. You should land on `/login` with the six demo-user
buttons. Sign in and click through Contacts, Executive Dashboard, etc.

If something 500s, check **Vercel → your project → Deployments → (latest) →
Runtime Logs** for the actual error — that's the fastest way to see what
broke, and paste it to me if you get stuck.

---

## Later: updating the live site

Any time you want to ship a change:

```bash
git add -A
git commit -m "describe the change"
git push
```

Vercel automatically redeploys on every push to `main`.

## Security reminders

- Never commit `.env.local` (already git-ignored).
- Change `DEFAULT_ADMIN_PASSWORD` and `DEMO_USER_PASSWORD` to something real
  before sharing the URL widely — this demo's login page shows all 6 demo
  accounts by design, so anyone with the link can sign in as any of them.
  That's appropriate for a stakeholder demo, not for anything containing
  real data.


---

## Email delivery and the scheduler (Sprint 2)

- **Public address:** set `APP_URL` to the address users and email recipients reach (e.g. `https://crm.ikl.com.pk`). Open-tracking, click-tracking and the unsubscribe link in every campaign email are built from it. Check it with `GET /api/health` (returns `{"ok":true,"database":"up"}`).
- **Scheduler:** `vercel.json` calls `/api/cron/campaigns` every 5 minutes (and `/api/cron/reminders` hourly). On any other host, point a cron job at the same URLs, with `Authorization: Bearer <CRON_SECRET>`. Scheduled campaigns only send when this runs.
- **Provider:** `EMAIL_PROVIDER=simulated` sends nothing. Plug in the real service as described in `docs/email-delivery.md`, then set `EMAIL_PROVIDER` and `EMAIL_WEBHOOK_SECRET`.
- **Migrations:** run `npm run db:migrate` after every deploy (latest: 037).
