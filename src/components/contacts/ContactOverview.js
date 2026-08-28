import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/format";

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-sm font-medium text-ink text-right">{children ?? "—"}</span>
    </div>
  );
}

export default function ContactOverview({ contact }) {
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold text-ink mb-1">Contact Information</h3>
        <div className="mt-2">
          <Row label="Email">{contact.email}</Row>
          <Row label="Phone">{contact.phone || "—"}</Row>
          <Row label="WhatsApp">{contact.whatsappNumber || "—"}</Row>
          <Row label="Job Title">{contact.jobTitle || "—"}</Row>
          <Row label="Location">{[contact.city, contact.country].filter(Boolean).join(", ") || "—"}</Row>
          <Row label="Company">
            {contact.Company ? <Link href={`/companies/${contact.Company.id}`} className="text-primary hover:underline">{contact.Company.name}</Link> : "—"}
          </Row>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold text-ink mb-1">CRM Details</h3>
        <div className="mt-2">
          <Row label="Status"><Badge status={contact.status} /></Row>
          <Row label="Engagement"><Badge tone="neutral">{contact.engagementStatus}</Badge></Row>
          <Row label="Lead Score">{contact.leadScore} / 100</Row>
          <Row label="Source">{contact.source}</Row>
          <Row label="Department">{contact.Department?.name}</Row>
          <Row label="Owner">{contact.owner?.name || "Unassigned"}</Row>
          <Row label="Created">{formatDate(contact.createdAt)}</Row>
          <Row label="Last Activity">{formatDate(contact.lastActivityAt)}</Row>
        </div>
      </div>
    </div>
  );
}
