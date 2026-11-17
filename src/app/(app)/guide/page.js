import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import { guideKeyFor } from "@/lib/utils/guideKey";
import { ROLES, GLOSSARY } from "@/lib/constants/guide";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import TourButton from "@/components/layout/TourButton";

export const metadata = { title: "Guide" };

export default async function GuidePage() {
  const user = await requireUser();
  const mine = guideKeyFor(user);
  const order = [mine, ...Object.keys(ROLES).filter((k) => k !== mine)];

  return (
    <div>
      <PageHeader title="How to use the CRM" description="What each part is for, step by step, for every role. Your own role is first." actions={<TourButton />} />

      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-ink mb-2">The whole system in one minute</h3>
        <ol className="list-decimal pl-5 text-sm text-ink-secondary flex flex-col gap-1.5">
          <li><strong>Leads come in</strong> from the website forms, Excel imports or by hand, and become contacts and companies.</li>
          <li><strong>Sales works them</strong>: inquiries, proposals (approved by the Head), invoice references and payments.</li>
          <li><strong>Programs and batches</strong> are the catalogue. People are registered, attend, complete (becoming alumni) and give feedback.</li>
          <li><strong>Marketing keeps in touch</strong> with email and WhatsApp campaigns and automations that follow up by themselves.</li>
          <li><strong>The Head and the Rector</strong> watch dashboards and reports. Everyone sees only what their role allows.</li>
        </ol>
      </Card>

      {order.map((key) => (
        <section key={key} className="mb-6">
          <h2 className="text-base font-semibold text-ink">{ROLES[key].label}{key === mine ? " (you)" : ""}</h2>
          <p className="text-sm text-ink-muted mb-3">{ROLES[key].intro}</p>
          <div className="grid md:grid-cols-2 gap-3">
            {ROLES[key].steps.map((s, i) => (
              <Card key={s.title} padding="sm">
                <p className="text-sm font-medium text-ink">{i + 1}. {s.title}</p>
                <p className="text-sm text-ink-secondary mt-1">{s.body}</p>
                {key === mine && s.href && <Link href={s.href} className="text-sm text-primary hover:underline mt-1.5 inline-block">Open</Link>}
              </Card>
            ))}
          </div>
        </section>
      ))}

      <section className="mb-6">
        <h2 className="text-base font-semibold text-ink mb-3">What the words mean</h2>
        <Card padding="none">
          <dl className="divide-y divide-border">
            {GLOSSARY.map(([term, meaning]) => (
              <div key={term} className="grid sm:grid-cols-[11rem_1fr] gap-1 sm:gap-4 px-4 py-2.5 text-sm">
                <dt className="font-medium text-ink">{term}</dt>
                <dd className="text-ink-secondary">{meaning}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>
    </div>
  );
}
