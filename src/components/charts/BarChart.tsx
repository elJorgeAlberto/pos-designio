import { useId, useState } from 'react'

type BarDatum = { label: string; value: number }

// Single-series magnitude chart — one hue (our brand primary) per the
// dataviz skill's form heuristic ("compare magnitude" -> bar, sequential
// color). Direct value labels ride every bar since our data volume here
// is small (a handful of days/products), satisfying the accessibility
// "visible labels" relief without a separate table-view toggle.
export function BarChart({ data, valuePrefix = '$' }: { data: BarDatum[]; valuePrefix?: string }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const gradientId = useId()
  const max = Math.max(1, ...data.map((d) => d.value))
  const height = 160
  const barWidth = 24
  const gap = 16

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos en este periodo.</p>
  }

  const width = data.length * (barWidth + gap)

  return (
    <div className="w-full overflow-x-auto">
      <svg
        role="img"
        aria-label="Gráfica de barras"
        width={width}
        height={height + 40}
        className="min-w-full"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--azafran)" />
            <stop offset="100%" stopColor="var(--azafran)" stopOpacity="0.75" />
          </linearGradient>
        </defs>
        <line
          x1={0}
          y1={height}
          x2={width}
          y2={height}
          stroke="var(--steel)"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const barHeight = Math.max(2, (d.value / max) * (height - 24))
          const x = i * (barWidth + gap) + gap / 2
          const y = height - barHeight
          const isHovered = hovered === i
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={`url(#${gradientId})`}
                opacity={isHovered ? 1 : 0.9}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={11}
                fill="var(--graphite)"
                fontFamily="var(--font-sans)"
              >
                {isHovered
                  ? `${valuePrefix}${d.value.toFixed(2)}`
                  : d.value > 0
                    ? `${valuePrefix}${Math.round(d.value)}`
                    : ''}
              </text>
              <text
                x={x + barWidth / 2}
                y={height + 16}
                textAnchor="middle"
                fontSize={11}
                fill="var(--smoke)"
                fontFamily="var(--font-sans)"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
