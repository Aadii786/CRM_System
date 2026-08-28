import { requireUser } from "@/lib/auth/requireUser";
import PageHeader from "@/components/common/PageHeader";
import PricingCalculator from "@/components/demo/PricingCalculator";
import { AlertTriangle } from "lucide-react";

export const metadata = { title: "Pricing Calculator" };

export default async function PricingCalculatorPage() {
  await requireUser();

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Demo Center", href: "/demo-center" }, { label: "Pricing Calculator" }]}
        title="Pricing Calculator"
        description="Demo cost estimates across the four growth scenarios (requirements #102-#103)."
      />
      <div className="mb-5 flex items-start gap-2.5 rounded-md border border-warning-border bg-warning-subtle px-4 py-3 text-sm text-warning">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        <p>All figures below are clearly-labeled <strong>demo estimates</strong>, not real Brevo pricing. Confirm actual costs directly with the vendor.</p>
      </div>
      <PricingCalculator />
    </div>
  );
}
