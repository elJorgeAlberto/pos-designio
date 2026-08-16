type Segment = { label: string; value: number; color: string }

// Part-to-whole -> stacked bar per the dataviz skill (donut stays
// deprioritized). Categorical colors here are the skill's validated
// default slots (not our brand hues — our brand palette doesn't have
// enough distinct, chart-safe hues for 4 categorical series; see
// PaymentMethodsCard). Legend carries the labels/values as text tokens,
// satisfying the contrast relief for the lighter segments.
export function StackedBarChart({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const active = segments.filter((s) => s.value > 0)

  if (total <= 0) {
    return <p className="text-sm text-muted-foreground">Sin datos en este periodo.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-sm bg-steel/20">
        {active.map((s, i) => (
          <div
            key={i}
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            title={`${s.label}: $${s.value.toFixed(2)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {active.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-foreground">{s.label}</span>
            <span className="tabular-nums text-muted-foreground">
              ${s.value.toFixed(2)} ({((s.value / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
