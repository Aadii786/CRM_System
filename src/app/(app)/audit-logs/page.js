import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { listAuditLogs } from "@/lib/services/auditService";
import PageHeader from "@/components/common/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import Badge from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils/format";

export const metadata = { title: "Audit Logs" };

export default async function AuditLogsPage({ searchParams }) {
  const user = await requireUserWithPermission("audit_logs.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { data: logsRaw, pagination } = await listAuditLogs({ page, limit: 30 });
  const logs = logsRaw.map((l) => l.get({ plain: true }));

  function buildHref(targetPage) {
    return `/audit-logs?page=${Math.max(1, targetPage)}`;
  }

  return (
    <div>
      <PageHeader title="Audit Logs" description="Every meaningful action taken across the platform (requirements #27, #45)." />
      <DataTable
        columns={[
          { key: "user", header: "User", render: (l) => l.User?.name || "System" },
          { key: "action", header: "Action" },
          { key: "module", header: "Module", render: (l) => <Badge tone="neutral">{l.module}</Badge> },
          { key: "result", header: "Result", render: (l) => <Badge tone={l.result === "success" ? "success" : l.result === "denied" ? "danger" : "warning"}>{l.result}</Badge> },
          { key: "date", header: "Date / Time", render: (l) => formatDateTime(l.createdAt) },
        ]}
        rows={logs}
      />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} buildHref={buildHref} />
    </div>
  );
}
