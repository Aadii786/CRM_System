import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { listApiKeys, listWebhooks } from "@/lib/services/integrationService";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import CreateApiKeyButton from "@/components/admin/CreateApiKeyButton";
import { KeyRound } from "lucide-react";
import { formatDate, timeAgo } from "@/lib/utils/format";

export const metadata = { title: "API & Webhooks" };

export default async function ApiWebhooksPage() {
  const user = await requireUserWithPermission("api.manage");
  const [apiKeysRaw, webhooksRaw] = await Promise.all([listApiKeys(user), listWebhooks(user)]);
  const apiKeys = apiKeysRaw.map((k) => k.get({ plain: true }));
  const webhooks = webhooksRaw.map((w) => w.get({ plain: true }));

  return (
    <div>
      <PageHeader
        title="API & Webhooks"
        description="Manage API access and outbound webhook subscriptions. Keys are masked - the raw value is only ever shown once, at creation."
      />

      <Card padding="none" className="mb-6">
        <div className="p-5 pb-3">
          <CardHeader title="API Keys" actions={<CreateApiKeyButton />} />
        </div>
        {apiKeys.length === 0 ? (
          <div className="p-5 pt-0"><EmptyState icon={KeyRound} title="No API keys yet" /></div>
        ) : (
          <div className="divide-y divide-border">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{k.name}</p>
                  <p className="text-xs font-mono text-ink-muted">{k.keyPrefix}{"•".repeat(24)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-muted">{k.lastUsedAt ? `Last used ${timeAgo(k.lastUsedAt)}` : "Never used"}</span>
                  <Badge tone={k.status === "active" ? "success" : "danger"}>{k.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="none">
        <div className="p-5 pb-3">
          <CardHeader title="Webhooks" description="Outbound event notifications - demo entries only." />
        </div>
        {webhooks.length === 0 ? (
          <div className="p-5 pt-0"><EmptyState title="No webhooks configured" /></div>
        ) : (
          <div className="divide-y divide-border">
            {webhooks.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{w.name}</p>
                  <p className="text-xs text-ink-muted font-mono">{w.url}</p>
                </div>
                <Badge tone={w.status === "active" ? "success" : "neutral"}>{w.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
