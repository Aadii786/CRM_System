import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FlowSteps from "@/components/demo/FlowSteps";
import { ArrowRight, Users, Building2, LineChart, ShieldCheck } from "lucide-react";

export const metadata = { title: "Demo Center" };

const SCENARIOS = [
  {
    icon: Users,
    title: "Scenario 1 - 58,000 Marketing Contacts",
    description: "Import, segment, nurture and convert the Marketing contact database end to end.",
    steps: [
      { label: "58,000 Contacts", href: "/contacts" },
      { label: "Segment", href: "/segments" },
      { label: "Campaign", href: "/campaigns" },
      { label: "Engagement", href: "/campaigns" },
      { label: "Automation", href: "/automations" },
      { label: "Interested Leads", href: "/contacts?status=Interested" },
      { label: "WhatsApp", href: "/conversations" },
      { label: "Assignment", href: "/conversations" },
      { label: "Conversion", href: "/contacts?status=Converted" },
    ],
    cta: { label: "Open Contacts", href: "/contacts" },
  },
  {
    icon: Building2,
    title: "Scenario 2 - IKL/HSM B2B Workflow",
    description: "From first inquiry to signed training, delivery and payment.",
    steps: [
      { label: "Company", href: "/companies" },
      { label: "Contact", href: "/companies" },
      { label: "Inquiry", href: "/deals" },
      { label: "Meeting", href: "/meetings" },
      { label: "Training Type", href: "/deals" },
      { label: "Trainer", href: "/deals" },
      { label: "TNA", href: "/deals" },
      { label: "Proposal", href: "/deals" },
      { label: "Acceptance", href: "/deals" },
      { label: "Execution", href: "/deals" },
      { label: "Invoice", href: "/deals" },
      { label: "Payment", href: "/deals" },
    ],
    cta: { label: "Open Pipeline", href: "/deals" },
  },
  {
    icon: LineChart,
    title: "Scenario 3 - Rector Dashboard",
    description: "University-wide visibility from executive KPIs down to individual campaigns and deals.",
    steps: [
      { label: "Rector Login", href: "/login" },
      { label: "University Dashboard", href: "/executive" },
      { label: "Marketing", href: "/marketing" },
      { label: "Campaign Performance", href: "/campaigns" },
      { label: "IKL/HSM", href: "/ikl-hsm" },
      { label: "B2B Pipeline", href: "/deals" },
      { label: "Revenue", href: "/reports/revenue" },
      { label: "Department Comparison", href: "/reports/department-performance" },
    ],
    cta: { label: "Open Executive Dashboard", href: "/executive" },
  },
  {
    icon: ShieldCheck,
    title: "Scenario 4 - Permissions & Governance",
    description: "Demonstrates that Marketing and IKL/HSM cannot see each other's operational records.",
    steps: [
      { label: "Rector -> University Reporting", href: "/executive" },
      { label: "Central Admin -> Full Access", href: "/users" },
      { label: "Marketing -> Contacts/Campaigns", href: "/marketing" },
      { label: "IKL/HSM -> B2B CRM/Deals", href: "/ikl-hsm" },
      { label: "Permission Matrix", href: "/roles" },
    ],
    cta: { label: "Open Roles & Permissions", href: "/roles" },
  },
];

export default async function DemoCenterPage() {
  await requireUser();

  return (
    <div>
      <PageHeader
        title="Demo Center"
        description="Four guided scenarios covering the mandatory demonstration flows (requirements #96-#100). Every step links to the real, working page."
        actions={
          <div className="flex gap-2">
            <Button href="/demo-center/evaluation" variant="secondary">Plan Evaluation</Button>
            <Button href="/demo-center/pricing" variant="secondary">Pricing Calculator</Button>
            <Button href="/demo-center/requirements-coverage" variant="secondary">Requirements Coverage</Button>
          </div>
        }
      />

      <div className="flex flex-col gap-5">
        {SCENARIOS.map((s) => (
          <Card key={s.title}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary-active">
                  <s.icon className="size-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{s.title}</h3>
                  <p className="text-sm text-ink-muted mt-0.5">{s.description}</p>
                </div>
              </div>
              <Button href={s.cta.href} variant="primary" iconRight={ArrowRight} className="shrink-0">
                Start Demo
              </Button>
            </div>
            <FlowSteps steps={s.steps} />
          </Card>
        ))}
      </div>
    </div>
  );
}
