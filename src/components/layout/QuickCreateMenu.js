"use client";

import Link from "next/link";
import { Plus, UserPlus, Building2, Handshake, CheckSquare, CalendarDays, Megaphone, Workflow } from "lucide-react";
import DropdownMenu, { DropdownItem, DropdownSeparator } from "@/components/ui/DropdownMenu";

// Global quick-create menu (requirements #59, #95).
const ITEMS = [
  { label: "Create Contact", href: "/contacts/new", icon: UserPlus },
  { label: "Create Company", href: "/companies/new", icon: Building2 },
  { label: "Create Deal", href: "/deals/new", icon: Handshake },
  { label: "Create Task", href: "/tasks", icon: CheckSquare },
  { label: "Create Meeting", href: "/meetings", icon: CalendarDays },
];
const ITEMS_2 = [
  { label: "Create Campaign", href: "/campaigns/new", icon: Megaphone },
  { label: "Create Automation", href: "/automations/new", icon: Workflow },
];

export default function QuickCreateMenu() {
  return (
    <DropdownMenu
      trigger={
        <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 h-9 text-sm font-medium text-white hover:bg-primary-hover focus-ring">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Create</span>
        </button>
      }
    >
      {ITEMS.map((item) => (
        <DropdownItem as={Link} href={item.href} icon={item.icon} key={item.href}>
          {item.label}
        </DropdownItem>
      ))}
      <DropdownSeparator />
      {ITEMS_2.map((item) => (
        <DropdownItem as={Link} href={item.href} icon={item.icon} key={item.href}>
          {item.label}
        </DropdownItem>
      ))}
    </DropdownMenu>
  );
}
