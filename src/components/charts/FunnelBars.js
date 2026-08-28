// A deliberately simple, highly readable funnel: horizontal bars scaled to
// the first stage, with the raw count and conversion % from the previous
// stage labeled on each row. Built with plain markup rather than a charting
// library's Funnel primitive because at this shape (linear conversion path,
// requirements #12/#41 funnel), a bar list reads more clearly than a wedge.
export default function FunnelBars({ stages }) {
  const max = stages[0]?.value || 1;
  return (
    <div className="flex flex-col gap-3">
      {stages.map((stage, i) => {
        const pct = Math.round((stage.value / max) * 100);
        const prevValue = i > 0 ? stages[i - 1].value : null;
        const stepRate = prevValue ? Math.round((stage.value / prevValue) * 100) : null;
        return (
          <div key={stage.label}>
            <div className="flex items-baseline justify-between text-sm mb-1">
              <span className="font-medium text-ink">{stage.label}</span>
              <span className="text-ink-muted tabular-nums">
                {stage.value.toLocaleString()}
                {stepRate != null && <span className="ml-2 text-xs">({stepRate}% from previous)</span>}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-surface-alt overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(pct, 3)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
