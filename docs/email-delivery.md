# Campaign email delivery

How campaign email works in the CRM, and exactly what to do when IKL's IT department chooses the real email service (Mailchimp, Amazon SES, SendGrid, SMTP ...). Built in Sprint 2; the real provider is **not** connected yet.

## What exists today

```
Send now / scheduled time
   -> dispatchCampaign / runDueCampaigns        (src/lib/services/emailDeliveryService.js)
   -> queue: one campaign_recipients row per eligible contact
   -> process: for each queued recipient, render the message and call the PROVIDER
   -> events come back: delivered / opened / clicked / bounced / unsubscribed
```

| Piece | File | Notes |
|---|---|---|
| Audience | `emailDeliveryService.audienceCounts` | Department (or segment) contacts, **minus** no email, status Unsubscribed/Bounced, opt-in "Opted Out", `unsubscribed_at` set |
| Personalisation | `src/lib/email/render.js` | `{{firstName}} {{lastName}} {{fullName}} {{email}} {{company}}`, in the subject too |
| Tracking | `render.js` + `/api/t/o/[token]` + `/api/t/c/[token]` | Open pixel; every web link wrapped in a **signed** redirect (no open-redirect possible) |
| Unsubscribe | `/unsubscribe/[token]` (public page), `POST /api/t/u/[token]` (one-click, RFC 8058), `List-Unsubscribe` headers | Sets contact Unsubscribed + Opted Out + `unsubscribed_at`; works even if the campaign was deleted |
| Scheduler | `GET /api/cron/campaigns` (every 5 min, `vercel.json`) | Starts campaigns whose `scheduled_at` has passed, continues unfinished "Sending" ones. Guard: `CRON_SECRET` |
| Provider events | `POST /api/email/webhook` | Bearer `EMAIL_WEBHOOK_SECRET`, normalized JSON (below) |
| Counters | `recomputeCounters` | From event history (distinct people), so open-then-unsubscribe still counts as opened |
| Demo | "Simulate engagement (demo)" button | Only while the provider is `simulated`; produces opens/clicks/unsubscribes through the real event path |

Statuses: Draft -> Scheduled -> Sending -> Sent (or Failed). A send request works for ~8 seconds, then the scheduler (or the "Continue sending" button) finishes large campaigns. The simulated driver takes about 40 ms per recipient, so it is slower than a real batch API; real drivers should use the provider's batch endpoint.

## Plugging in the real provider (when IT decides)

1. Get from IT: which product and plan, the API key / SMTP credentials, the verified sending domain (SPF, DKIM, DMARC for `ikl.com.pk`), and the daily limit (IKL expects 500+ emails a day).
   - **Important:** the standard Mailchimp *Marketing* product runs its own campaigns and is not built for another system sending one email per contact. For the CRM, use **Mailchimp Transactional (Mandrill, a separate add-on)** or Amazon SES / SendGrid.
2. In `src/lib/email/provider.js` replace the placeholder driver (`mailchimp` or `ses`) with a real one:
   `{ name, async send(message) -> { ok, providerMessageId, status: "sent" } }`. Return `status: "sent"`, not `"delivered"` (only the simulated driver claims delivered).
   The `message` has `to, toName, from, fromName, replyTo, subject, html, text, headers, metadata: { campaignId, contactId }`. Pass `metadata` through to the provider so webhook events can be matched back.
3. Set in the environment: `EMAIL_PROVIDER`, `APP_URL` (public address, needed for tracking links), `EMAIL_WEBHOOK_SECRET`, and the provider's own keys.
4. In the provider's dashboard point its webhook at `https://<APP_URL>/api/email/webhook`. If the provider's payload differs, add a small adapter that converts it to the normalized format:

```json
POST /api/email/webhook        Authorization: Bearer <EMAIL_WEBHOOK_SECRET>
{ "events": [ { "type": "delivered|opened|clicked|bounced|unsubscribed",
                "campaignId": 12, "contactId": 345,           // or "email": "a@b.com" with campaignId
                "occurredAt": "2026-11-12T09:30:00Z", "url": "https://..." } ] }
```

5. Send a test campaign to a small list of IKL mailboxes; check delivery, an open, a click and the unsubscribe page.

If the provider also tracks opens/clicks itself, keep our pixel and links (they work with any provider) or turn one of them off to avoid double counting. Events are idempotent per status, but repeated opens/clicks are intentionally kept as events.

## Testing locally

```bash
curl http://localhost:3000/api/health                 # is the app up
curl http://localhost:3000/api/cron/campaigns         # run the scheduler once (no CRON_SECRET locally)
```
Tokens are signed with `EMAIL_LINK_SECRET` (or `SESSION_SECRET`); a tampered token is rejected and redirects to `/`.
