"use client";

import { PlayCircle } from "lucide-react";
import Button from "@/components/ui/Button";

/** Opens the welcome tour again (the tour listens for this event). */
export default function TourButton() {
  return <Button variant="secondary" icon={PlayCircle} onClick={() => window.dispatchEvent(new Event("crm:open-tour"))}>Take the tour</Button>;
}
