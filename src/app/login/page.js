import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/authService";
import { DEMO_USERS } from "@/lib/constants/demoUsers";
import { demoLoginAction } from "@/actions/auth";
import PasswordLoginForm from "@/components/auth/PasswordLoginForm";

const ROLE_DESCRIPTIONS = {
  RECTOR: "University-wide executive dashboard, read-only reports",
  CENTRAL_CRM_ADMINISTRATOR: "Full platform access - users, roles, all data",
  MARKETING_MANAGER: "Contacts, campaigns, segments, automation",
  MARKETING_EXECUTIVE: "Operational marketing access",
  IKL_HSM_MANAGER: "Companies, deals, training, proposals, invoices",
  IKL_HSM_EXECUTIVE: "Operational B2B CRM access",
};

export default async function LoginPage() {
  const existing = await getCurrentUser();
  if (existing) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="flex flex-col items-center text-center mb-8">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-white mb-3">
            <GraduationCap className="size-6" />
          </span>
          <h1 className="text-xl font-semibold text-ink">University CRM & Marketing Platform</h1>
          <p className="text-sm text-ink-muted mt-1 max-w-md">
            A centralized CRM, marketing automation and B2B (IKL/HSM) demo built around the Brevo evaluation requirements.
          </p>
          <span className="mt-3 inline-flex items-center rounded-full border border-warning-border bg-warning-subtle px-3 py-1 text-xs font-medium text-warning">
            DEMO ENVIRONMENT - no real emails or messages are ever sent
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink mb-1">Sign in as a demo user</h2>
            <p className="text-xs text-ink-muted mb-4">
              One click signs you in - permissions, sidebar and dashboards update instantly per role (requirements #9-#10).
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {DEMO_USERS.map((u) => (
                <form key={u.key} action={demoLoginAction}>
                  <input type="hidden" name="roleKey" value={u.roleKey} />
                  <button
                    type="submit"
                    className="w-full flex items-start gap-3 rounded-md border border-border-strong bg-surface p-3 text-left hover:border-primary-border hover:bg-primary-subtle/40 transition-colors focus-ring"
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: u.avatarColor }}
                    >
                      {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink truncate">{u.name}</span>
                      <span className="block text-xs text-ink-muted truncate">{u.jobTitle}</span>
                      <span className="block text-[11px] text-ink-muted mt-0.5">{ROLE_DESCRIPTIONS[u.roleKey]}</span>
                    </span>
                  </button>
                </form>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5 h-fit">
            <h2 className="text-sm font-semibold text-ink mb-1">Sign in with email</h2>
            <p className="text-xs text-ink-muted mb-4">
              Use a seeded account directly, e.g. <code className="text-[11px]">rector@university.edu.pk</code>.
            </p>
            <PasswordLoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
