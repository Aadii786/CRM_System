"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Field, { Input, Select, Checkbox } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { createContactAction, updateContactAction } from "@/actions/contacts";
import {
  LEAD_SOURCES, CONTACT_STATUSES, CONTACT_TIMEZONES, DETECTED_LANGUAGES,
  DOUBLE_OPT_IN_OPTIONS, OPT_IN_OPTIONS,
} from "@/lib/constants/crm";
import { useToast } from "@/components/ui/Toast";

const initialState = { error: null };

export default function ContactForm({ departments, contact, companies = [], owners = [], lists = [], contactListIds = [] }) {
  const isEdit = Boolean(contact);
  const [state, formAction, pending] = useActionState(isEdit ? updateContactAction : createContactAction, initialState);
  const [selectedListIds, setSelectedListIds] = useState(new Set(contactListIds.map(String)));
  const router = useRouter();
  const { push } = useToast();

  useEffect(() => {
    if (state?.success) {
      push(isEdit ? "Contact updated." : "Contact created successfully.");
      router.push(`/contacts/${isEdit ? contact.id : state.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function toggleList(id) {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-2xl">
      {isEdit && <input type="hidden" name="id" value={contact.id} />}
      <input type="hidden" name="listsSubmitted" value="1" />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="First Name" htmlFor="firstName" required>
          <Input id="firstName" name="firstName" required defaultValue={contact?.firstName} />
        </Field>
        <Field label="Last Name" htmlFor="lastName" required>
          <Input id="lastName" name="lastName" required defaultValue={contact?.lastName} />
        </Field>
      </div>

      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" required defaultValue={contact?.email} />
      </Field>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted -mb-2">Contact numbers</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="SMS" htmlFor="phone" hint="Mobile number">
          <Input id="phone" name="phone" placeholder="+92-3xx-xxxxxxx" defaultValue={contact?.phone} />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsappNumber">
          <Input id="whatsappNumber" name="whatsappNumber" placeholder="+92-3xx-xxxxxxx" defaultValue={contact?.whatsappNumber} />
        </Field>
        <Field label="Landline Number" htmlFor="landlineNumber">
          <Input id="landlineNumber" name="landlineNumber" placeholder="+92-42-xxxxxxx" defaultValue={contact?.landlineNumber} />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Ext ID" htmlFor="externalId" hint="External-system id, for de-duplicating re-imports">
          <Input id="externalId" name="externalId" defaultValue={contact?.externalId} />
        </Field>
        <Field label="Job Title" htmlFor="jobTitle">
          <Input id="jobTitle" name="jobTitle" defaultValue={contact?.jobTitle} />
        </Field>
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted -mb-2">Ownership &amp; association</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Contact Owner" htmlFor="ownerId">
          <Select id="ownerId" name="ownerId" defaultValue={contact?.ownerId || ""}>
            <option value="">Unassigned</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </Field>
        <Field label="Associated to Company" htmlFor="companyId">
          <Select id="companyId" name="companyId" defaultValue={contact?.companyId || ""}>
            <option value="">No company</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      </div>

      {lists.length > 0 && (
        <Field label="Lists" htmlFor="lists-group" hint="Add this contact to one or more static lists.">
          <div id="lists-group" className="flex flex-col gap-2 rounded-md border border-border-strong px-3 py-2.5 max-h-40 overflow-y-auto">
            {lists.map((l) => (
              <Checkbox
                key={l.id}
                label={`${l.name} (${l.folder?.name || "—"})`}
                checked={selectedListIds.has(String(l.id))}
                onChange={() => toggleList(String(l.id))}
              />
            ))}
          </div>
          {[...selectedListIds].map((id) => (
            <input key={id} type="hidden" name="listIds" value={id} />
          ))}
        </Field>
      )}

      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted -mb-2">Location &amp; preferences</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" defaultValue={contact?.city} />
        </Field>
        <Field label="Country" htmlFor="country">
          <Input id="country" name="country" defaultValue={contact?.country || "Pakistan"} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Contact Timezone" htmlFor="timezone">
          <Select id="timezone" name="timezone" defaultValue={contact?.timezone || ""}>
            <option value="">Select a timezone</option>
            {CONTACT_TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </Select>
        </Field>
        <Field label="LinkedIn" htmlFor="linkedin">
          <Input id="linkedin" name="linkedin" placeholder="linkedin.com/in/..." defaultValue={contact?.linkedin} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Detected Language" htmlFor="detectedLanguage">
          <Select id="detectedLanguage" name="detectedLanguage" defaultValue={contact?.detectedLanguage || ""}>
            <option value="">Select an option</option>
            {DETECTED_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Double Opt-In" htmlFor="doubleOptIn">
          <Select id="doubleOptIn" name="doubleOptIn" defaultValue={contact?.doubleOptIn || "No"}>
            {DOUBLE_OPT_IN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Opt-In" htmlFor="optIn">
          <Select id="optIn" name="optIn" defaultValue={contact?.optIn || "Unknown"}>
            {OPT_IN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </Field>
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted -mb-2">Lifecycle</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Source" htmlFor="source">
          <Select id="source" name="source" defaultValue={contact?.source || "Website"}>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={contact?.status || "New"}>
            {CONTACT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>
        {!isEdit && departments.length > 1 && (
          <Field label="Department" htmlFor="departmentKey">
            <Select id="departmentKey" name="departmentKey" defaultValue={departments[0]?.key}>
              {departments.map((d) => (
                <option key={d.key} value={d.key}>{d.name}</option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}

      <div className="flex items-center gap-2.5">
        <Button type="submit" variant="primary" loading={pending}>
          {isEdit ? "Save Changes" : "Create Contact"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
