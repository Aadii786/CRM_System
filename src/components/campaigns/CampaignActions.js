"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Pause, Play } from "lucide-react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { sendCampaignAction, updateCampaignStatusAction } from "@/actions/campaigns";

export default function CampaignActions({ campaign, canSend }) {
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function send() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", campaign.id);
      await sendCampaignAction(fd);
      push("Campaign sent (demo). Engagement metrics updated.");
      router.refresh();
    });
  }

  function toggleStatus() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", campaign.id);
      fd.set("status", campaign.status === "Paused" ? "Scheduled" : "Paused");
      await updateCampaignStatusAction(fd);
      push(campaign.status === "Paused" ? "Campaign resumed." : "Campaign paused.");
      router.refresh();
    });
  }

  if (!canSend) return null;

  if (["Draft", "Scheduled"].includes(campaign.status)) {
    return (
      <Button variant="primary" icon={Send} loading={isPending} onClick={send}>
        Send Now
      </Button>
    );
  }
  if (["Scheduled", "Paused"].includes(campaign.status)) {
    return (
      <Button variant="secondary" icon={campaign.status === "Paused" ? Play : Pause} loading={isPending} onClick={toggleStatus}>
        {campaign.status === "Paused" ? "Resume" : "Pause"}
      </Button>
    );
  }
  return null;
}
