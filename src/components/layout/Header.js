"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, HelpCircle, ChevronDown, LogOut, RefreshCcw, Search as SearchIcon } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import DropdownMenu, { DropdownItem, DropdownSeparator } from "@/components/ui/DropdownMenu";
import { logoutAction } from "@/actions/auth";
import QuickCreateMenu from "./QuickCreateMenu";
import NotificationsMenu from "./NotificationsMenu";
import GlobalSearch from "./GlobalSearch";

export default function Header({ user, notifications, unreadCount, onToggleMobileNav }) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-[var(--header-height)] items-center gap-3 border-b border-border bg-surface px-4">
      <button
        type="button"
        onClick={onToggleMobileNav}
        aria-label="Toggle navigation"
        className="lg:hidden rounded-md p-2 text-ink-secondary hover:bg-surface-alt focus-ring"
      >
        <Menu className="size-5" />
      </button>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border-strong bg-surface-alt px-3 h-9 text-sm text-ink-muted hover:border-primary-border w-full max-w-xs focus-ring"
      >
        <SearchIcon className="size-4" />
        <span className="flex-1 text-left">Search contacts, deals, campaigns...</span>
        <kbd className="hidden sm:inline text-[10px] font-mono bg-surface border border-border rounded px-1.5 py-0.5">/</kbd>
      </button>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <div className="ml-auto flex items-center gap-1.5">
        {user.department && (
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-medium text-ink-secondary mr-1">
            {user.department.name}
          </span>
        )}

        <QuickCreateMenu />

        <NotificationsMenu notifications={notifications} unreadCount={unreadCount} />

        <Link
          href="/demo-center"
          title="Help & Demo Center"
          className="hidden sm:inline-flex rounded-md p-2 text-ink-secondary hover:bg-surface-alt focus-ring"
        >
          <HelpCircle className="size-[18px]" />
        </Link>

        <DropdownMenu
          trigger={
            <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface-alt focus-ring">
              <Avatar name={user.name} color={user.avatarColor} size="sm" />
              <span className="hidden md:flex flex-col items-start leading-tight">
                <span className="text-sm font-medium text-ink">{user.name}</span>
                <span className="text-xs text-ink-muted">{user.jobTitle}</span>
              </span>
              <ChevronDown className="size-4 text-ink-muted hidden md:block" />
            </button>
          }
        >
          <div className="px-2.5 py-2 mb-1">
            <p className="text-sm font-medium text-ink">{user.name}</p>
            <p className="text-xs text-ink-muted">{user.email}</p>
          </div>
          <DropdownSeparator />
          <DropdownItem as={Link} href="/login" icon={RefreshCcw}>
            Switch Demo User
          </DropdownItem>
          <DropdownSeparator />
          <form action={logoutAction}>
            <DropdownItem as="button" type="submit" icon={LogOut} danger>
              Log Out
            </DropdownItem>
          </form>
        </DropdownMenu>
      </div>
    </header>
  );
}
