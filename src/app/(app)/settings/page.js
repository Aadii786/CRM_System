import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getAllSettings, listCustomObjects } from "@/lib/services/settingsService";
import { listDepartments } from "@/lib/services/departmentService";
import { listPipelines } from "@/lib/services/dealService";
import { listUsers } from "@/lib/services/userService";
import PageHeader from "@/components/common/PageHeader";
import Tabs from "@/components/ui/Tabs";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LeadScoringSettings from "@/components/admin/LeadScoringSettings";
import DepartmentSenderIdentity from "@/components/admin/DepartmentSenderIdentity";
import NewDepartmentButton from "@/components/admin/NewDepartmentButton";

export const metadata = { title: "Settings" };

function TierBadge({ tier }) {
  return <Badge tone="info">{tier}</Badge>;
}

export default async function SettingsPage() {
  const user = await requireUser();
  const canViewSettings = hasPermission(user, "settings.view");
  const canManageDepts = hasPermission(user, "departments.manage");
  // A department manager who can't see the global Settings tabs (security,
  // retention, custom data - Central Admin only) still needs a place to
  // manage their own department's sender identity/team, so the Departments
  // tab has its own, narrower gate.
  const canSeeDepartmentsTab = canManageDepts || hasPermission(user, "campaigns.create");
  if (!canViewSettings && !canSeeDepartmentsTab) redirect("/403");

  const [settings, customObjectsRaw, departmentsRaw, pipelinesRaw, allUsersRaw] = await Promise.all([
    canViewSettings ? getAllSettings(user) : Promise.resolve({}),
    canViewSettings ? listCustomObjects(user) : Promise.resolve([]),
    listDepartments(),
    canViewSettings ? listPipelines(user).catch(() => []) : Promise.resolve([]),
    canManageDepts ? listUsers(user) : Promise.resolve([]),
  ]);
  const customObjects = customObjectsRaw.map((c) => c.get({ plain: true }));
  const departments = departmentsRaw.map((d) => d.get({ plain: true }));
  const allUsers = allUsersRaw.map((u) => u.get({ plain: true }));

  const security = settings.security || {};
  const retention = settings.data_retention || {};

  const sections = [
    canViewSettings && {
      key: "general",
      label: "General",
      panel: (
        <Card className="max-w-lg">
          <h3 className="text-sm font-semibold text-ink mb-3">Organization</h3>
          <SettingRow label="Organization Name" value={settings.general?.organization_name} />
          <SettingRow label="Timezone" value={settings.general?.timezone} />
        </Card>
      ),
    },
    canSeeDepartmentsTab && {
      key: "departments",
      label: "Departments",
      panel: (
        <Card padding="none">
          <div className="p-5 pb-0 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ink">Departments</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Unlimited departments, each with its own head, team and campaign sender identity. Super Admin creates/deactivates departments and assigns heads; a department&apos;s own manager can edit its sender identity.
              </p>
            </div>
            {canManageDepts && <NewDepartmentButton existingUsers={allUsers} />}
          </div>
          <div className="divide-y divide-border mt-3">
            {departments.map((d) => {
              const sameOrUniversityWide = user.department?.isUniversityWide || user.department?.key === d.key;
              const canEditSender = canManageDepts || (hasPermission(user, "campaigns.create") && sameOrUniversityWide);
              const head = allUsers.find((u) => u.id === d.headUserId) || null;
              const departmentUsers = allUsers.filter((u) => u.departmentId === d.id);
              return (
                <DepartmentSenderIdentity
                  key={d.id}
                  department={d}
                  canEdit={canEditSender}
                  canManageDept={canManageDepts}
                  head={head}
                  departmentUsers={departmentUsers}
                />
              );
            })}
          </div>
        </Card>
      ),
    },
    canViewSettings && {
      key: "lead_scoring",
      label: "Lead Scoring",
      panel: (
        <Card className="max-w-lg">
          <h3 className="text-sm font-semibold text-ink mb-3">Lead Scoring Rules</h3>
          <LeadScoringSettings rules={settings.lead_scoring?.rules || []} threshold={settings.lead_scoring?.qualified_threshold || 70} />
        </Card>
      ),
    },
    canViewSettings && {
      key: "security",
      label: "Security",
      panel: (
        <Card className="max-w-lg">
          <h3 className="text-sm font-semibold text-ink mb-1">Security Capabilities</h3>
          <p className="text-xs text-ink-muted mb-4">
            Shown as configurable/demo status per plan tier (requirements #65) - this does not represent confirmed, current Brevo pricing or feature availability.
          </p>
          <SettingRow label="Multi-Factor Authentication (MFA)" value={<TierBadge tier={security.mfa?.tier || "N/A"} />} />
          <SettingRow label="Single Sign-On (SSO)" value={<TierBadge tier={security.sso?.tier || "N/A"} />} />
          <SettingRow label="SAML" value={<TierBadge tier={security.saml?.tier || "N/A"} />} />
          <SettingRow label="Session Management" value={<Badge tone="success">Enabled</Badge>} />
          <SettingRow label="Audit Logs" value={<Badge tone="success">Enabled</Badge>} />
        </Card>
      ),
    },
    canViewSettings && {
      key: "retention",
      label: "Data Retention",
      panel: (
        <Card className="max-w-lg">
          <h3 className="text-sm font-semibold text-ink mb-1">Data Retention</h3>
          <p className="text-xs text-ink-muted mb-4">Email-event and historical reporting retention (requirements #66).</p>
          <SettingRow label="Contact Data" value={`${retention.contacts?.months || 36} months`} />
          <SettingRow label="Email Event Data" value={`${retention.email_events?.months || 24} months`} />
          <SettingRow label="Automation Logs" value={`${retention.automation_logs?.months || 12} months`} />
          <SettingRow label="Campaign Reporting" value={`${retention.campaign_reports?.months || 24} months`} />
          <SettingRow label="Deleted Contact Recovery" value={<Badge tone="success">30-day recovery window</Badge>} />
          <SettingRow label="Backup / Recovery" value={<Badge tone="success">Daily automated backups</Badge>} />
        </Card>
      ),
    },
    canViewSettings && {
      key: "custom_data",
      label: "Custom Data",
      panel: (
        <Card padding="none">
          <div className="p-5 pb-3">
            <h3 className="text-sm font-semibold text-ink">Custom Objects</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Training Program, Trainer, TNA, Proposal, Participant, Invoice, Payment and Trainer Remuneration are first-class CRM records (requirements #49) - definitions below document their schema.
            </p>
          </div>
          <div className="divide-y divide-border">
            {customObjects.map((c) => (
              <div key={c.id} className="px-5 py-3.5">
                <p className="text-sm font-medium text-ink">{c.name}</p>
                <p className="text-xs text-ink-muted mt-0.5">{c.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(c.schema || []).map((f) => <Badge key={f} tone="neutral">{f}</Badge>)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ),
    },
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        title="Settings"
        description={canViewSettings ? "Organization, security, data retention, lead scoring and custom data configuration." : "Manage your department."}
      />
      <Tabs tabs={sections.map(({ key, label }) => ({ key, label }))}>
        {sections.map((s) => s.panel)}
      </Tabs>
    </div>
  );
}

function SettingRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
