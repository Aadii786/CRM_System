import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { REQUIREMENTS_COVERAGE } from "@/lib/constants/requirementsCoverage";

export const metadata = { title: "Requirements Coverage" };

export default async function RequirementsCoveragePage() {
  await requireUser();

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Demo Center", href: "/demo-center" }, { label: "Requirements Coverage" }]}
        title="Requirements Coverage"
        description="Maps each major requirement to the module that implements it (requirements #104)."
      />
      <Card padding="none">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Requirement</th>
              <th className="px-4 py-3 text-left font-medium">Module</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {REQUIREMENTS_COVERAGE.map((r) => (
              <tr key={r.requirement}>
                <td className="px-4 py-2.5 text-ink">{r.requirement}</td>
                <td className="px-4 py-2.5">
                  <Link href={r.href} className="text-primary hover:underline">{r.module}</Link>
                </td>
                <td className="px-4 py-2.5"><Badge tone={r.status === "Live" ? "success" : "info"}>{r.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
