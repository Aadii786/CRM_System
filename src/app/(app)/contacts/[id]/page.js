import { notFound } from "next/navigation";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getContactById, getContactTimeline, getContactRelated, getContactProposals } from "@/lib/services/contactService";
import { listDocuments } from "@/lib/services/documentService";
import { listNotes } from "@/lib/services/noteService";
import NotesPanel from "@/components/common/NotesPanel";
import ContactProgramsPanel from "@/components/contacts/ContactProgramsPanel";
import ContactProposals from "@/components/contacts/ContactProposals";
import { listContactInterests, listContactOrganizations, listProgramOptions } from "@/lib/services/programService";
import { listCompanyOptions } from "@/lib/services/companyService";
import { getContactProgramHistory } from "@/lib/services/registrationService";
import ProgramHistory from "@/components/programs/ProgramHistory";
import PageHeader from "@/components/common/PageHeader";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import Avatar from "@/components/ui/Avatar";
import ContactHeaderActions from "@/components/contacts/ContactHeaderActions";
import ContactOverview from "@/components/contacts/ContactOverview";
import ContactEngagement from "@/components/contacts/ContactEngagement";
import ContactTimeline from "@/components/contacts/ContactTimeline";
import ContactRelated from "@/components/contacts/ContactRelated";
import DocumentsPanel from "@/components/documents/DocumentsPanel";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Contact ${id}` };
}

export default async function ContactDetailPage({ params }) {
  const user = await requireUserWithPermission("contacts.view");
  const { id } = await params;

  const contactRaw = await getContactById(user, id);
  if (!contactRaw) notFound();
  const contact = contactRaw.get({ plain: true });

  const canSeePrograms = hasPermission(user, "programs.view");
  const [interests, organizations, programOptions, companyOptions, programHistory] = await Promise.all([
    canSeePrograms ? listContactInterests(user, id) : Promise.resolve([]),
    canSeePrograms ? listContactOrganizations(user, id) : Promise.resolve([]),
    canSeePrograms ? listProgramOptions(user) : Promise.resolve([]),
    canSeePrograms && hasPermission(user, "companies.view") ? listCompanyOptions(user) : Promise.resolve([]),
    canSeePrograms ? getContactProgramHistory(user, id) : Promise.resolve({ registrations: [], inhouse: [], inquiries: [] }),
  ]);
  const [notesRaw, timelineRaw, related, documentsRaw, proposals] = await Promise.all([
    listNotes(user, "contact", id),
    getContactTimeline(user, id),
    getContactRelated(user, id),
    listDocuments(user, "contact", id),
    hasPermission(user, "deals.view") ? getContactProposals(user, id) : Promise.resolve([]),
  ]);
  const notes = notesRaw.map((n) => n.get({ plain: true }));
  const timeline = timelineRaw.map((a) => a.get({ plain: true }));
  const deals = related.deals.map((d) => d.get({ plain: true }));
  const tasks = related.tasks.map((t) => t.get({ plain: true }));
  const meetings = related.meetings.map((m) => m.get({ plain: true }));
  const campaignRecipients = related.campaignRecipients.map((r) => r.get({ plain: true }));
  const conversation = related.conversation ? related.conversation.get({ plain: true }) : null;
  const documents = documentsRaw.map((d) => d.get({ plain: true }));

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: "Contacts", href: "/contacts" }, { label: `${contact.firstName} ${contact.lastName}` }]} />

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <Avatar name={`${contact.firstName} ${contact.lastName}`} size="lg" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-ink">{contact.firstName} {contact.lastName}</h1>
              <Badge status={contact.status} />
              {contact.isParticipant && <Badge tone="teal">Participant</Badge>}
              {contact.isAlumnus && <Badge tone="purple">Alumnus</Badge>}
              {!contact.isParticipant && !contact.isAlumnus && ["Lead", "Prospect"].includes(contact.contactType) && <Badge tone="neutral">{contact.contactType}</Badge>}
            </div>
            <p className="text-sm text-ink-muted mt-0.5">
              {contact.jobTitle ? `${contact.jobTitle} · ` : ""}{contact.email}
              {contact.Company && ` · ${contact.Company.name}`}
            </p>
          </div>
        </div>
        <ContactHeaderActions contact={contact} canEdit={hasPermission(user, "contacts.update")} canConvert={hasPermission(user, "deals.create")} canTask={hasPermission(user, "tasks.create")} canLog={hasPermission(user, "contacts.update")} canMessage={hasPermission(user, "conversations.reply")} programs={programOptions} />
      </div>

      <Tabs
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "notes", label: "Notes", count: notes.length },
          ...(canSeePrograms ? [{ key: "programs", label: "Proposals & Programs", count: interests.length + proposals.length + programHistory.registrations.length + programHistory.inhouse.length + programHistory.inquiries.length }] : []),
          { key: "engagement", label: "Engagement" },
          { key: "timeline", label: "Timeline", count: timeline.length },
          { key: "related", label: "Related" },
          { key: "documents", label: "Documents", count: documents.length },
        ]}
      >
        <ContactOverview contact={contact} />
        <NotesPanel relatedType="contact" relatedId={contact.id} notes={notes} canAdd={hasPermission(user, "contacts.update")} />
        {canSeePrograms && (
          <div className="flex flex-col gap-6">
            <ContactProgramsPanel
              contact={contact}
              interests={interests}
              programs={programOptions}
              organizations={organizations}
              companies={companyOptions}
              canEdit={hasPermission(user, "contacts.update")}
            />
            <ContactProposals proposals={proposals} />
            <section>
              <h3 className="text-sm font-semibold text-ink mb-2">Program history</h3>
              <ProgramHistory history={programHistory} />
            </section>
          </div>
        )}
        <ContactEngagement contact={contact} campaignRecipients={campaignRecipients} />
        <ContactTimeline activities={timeline} />
        <ContactRelated deals={deals} tasks={tasks} meetings={meetings} conversation={conversation} />
        <DocumentsPanel
          relatedType="contact"
          relatedId={contact.id}
          documents={documents}
          canManage={hasPermission(user, "contacts.update")}
          revalidatePathValue={`/contacts/${contact.id}`}
        />
      </Tabs>
    </div>
  );
}
