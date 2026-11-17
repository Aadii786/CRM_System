# WhatsApp, automations and reminders (Sprint 3)

## WhatsApp

IKL uses WhatsApp for campaigns and replies. The WhatsApp service is **provided by the IT department** (third-party API). The CRM talks to it through a driver, the same idea as the email provider (`src/lib/whatsapp/provider.js`).

| Variable | Meaning |
|---|---|
| `WHATSAPP_PROVIDER` | `simulated` (default, nothing leaves the system) or `http` |
| `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN` | the IT department's API address and token (driver `http`) |
| `WHATSAPP_RESPONSE_ID_FIELD` | field of the API answer that holds the message id (default `id`) |
| `WHATSAPP_WEBHOOK_SECRET` | secret the WhatsApp service sends to `POST /api/whatsapp/webhook` |

The `http` driver posts `{ to, text, template, language, metadata }` as JSON with `Authorization: Bearer <token>`. When IT hands over the real API, only the request shape in that driver needs adjusting (one function).

**Inbound** (`POST /api/whatsapp/webhook`, header `Authorization: Bearer <WHATSAPP_WEBHOOK_SECRET>`):

```json
{ "messages": [ { "from": "923001234567", "text": "Yes please", "id": "wamid...", "timestamp": "2026-11-12T09:30:00Z" } ],
  "statuses": [ { "id": "wamid...", "status": "delivered" } ] }
```

A reply lands in the **WhatsApp inbox** and on the person's history, raises the lead score ("WhatsApp reply"), notifies the assigned user, counts as a **reply** for the last WhatsApp campaign the person received and can start an automation. Numbers are matched on the last 10 digits (spaces, dashes and `+` ignored). Replies from numbers that are not in the CRM are ignored. Delivery receipts (`delivered`, `read`, `failed`) update the message and the campaign counters.

**Campaigns:** create a campaign with channel WhatsApp (Campaigns > New), same audiences and scheduling as email. People without a number, who unsubscribed, bounced or opted out are skipped. Business-initiated WhatsApp messages normally need the recipient's consent and approved templates: IKL and IT confirm both before the first real send (the CRM treats "Unknown" consent as allowed, exactly like email).

## Automations that run by themselves

An automation is a trigger, then steps: **wait**, **send email**, **send WhatsApp**, **create task**, **notify the owner**, **change status**, **condition** (opened / clicked the last email, replied on WhatsApp, is registered; Yes continues, No ends). Build it on the automation page, press **Activate**.

Triggers that really fire: a contact is added, a website form is received, someone registers, someone completes a program, a campaign email is opened or clicked, a WhatsApp reply arrives, an inquiry changes stage. A trigger can be limited to one program or one form type. Each person enters an automation once. A person who unsubscribed, bounced or opted out leaves it. Every step is logged per person. Emails sent by an automation carry the unsubscribe link and open/click tracking.

Waits end on time because of the scheduler (below).

## The scheduler

One function runs the background work: scheduled campaigns, automation waits, overdue tasks and follow-up reminders (`src/lib/services/schedulerService.js`). It is called by:

- `/api/cron/campaigns`, `/api/cron/automations`, `/api/cron/reminders` (Vercel Cron or any cron service; protect with `CRON_SECRET`), and
- the signed-in app itself, at most once a minute per server, so a host without cron (the Railway test link) still works while someone uses the CRM.

For production, ask IT for a real cron calling the three endpoints every 5 minutes.

## Follow-up reminders

A task or meeting that is due within the next 24 hours (`REMINDER_HOURS_AHEAD`) sends its owner one notification and one email. Managers (people who approve proposals) get **one digest notification** when follow-ups stay overdue for more than a day, and see a **Team follow-ups** table on the Tasks page. WhatsApp reminders to staff are not built (decision pending with IKL).

## Lead scoring

Points now come from real activity: email opened and clicked, WhatsApp reply, website form, meeting completed. Rules and the "qualified" threshold are in Settings > Lead scoring. The old "Send Email (demo)" shortcut on a contact no longer adds points.
