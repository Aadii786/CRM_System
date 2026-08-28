import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-muted mb-1">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-ink transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-ink font-medium" : ""}>{item.label}</span>
            )}
            {!isLast && <ChevronRight className="size-3.5" aria-hidden="true" />}
          </span>
        );
      })}
    </nav>
  );
}
