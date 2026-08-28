import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function PageHeader({ breadcrumbs, title, description, actions }) {
  return (
    <div className="mb-5">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {description && <p className="text-sm text-ink-muted mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
