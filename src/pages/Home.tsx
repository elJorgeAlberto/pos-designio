import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { parseLocalDate } from '@/lib/dates'
import { StatTile } from '@/components/StatTile'
import { BarChart } from '@/components/charts/BarChart'
import { HorizontalBarChart } from '@/components/charts/HorizontalBarChart'
import { StackedBarChart } from '@/components/charts/StackedBarChart'
import { SalesDetailDrawer, type SaleDetailRow } from '@/components/SalesDetailDrawer'
import { ReceivablesDrawer, type ReceivableRow } from '@/components/ReceivablesDrawer'
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

type Detail = 'sales' | 'receivables' | null

export function Home() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('week')
  const [loading, setLoading] = useState(true)
  const [salesDetail, setSalesDetail] = useState<SaleDetailRow[]>([])
  const [previousTotal, setPreviousTotal] = useState(0)
  const [topProducts, setTopProducts] = useState<{ label: string; value: number }[]>([])
  const [methodTotals, setMethodTotals] = useState<Record<string, number>>({})
  const [receivableRows, setReceivableRows] = useState<ReceivableRow[]>([])
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [openDetail, setOpenDetail] = useState<Detail>(null)

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

  function loadData() {
    setLoading(true)
    supabase
      .from('sales')
      .select('id, total, discount_amount, created_at, client:clients(name)')
      .is('voided_at', null)
      .gte('created_at', previousPeriodStart.toISOString())
      .then(async ({ data }) => {
        const allSales = data ?? []
        const currentRaw = allSales.filter((s) => new Date(s.created_at) >= periodStart)
        const previousRaw = allSales.filter((s) => new Date(s.created_at) < periodStart)
        setPreviousTotal(previousRaw.reduce((sum, s) => sum + (s.total - s.discount_amount), 0))

        const currentIds = currentRaw.map((s) => s.id)
        if (currentIds.length === 0) {
          setSalesDetail([])
          setTopProducts([])
          setMethodTotals({})
          setLoading(false)
          return
        }

        const [{ data: items }, { data: payments }] = await Promise.all([
          supabase
            .from('sale_items')
            .select('sale_id, quantity, unit_price, unit_cost, product:products(name)')
            .in('sale_id', currentIds),
          supabase.from('sale_payments').select('sale_id, method, amount').in('sale_id', currentIds),
        ])

        const byProduct = new Map<string, number>()
        const costBySale = new Map<string, number>()
        for (const item of items ?? []) {
          const name = Array.isArray(item.product) ? item.product[0]?.name : item.product?.name
          if (name) byProduct.set(name, (byProduct.get(name) ?? 0) + item.quantity * item.unit_price)
          costBySale.set(item.sale_id, (costBySale.get(item.sale_id) ?? 0) + item.quantity * item.unit_cost)
        }
        setTopProducts(
          [...byProduct.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([label, value]) => ({ label, value })),
        )

        const byMethod: Record<string, number> = {}
        const methodsBySale = new Map<string, string[]>()
        for (const p of payments ?? []) {
          byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount
          methodsBySale.set(p.sale_id, [...(methodsBySale.get(p.sale_id) ?? []), p.method])
        }
        setMethodTotals(byMethod)

        setSalesDetail(
          currentRaw.map((s) => {
            const client = Array.isArray(s.client) ? s.client[0] : s.client
            return {
              id: s.id,
              createdAt: s.created_at,
              total: s.total,
              discount: s.discount_amount,
              cost: costBySale.get(s.id) ?? 0,
              clientName: client?.name ?? null,
              methods: methodsBySale.get(s.id) ?? [],
            }
          }),
        )
        setLoading(false)
      })

    supabase
      .from('debt_commitments')
      .select('client_id, amount, due_date, client:clients(name)')
      .eq('status', 'pending')
      .then(({ data }) => {
        const today = new Date()
        const byClient = new Map<string, { name: string; balance: number; overdue: boolean }>()
        for (const c of data ?? []) {
          const client = Array.isArray(c.client) ? c.client[0] : c.client
          const entry = byClient.get(c.client_id) ?? { name: client?.name ?? '—', balance: 0, overdue: false }
          entry.balance += c.amount
          if (c.due_date && parseLocalDate(c.due_date) < today) entry.overdue = true
          byClient.set(c.client_id, entry)
        }
        setReceivableRows(
          [...byClient.entries()].map(([clientId, entry]) => ({
            clientId,
            name: entry.name,
            balance: entry.balance,
            overdue: entry.overdue,
          })),
        )
      })

    supabase
      .from('expenses')
      .select('amount, created_at')
      .gte('created_at', periodStart.toISOString())
      .then(({ data }) => {
        setExpensesTotal((data ?? []).reduce((sum, e) => sum + e.amount, 0))
      })
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart, previousPeriodStart])

  const currentTotal = salesDetail.reduce((sum, s) => sum + (s.total - s.discount), 0)
  const totalCost = salesDetail.reduce((sum, s) => sum + s.cost, 0)
  const totalDiscount = salesDetail.reduce((sum, s) => sum + s.discount, 0)
  const deltaPct = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null
  const avgTicket = salesDetail.length > 0 ? currentTotal / salesDetail.length : 0
  const profit = currentTotal - totalCost
  const receivablesTotal = receivableRows.reduce((sum, r) => sum + r.balance, 0)

  const dailyData = useMemo(() => {
    const byDay = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date(periodStart)
      d.setDate(d.getDate() + i)
      byDay.set(d.toDateString(), 0)
    }
    for (const s of salesDetail) {
      const key = new Date(s.createdAt).toDateString()
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + (s.total - s.discount))
    }
    return [...byDay.entries()].map(([key, value]) => ({
      label: new Date(key).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
      value,
    }))
  }, [salesDetail, periodStart, days])

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

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        <div className="w-64 shrink-0 snap-start">
          <StatTile
            label="Ventas del periodo"
            value={currentTotal}
            deltaPct={deltaPct}
            onClick={() => setOpenDetail('sales')}
          />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile label="Ticket promedio" value={avgTicket} onClick={() => setOpenDetail('sales')} />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile
            label="Número de ventas"
            value={salesDetail.length}
            isCurrency={false}
            onClick={() => setOpenDetail('sales')}
          />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile
            label="Utilidad estimada"
            value={profit}
            deltaGoodDirection="up"
            onClick={() => setOpenDetail('sales')}
          />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile label="Descuentos otorgados" value={totalDiscount} onClick={() => setOpenDetail('sales')} />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile
            label="Cuentas por cobrar"
            value={receivablesTotal}
            deltaGoodDirection="down"
            onClick={() => setOpenDetail('receivables')}
          />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile
            label="Gastos del periodo"
            value={expensesTotal}
            deltaGoodDirection="down"
            onClick={() => navigate('/gastos')}
          />
        </div>
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

      <SalesDetailDrawer
        open={openDetail === 'sales'}
        onOpenChange={(o) => setOpenDetail(o ? 'sales' : null)}
        title="Ventas del periodo"
        sales={salesDetail}
        onVoided={loadData}
      />
      <ReceivablesDrawer
        open={openDetail === 'receivables'}
        onOpenChange={(o) => setOpenDetail(o ? 'receivables' : null)}
        clients={receivableRows}
      />
    </div>
  )
}
