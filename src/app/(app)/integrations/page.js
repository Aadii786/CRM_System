import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listIntegrations } from "@/lib/services/integrationService";
import PageHeader from "@/components/common/PageHeader";
import IntegrationCard from "@/components/admin/IntegrationCard";

export const metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const user = await requireUserWithPermission("integrations.view");
  const integrationsRaw = await listIntegrations(user);
  const integrations = integrationsRaw.map((i) => i.get({ plain: true }));

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Classified as native, third-party, or API/custom (requirements #46). Connecting here is a demo toggle only - no real OAuth or API call is made."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((i) => (
          <IntegrationCard key={i.id} integration={i} canManage={hasPermission(user, "integrations.manage")} />
        ))}
      </div>
    </div>
  );
}
