"use client";

import { useState, useTransition, useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle, CheckSquare, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Field, { Input, Textarea, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { sendDemoEmailAction, sendDemoWhatsappAction } from "@/actions/engagement";
import { createTaskAction } from "@/actions/tasks";
import LogCallButton from "@/components/common/LogCallButton";
import ConvertToOpportunityButton from "@/components/contacts/ConvertToOpportunityButton";

export default function ContactHeaderActions({ contact, canEdit, canConvert, canTask = false, canLog = false, canMessage = false, programs = [] }) {
  const { push } = useToast();
  const [waOpen, setWaOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSendEmail() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("contactId", contact.id);
      await sendDemoEmailAction(fd);
      push(`Demo email sent to ${contact.firstName} ${contact.lastName}. Lead score updated.`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canConvert && <ConvertToOpportunityButton contact={contact} programs={programs} />}
      {canEdit && (
        <Button href={`/contacts/${contact.id}/edit`} variant="secondary" icon={Pencil}>
          Edit
        </Button>
      )}
      {canTask && (
        <Button variant="secondary" icon={CheckSquare} onClick={() => setTaskOpen(true)}>
          Add Task
        </Button>
      )}
      {canLog && <LogCallButton contactId={contact.id} revalidatePathValue={`/contacts/${contact.id}`} />}
      {canLog && (
        <Button variant="secondary" icon={Mail} onClick={handleSendEmail} loading={isPending}>
          Send Email
        </Button>
      )}
      {canMessage && (
        <Button variant="primary" icon={MessageCircle} onClick={() => setWaOpen(true)}>
          WhatsApp
        </Button>
      )}

      <WhatsappModal contact={contact} open={waOpen} onClose={() => setWaOpen(false)} />
      <TaskModal contact={contact} open={taskOpen} onClose={() => setTaskOpen(false)} />
    </div>
  );
}

function WhatsappModal({ contact, open, onClose }) {
  const { push } = useToast();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [message, setMessage] = useState(
    `Hi ${contact.firstName}, following up on your interest in our programs - happy to answer any questions!`
  );

  function send() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("contactId", contact.id);
      fd.set("body", message);
      await sendDemoWhatsappAction(fd);
      push("WhatsApp message sent (demo). Added to the conversation.");
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Send WhatsApp Message" description={`To ${contact.firstName} ${contact.lastName} - ${contact.whatsappNumber || contact.phone || "no number on file"}`}>
      <Field label="Message" htmlFor="wa-body">
        <Textarea id="wa-body" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={MessageCircle} loading={isPending} onClick={send}>Send</Button>
      </div>
    </Modal>
  );
}

const taskInitialState = { error: null };

function TaskModal({ contact, open, onClose }) {
  const { push } = useToast();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createTaskAction, taskInitialState);

  useEffect(() => {
    if (state?.success) {
      push("Task created.");
      onClose();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title="Add Task" description={`Related to ${contact.firstName} ${contact.lastName}`}>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="contactId" value={contact.id} />
        <Field label="Title" htmlFor="task-title" required>
          <Input id="task-title" name="title" required autoFocus />
        </Field>
        <Field label="Description" htmlFor="task-description">
          <Textarea id="task-description" name="description" rows={3} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due Date" htmlFor="task-due">
            <Input id="task-due" name="dueDate" type="date" />
          </Field>
          <Field label="Priority" htmlFor="task-priority">
            <Select id="task-priority" name="priority" defaultValue="Medium">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Urgent</option>
            </Select>
          </Field>
        </div>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={pending}>
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
