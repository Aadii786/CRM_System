"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Field, { Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { createCompanyAction, updateCompanyAction } from "@/actions/companies";
import { ORGANIZATION_TYPES, LEAD_SOURCES, COMPANY_SIZES } from "@/lib/constants/crm";
import { useToast } from "@/components/ui/Toast";

const initialState = { error: null };

export default function CompanyForm({ company }) {
  const isEdit = Boolean(company);
  const [state, formAction, pending] = useActionState(isEdit ? updateCompanyAction : createCompanyAction, initialState);
  const router = useRouter();
  const { push } = useToast();

  useEffect(() => {
    if (state?.success) {
      push(isEdit ? "Company updated." : "Company created successfully.");
      router.push(`/companies/${isEdit ? company.id : state.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-2xl">
      {isEdit && <input type="hidden" name="id" value={company.id} />}
      <Field label="Company Name" htmlFor="name" required>
        <Input id="name" name="name" required defaultValue={company?.name} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Organization Type" htmlFor="organizationType">
          <Select id="organizationType" name="organizationType" defaultValue={company?.organizationType || "Corporate"}>
            {ORGANIZATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Industry" htmlFor="industry">
          <Input id="industry" name="industry" defaultValue={company?.industry} />
        </Field>
      </div>
      <Field label="Company Size" htmlFor="companySize">
        <Select id="companySize" name="companySize" defaultValue={company?.companySize || ""}>
          <option value="">Select a size</option>
          {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
        </Select>
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Website" htmlFor="website">
          <Input id="website" name="website" placeholder="https://" defaultValue={company?.website} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={company?.email} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={company?.phone} />
        </Field>
        <Field label="Lead Source" htmlFor="leadSource">
          <Select id="leadSource" name="leadSource" defaultValue={company?.leadSource || "Other"}>
            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" defaultValue={company?.city} />
        </Field>
        <Field label="Country" htmlFor="country">
          <Input id="country" name="country" defaultValue={company?.country || "Pakistan"} />
        </Field>
      </div>
      <Field label="Address" htmlFor="address">
        <Input id="address" name="address" defaultValue={company?.address} />
      </Field>
      <Field label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue={company?.status || "Prospect"}>
          <option>Prospect</option>
          <option>Active</option>
          <option>Inactive</option>
        </Select>
      </Field>

      {state?.duplicateCompanyId && (
        <div className="rounded-md border border-warning-border bg-warning-subtle px-3.5 py-3 text-sm text-ink" role="alert">
          <p className="font-medium">{state.error}</p>
          <p className="mt-0.5">Companies are matched by name (ignoring Ltd, Pvt and punctuation) and by website, so the same client is not entered twice.</p>
          <Link href={`/companies/${state.duplicateCompanyId}`} className="underline font-medium">View existing company</Link>
        </div>
      )}
      {state?.error && !state?.duplicateCompanyId && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex items-center gap-2.5">
        <Button type="submit" variant="primary" loading={pending}>{isEdit ? "Save Changes" : "Create Company"}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
