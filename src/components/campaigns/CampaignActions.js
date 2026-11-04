"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { sendCampaignAction, updateCampaignStatusAction, simulateEngagementAction } from "@/actions/campaigns";

export default function CampaignActions({ campaign, canSend, simulated = false }) {
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function send() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", campaign.id);
      const result = await sendCampaignAction(fd);
      if (result?.error) {
        push(result.error, { type: "error" });
        router.refresh();
        return;
      }
      const skipped = result.excluded ? ` ${result.excluded.toLocaleString()} skipped (unsubscribed, bounced or opted out).` : "";
      push(
        result.done
          ? `${result.simulated ? "Sent in demo mode (no real email left the system)." : "Campaign sent."}${skipped}`
          : `Sending started: ${result.sent.toLocaleString()} sent, ${result.remaining.toLocaleString()} still to go. The scheduler finishes the rest.${skipped}`
      );
      router.refresh();
    });
  }

  function setStatus(status, message) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", campaign.id);
      fd.set("status", status);
      const result = await updateCampaignStatusAction(fd);
      if (result?.error) push(result.error, { type: "error" });
      else push(message);
      router.refresh();
    });
  }

  function simulate() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", campaign.id);
      const result = await simulateEngagementAction(fd);
      if (result?.error) push(result.error, { type: "error" });
      else push(`Demo: ${result.events.toLocaleString()} open / click / unsubscribe events recorded.`);
      router.refresh();
    });
  }

  if (!canSend) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {["Draft", "Scheduled"].includes(campaign.status) && (
        <Button variant="primary" icon={Send} loading={isPending} onClick={send}>Send Now</Button>
      )}
      {campaign.status === "Scheduled" && (
        <Button variant="secondary" icon={Pause} loading={isPending} onClick={() => setStatus("Paused", "Campaign paused.")}>Pause</Button>
      )}
      {campaign.status === "Paused" && (
        <>
          <Button variant="primary" icon={Send} loading={isPending} onClick={send}>Send Now</Button>
          <Button variant="secondary" icon={Play} loading={isPending} onClick={() => setStatus("Scheduled", "Campaign resumed.")}>Resume schedule</Button>
        </>
      )}
      {campaign.status === "Sending" && (
        <Button variant="primary" icon={Send} loading={isPending} onClick={send}>Continue sending</Button>
      )}
      {campaign.status === "Failed" && (
        <Button variant="secondary" icon={RotateCcw} loading={isPending} onClick={() => setStatus("Draft", "Back to draft. Fix the problem, then send again.")}>Back to draft</Button>
      )}
      {simulated && ["Sent", "Sending"].includes(campaign.status) && (
        <Button variant="secondary" icon={Sparkles} loading={isPending} onClick={simulate} title="Demo only: creates opens and clicks through the real tracking path">Simulate engagement (demo)</Button>
      )}
    </div>
  );
}
