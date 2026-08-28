import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getMeetings } from "@/lib/services/meetingService";
import PageHeader from "@/components/common/PageHeader";
import Tabs from "@/components/ui/Tabs";
import MeetingsList from "@/components/meetings/MeetingsList";
import NewMeetingButton from "@/components/meetings/NewMeetingButton";

export const metadata = { title: "Meetings" };

export default async function MeetingsPage() {
  const user = await requireUserWithPermission("meetings.view");
  const [upcomingRaw, completedRaw] = await Promise.all([
    getMeetings(user, { upcoming: true }),
    getMeetings(user, { upcoming: false }),
  ]);
  const upcoming = upcomingRaw.map((m) => m.get({ plain: true }));
  const completed = completedRaw.map((m) => m.get({ plain: true }));

  return (
    <div>
      <PageHeader
        title="Meetings"
        description="Calendar of upcoming and past meetings across every deal and contact."
        actions={hasPermission(user, "meetings.create") && <NewMeetingButton />}
      />
      <Tabs tabs={[{ key: "upcoming", label: "Upcoming", count: upcoming.length }, { key: "past", label: "Completed", count: completed.length }]}>
        <MeetingsList meetings={upcoming} showComplete />
        <MeetingsList meetings={completed} />
      </Tabs>
    </div>
  );
}
