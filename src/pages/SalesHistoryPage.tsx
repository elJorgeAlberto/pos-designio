import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { StatTile } from '@/components/StatTile'
import { BarChart } from '@/components/charts/BarChart'
import { SaleTraceabilityDrawer } from '@/components/SaleTraceabilityDrawer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Period = 'today' | 'week' | 'month'

const periods: { key: Period; label: string; days: number }[] = [
  { key: 'today', label: 'Hoy', days: 1 },
  { key: 'week', label: 'Semana', days: 7 },
  { key: 'month', label: 'Mes', days: 30 },
]

const methodLabel: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
}

type Sale = {
  id: string
  created_at: string
  total: number
  discount_amount: number
  voided_at: string | null
  clientName: string | null
  cajeroName: string | null
  cost: number
  methods: string[]
}

function startOfDay(d: Date) {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function SalesHistoryPage() {
  const [period, setPeriod] = useState<Period>('week')
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

  const days = periods.find((p) => p.key === period)!.days
  const periodStart = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1))
    return startOfDay(d)
  }, [days])

  function loadSales() {
    setLoading(true)
    supabase
      .from('sales')
      .select(
        'id, created_at, total, discount_amount, voided_at, client:clients(name), cajero:users!sales_user_id_fkey(name)',
      )
      .gte('created_at', periodStart.toISOString())
      .order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error || !data) {
          setSales([])
          setLoading(false)
          return
        }

        const ids = data.map((s) => s.id)
        if (ids.length === 0) {
          setSales([])
          setLoading(false)
          return
        }

        const [{ data: items }, { data: payments }] = await Promise.all([
          supabase.from('sale_items').select('sale_id, quantity, unit_cost').in('sale_id', ids),
          supabase.from('sale_payments').select('sale_id, method').in('sale_id', ids),
        ])

        const costBySale = new Map<string, number>()
        for (const item of items ?? []) {
          costBySale.set(item.sale_id, (costBySale.get(item.sale_id) ?? 0) + item.quantity * item.unit_cost)
        }
        const methodsBySale = new Map<string, string[]>()
        for (const p of payments ?? []) {
          methodsBySale.set(p.sale_id, [...(methodsBySale.get(p.sale_id) ?? []), p.method])
        }

        setSales(
          data.map((s) => {
            const client = Array.isArray(s.client) ? s.client[0] : s.client
            const cajero = Array.isArray(s.cajero) ? s.cajero[0] : s.cajero
            return {
              id: s.id,
              created_at: s.created_at,
              total: s.total,
              discount_amount: s.discount_amount,
              voided_at: s.voided_at,
              clientName: client?.name ?? null,
              cajeroName: cajero?.name ?? null,
              cost: costBySale.get(s.id) ?? 0,
              methods: methodsBySale.get(s.id) ?? [],
            }
          }),
        )
        setLoading(false)
      })
  }

  useEffect(() => {
    loadSales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart])

  const activeSales = sales.filter((s) => !s.voided_at)
  const voidedCount = sales.length - activeSales.length
  const totalNet = activeSales.reduce((sum, s) => sum + (s.total - s.discount_amount), 0)

  const dailyData = useMemo(() => {
    const byDay = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date(periodStart)
      d.setDate(d.getDate() + i)
      byDay.set(d.toDateString(), 0)
    }
    for (const s of activeSales) {
      const key = new Date(s.created_at).toDateString()
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + (s.total - s.discount_amount))
    }
    return [...byDay.entries()].map(([key, value]) => ({
      label: new Date(key).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
      value,
    }))
  }, [activeSales, periodStart, days])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 style={{ fontFamily: 'var(--font-heading)' }} className="text-2xl font-semibold">
        Historial de ventas
      </h1>

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
        <StatTile label="Ventas completadas" value={activeSales.length} isCurrency={false} />
        <StatTile label="Ventas canceladas" value={voidedCount} isCurrency={false} deltaGoodDirection="down" />
        <StatTile label="Total del periodo" value={totalNet} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas por día</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Cargando…</p> : <BarChart data={dailyData} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : sales.length === 0 ? (
            <p className="text-muted-foreground">Sin ventas en este periodo.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Utilidad</TableHead>
                    <TableHead>Cajero</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => {
                    const net = sale.total - sale.discount_amount
                    const profit = net - sale.cost
                    return (
                      <TableRow
                        key={sale.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedSaleId(sale.id)}
                      >
                        <TableCell>{new Date(sale.created_at).toLocaleString('es-MX')}</TableCell>
                        <TableCell>{sale.clientName ?? 'Sin cliente'}</TableCell>
                        <TableCell>{sale.methods.map((m) => methodLabel[m] ?? m).join(' + ')}</TableCell>
                        <TableCell>${net.toFixed(2)}</TableCell>
                        <TableCell className={profit >= 0 ? 'text-success' : 'text-destructive'}>
                          ${profit.toFixed(2)}
                        </TableCell>
                        <TableCell>{sale.cajeroName ?? '—'}</TableCell>
                        <TableCell>
                          {sale.voided_at ? (
                            <span className="text-destructive">Cancelada</span>
                          ) : (
                            <span className="text-success">Completada</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SaleTraceabilityDrawer
        open={!!selectedSaleId}
        onOpenChange={(o) => !o && setSelectedSaleId(null)}
        saleId={selectedSaleId}
        onVoided={loadSales}
      />
    </div>
  )
}
