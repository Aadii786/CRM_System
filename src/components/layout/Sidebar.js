"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { departmentTone, getTone } from "@/lib/constants/moduleColors";
import {
  LayoutDashboard, Users, Building2, Handshake, Activity, CheckSquare,
  CalendarDays, Megaphone, Filter, Workflow, MessageCircle, LineChart,
  FileBarChart, GitCompareArrows, ShieldCheck, Plug, KeyRound, ScrollText,
  Settings, PlayCircle, Landmark, Briefcase, PanelLeftClose, PanelLeftOpen, X,
  GraduationCap, ListChecks, FolderOpen,
} from "lucide-react";

const ICONS = {
  LayoutDashboard, Users, Building2, Handshake, Activity, CheckSquare,
  CalendarDays, Megaphone, Filter, Workflow, MessageCircle, LineChart,
  FileBarChart, GitCompareArrows, ShieldCheck, Plug, KeyRound, ScrollText,
  Settings, PlayCircle, Landmark, Briefcase, ListChecks, FolderOpen,
};

function NavLink({ item, collapsed, onNavigate }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
  const Icon = ICONS[item.icon] || LayoutDashboard;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={[
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 focus-ring",
        collapsed ? "justify-center" : "",
        isActive
          ? "bg-primary-subtle text-primary-active"
          : "text-ink-secondary hover:bg-surface-alt hover:text-ink hover:translate-x-0.5",
      ].join(" ")}
    >
      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary" aria-hidden="true" />}
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      {!collapsed && (
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="truncate">{item.label}</span>
          {item.dept && <span className={["size-1.5 rounded-full shrink-0", getTone(departmentTone(item.dept)).dot].join(" ")} aria-hidden="true" />}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({ navSections, collapsed, onToggleCollapse, onNavigate, showMobileClose, onCloseMobile }) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className={["flex items-center h-[var(--header-height)] shrink-0 border-b border-border px-4", collapsed ? "justify-center" : "justify-between"].join(" ")}>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-ink">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-white shrink-0">
            <GraduationCap className="size-[18px]" />
          </span>
          {!collapsed && <span className="text-[15px] tracking-tight">University CRM</span>}
        </Link>
        {showMobileClose && (
          <button onClick={onCloseMobile} aria-label="Close navigation" className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt">
            <X className="size-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-4">
        {navSections.map((section) => (
          <div key={section.title || "untitled"}>
            {section.title && !collapsed && (
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{section.title}</p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-2.5 hidden lg:block">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={["flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-secondary hover:bg-surface-alt focus-ring", collapsed ? "justify-center" : ""].join(" ")}
        >
          {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ navSections, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  return (
    <>
      {/* Desktop / tablet */}
      <aside
        className="hidden lg:block fixed inset-y-0 left-0 z-30 border-r border-border transition-[width] duration-200"
        style={{ width: collapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)" }}
      >
        <SidebarContent navSections={navSections} collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onCloseMobile} aria-hidden="true" />
          <div className="relative w-[280px] max-w-[80vw] animate-fade-in">
            <SidebarContent
              navSections={navSections}
              collapsed={false}
              onNavigate={onCloseMobile}
              showMobileClose
              onCloseMobile={onCloseMobile}
            />
          </div>
        </div>
      )}
    </>
  );
}
