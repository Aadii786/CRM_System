"use client";

import { Bell, CheckCheck } from "lucide-react";
import DropdownMenu from "@/components/ui/DropdownMenu";
import { markAllNotificationsReadAction } from "@/actions/notifications";
import { timeAgo } from "@/lib/utils/format";

export default function NotificationsMenu({ notifications, unreadCount }) {
  return (
    <DropdownMenu
      trigger={
        <button className="relative rounded-md p-2 text-ink-secondary hover:bg-surface-alt focus-ring" aria-label="Notifications">
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      }
      className="w-80 max-h-96 overflow-y-auto"
    >
      <div className="flex items-center justify-between px-2 py-1.5">
        <p className="text-sm font-semibold text-ink">Notifications</p>
        {unreadCount > 0 && (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover">
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          </form>
        )}
      </div>
      {notifications.length === 0 ? (
        <p className="px-2.5 py-6 text-center text-sm text-ink-muted">You&apos;re all caught up.</p>
      ) : (
        <div className="flex flex-col">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={["flex flex-col gap-0.5 rounded-md px-2.5 py-2 text-left", !n.isRead ? "bg-primary-subtle/40" : ""].join(" ")}
            >
              <div className="flex items-center gap-1.5">
                {!n.isRead && <span className="size-1.5 rounded-full bg-primary shrink-0" />}
                <p className="text-sm font-medium text-ink">{n.title}</p>
              </div>
              {n.body && <p className="text-xs text-ink-muted">{n.body}</p>}
              <p className="text-[11px] text-ink-muted">{timeAgo(n.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </DropdownMenu>
  );
}
