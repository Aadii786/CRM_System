# Website forms: connecting ikl.com.pk to the CRM

For the team that builds the IKL website (Next.js). The website sends each form to the CRM from **its own server**, never from the visitor's browser, so the API key stays secret.

## What happens to a submission

1. The CRM checks the API key and stores the call in **Website forms** (staff screen), so nothing is lost.
2. The person is matched by **email** inside the IKL department. If the person exists, no second record is created; if not, a **lead with source "Website"** is created.
3. The lead gets an owner (the department manager unless IKL names someone else), and the owner receives a **notification**.
4. The person's **lead score** rises by the "Form submission" points (Settings > Lead scoring) and the form appears on the person's history.
5. Automations triggered by "A website form is received" start.
6. An **acknowledgement email** goes to the sender (see wording below). While the email provider is the demo one, nothing is delivered and the history says so.

## Set up (once, by the CRM administrator)

1. Log in as the CRM administrator, open **API & Webhooks > New API Key**, name it "IKL website", choose the **IKL** department and copy the key (shown once).
2. Store it on the website server as a secret environment variable, for example `CRM_API_KEY`. Never put it in browser code.
3. Set `CRM_URL` to the CRM address (the permanent web address agreed with IT).

## Request

```
POST {CRM_URL}/api/public/forms/<form>
Authorization: Bearer <CRM_API_KEY>
Content-Type: application/json
```

`<form>` is one of `enquiry`, `brochure`, `registration`, `feedback`. A key sent as `x-api-key: <key>` also works. Limits: 120 requests a minute per key, 50 KB per request.

### Fields

| Field | enquiry | brochure | registration | feedback | Notes |
|---|---|---|---|---|---|
| `name` (or `firstName` + `lastName`) | required | required | required | not needed | |
| `email` | required | required | required | required | the identity of the person |
| `phone`, `whatsapp`, `designation`, `city`, `company` | optional | optional | optional | | `company` is matched by name, created if new |
| `programCode` (or `programId`) | optional | optional | optional | optional | use the codes from the catalogue |
| `batchCode` (or `batchId`) | | | **required** | recommended | the batch registered for / rated |
| `message` | optional | | | | free text |
| `score` (1 to 5) and `comments` | | | | **required** / optional | stored on the person's registration |
| `consent` | optional | optional | optional | | `true` marks the person "Opted In" (only if the form really asks) |
| `sourcePage` | optional | optional | optional | optional | page address, stored for reference |
| `website_url` | | | | | **honeypot**: add a hidden field with this name; bots fill it, the CRM then discards the submission silently |

Feedback needs an existing registration for that email and batch (or program). Registration respects the **seat limit** of the batch.

### Responses

| Status | Meaning |
|---|---|
| 200 | `{ "ok": true, "contactId": 1, "newContact": true, "registrationId": null, "acknowledged": true }` |
| 401 | missing, wrong or revoked key |
| 404 | unknown form, program, batch or registration |
| 409 | registration refused: batch full, closed or already registered (the `error` text can be shown to the visitor) |
| 422 | invalid field (for example a bad email) |
| 429 | too many requests (`Retry-After` header) |

### Example (Next.js route handler on the website)

```js
// app/api/enquiry/route.js (runs on the website server)
export async function POST(request) {
  const body = await request.json();
  const res = await fetch(`${process.env.CRM_URL}/api/public/forms/enquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRM_API_KEY}` },
    body: JSON.stringify({ name: body.name, email: body.email, phone: body.phone, company: body.company, message: body.message, programCode: body.programCode }),
  });
  return Response.json(await res.json(), { status: res.status });
}
```

## Catalogue for the registration form

`GET {CRM_URL}/api/public/catalogue` with the same key returns the active programs and their upcoming batches (id, code, dates, venue, seats, fee), so the form offers real batches.

## Wording of the acknowledgement email

Defaults are in `src/lib/services/websiteFormService.js`. IKL's own wording replaces them through the `settings` table: category `website_forms`, key `ack_enquiry` / `ack_brochure` / `ack_registration` / `ack_feedback`, value `{ "subject": "...", "body": "..." }`. The body may use `{{firstName}}`, `{{programLine}}` (" for <program>") and `{{senderName}}`. The sender is the IKL sender identity (Departments > IKL > email sender). The default owner of new web leads can be set with key `default_owner_user_id` (a user id) in category `website_forms`.

IKL still has to confirm the real wording (open question about website forms).
