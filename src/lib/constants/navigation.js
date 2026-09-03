import { hasPermission } from "@/lib/permissions/rbac";

// Icons are referenced by name (string) rather than component reference:
// this file is imported from a Server Component (AppShell) and the result
// crosses into a Client Component (Sidebar), which resolves each name via
// its own local ICONS map (see components/layout/Sidebar.js) - component
// *references* don't reliably survive that server->client props boundary,
// plain strings always do.

// Declarative sidebar (requirements #6, #70, #105). Every item's
// visibility is resolved from the current user's real permissions/department
// - never hard-coded per role - so navigation-aware access control and
// permission-driven access control are always the same source of truth.
function isUniversityWide(user) {
  return Boolean(user?.department?.isUniversityWide);
}
function inDepartment(user, key) {
  return user?.department?.key === key || isUniversityWide(user);
}

export function getNavSections(user) {
  const sections = [
    {
      title: "Main",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", show: () => hasPermission(user, "dashboard.view") },
        { label: "Contacts", href: "/contacts", icon: "Users", show: () => hasPermission(user, "contacts.view") },
        { label: "Companies", href: "/companies", icon: "Building2", show: () => hasPermission(user, "companies.view") },
        { label: "Deals", href: "/deals", icon: "Handshake", show: () => hasPermission(user, "deals.view") },
        { label: "Activities", href: "/activities", icon: "Activity", show: () => hasPermission(user, "contacts.view") || hasPermission(user, "deals.view") },
        { label: "Tasks", href: "/tasks", icon: "CheckSquare", show: () => hasPermission(user, "tasks.view") },
        { label: "Meetings", href: "/meetings", icon: "CalendarDays", show: () => hasPermission(user, "meetings.view") },
      ],
    },
    {
      title: "Marketing",
      items: [
        { label: "Campaigns", href: "/campaigns", icon: "Megaphone", show: () => hasPermission(user, "campaigns.view") },
        { label: "Segments", href: "/segments", icon: "Filter", show: () => hasPermission(user, "segments.view") },
        { label: "Automations", href: "/automations", icon: "Workflow", show: () => hasPermission(user, "automations.view") },
        { label: "WhatsApp", href: "/conversations", icon: "MessageCircle", show: () => hasPermission(user, "conversations.view") },
      ],
    },
    {
      title: "Departments",
      items: [
        { label: "Marketing", href: "/marketing", icon: "Briefcase", show: () => inDepartment(user, "marketing") && hasPermission(user, "dashboard.view") },
        { label: "IKL / HSM", href: "/ikl-hsm", icon: "Landmark", show: () => inDepartment(user, "ikl-hsm") && hasPermission(user, "dashboard.view") },
      ],
    },
    {
      title: "Management",
      items: [
        { label: "Executive Dashboard", href: "/executive", icon: "LineChart", show: () => hasPermission(user, "executive.dashboard.view") },
        { label: "Reports", href: "/reports", icon: "FileBarChart", show: () => hasPermission(user, "reports.view") },
        { label: "Department Performance", href: "/reports/department-performance", icon: "GitCompareArrows", show: () => hasPermission(user, "executive.dashboard.view") },
      ],
    },
    {
      title: "Administration",
      items: [
        { label: "Users", href: "/users", icon: "Users", show: () => hasPermission(user, "users.view") },
        { label: "Roles & Permissions", href: "/roles", icon: "ShieldCheck", show: () => hasPermission(user, "roles.view") },
        { label: "Integrations", href: "/integrations", icon: "Plug", show: () => hasPermission(user, "integrations.view") },
        { label: "API & Webhooks", href: "/api-webhooks", icon: "KeyRound", show: () => hasPermission(user, "api.manage") },
        { label: "Audit Logs", href: "/audit-logs", icon: "ScrollText", show: () => hasPermission(user, "audit_logs.view") },
        {
          label: "Settings",
          href: "/settings",
          icon: "Settings",
          // Also visible to anyone who can only reach the Departments tab
          // (their own department's sender identity/head/team) even
          // without full settings.view - see settings/page.js.
          show: () => hasPermission(user, "settings.view") || hasPermission(user, "departments.manage") || hasPermission(user, "campaigns.create"),
        },
      ],
    },
    {
      title: "",
      items: [{ label: "Demo Center", href: "/demo-center", icon: "PlayCircle", show: () => true }],
    },
  ];

  return sections
    .map((section) => ({
      title: section.title,
      items: section.items.filter((item) => item.show()).map(({ label, href, icon }) => ({ label, href, icon })),
    }))
    .filter((section) => section.items.length > 0);
}
