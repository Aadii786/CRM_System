"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getTone } from "@/lib/constants/moduleColors";
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
  const tone = getTone(item.tone);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={[
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 focus-ring",
        collapsed ? "justify-center" : "",
        isActive
          ? [tone.navActiveBg, "text-white shadow-sm"].join(" ")
          : ["text-slate-300", tone.navHoverBg, "hover:text-white hover:translate-x-0.5"].join(" "),
      ].join(" ")}
    >
      <Icon className={["size-[18px] shrink-0", isActive ? "text-white" : tone.navIcon].join(" ")} aria-hidden="true" />
      {!collapsed && (
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="truncate">{item.label}</span>
          {item.dept && <span className={["size-1.5 rounded-full shrink-0", isActive ? "bg-white" : getTone(item.dept === "marketing" ? "purple" : "blue").dot].join(" ")} aria-hidden="true" />}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({ navSections, collapsed, onToggleCollapse, onNavigate, showMobileClose, onCloseMobile }) {
  return (
    <div
      className="flex h-full flex-col bg-gradient-to-b from-[#1e1b4b] via-[#2b2470] to-[#3730a3] relative overflow-hidden"
    >
      {/* Faint decorative glow - purely atmospheric, sits behind all content */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 -left-16 size-48 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden="true" />

      <div className={["relative flex items-center h-[var(--header-height)] shrink-0 border-b border-white/10 px-4", collapsed ? "justify-center" : "justify-between"].join(" ")}>
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold text-white">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-white/25 to-white/5 text-white shrink-0 ring-1 ring-white/20">
            <GraduationCap className="size-[18px]" />
          </span>
          {!collapsed && <span className="text-[15px] tracking-tight">University CRM</span>}
        </Link>
        {showMobileClose && (
          <button onClick={onCloseMobile} aria-label="Close navigation" className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        )}
      </div>

      <nav className="relative flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-4">
        {navSections.map((section) => (
          <div key={section.title || "untitled"}>
            {section.title && !collapsed && (
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300/70">{section.title}</p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative shrink-0 border-t border-white/10 p-2.5 hidden lg:block">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={["flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white focus-ring", collapsed ? "justify-center" : ""].join(" ")}
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
        className="hidden lg:block fixed inset-y-0 left-0 z-30 shadow-xl transition-[width] duration-200"
        style={{ width: collapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)" }}
      >
        <SidebarContent navSections={navSections} collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onCloseMobile} aria-hidden="true" />
          <div className="relative w-[280px] max-w-[80vw] animate-fade-in shadow-2xl">
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
