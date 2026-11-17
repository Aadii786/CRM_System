"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import DemoEnvironmentBanner from "./DemoEnvironmentBanner";
import WelcomeTour from "./WelcomeTour";

export default function AppShell({ user, navSections, notifications, unreadCount, guideKey, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar
        navSections={navSections}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className={collapsed ? "lg:ml-[var(--sidebar-width-collapsed)]" : "lg:ml-[var(--sidebar-width)]"}>
        <Header
          user={user}
          notifications={notifications}
          unreadCount={unreadCount}
          onToggleMobileNav={() => setMobileOpen(true)}
        />
        <DemoEnvironmentBanner />
        <main className="p-4 md:p-6 max-w-[1600px]">{children}</main>
        <WelcomeTour userId={user.id} userName={user.name} guideKey={guideKey} />
      </div>
    </div>
  );
}
