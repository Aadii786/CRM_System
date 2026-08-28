"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import Field, { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState = { error: null };

export default function PasswordLoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" required placeholder="you@university.edu.pk" autoComplete="username" />
      </Field>
      <Field label="Password" htmlFor="password" required>
        <Input id="password" name="password" type="password" required placeholder="••••••••" autoComplete="current-password" />
      </Field>
      {state?.error && (
        <p className="text-xs text-danger" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" loading={pending} className="w-full mt-1">
        Sign In
      </Button>
    </form>
  );
}
