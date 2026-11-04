"use client";

import Link from "next/link";
import { Plus, UserPlus, Building2, Handshake, CheckSquare, CalendarDays, Megaphone, Workflow } from "lucide-react";
import DropdownMenu, { DropdownItem, DropdownSeparator } from "@/components/ui/DropdownMenu";

// Global quick-create menu (requirements #59, #95).
// Each entry is shown only to people who hold the permission behind it, so a
// read-only user (the Rector) never sees a Create menu full of dead ends.
const ITEMS = [
  { label: "Create Contact", href: "/contacts/new", icon: UserPlus, permission: "contacts.create" },
  { label: "Create Company", href: "/companies/new", icon: Building2, permission: "companies.create" },
  { label: "Create Deal", href: "/deals/new", icon: Handshake, permission: "deals.create" },
  { label: "Create Task", href: "/tasks", icon: CheckSquare, permission: "tasks.create" },
  { label: "Create Meeting", href: "/meetings", icon: CalendarDays, permission: "meetings.create" },
];
const ITEMS_2 = [
  { label: "Create Campaign", href: "/campaigns/new", icon: Megaphone, permission: "campaigns.create" },
  { label: "Create Automation", href: "/automations/new", icon: Workflow, permission: "automations.create" },
];

export default function QuickCreateMenu({ permissions = [] }) {
  const allowed = (list) => list.filter((i) => permissions.includes(i.permission));
  const first = allowed(ITEMS);
  const second = allowed(ITEMS_2);
  if (!first.length && !second.length) return null;
  return (
    <DropdownMenu
      trigger={
        <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 h-9 text-sm font-medium text-white hover:bg-primary-hover focus-ring">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Create</span>
        </button>
      }
    >
      {first.map((item) => (
        <DropdownItem as={Link} href={item.href} icon={item.icon} key={item.href}>
          {item.label}
        </DropdownItem>
      ))}
      {first.length > 0 && second.length > 0 && <DropdownSeparator />}
      {second.map((item) => (
        <DropdownItem as={Link} href={item.href} icon={item.icon} key={item.href}>
          {item.label}
        </DropdownItem>
      ))}
    </DropdownMenu>
  );
}
