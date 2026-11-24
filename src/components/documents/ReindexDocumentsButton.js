"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { reindexDocumentsAction } from "@/actions/documents";

/** Reads the text of documents uploaded before document search existed, so they can be found by their content. */
export default function ReindexDocumentsButton({ waiting }) {
  const [pending, start] = useTransition();
  const { push } = useToast();
  const router = useRouter();
  return (
    <Button size="sm" variant="secondary" loading={pending} onClick={() => start(async () => {
      const res = await reindexDocumentsAction();
      if (res?.error) { push(res.error, { type: "error" }); return; }
      push(`Read ${res.checked} document${res.checked === 1 ? "" : "s"}: ${res.indexed} with text, ${res.empty} without text${res.missing ? `, ${res.missing} file(s) missing` : ""}.`);
      router.refresh();
    })}>
      Read {waiting} document{waiting === 1 ? "" : "s"} for search
    </Button>
  );
}
