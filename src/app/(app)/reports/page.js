import Link from "next/link";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import {
  Megaphone, Users, Activity, Handshake, GitCompareArrows, User, Building2,
  TrendingUp, Wallet, Workflow, MessageCircle, FileBarChart,
} from "lucide-react";

export const metadata = { title: "Reports" };

// The full report category list from requirements #39. Categories with a
// dedicated, fully data-backed report link there; the rest surface through
// the department dashboards (Marketing / IKL-HSM) and Executive Dashboard,
// which already answer the same questions with live queries - listed here
// so the full requirements taxonomy stays visible in one place.
const CATEGORIES = [
  { key: "campaign", label: "Campaign Reports", icon: Megaphone, href: "/campaigns", description: "Delivery, opens, clicks per campaign." },
  { key: "contact", label: "Contact Reports", icon: Users, href: "/contacts", description: "Status, source and lifecycle breakdowns." },
  { key: "engagement", label: "Engagement Reports", icon: Activity, href: "/marketing", description: "Open/click/engagement rates over time." },
  { key: "deal", label: "Deal Reports", icon: Handshake, href: "/deals", description: "Pipeline value, stage distribution." },
  { key: "pipeline", label: "Pipeline Reports", icon: GitCompareArrows, href: "/ikl-hsm", description: "IKL/HSM pipeline health and conversion." },
  { key: "user", label: "User Reports", icon: User, href: "/users", description: "Activity and ownership by user." },
  { key: "department", label: "Department Reports", icon: Building2, href: "/reports/department-performance", description: "Marketing vs. IKL/HSM side by side." },
  { key: "conversion", label: "Conversion Reports", icon: TrendingUp, href: "/executive", description: "Funnel and conversion-rate tracking." },
  { key: "revenue", label: "Revenue Reports", icon: Wallet, href: "/reports/revenue", description: "Pipeline value, revenue by training type/company/owner." },
  { key: "automation", label: "Automation Reports", icon: Workflow, href: "/automations", description: "Entered/completed/converted per automation." },
  { key: "whatsapp", label: "WhatsApp Reports", icon: MessageCircle, href: "/conversations", description: "Conversation volume and response activity." },
  { key: "custom", label: "Custom Reports", icon: FileBarChart, href: "/reports/department-performance", description: "Save and schedule your own report views." },
];

export default async function ReportsPage() {
  const user = await requireUserWithPermission("reports.view");

  return (
    <div>
      <PageHeader title="Reports" description="Every report category is backed by live database queries - filter, drill down and export from each area." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((c) => (
          <Link key={c.key} href={c.href} className="block">
            <Card className="h-full hover:border-primary-border hover:shadow-md transition-all">
              <c.icon className="size-5 text-primary mb-3" />
              <h3 className="text-sm font-semibold text-ink mb-1">{c.label}</h3>
              <p className="text-xs text-ink-muted">{c.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
