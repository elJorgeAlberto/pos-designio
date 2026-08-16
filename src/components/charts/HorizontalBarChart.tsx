type Datum = { label: string; value: number }

// Ranked magnitude comparison with long category names -> horizontal bar,
// one hue, per the dataviz skill. Direct label at the tip of every bar.
export function HorizontalBarChart({
  data,
  valuePrefix = '',
  valueSuffix = '',
}: {
  data: Datum[]
  valuePrefix?: string
  valueSuffix?: string
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos en este periodo.</p>
  }

  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="flex flex-col gap-3">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="truncate font-medium">{d.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {valuePrefix}
              {d.value.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
              {valueSuffix}
            </span>
          </div>
          <div className="h-3 w-full bg-steel/30">
            <div
              className="h-3 rounded-r-[4px] bg-azafran transition-[width]"
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
