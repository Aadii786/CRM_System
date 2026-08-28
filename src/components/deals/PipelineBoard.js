import DealCard from "./DealCard";
import { formatCurrencyPKR } from "@/lib/utils/format";

export default function PipelineBoard({ pipeline, byStage }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1">
      {pipeline.stages.map((stage) => {
        const deals = byStage[stage.id] || [];
        const stageValue = deals.reduce((sum, d) => sum + Number(d.value), 0);
        return (
          <div key={stage.id} className="flex flex-col w-72 shrink-0">
            <div className="flex items-center justify-between px-1 mb-2.5">
              <h3 className="text-sm font-semibold text-ink truncate">{stage.name}</h3>
              <span className="text-xs text-ink-muted shrink-0 ml-2">{deals.length}</span>
            </div>
            <p className="px-1 text-xs text-ink-muted mb-2.5">{formatCurrencyPKR(stageValue)}</p>
            <div className="flex flex-col gap-2.5 min-h-[80px] rounded-lg bg-surface-alt/60 p-2">
              {deals.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-6">No deals</p>
              ) : (
                deals.map((deal) => <DealCard key={deal.id} deal={deal} stages={pipeline.stages} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
