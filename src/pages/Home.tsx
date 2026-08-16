import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { StatTile } from '@/components/StatTile'
import { BarChart } from '@/components/charts/BarChart'
import { HorizontalBarChart } from '@/components/charts/HorizontalBarChart'
import { StackedBarChart } from '@/components/charts/StackedBarChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Period = 'today' | 'week' | 'month'

const periods: { key: Period; label: string; days: number }[] = [
  { key: 'today', label: 'Hoy', days: 1 },
  { key: 'week', label: 'Semana', days: 7 },
  { key: 'month', label: 'Mes', days: 30 },
]

// Validated categorical slots (dataviz skill's documented default
// palette) — our brand hues don't have four distinct, chart-safe tones
// for payment-method identity, so this borrows the skill's reference
// instance rather than eyeballing brand-adjacent colors.
const methodColor: Record<string, string> = {
  cash: '#2a78d6',
  card: '#eb6834',
  transfer: '#1baf7a',
  credit: '#eda100',
}
const methodLabel: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
}

function startOfDay(d: Date) {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function Home() {
  const { profile } = useAuth()
  const [period, setPeriod] = useState<Period>('week')
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState<{ id: string; total: number; discount_amount: number; created_at: string }[]>(
    [],
  )
  const [topProducts, setTopProducts] = useState<{ label: string; value: number }[]>([])
  const [methodTotals, setMethodTotals] = useState<Record<string, number>>({})
  const [receivables, setReceivables] = useState(0)

  const days = periods.find((p) => p.key === period)!.days
  const periodStart = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1))
    return startOfDay(d)
  }, [days])
  const previousPeriodStart = useMemo(() => {
    const d = new Date(periodStart)
    d.setDate(d.getDate() - days)
    return d
  }, [periodStart, days])

  useEffect(() => {
    setLoading(true)
    supabase
      .from('sales')
      .select('id, total, discount_amount, created_at')
      .is('voided_at', null)
      .gte('created_at', previousPeriodStart.toISOString())
      .then(async ({ data }) => {
        const allSales = data ?? []
        setSales(allSales)

        const currentIds = allSales
          .filter((s) => new Date(s.created_at) >= periodStart)
          .map((s) => s.id)

        if (currentIds.length === 0) {
          setTopProducts([])
          setMethodTotals({})
          setLoading(false)
          return
        }

        const [{ data: items }, { data: payments }] = await Promise.all([
          supabase
            .from('sale_items')
            .select('quantity, unit_price, product:products(name)')
            .in('sale_id', currentIds),
          supabase.from('sale_payments').select('method, amount').in('sale_id', currentIds),
        ])

        const byProduct = new Map<string, number>()
        for (const item of items ?? []) {
          const name = Array.isArray(item.product) ? item.product[0]?.name : item.product?.name
          if (!name) continue
          byProduct.set(name, (byProduct.get(name) ?? 0) + item.quantity * item.unit_price)
        }
        const ranked = [...byProduct.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([label, value]) => ({ label, value }))
        setTopProducts(ranked)

        const byMethod: Record<string, number> = {}
        for (const p of payments ?? []) {
          byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount
        }
        setMethodTotals(byMethod)
        setLoading(false)
      })

    supabase
      .from('sales')
      .select('client_id, sale_payments(method, amount)')
      .not('client_id', 'is', null)
      .is('voided_at', null)
      .then(async ({ data: creditSales }) => {
        const owed = (creditSales ?? []).reduce(
          (sum, s) =>
            sum + s.sale_payments.filter((p) => p.method === 'credit').reduce((a, p) => a + p.amount, 0),
          0,
        )
        const { data: collections } = await supabase.from('collections').select('amount')
        const collected = (collections ?? []).reduce((sum, c) => sum + c.amount, 0)
        setReceivables(Math.max(0, owed - collected))
      })
  }, [periodStart, previousPeriodStart])

  const currentSales = sales.filter((s) => new Date(s.created_at) >= periodStart)
  const previousSales = sales.filter((s) => new Date(s.created_at) < periodStart)

  const currentTotal = currentSales.reduce((sum, s) => sum + (s.total - s.discount_amount), 0)
  const previousTotal = previousSales.reduce((sum, s) => sum + (s.total - s.discount_amount), 0)
  const deltaPct = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null

  const avgTicket = currentSales.length > 0 ? currentTotal / currentSales.length : 0

  const dailyData = useMemo(() => {
    const byDay = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date(periodStart)
      d.setDate(d.getDate() + i)
      byDay.set(d.toDateString(), 0)
    }
    for (const s of currentSales) {
      const key = new Date(s.created_at).toDateString()
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + (s.total - s.discount_amount))
    }
    return [...byDay.entries()].map(([key, value]) => ({
      label: new Date(key).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
      value,
    }))
  }, [currentSales, periodStart, days])

  const paymentSegments = Object.entries(methodTotals).map(([method, value]) => ({
    label: methodLabel[method] ?? method,
    value,
    color: methodColor[method] ?? '#999',
  }))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 style={{ fontFamily: 'var(--font-heading)' }} className="text-2xl font-semibold">
          Bienvenido
        </h1>
        {profile && (
          <p className="text-sm text-muted-foreground">
            Rol: {profile.roleName ?? 'sin asignar'}
            {profile.branchNames.length > 0 && ` · ${profile.branchNames.join(', ')}`}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {periods.map((p) => (
          <Button
            key={p.key}
            type="button"
            variant={period === p.key ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Ventas del periodo" value={currentTotal} deltaPct={deltaPct} />
        <StatTile label="Ticket promedio" value={avgTicket} />
        <StatTile label="Cuentas por cobrar" value={receivables} deltaGoodDirection="down" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas por día</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Cargando…</p> : <BarChart data={dailyData} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Productos más vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Cargando…</p>
            ) : (
              <HorizontalBarChart data={topProducts} valuePrefix="$" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Métodos de pago</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Cargando…</p>
            ) : (
              <StackedBarChart segments={paymentSegments} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
