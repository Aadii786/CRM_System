"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Field, { Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { createContactAction, updateContactAction } from "@/actions/contacts";
import { LEAD_SOURCES, CONTACT_STATUSES } from "@/lib/constants/crm";
import { useToast } from "@/components/ui/Toast";

const initialState = { error: null };

export default function ContactForm({ departments, contact }) {
  const isEdit = Boolean(contact);
  const [state, formAction, pending] = useActionState(isEdit ? updateContactAction : createContactAction, initialState);
  const router = useRouter();
  const { push } = useToast();

  useEffect(() => {
    if (state?.success) {
      push(isEdit ? "Contact updated." : "Contact created successfully.");
      router.push(`/contacts/${isEdit ? contact.id : state.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-2xl">
      {isEdit && <input type="hidden" name="id" value={contact.id} />}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="First Name" htmlFor="firstName" required>
          <Input id="firstName" name="firstName" required defaultValue={contact?.firstName} />
        </Field>
        <Field label="Last Name" htmlFor="lastName" required>
          <Input id="lastName" name="lastName" required defaultValue={contact?.lastName} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" required defaultValue={contact?.email} />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" placeholder="+92-3xx-xxxxxxx" defaultValue={contact?.phone} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="WhatsApp Number" htmlFor="whatsappNumber">
          <Input id="whatsappNumber" name="whatsappNumber" placeholder="+92-3xx-xxxxxxx" defaultValue={contact?.whatsappNumber} />
        </Field>
        <Field label="Job Title" htmlFor="jobTitle">
          <Input id="jobTitle" name="jobTitle" defaultValue={contact?.jobTitle} />
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
