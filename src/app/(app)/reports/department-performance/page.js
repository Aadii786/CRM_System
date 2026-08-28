import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { getDepartmentComparison } from "@/lib/services/reportingService";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import { formatNumber, formatCurrencyPKR } from "@/lib/utils/format";

export const metadata = { title: "Department Performance" };

export default async function DepartmentPerformancePage() {
  const user = await requireUserWithPermission("executive.dashboard.view");
  const comparison = await getDepartmentComparison();

  const rows = [
    { label: "Contacts", a: comparison.marketing.contacts, b: comparison.ikl.contacts },
    { label: "New Leads", a: comparison.marketing.newLeads, b: comparison.ikl.newLeads },
    { label: "Qualified", a: comparison.marketing.qualified, b: comparison.ikl.qualified },
    { label: "Conversions", a: comparison.marketing.conversions, b: comparison.ikl.conversions },
    { label: "Active Deals", a: comparison.marketing.activeDeals, b: comparison.ikl.activeDeals },
    { label: "Revenue", a: comparison.marketing.revenue, b: comparison.ikl.revenue, currency: true },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Department Performance" }]}
        title="Department Performance"
        description="Marketing vs. IKL/HSM, side by side (requirements #41). Figures are computed live from the seeded demo database."
      />
      <Card padding="none">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="text-left font-medium px-5 py-3">Metric</th>
              <th className="text-right font-medium px-5 py-3">Marketing</th>
              <th className="text-right font-medium px-5 py-3">IKL/HSM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="px-5 py-3.5 text-ink-secondary">{r.label}</td>
                <td className="px-5 py-3.5 text-right font-medium text-ink tabular-nums">
                  {r.a == null ? "—" : r.currency ? formatCurrencyPKR(r.a) : formatNumber(r.a)}
                </td>
                <td className="px-5 py-3.5 text-right font-medium text-ink tabular-nums">
                  {r.b == null ? "—" : r.currency ? formatCurrencyPKR(r.b) : formatNumber(r.b)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-ink-muted mt-3">
        DEMO DATA - figures reflect the seeded demo dataset (~58,000 Marketing contacts, ~4,280 IKL/HSM contacts) and will change as the platform is used.
      </p>
    </div>
  );
}
