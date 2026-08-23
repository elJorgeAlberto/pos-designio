import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

export function StatTile({
  label,
  value,
  deltaPct,
  deltaGoodDirection = 'up',
  isCurrency = true,
  suffix,
  onClick,
}: {
  label: string
  value: number
  deltaPct?: number | null
  deltaGoodDirection?: 'up' | 'down'
  isCurrency?: boolean
  suffix?: string
  onClick?: () => void
}) {
  const hasDelta = deltaPct != null && Number.isFinite(deltaPct)
  const isUp = hasDelta && deltaPct! >= 0
  const isGood = hasDelta && (deltaGoodDirection === 'up' ? isUp : !isUp)

  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick()
      }}
      className={onClick ? 'transition-colors hover:border-primary' : ''}
    >
      <CardContent className="flex items-center justify-between gap-2 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-h2 tabular-nums">
            {isCurrency ? formatCompact(value) : value.toLocaleString('es-MX')}
            {suffix}
          </span>
          {hasDelta && (
            <span
              className={`flex items-center gap-1 text-xs font-medium ${isGood ? 'text-success' : 'text-destructive'}`}
            >
              {isUp ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {Math.abs(deltaPct!).toFixed(0)}% vs periodo anterior
            </span>
          )}
        </div>
        {onClick && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
      </CardContent>
    </Card>
  )
}
