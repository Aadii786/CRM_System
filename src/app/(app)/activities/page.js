import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import { listActivities } from "@/lib/services/activityService";
import PageHeader from "@/components/common/PageHeader";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/utils/format";

export const metadata = { title: "Activities" };

export default async function ActivitiesPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { data: activitiesRaw, pagination } = await listActivities(user, { page, limit: 40 });
  const activities = activitiesRaw.map((a) => a.get({ plain: true }));

  return (
    <div>
      <PageHeader title="Activities" description="Unified timeline of everything happening across contacts, companies and deals." />

      {activities.length === 0 ? (
        <EmptyState tone="indigo" title="No activity yet" />
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{a.title}</p>
                <p className="text-xs text-ink-muted truncate">
                  {a.Contact && <Link href={`/contacts/${a.Contact.id}`} className="hover:text-primary">{a.Contact.firstName} {a.Contact.lastName}</Link>}
                  {a.Company && <Link href={`/companies/${a.Company.id}`} className="hover:text-primary">{a.Company.name}</Link>}
                  {a.Deal && <Link href={`/deals/${a.Deal.id}`} className="hover:text-primary">{a.Deal.name}</Link>}
                  {a.User && ` · ${a.User.name}`}
                </p>
              </div>
              <span className="text-xs text-ink-muted shrink-0">{formatDateTime(a.occurredAt)}</span>
            </div>
          ))}
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} buildHref={(p) => `/activities?page=${Math.max(1, p)}`} />
    </div>
  );
}
