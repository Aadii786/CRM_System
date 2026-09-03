"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Building2, Plus, Check, X } from "lucide-react";
import Field, { Input, Select } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { createCompanyAction } from "@/actions/companies";
import { COMPANY_SIZES } from "@/lib/constants/crm";

/**
 * Searchable company picker with an inline "+ Create New Company" step, so
 * creating a contact for a brand-new company never requires leaving the
 * form (requirements: Company field must be searchable; if it doesn't
 * exist, create it without leaving contact creation).
 */
export default function CompanyCombobox({ companies, name = "companyId", defaultCompany, onCompanyChange }) {
  const [query, setQuery] = useState(defaultCompany?.name || "");
  const [selected, setSelected] = useState(defaultCompany || null);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const boxRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && query === selected.name)) return companies.slice(0, 30);
    return companies.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 30);
  }, [query, companies, selected]);

  function pick(company) {
    setSelected(company);
    setQuery(company.name);
    setOpen(false);
    onCompanyChange?.(company);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    onCompanyChange?.(null);
  }

  function handleCreated(company) {
    setCreateOpen(false);
    pick(company);
  }

  return (
    <div className="relative" ref={boxRef}>
      <input type="hidden" name={name} value={selected?.id || ""} />
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected && e.target.value !== selected.name) setSelected(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search company..."
          className="pr-8"
        />
        {selected ? (
          <button type="button" onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink" aria-label="Clear company">
            <X className="size-4" />
          </button>
        ) : (
          <Building2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-ink-muted pointer-events-none" />
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-surface shadow-lg py-1">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-ink-muted">No companies match &quot;{query}&quot;.</p>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-surface-alt"
            >
              <span className="truncate">{c.name}</span>
              {selected?.id === c.id && <Check className="size-3.5 text-primary shrink-0" />}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setOpen(false);
              setCreateOpen(true);
            }}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-sm text-left text-primary hover:bg-surface-alt border-t border-border"
          >
            <Plus className="size-3.5" /> Create new company{query.trim() ? `: "${query.trim()}"` : ""}
          </button>
        </div>
      )}

      <QuickCreateCompanyModal open={createOpen} onClose={() => setCreateOpen(false)} initialName={query} onCreated={handleCreated} />
    </div>
  );
}

function QuickCreateCompanyModal({ open, onClose, initialName, onCreated }) {
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData) {
    setError(null);
    startTransition(async () => {
      const result = await createCompanyAction(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onCreated({ id: result.id, name: formData.get("name")?.toString() });
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New Company" size="lg">
      <form action={handleSubmit} className="flex flex-col gap-4">
        <Field label="Company Name" htmlFor="qc-name" required>
          <Input id="qc-name" name="name" required defaultValue={initialName} autoFocus />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Company Website" htmlFor="qc-website">
            <Input id="qc-website" name="website" placeholder="https://..." />
          </Field>
          <Field label="Company Industry" htmlFor="qc-industry">
            <Input id="qc-industry" name="industry" />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Company Size" htmlFor="qc-size">
            <Select id="qc-size" name="companySize" defaultValue="">
              <option value="">Select a size</option>
              {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
            </Select>
          </Field>
          <Field label="Company Location" htmlFor="qc-city">
            <Input id="qc-city" name="city" placeholder="City" />
          </Field>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={isPending}>Create Company</Button>
        </div>
      </form>
    </Modal>
  );
}
