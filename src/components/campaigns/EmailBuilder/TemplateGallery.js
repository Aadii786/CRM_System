"use client";

import Card from "@/components/ui/Card";
import { LayoutTemplate } from "lucide-react";
import { EMAIL_TEMPLATES } from "@/lib/emailDesign/templates";

/** Shown when the canvas is empty - pick a starter layout or begin blank. */
export default function TemplateGallery({ onPick, onBlank }) {
  return (
    <div>
      <p className="text-sm text-ink-muted mb-4">Start from a template or build your own with the drag-and-drop canvas.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <button type="button" onClick={onBlank} className="text-left">
          <Card className="h-full hover:border-primary-border hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 py-8 border-dashed">
            <LayoutTemplate className="size-6 text-ink-muted" />
            <span className="text-sm font-semibold text-ink">Blank Canvas</span>
            <span className="text-xs text-ink-muted">Start from scratch</span>
          </Card>
        </button>
        {EMAIL_TEMPLATES.map((t) => (
          <button key={t.key} type="button" onClick={() => onPick(t)} className="text-left">
            <Card className="h-full hover:border-primary-border hover:shadow-md transition-all">
              <h3 className="text-sm font-semibold text-ink mb-1">{t.name}</h3>
              <p className="text-xs text-ink-muted">{t.description}</p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
