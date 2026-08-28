import { requireUserWithPermission } from "@/lib/auth/requireUser";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import NewAutomationForm from "@/components/automation/NewAutomationForm";

export const metadata = { title: "Create Automation" };

export default async function NewAutomationPage() {
  await requireUserWithPermission("automations.create");
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Automations", href: "/automations" }, { label: "New Automation" }]}
        title="Create Automation"
        description="Start with a trigger - conditions, actions and delays are visualized on the automation detail page."
      />
      <Card className="max-w-lg">
        <NewAutomationForm />
      </Card>
    </div>
  );
}
