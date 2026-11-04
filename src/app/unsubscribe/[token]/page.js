import db from "@/lib/db";
import { verifyToken } from "@/lib/email/tokens";
import UnsubscribeForm from "./UnsubscribeForm";

export const metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

// Public page opened from the link at the bottom of every campaign email.
export default async function UnsubscribePage({ params }) {
  const { token } = await params;
  const payload = verifyToken(token);
  const contact = payload?.t === "u" ? await db.Contact.findByPk(payload.u, { attributes: ["id", "email"] }) : null;
  const campaign = contact ? await db.Campaign.findByPk(payload.c, { attributes: ["senderName"] }) : null;

  return (
    <main className="min-h-screen bg-surface-alt flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 shadow-sm">
        {contact ? (
          <UnsubscribeForm token={token} senderName={campaign?.senderName || "this sender"} email={contact.email} />
        ) : (
          <div>
            <h1 className="text-xl font-semibold text-ink mb-2">This link is not valid</h1>
            <p className="text-sm text-ink-secondary">The unsubscribe link is incomplete or has been changed. Please use the link from the email again.</p>
          </div>
        )}
      </div>
    </main>
  );
}
