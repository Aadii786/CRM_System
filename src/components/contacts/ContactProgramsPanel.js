"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Building2, X, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Field, { Select, Input } from "@/components/ui/Field";
import { addInterestAction, removeInterestAction, addOrganizationAction, removeOrganizationAction } from "@/actions/programs";
import { useToast } from "@/components/ui/Toast";
import { PROGRAM_CATEGORIES } from "@/lib/constants/programs";

/**
 * "One person" view of a contact: which programs / categories they are
 * interested in (several allowed) and which other organizations they are
 * linked to besides their main one.
 */
export default function ContactProgramsPanel({ contact, interests, programs, organizations, companies, canEdit }) {
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function run(action, formData, message) {
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      if (message) push(message);
      router.refresh();
    });
  }

  function remove(action, id, message) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("contactId", contact.id);
    run(action, fd, message);
  }

  const mainCompanyId = contact.companyId;
  const linkable = companies.filter((c) => String(c.id) !== String(mainCompanyId) && !organizations.some((o) => o.companyId === c.id));

  return (
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      <section className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold text-ink mb-1 flex items-center gap-2"><GraduationCap className="size-4 text-primary" /> Program interests</h3>
        <p className="text-xs text-ink-muted mb-3">Programs or whole categories this person wants. Several are allowed; they feed segments and campaigns.</p>
        {interests.length === 0 ? (
          <p className="text-sm text-ink-muted mb-3">No interests recorded yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2 mb-3">
            {interests.map((i) => (
              <li key={i.id} className="inline-flex items-center gap-1.5 rounded-full border border-primary-border bg-primary-subtle px-2.5 py-1 text-xs text-primary-active">
                {i.program ? <Link href={`/programs/${i.program.id}`} className="hover:underline">{i.program.title}</Link> : <span>{i.category} (category)</span>}
                {canEdit && (
                  <button type="button" title="Remove" disabled={isPending} onClick={() => remove(removeInterestAction, i.id, "Interest removed.")} className="rounded-full hover:bg-primary-border/60 p-0.5">
                    <X className="size-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <form action={(fd) => run(addInterestAction, fd, "Interest added.")} className="flex flex-col gap-2.5 border-t border-border pt-3">
            <input type="hidden" name="contactId" value={contact.id} />
            <Field label="Add a program" htmlFor="int-program">
              <Select id="int-program" name="programId" defaultValue="">
                <option value="">Choose a program...</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.title}{p.category ? ` (${p.category})` : ""}</option>)}
              </Select>
            </Field>
            <Field label="or a whole category" htmlFor="int-category">
              <Select id="int-category" name="category" defaultValue="">
                <option value="">Choose a category...</option>
                {PROGRAM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" size="sm" icon={Plus} loading={isPending}>Add interest</Button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold text-ink mb-1 flex items-center gap-2"><Building2 className="size-4 text-primary" /> Organizations</h3>
        <p className="text-xs text-ink-muted mb-3">One person can be linked to more than one organization. The main one is shown in the header.</p>
        <ul className="flex flex-col gap-2 mb-3">
          {contact.Company && (
            <li className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <Link href={`/companies/${contact.Company.id}`} className="font-medium text-ink hover:text-primary">{contact.Company.name}</Link>
              <span className="text-xs text-ink-muted">Main organization</span>
            </li>
          )}
          {organizations.map((o) => (
            <li key={o.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span>
                <Link href={`/companies/${o.companyId}`} className="font-medium text-ink hover:text-primary">{o.Company?.name}</Link>
                {o.jobTitle && <span className="text-xs text-ink-muted"> · {o.jobTitle}</span>}
              </span>
              {canEdit && (
                <button type="button" title="Remove" disabled={isPending} onClick={() => remove(removeOrganizationAction, o.id, "Link removed.")} className="p-1 rounded text-ink-muted hover:text-danger hover:bg-surface-alt">
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
          {!contact.Company && organizations.length === 0 && <li className="text-sm text-ink-muted">Not linked to any organization.</li>}
        </ul>
        {canEdit && linkable.length > 0 && (
          <form action={(fd) => run(addOrganizationAction, fd, "Organization linked.")} className="flex flex-col gap-2.5 border-t border-border pt-3">
            <input type="hidden" name="contactId" value={contact.id} />
            <Field label="Link another organization" htmlFor="org-company">
              <Select id="org-company" name="companyId" defaultValue="" required>
                <option value="" disabled>Choose a company...</option>
                {linkable.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Job title there" htmlFor="org-title">
              <Input id="org-title" name="jobTitle" maxLength={150} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" size="sm" icon={Plus} loading={isPending}>Link organization</Button>
            </div>
          </form>
        )}
      </section>

      {error && <p className="lg:col-span-2 text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}
