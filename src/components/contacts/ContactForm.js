"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Field, { Input, Select, Checkbox } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { createContactAction, updateContactAction } from "@/actions/contacts";
import CompanyCombobox from "@/components/contacts/CompanyCombobox";
import {
  LEAD_SOURCES, CONTACT_STATUSES, CONTACT_TIMEZONES, DETECTED_LANGUAGES,
  DOUBLE_OPT_IN_OPTIONS, OPT_IN_OPTIONS, CONTACT_TYPES,
} from "@/lib/constants/crm";
import { useToast } from "@/components/ui/Toast";

const initialState = { error: null };

export default function ContactForm({ departments, contact, companies = [], owners = [], folders = [], lists = [], contactListIds = [], canManageCompanies = true }) {
  const isEdit = Boolean(contact);
  const [state, formAction, pending] = useActionState(isEdit ? updateContactAction : createContactAction, initialState);
  const [selectedListIds, setSelectedListIds] = useState(new Set(contactListIds.map(String)));
  const [companyId, setCompanyId] = useState(contact?.companyId ? String(contact.companyId) : "");
  const [folderId, setFolderId] = useState("");
  const router = useRouter();
  const { push } = useToast();

  useEffect(() => {
    if (state?.success) {
      push(isEdit ? "Contact updated." : "Contact created successfully.");
      router.push(`/contacts/${isEdit ? contact.id : state.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Company -> Folder -> List cascade (requirements #14): a folder either
  // belongs to the selected company, or is a general/no-company folder
  // available regardless of which company is chosen.
  const visibleFolders = useMemo(
    () => folders.filter((f) => !f.companyId || String(f.companyId) === companyId),
    [folders, companyId]
  );
  const visibleLists = useMemo(() => {
    if (folderId) return lists.filter((l) => String(l.folderId) === folderId);
    const visibleFolderIds = new Set(visibleFolders.map((f) => f.id));
    return lists.filter((l) => visibleFolderIds.has(l.folderId));
  }, [lists, folderId, visibleFolders]);

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

      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted -mb-2">Personal information</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="First Name" htmlFor="firstName" required>
          <Input id="firstName" name="firstName" required defaultValue={contact?.firstName} />
        </Field>
        <Field label="Last Name" htmlFor="lastName" required>
          <Input id="lastName" name="lastName" required defaultValue={contact?.lastName} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Job Title" htmlFor="jobTitle">
          <Input id="jobTitle" name="jobTitle" defaultValue={contact?.jobTitle} />
        </Field>
        <Field label="Contact Type" htmlFor="contactType">
          <Select id="contactType" name="contactType" defaultValue={contact?.contactType || "Lead"}>
            {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted -mb-2">Contact information</h3>
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" required defaultValue={contact?.email} />
      </Field>
      {state?.duplicateContactId && (
        <p className="text-sm text-danger -mt-3">
          A contact with this email already exists.{" "}
          <Link href={`/contacts/${state.duplicateContactId}`} className="underline font-medium">View Existing Contact</Link>
        </p>
      )}
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Mobile Number" htmlFor="phone">
          <Input id="phone" name="phone" placeholder="+92-3xx-xxxxxxx" defaultValue={contact?.phone} />
        </Field>
        <Field label="WhatsApp Number" htmlFor="whatsappNumber">
          <Input id="whatsappNumber" name="whatsappNumber" placeholder="+92-3xx-xxxxxxx" defaultValue={contact?.whatsappNumber} />
        </Field>
        <Field label="Phone Number" htmlFor="landlineNumber" hint="Landline">
          <Input id="landlineNumber" name="landlineNumber" placeholder="+92-42-xxxxxxx" defaultValue={contact?.landlineNumber} />
        </Field>
      </div>

      {canManageCompanies && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted -mb-2">Company information</h3>
          <Field label="Company" htmlFor="companyId-search" hint="Search an existing company, or create a new one without leaving this form.">
            <CompanyCombobox
              companies={companies}
              defaultCompany={contact?.companyId ? companies.find((c) => c.id === contact.companyId) : null}
              onCompanyChange={(c) => {
                setCompanyId(c ? String(c.id) : "");
                setFolderId("");
              }}
            />
          </Field>
        </>
      )}

      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted -mb-2">Organization</h3>
      <p className="text-xs text-ink-muted -mt-3">Company → Folder → List. Optional - you can also organize contacts later.</p>
      <Field label="Folder" htmlFor="folder-picker">
        <Select id="folder-picker" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
          <option value="">All folders</option>
          {visibleFolders.map((f) => <option key={f.id} value={String(f.id)}>{f.name}{f.companyId ? "" : " (general)"}</option>)}
        </Select>
      </Field>
      {visibleLists.length > 0 && (
        <Field label="Lists" htmlFor="lists-group" hint="Add this contact to one or more lists.">
          <div id="lists-group" className="flex flex-col gap-2 rounded-md border border-border-strong px-3 py-2.5 max-h-40 overflow-y-auto">
            {visibleLists.map((l) => (
              <Checkbox
                key={l.id}
                label={l.folder?.name ? `${l.name} (${l.folder.name})` : l.name}
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

      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted -mb-2">Additional information</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Contact Owner" htmlFor="ownerId">
          <Select id="ownerId" name="ownerId" defaultValue={contact?.ownerId || ""}>
            <option value="">Unassigned</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </Field>
        <Field label="Ext ID" htmlFor="externalId" hint="External-system id, for de-duplicating re-imports">
          <Input id="externalId" name="externalId" defaultValue={contact?.externalId} />
        </Field>
      </div>
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

      {state?.error && !state?.duplicateContactId && <p className="text-sm text-danger" role="alert">{state.error}</p>}

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
