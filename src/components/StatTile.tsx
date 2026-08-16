import { TrendingUp, TrendingDown } from 'lucide-react'
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
}: {
  label: string
  value: number
  deltaPct?: number | null
  deltaGoodDirection?: 'up' | 'down'
  isCurrency?: boolean
}) {
  const hasDelta = deltaPct != null && Number.isFinite(deltaPct)
  const isUp = hasDelta && deltaPct! >= 0
  const isGood = hasDelta && (deltaGoodDirection === 'up' ? isUp : !isUp)

  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          style={{ fontFamily: 'var(--font-heading)' }}
          className="text-2xl font-semibold tabular-nums"
        >
          {isCurrency ? formatCompact(value) : value.toLocaleString('es-MX')}
        </span>
        {hasDelta && (
          <span
            className={`flex items-center gap-1 text-xs font-medium ${isGood ? 'text-success' : 'text-destructive'}`}
          >
            {isUp ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {Math.abs(deltaPct!).toFixed(0)}% vs periodo anterior
          </span>
        )}
      </CardContent>
    </Card>
  )
}
