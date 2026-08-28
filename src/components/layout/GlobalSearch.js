"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Loader2, Users, Building2, Handshake, Megaphone, CheckSquare } from "lucide-react";
import Modal from "@/components/ui/Modal";

const GROUPS = [
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "deals", label: "Deals", icon: Handshake },
  { key: "campaigns", label: "Campaigns", icon: Megaphone },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
];

/** Command-palette style global search overlay (requirements #7, #58). */
export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Reset the overlay's local state whenever it transitions closed->open,
  // computed during render (not in an effect) per React's "adjusting state
  // when a prop changes" pattern - avoids a setState-in-effect cascade.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setResults(null);
    }
  }

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const totalResults = results ? GROUPS.reduce((sum, g) => sum + (results[g.key]?.length || 0), 0) : null;

  return (
    <Modal open={open} onClose={onClose} title="Search" size="lg">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts, companies, deals, campaigns, tasks..."
          className="h-11 w-full rounded-md border border-border-strong pl-9 pr-9 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-ink-muted" />}
      </div>

      {!results && query.trim().length < 2 && (
        <p className="text-sm text-ink-muted py-8 text-center">Start typing to search across the platform.</p>
      )}
      {results && totalResults === 0 && (
        <p className="text-sm text-ink-muted py-8 text-center">No results for &quot;{query}&quot;.</p>
      )}
      {results && totalResults > 0 && (
        <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
          {GROUPS.map((group) => {
            const items = results[group.key];
            if (!items || items.length === 0) return null;
            const Icon = group.icon;
            return (
              <div key={group.key}>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">{group.label}</p>
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-surface-alt transition-colors"
                    >
                      <Icon className="size-4 text-ink-muted shrink-0" />
                      <span className="text-sm text-ink truncate">{item.label}</span>
                      {item.sub && <span className="text-xs text-ink-muted truncate ml-auto">{item.sub}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
