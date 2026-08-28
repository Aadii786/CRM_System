import { requireUser } from "@/lib/auth/requireUser";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import { AlertTriangle } from "lucide-react";
import { PLANS, EVALUATION_ROWS } from "@/lib/constants/planEvaluation";

export const metadata = { title: "Plan Evaluation" };

const VALUE_TONE = {
  Yes: "text-success",
  No: "text-danger",
  Limited: "text-warning",
  Basic: "text-warning",
  "Add-on": "text-info",
};

export default async function PlanEvaluationPage() {
  await requireUser();

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Demo Center", href: "/demo-center" }, { label: "Plan Evaluation" }]}
        title="Demo / Evaluation Matrix"
        description="Illustrative feature-vs-plan matrix used to structure the evaluation conversation (requirements #101)."
      />

      <div className="mb-5 flex items-start gap-2.5 rounded-md border border-warning-border bg-warning-subtle px-4 py-3 text-sm text-warning">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        <p>
          This is a <strong>demo evaluation aid</strong>, not an authoritative or current statement of Brevo pricing or feature
          availability. Confirm exact tiers and features directly with the vendor before making a purchasing decision.
        </p>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Requirement</th>
                {PLANS.map((p) => (
                  <th key={p} className="px-4 py-3 text-center font-medium">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {EVALUATION_ROWS.map((row) => (
                <tr key={row.feature}>
                  <td className="px-4 py-2.5 text-ink-secondary">{row.feature}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className={["px-4 py-2.5 text-center font-medium", VALUE_TONE[v] || "text-ink"].join(" ")}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
