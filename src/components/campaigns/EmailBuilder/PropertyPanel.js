"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Field, { Input, Textarea, Select, Checkbox } from "@/components/ui/Field";
import { Trash2, BringToFront, SendToBack } from "lucide-react";
import { ELEMENT_LABELS } from "@/lib/emailDesign/elements";

/** Right-hand inspector for whichever canvas element is currently selected. */
export default function PropertyPanel({ element, onUpdateProps, onDelete, onBringToFront, onSendToBack }) {
  if (!element) {
    return (
      <Card className="w-64 shrink-0">
        <p className="text-sm text-ink-muted">Select an element on the canvas to edit it, or drag a new one in from the palette above.</p>
      </Card>
    );
  }

  const { type, props } = element;
  function set(patch) {
    onUpdateProps(element.id, patch);
  }

  return (
    <Card className="w-64 shrink-0 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink">{ELEMENT_LABELS[type]} settings</h4>
        <div className="flex gap-1">
          <button type="button" title="Bring to front" onClick={() => onBringToFront(element.id)} className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-alt">
            <BringToFront className="size-4" />
          </button>
          <button type="button" title="Send to back" onClick={() => onSendToBack(element.id)} className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-alt">
            <SendToBack className="size-4" />
          </button>
        </div>
      </div>

      {type === "text" && (
        <>
          <Field label="Content" htmlFor="p-content">
            <Textarea id="p-content" rows={4} value={props.content} onChange={(e) => set({ content: e.target.value })} />
          </Field>
          <Field label="Font size" htmlFor="p-fontsize">
            <Input id="p-fontsize" type="number" min={10} max={60} value={props.fontSize} onChange={(e) => set({ fontSize: Number(e.target.value) || 16 })} />
          </Field>
          <Field label="Color" htmlFor="p-color">
            <Input id="p-color" type="color" value={props.color} onChange={(e) => set({ color: e.target.value })} className="h-9 p-1" />
          </Field>
          <Field label="Align" htmlFor="p-align">
            <Select id="p-align" value={props.align} onChange={(e) => set({ align: e.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </Select>
          </Field>
          <Checkbox label="Bold" checked={props.bold} onChange={(e) => set({ bold: e.target.checked })} />
        </>
      )}

      {type === "image" && (
        <>
          <Field label="Image URL" htmlFor="p-src" hint="Paste a link to an image (e.g. from your CDN or Documents upload).">
            <Input id="p-src" value={props.src} onChange={(e) => set({ src: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Alt text" htmlFor="p-alt">
            <Input id="p-alt" value={props.alt} onChange={(e) => set({ alt: e.target.value })} />
          </Field>
        </>
      )}

      {type === "button" && (
        <>
          <Field label="Label" htmlFor="p-label">
            <Input id="p-label" value={props.label} onChange={(e) => set({ label: e.target.value })} />
          </Field>
          <Field label="Link URL" htmlFor="p-href">
            <Input id="p-href" value={props.href} onChange={(e) => set({ href: e.target.value })} />
          </Field>
          <Field label="Background" htmlFor="p-bg">
            <Input id="p-bg" type="color" value={props.bgColor} onChange={(e) => set({ bgColor: e.target.value })} className="h-9 p-1" />
          </Field>
          <Field label="Text color" htmlFor="p-fg">
            <Input id="p-fg" type="color" value={props.textColor} onChange={(e) => set({ textColor: e.target.value })} className="h-9 p-1" />
          </Field>
          <Field label="Align" htmlFor="p-btn-align">
            <Select id="p-btn-align" value={props.align} onChange={(e) => set({ align: e.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </Select>
          </Field>
        </>
      )}

      {type === "divider" && (
        <Field label="Color" htmlFor="p-divider-color">
          <Input id="p-divider-color" type="color" value={props.color} onChange={(e) => set({ color: e.target.value })} className="h-9 p-1" />
        </Field>
      )}

      {type === "spacer" && <p className="text-xs text-ink-muted">Drag the bottom-right handle to change the spacer&apos;s height.</p>}

      <Button variant="danger-ghost" icon={Trash2} onClick={() => onDelete(element.id)} className="mt-2">
        Delete element
      </Button>
    </Card>
  );
}
