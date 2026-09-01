import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import StageMoveSelect from "./StageMoveSelect";
import { formatCurrencyPKR, formatDate } from "@/lib/utils/format";

export default function DealCard({ deal, stages, onMoved, canMove, indent }) {
  return (
    <div className={["rounded-lg border border-border bg-surface p-3.5 hover:border-primary-border hover:shadow-sm transition-all", indent ? "pl-6" : ""].join(" ")}>
      <Link href={`/deals/${deal.id}`} className="block">
        {deal.referenceNumber && <p className="text-[11px] font-mono text-ink-muted mb-0.5">{deal.referenceNumber}</p>}
        <p className="text-sm font-medium text-ink mb-1 line-clamp-2">{deal.name}</p>
        <p className="text-xs text-ink-muted mb-2.5">{deal.Company?.name || "—"}</p>

        <div className="flex items-center justify-between mb-2.5">
          <span className="text-sm font-semibold text-ink tabular-nums">{formatCurrencyPKR(deal.value)}</span>
          {deal.trainingType && <Badge tone="neutral">{deal.trainingType}</Badge>}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-muted">{deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : "No close date"}</span>
          {deal.owner && <Avatar name={deal.owner.name} color={deal.owner.avatarColor} size="xs" />}
        </div>
      </Link>

      <div className="mt-2.5 pt-2.5 border-t border-border">
        {canMove ? (
          <StageMoveSelect dealId={deal.id} currentStageId={deal.stageId} stages={stages} onMoved={onMoved} />
        ) : (
          <Badge tone="neutral">{stages.find((s) => s.id === deal.stageId)?.name}</Badge>
        )}
      </div>
    </div>
  );
}
