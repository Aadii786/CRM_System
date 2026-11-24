# Go-live runbook (IKL CRM)

For the project team and the IT department. Do the steps in this order. Each step says how to check it worked.

## 0. Before the day

| Step | Who | Check |
| --- | --- | --- |
| Permanent web address and HTTPS | IT | the CRM opens at the agreed address; `APP_URL` is set to it |
| Persistent disk for attached documents | IT / project team | A volume is mounted and `UPLOAD_DIR` points to it. Without it, attached files disappear at every deploy |
| Scheduler | IT | the host calls `/api/cron/campaigns`, `/api/cron/automations` and `/api/cron/reminders` every 5 minutes with `Authorization: Bearer <CRON_SECRET>` |
| Email account and verified sending domain | IT | `EMAIL_PROVIDER` set, driver connected (see `docs/email-delivery.md`) |
| WhatsApp service and approved templates | IT | `WHATSAPP_PROVIDER` set, webhook secret set (see `docs/whatsapp-and-automations.md`) |
| Website sends its four forms | Website team | `docs/website-forms.md`; a test form shows on Website forms |
| Optional "copy to CRM" mailbox | IT | the mailbox calls `POST /api/email/capture` with `EMAIL_CAPTURE_SECRET` (`docs/email-delivery.md`) |

## 1. Load IKL's own data (CRM-4.8, CRM-4.9)

1. Contacts: Contacts > Import (Excel or CSV, column mapping, duplicate preview). Companies: Companies > Import.
2. Programs, batches, participants, registrations and history: Programs > Import program data. Download the template, fill it, press **Check the file**, fix the rows listed, check again, then **Import**.
3. Sit with the IKL focal person and compare counts and a sample of records with the Excel files. Run the check again after corrections: it is safe to repeat (people are matched by email, programs by code, batches by program and code, registrations by batch and person).
4. Attach documents; then open Documents and press **Read documents for search** for files that were attached earlier.

## 2. Backup and restore test (GO-2)

```bash
npm run db:backup:verify
```

Takes a backup, restores it into a scratch database, compares every table with the live one and removes the scratch database. It must print `RESTORE CHECK PASSED`. Run it on the production database before go-live and keep the first backup.

Regular backups: schedule `npm run db:backup -- --with-uploads` daily (the host's scheduled job, or ask the hosting provider to enable database backups as well). Backups are written to `backups/` (not in git; they contain personal data). To restore: `npm run db:restore -- backups/<file>.sql.gz --yes`.

## 3. Response times (GO-3)

```bash
npm run build && npm start
npm run perf:check -- --url http://localhost:3000 --as-user <head user id>
npm run perf:check -- --url https://<live address> --cookie "<crm_session value>" --write docs/performance-check.md
```

Every screen should be within its target (screens 2 seconds, search 1 second). The last run is in `docs/performance-check.md`.

## 4. Remove demo data and the demo banner (GO-4)

1. Create the real users first (Users screen), at least the Head of Department.
2. Dry run: `npm run golive:cleanup` lists what would be deleted and changes nothing.
3. Do it: `npm run golive:cleanup -- --confirm-database <database name> --disable-demo-users`. A backup is taken first. The set-up (departments, roles, permissions, pipeline stages, settings, integrations, tags, users) is kept.
4. Set `APP_MODE=live` and redeploy: the demo banner, the one-click demo logins and the Demo Center disappear; the login shows the email and password form.
5. Load IKL's data (step 1) **after** the cleanup, not before.

## 5. Acceptance test and training (GO-5)

Use `docs/IKL_UAT_and_Training_Plan.html` (print it): the acceptance scenarios for each role, the three training sessions and the sign-off page. IKL names the person who accepts and the people to train.

## 6. Day one

- Check the Audit Log and the notifications after the first hour.
- Keep the backup taken before the cleanup for at least 30 days.
- Report problems to the project team through the shared workbook (sheet Open Questions) or by email.
