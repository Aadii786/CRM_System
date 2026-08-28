import { ShieldAlert } from "lucide-react";
import Button from "@/components/ui/Button";

export const metadata = { title: "Access Restricted" };

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-bg">
      <span className="flex size-14 items-center justify-center rounded-full bg-danger-subtle text-danger mb-5">
        <ShieldAlert className="size-7" />
      </span>
      <p className="text-sm font-semibold text-danger mb-1">403</p>
      <h1 className="text-xl font-semibold text-ink mb-2">Access Restricted</h1>
      <p className="text-sm text-ink-muted max-w-sm mb-6">
        You don&apos;t have permission to access this resource. If you believe this is a mistake, contact your Central CRM Administrator.
      </p>
      <Button href="/dashboard" variant="primary">
        Go to Dashboard
      </Button>
    </div>
  );
}
