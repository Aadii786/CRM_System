import { redirect } from "next/navigation";
import { GraduationCap, Users, LineChart, ShieldCheck, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/authService";
import { DEMO_USERS } from "@/lib/constants/demoUsers";
import { demoLoginAction } from "@/actions/auth";
import PasswordLoginForm from "@/components/auth/PasswordLoginForm";

const ROLE_DESCRIPTIONS = {
  RECTOR: "University-wide executive dashboard, read-only reports",
  CENTRAL_CRM_ADMINISTRATOR: "Full platform access - users, roles, all data",
  MARKETING_MANAGER: "Heads the Marketing department - contacts, campaigns, segments, automation",
  MARKETING_EXECUTIVE: "Marketing department team member - operational access",
  IKL_HSM_MANAGER: "Heads the IKL/HSM department - companies, deals, training, proposals, invoices",
  IKL_HSM_EXECUTIVE: "IKL/HSM department team member - operational B2B access",
  DEPARTMENT_HEAD: "Runs the Admissions department - team, contacts, reports",
  DEPARTMENT_MARKETING: "Marketing side of Admissions - shares the department's contacts with Sales",
  DEPARTMENT_SALES: "Sales side of Admissions - shares the department's contacts with Marketing",
};

// Manager-tier pilot roles are that department's head in every way that
// matters (full authority, owns the team) - they just predate the
// "Department Head" title the newer generic template (see Admissions
// below) uses. Flagged here purely for a "Head" badge on the login page
// so the parallel is visible at a glance - no role/permission change.
const HEAD_EQUIVALENT_ROLE_KEYS = new Set(["MARKETING_MANAGER", "IKL_HSM_MANAGER", "DEPARTMENT_HEAD"]);

const HIGHLIGHTS = [
  { icon: Users, label: "58,000+ contacts managed" },
  { icon: LineChart, label: "Real-time dashboards" },
  { icon: ShieldCheck, label: "Role & department-aware access" },
];

const UNIVERSITY_DEMO_USERS = DEMO_USERS.filter((u) => u.departmentKey === "university");
const MARKETING_DEMO_USERS = DEMO_USERS.filter((u) => u.departmentKey === "marketing");
const IKL_DEMO_USERS = DEMO_USERS.filter((u) => u.departmentKey === "ikl-hsm");
const DEPARTMENT_DEMO_USERS = DEMO_USERS.filter((u) => u.departmentKey === "admissions");

function DemoUserButton({ user: u }) {
  const isHead = HEAD_EQUIVALENT_ROLE_KEYS.has(u.roleKey);
  return (
    <form action={demoLoginAction}>
      <input type="hidden" name="roleKey" value={u.roleKey} />
      <button
        type="submit"
        className="w-full flex items-start gap-3 rounded-xl border border-border-strong bg-surface p-3 text-left transition-all hover:border-primary-border hover:shadow-md hover:-translate-y-0.5 focus-ring"
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
          style={{ backgroundColor: u.avatarColor }}
        >
          {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="block text-sm font-medium text-ink truncate">{u.name}</span>
            {isHead && (
              <span className="shrink-0 rounded-full bg-primary-subtle px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-active">
                Head
              </span>
            )}
          </span>
          <span className="block text-xs text-ink-muted truncate">{u.jobTitle}</span>
          <span className="block text-[11px] text-ink-muted mt-0.5">{ROLE_DESCRIPTIONS[u.roleKey]}</span>
        </span>
      </button>
    </form>
  );
}

export default async function LoginPage() {
  const existing = await getCurrentUser();
  if (existing) redirect("/dashboard");

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1e1b4b] via-[#2b2470] to-[#3730a3] px-12 py-12 text-white">
        <div className="pointer-events-none absolute -top-32 -right-20 size-96 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 -left-24 size-80 rounded-full bg-purple-500/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute top-1/3 left-1/4 size-40 rounded-full bg-amber-400/10 blur-3xl" aria-hidden="true" />

        <div className="relative flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-white/25 to-white/5 ring-1 ring-white/20">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">University CRM</span>
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100 ring-1 ring-white/15 mb-5">
            <Sparkles className="size-3.5" /> Marketing + B2B CRM, in one platform
          </span>
          <h1 className="text-3xl font-semibold leading-tight text-balance">
            Every department, every deal, every contact — one connected CRM.
          </h1>
          <p className="mt-3 text-sm text-indigo-100/80 leading-relaxed">
            A centralized CRM, marketing automation and B2B (IKL/HSM) demo built around the Brevo evaluation requirements.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {HIGHLIGHTS.map((h) => (
              <div key={h.label} className="flex items-center gap-3 rounded-lg bg-white/5 px-3.5 py-2.5 ring-1 ring-white/10">
                <span className="flex size-8 items-center justify-center rounded-md bg-white/10 shrink-0">
                  <h.icon className="size-4 text-cyan-300" />
                </span>
                <span className="text-sm text-indigo-50">{h.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-indigo-200/60">© {new Date().getFullYear()} University of Management &amp; Technology - Demo Platform</p>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center px-4 py-10 sm:py-16 bg-bg">
        <div className="w-full max-w-lg">
          <div className="flex lg:hidden items-center gap-2.5 justify-center mb-6">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white">
              <GraduationCap className="size-5" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">University CRM</span>
          </div>

          <div className="flex flex-col items-center text-center mb-6">
            <h2 className="text-xl font-semibold text-ink">Welcome back</h2>
            <p className="text-sm text-ink-muted mt-1">Sign in to continue to your dashboard.</p>
            <span className="mt-3 inline-flex items-center rounded-full border border-warning-border bg-warning-subtle px-3 py-1 text-xs font-medium text-warning">
              DEMO ENVIRONMENT - no real emails or messages are ever sent
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-surface shadow-lg shadow-black/[0.03] p-5 sm:p-6 mb-5">
            <h3 className="text-sm font-semibold text-ink mb-1">Sign in as a demo user</h3>
            <p className="text-xs text-ink-muted mb-4">
              One click signs you in - permissions, sidebar and dashboards update instantly per role. Every department here has a head and a team, whatever that department happens to call them.
            </p>

            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted mb-2">University leadership</p>
            <div className="grid gap-2.5 sm:grid-cols-2 mb-5">
              {UNIVERSITY_DEMO_USERS.map((u) => <DemoUserButton key={u.key} user={u} />)}
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted mb-2">Marketing department</p>
            <div className="grid gap-2.5 sm:grid-cols-2 mb-5">
              {MARKETING_DEMO_USERS.map((u) => <DemoUserButton key={u.key} user={u} />)}
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted mb-2">IKL/HSM department</p>
            <div className="grid gap-2.5 sm:grid-cols-2 mb-5">
              {IKL_DEMO_USERS.map((u) => <DemoUserButton key={u.key} user={u} />)}
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted mb-2">Admissions - the newer department template</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {DEPARTMENT_DEMO_USERS.map((u) => <DemoUserButton key={u.key} user={u} />)}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface shadow-lg shadow-black/[0.03] p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-ink mb-1">Sign in with email</h3>
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
