import { redirect } from "next/navigation";
import { GraduationCap, Users, LineChart, ShieldCheck, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/authService";
import { loginDemoUsers } from "@/lib/constants/demoUsers";
import { demoLoginAction } from "@/actions/auth";
import PasswordLoginForm from "@/components/auth/PasswordLoginForm";

const HIGHLIGHTS = [
  { icon: Users, label: "Leads, clients, programs and registrations in one place" },
  { icon: LineChart, label: "Pipeline, proposals, invoices and live dashboards" },
  { icon: ShieldCheck, label: "Each person sees only what their role allows" },
];

// Which demo logins appear is decided in constants/demoUsers.js (loginDemoUsers).
const GROUPS = [
  { key: "university", title: "University leadership" },
  { key: "ikl-hsm", title: "IKL department" },
  { key: "marketing", title: "Marketing department" },
  { key: "admissions", title: "Admissions - the newer department template" },
];

function DemoUserButton({ user: u }) {
  return (
    <form action={demoLoginAction}>
      <input type="hidden" name="demoKey" value={u.key} />
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
            {u.isHead && (
              <span className="shrink-0 rounded-full bg-primary-subtle px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-active">
                Head
              </span>
            )}
          </span>
          <span className="block text-xs text-ink-muted truncate">{u.loginRole || u.jobTitle}</span>
          <span className="block text-[11px] text-ink-muted mt-0.5">{u.loginDescription || u.description}</span>
        </span>
      </button>
    </form>
  );
}

export default async function LoginPage() {
  const existing = await getCurrentUser();
  if (existing) redirect("/dashboard");
  const demoUsers = loginDemoUsers();

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
            <Sparkles className="size-3.5" /> One CRM for every department
          </span>
          <h1 className="text-3xl font-semibold leading-tight text-balance">
            Every department, every deal, every contact — one connected CRM.
          </h1>
          <p className="mt-3 text-sm text-indigo-100/80 leading-relaxed">
            The university&apos;s centralized CRM. IKL is the first department live: leads, programs, proposals, invoices and email campaigns.
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
            <h3 className="text-sm font-semibold text-ink mb-1">Choose your role</h3>
            <p className="text-xs text-ink-muted mb-4">
              One click signs you in. The menu and dashboards change with the role, so you can see what each person in the department sees.
            </p>

            {GROUPS.map((g) => {
              const members = demoUsers.filter((u) => u.departmentKey === g.key);
              if (!members.length) return null;
              return (
                <div key={g.key} className="mb-5 last:mb-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted mb-2">{g.title}</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {members.map((u) => <DemoUserButton key={u.key} user={u} />)}
                  </div>
                </div>
              );
            })}
          </div>

          <details className="group rounded-2xl border border-border bg-surface shadow-lg shadow-black/[0.03] p-5 sm:p-6">
            <summary className="cursor-pointer select-none text-sm font-medium text-ink-secondary hover:text-ink focus-ring rounded">
              Staff sign-in with email and password
            </summary>
            <div className="mt-4">
              <PasswordLoginForm />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
