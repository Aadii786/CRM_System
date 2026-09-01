"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import { createElement } from "@/lib/emailDesign/elements";
import TemplateGallery from "./TemplateGallery";
import Palette from "./Palette";
import Canvas from "./Canvas";
import PropertyPanel from "./PropertyPanel";

/**
 * Freeform drag-and-drop email builder (Brevo-style). Fully controlled:
 * the caller owns `elements` and receives every change via `onChange`, the
 * same pattern CampaignWizard already uses for its other form fields.
 */
export default function EmailBuilder({ elements, onChange }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = elements.find((el) => el.id === selectedId) || null;

  function addElement(type, x, y) {
    const newEl = createElement(type, x, y);
    onChange([...elements, newEl]);
    setSelectedId(newEl.id);
  }

  // Fallback position for a palette click (no drop coordinates available) -
  // stack new blocks below whatever's already on the canvas.
  function addElementDefault(type) {
    const bottom = elements.reduce((max, el) => Math.max(max, el.y + (el.height || 0)), 0);
    addElement(type, 20, bottom + 20);
  }

  function updateElement(id, patch) {
    onChange(elements.map((el) => (el.id === id ? { ...el, ...patch } : el)));
  }

  function updateElementProps(id, propsPatch) {
    onChange(elements.map((el) => (el.id === id ? { ...el, props: { ...el.props, ...propsPatch } } : el)));
  }

  function moveElement(id, x, y) {
    updateElement(id, { x, y });
  }

  function removeElement(id) {
    onChange(elements.filter((el) => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function bringToFront(id) {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    onChange([...elements.filter((e) => e.id !== id), el]);
  }

  function sendToBack(id) {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    onChange([el, ...elements.filter((e) => e.id !== id)]);
  }

  function loadTemplate(template) {
    onChange(template.elements());
    setSelectedId(null);
  }

  if (elements.length === 0) {
    return <TemplateGallery onPick={loadTemplate} onBlank={() => addElementDefault("text")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Palette onAdd={addElementDefault} />
        <Button
          variant="ghost"
          size="sm"
          icon={RotateCcw}
          onClick={() => {
            if (window.confirm("Clear the canvas and choose a different template? This can't be undone.")) {
              onChange([]);
              setSelectedId(null);
            }
          }}
        >
          Change template
        </Button>
      </div>
      <div className="flex gap-4 items-start">
        <Canvas
          elements={elements}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={moveElement}
          onResize={updateElement}
          onDelete={removeElement}
          onDropNew={addElement}
        />
        <PropertyPanel
          element={selected}
          onUpdateProps={updateElementProps}
          onDelete={removeElement}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
        />
      </div>
    </div>
  );
}
