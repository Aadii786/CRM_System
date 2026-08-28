import { FileQuestion } from "lucide-react";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-bg">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-alt text-ink-muted mb-5 border border-border">
        <FileQuestion className="size-7" />
      </span>
      <p className="text-sm font-semibold text-primary mb-1">404</p>
      <h1 className="text-xl font-semibold text-ink mb-2">Page Not Found</h1>
      <p className="text-sm text-ink-muted max-w-sm mb-6">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Button href="/dashboard" variant="primary">
        Back to Dashboard
      </Button>
    </div>
  );
}
