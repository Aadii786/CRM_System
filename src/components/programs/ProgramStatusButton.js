"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import { setProgramStatusAction } from "@/actions/programs";
import { useToast } from "@/components/ui/Toast";

export default function ProgramStatusButton({ program }) {
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();
  const archiving = program.status === "Active";

  function toggle() {
    if (archiving && !window.confirm("Archive this program? It stays on existing records but can no longer be picked for new ones.")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", program.id);
      fd.set("status", archiving ? "Archived" : "Active");
      const result = await setProgramStatusAction(fd);
      if (result?.error) push(result.error, { type: "error" });
      else {
        push(archiving ? "Program archived." : "Program reactivated.");
        router.refresh();
      }
    });
  }

  return (
    <Button variant="secondary" icon={archiving ? Archive : RotateCcw} loading={isPending} onClick={toggle}>
      {archiving ? "Archive" : "Reactivate"}
    </Button>
  );
}
