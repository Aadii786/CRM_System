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
//
// `tone` is a color-system key (see lib/constants/moduleColors.js) grouped
// by what the item actually is - every Marketing/audience item is purple,
// every deal-pipeline item is cyan, every admin item is indigo, and so on
// - not assigned at random, so the colorful sidebar still communicates
// meaning instead of just looking busy.
function isUniversityWide(user) {
  return Boolean(user?.department?.isUniversityWide);
}
function inDepartment(user, key) {
  return user?.department?.key === key || isUniversityWide(user);
}
// True for anyone in a department other than the two pilot ones (Marketing,
// IKL/HSM) and not university-wide - i.e. a department created later via
// Settings > Departments, which uses the generic Department Dashboard
// instead of a hand-built one.
function inOtherDepartment(user) {
  const key = user?.department?.key;
  return Boolean(key) && !isUniversityWide(user) && key !== "marketing" && key !== "ikl-hsm";
}

export function getNavSections(user) {
  const sections = [
    {
      title: "Main",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", tone: "blue", show: () => hasPermission(user, "dashboard.view") },
        { label: "Contacts", href: "/contacts", icon: "Users", tone: "blue", show: () => hasPermission(user, "contacts.view") },
        { label: "Companies", href: "/companies", icon: "Building2", tone: "cyan", show: () => hasPermission(user, "companies.view") },
        { label: "Deals", href: "/deals", icon: "Handshake", tone: "cyan", show: () => hasPermission(user, "deals.view") },
        { label: "Activities", href: "/activities", icon: "Activity", tone: "indigo", show: () => hasPermission(user, "contacts.view") || hasPermission(user, "deals.view") },
        { label: "Tasks", href: "/tasks", icon: "CheckSquare", tone: "amber", show: () => hasPermission(user, "tasks.view") },
        { label: "Meetings", href: "/meetings", icon: "CalendarDays", tone: "teal", show: () => hasPermission(user, "meetings.view") },
      ],
    },
    {
      title: "Marketing",
      items: [
        { label: "Campaigns", href: "/campaigns", icon: "Megaphone", tone: "purple", show: () => hasPermission(user, "campaigns.view") },
        { label: "Folders", href: "/folders", icon: "FolderOpen", tone: "purple", show: () => hasPermission(user, "lists.view") },
        { label: "Lists", href: "/lists", icon: "ListChecks", tone: "purple", show: () => hasPermission(user, "lists.view") },
        { label: "Segments", href: "/segments", icon: "Filter", tone: "purple", show: () => hasPermission(user, "segments.view") },
        { label: "Automations", href: "/automations", icon: "Workflow", tone: "purple", show: () => hasPermission(user, "automations.view") },
        { label: "WhatsApp", href: "/conversations", icon: "MessageCircle", tone: "green", show: () => hasPermission(user, "conversations.view") },
      ],
    },
    {
      title: "Departments",
      items: [
        { label: "Marketing", href: "/marketing", icon: "Briefcase", dept: "marketing", tone: "purple", show: () => inDepartment(user, "marketing") && hasPermission(user, "dashboard.view") },
        { label: "IKL / HSM", href: "/ikl-hsm", icon: "Landmark", dept: "ikl-hsm", tone: "blue", show: () => inDepartment(user, "ikl-hsm") && hasPermission(user, "dashboard.view") },
        { label: user?.department?.name || "My Department", href: "/department", icon: "Briefcase", dept: user?.department?.key, tone: "teal", show: () => inOtherDepartment(user) && hasPermission(user, "dashboard.view") },
      ],
    },
    {
      title: "Management",
      items: [
        { label: "Executive Dashboard", href: "/executive", icon: "LineChart", tone: "indigo", show: () => hasPermission(user, "executive.dashboard.view") },
        { label: "Reports", href: "/reports", icon: "FileBarChart", tone: "cyan", show: () => hasPermission(user, "reports.view") },
        { label: "Department Performance", href: "/reports/department-performance", icon: "GitCompareArrows", tone: "indigo", show: () => hasPermission(user, "executive.dashboard.view") },
      ],
    },
    {
      title: "Administration",
      items: [
        {
          label: "Departments",
          href: "/departments",
          icon: "Building2",
          tone: "indigo",
          // Super Admin manages every department here (create/deactivate,
          // assign heads); a department's own manager reaches just their
          // own row (edit sender identity) without needing settings.view.
          show: () => hasPermission(user, "departments.manage") || hasPermission(user, "campaigns.create"),
        },
        { label: "Users", href: "/users", icon: "Users", tone: "indigo", show: () => hasPermission(user, "users.view") },
        { label: "Roles & Permissions", href: "/roles", icon: "ShieldCheck", tone: "indigo", show: () => hasPermission(user, "roles.view") },
        { label: "Integrations", href: "/integrations", icon: "Plug", tone: "indigo", show: () => hasPermission(user, "integrations.view") },
        { label: "API & Webhooks", href: "/api-webhooks", icon: "KeyRound", tone: "indigo", show: () => hasPermission(user, "api.manage") },
        { label: "Audit Logs", href: "/audit-logs", icon: "ScrollText", tone: "indigo", show: () => hasPermission(user, "audit_logs.view") },
        { label: "Settings", href: "/settings", icon: "Settings", tone: "neutral", show: () => hasPermission(user, "settings.view") },
      ],
    },
    {
      title: "",
      items: [{ label: "Demo Center", href: "/demo-center", icon: "PlayCircle", tone: "amber", show: () => true }],
    },
  ];

  return sections
    .map((section) => ({
      title: section.title,
      items: section.items.filter((item) => item.show()).map(({ label, href, icon, dept, tone }) => ({ label, href, icon, dept, tone })),
    }))
    .filter((section) => section.items.length > 0);
}
