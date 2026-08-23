import { useEffect, useMemo, useState } from 'react'
import { sileo } from 'sileo'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseLocalDate, endOfDay, startOfDay } from '@/lib/dates'
import { CollectDebtSheet, type DebtCommitment } from '@/components/CollectDebtSheet'
import { DebtDetailDrawer } from '@/components/DebtDetailDrawer'
import { SaleTraceabilityDrawer } from '@/components/SaleTraceabilityDrawer'
import { DateRangeFilter, type DateRange } from '@/components/DateRangeFilter'
import { TablePagination } from '@/components/TablePagination'
import { usePagination } from '@/lib/use-pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type PendingCommitment = {
  id: string
  client_id: string
  clientName: string
  amount: number
  due_date: string | null
}

type QuickFilter = 'all' | 'overdue' | 'today' | 'week'

type LedgerEntry = {
  id: string
  date: string
  clientName: string
  concept: string
  debe: number
  haber: number
  commitmentId: string | null
  saldo: number
}

type Client = { id: string; name: string }

const weekdayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function isoKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CobrosPendientesPage() {
  const [commitments, setCommitments] = useState<PendingCommitment[]>([])
  const [loading, setLoading] = useState(true)
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [search, setSearch] = useState('')
  const [collectTarget, setCollectTarget] = useState<DebtCommitment | null>(null)
  const [collectClientName, setCollectClientName] = useState('')

  const [clients, setClients] = useState<Client[]>([])
  const [historyClientId, setHistoryClientId] = useState('')
  const [historyRange, setHistoryRange] = useState<DateRange>(() => {
    const end = startOfDay(new Date())
    const start = new Date(end.getFullYear(), end.getMonth(), 1)
    return { start, end }
  })
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(true)
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string | null>(null)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('debt_commitments')
      .select('id, client_id, amount, due_date, client:clients(name)')
      .eq('status', 'pending')
      .order('due_date')

    if (error) {
      sileo.error({ title: 'No se pudieron cargar los cobros pendientes.' })
      setLoading(false)
      return
    }

    setCommitments(
      (data ?? []).map((row) => {
        const client = Array.isArray(row.client) ? row.client[0] : row.client
        return {
          id: row.id,
          client_id: row.client_id,
          clientName: client?.name ?? '—',
          amount: row.amount,
          due_date: row.due_date,
        }
      }),
    )
    setLoading(false)
  }

  async function loadLedger() {
    setLedgerLoading(true)

    let debeQuery = supabase
      .from('debt_commitments')
      .select('id, client_id, amount, created_at, note, sale_id, parent_commitment_id, client:clients(name)')
      .gte('created_at', historyRange.start.toISOString())
      .lte('created_at', endOfDay(historyRange.end).toISOString())
      .order('created_at')
    if (historyClientId) debeQuery = debeQuery.eq('client_id', historyClientId)

    let haberQuery = supabase
      .from('collections')
      .select('id, client_id, amount, created_at, debt_commitment_id, client:clients(name), payment_method:payment_methods(label)')
      .gte('created_at', historyRange.start.toISOString())
      .lte('created_at', endOfDay(historyRange.end).toISOString())
      .order('created_at')
    if (historyClientId) haberQuery = haberQuery.eq('client_id', historyClientId)

    const [{ data: debeRows, error: debeError }, { data: haberRows, error: haberError }] = await Promise.all([
      debeQuery,
      haberQuery,
    ])

    if (debeError || haberError) {
      sileo.error({ title: 'No se pudo cargar el historial.' })
      setLedgerLoading(false)
      return
    }

    // debt_commitments.amount is a running balance (collect_debt() mutates
    // it down as abonos land), not the original charge — reconstruct the
    // original Debe by adding back everything ever collected against each
    // commitment, regardless of when (a partial payment from outside this
    // date range still shrank the row we're looking at).
    const commitmentIds = (debeRows ?? []).map((r) => r.id)
    const totalCollectedByCommitment = new Map<string, number>()
    if (commitmentIds.length > 0) {
      const { data: allCollections } = await supabase
        .from('collections')
        .select('debt_commitment_id, amount')
        .in('debt_commitment_id', commitmentIds)
      for (const c of allCollections ?? []) {
        if (!c.debt_commitment_id) continue
        totalCollectedByCommitment.set(
          c.debt_commitment_id,
          (totalCollectedByCommitment.get(c.debt_commitment_id) ?? 0) + c.amount,
        )
      }
    }

    const debeEntries = (debeRows ?? []).map((r) => {
      const client = Array.isArray(r.client) ? r.client[0] : r.client
      const original = r.amount + (totalCollectedByCommitment.get(r.id) ?? 0)
      const concept = r.parent_commitment_id
        ? 'Renegociación'
        : r.note
          ? r.note
          : r.sale_id
            ? 'Venta a crédito'
            : 'Adeudo'
      return {
        id: `debe-${r.id}`,
        date: r.created_at,
        clientName: client?.name ?? '—',
        concept,
        debe: original,
        haber: 0,
        commitmentId: r.id as string | null,
      }
    })

    const haberEntries = (haberRows ?? []).map((r) => {
      const client = Array.isArray(r.client) ? r.client[0] : r.client
      const paymentMethod = Array.isArray(r.payment_method) ? r.payment_method[0] : r.payment_method
      return {
        id: `haber-${r.id}`,
        date: r.created_at,
        clientName: client?.name ?? '—',
        concept: `Abono · ${paymentMethod?.label ?? '—'}`,
        debe: 0,
        haber: r.amount,
        commitmentId: null as string | null,
      }
    })

    const merged = [...debeEntries, ...haberEntries].sort((a, b) => a.date.localeCompare(b.date))

    let running = 0
    const withSaldo: LedgerEntry[] = merged.map((e) => {
      running += e.debe - e.haber
      return { ...e, saldo: running }
    })

    setLedger(withSaldo)
    setLedgerLoading(false)
  }

  useEffect(() => {
    load()
    supabase
      .from('clients')
      .select('id, name')
      .order('name')
      .then(({ data }) => setClients(data ?? []))
  }, [])

  useEffect(() => {
    loadLedger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyClientId, historyRange])

  const todayKey = isoKey(new Date())
  const weekAheadKey = isoKey(new Date(Date.now() + 7 * 86400000))

  const commitmentsByDate = useMemo(() => {
    const map = new Map<string, PendingCommitment[]>()
    for (const c of commitments) {
      if (!c.due_date) continue
      map.set(c.due_date, [...(map.get(c.due_date) ?? []), c])
    }
    return map
  }, [commitments])

  const monthCells = useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = Array.from({ length: firstDay.getDay() }, () => null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    return cells
  }, [monthCursor])

  const filteredCommitments = useMemo(() => {
    return commitments
      .filter((c) => c.clientName.toLowerCase().includes(search.toLowerCase()))
      .filter((c) => {
        if (selectedDate) return c.due_date === selectedDate
        if (!c.due_date) return quickFilter === 'all'
        if (quickFilter === 'overdue') return c.due_date < todayKey
        if (quickFilter === 'today') return c.due_date === todayKey
        if (quickFilter === 'week') return c.due_date >= todayKey && c.due_date <= weekAheadKey
        return true
      })
      .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
  }, [commitments, search, selectedDate, quickFilter, todayKey, weekAheadKey])

  const ledgerTotals = useMemo(
    () => ({
      debe: ledger.reduce((sum, e) => sum + e.debe, 0),
      haber: ledger.reduce((sum, e) => sum + e.haber, 0),
    }),
    [ledger],
  )

  const { page, setPage, totalPages, pageItems: pagedLedger } = usePagination(ledger)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-h1">Cobros pendientes</h1>

      <Tabs defaultValue="calendario">
        <TabsList className="w-full">
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="flex flex-col gap-6 pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {monthCursor.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Mes anterior"
                    onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Mes siguiente"
                    onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {weekdayLabels.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {monthCells.map((cell, i) => {
                  if (!cell) return <div key={i} />
                  const key = isoKey(cell)
                  const dayCommitments = commitmentsByDate.get(key) ?? []
                  const hasPending = dayCommitments.length > 0
                  const overdue = hasPending && key < todayKey
                  const isSelected = selectedDate === key
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedDate(isSelected ? null : key)}
                      className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : hasPending
                            ? overdue
                              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                              : 'bg-azafran/10 text-azafran hover:bg-azafran/20'
                            : 'hover:bg-accent/40'
                      }`}
                    >
                      <span>{cell.getDate()}</span>
                      {hasPending && <span className="size-1.5 rounded-full bg-current" />}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56"
            />
            {(
              [
                { key: 'all', label: 'Todos' },
                { key: 'overdue', label: 'Atrasados' },
                { key: 'today', label: 'Hoy' },
                { key: 'week', label: 'Próximos 7 días' },
              ] as { key: QuickFilter; label: string }[]
            ).map((f) => (
              <Button
                key={f.key}
                type="button"
                size="sm"
                variant={!selectedDate && quickFilter === f.key ? 'default' : 'secondary'}
                onClick={() => {
                  setSelectedDate(null)
                  setQuickFilter(f.key)
                }}
              >
                {f.label}
              </Button>
            ))}
            {selectedDate && (
              <Button type="button" size="sm" variant="secondary" onClick={() => setSelectedDate(null)}>
                Quitar filtro de día
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate
                  ? `Cobros del ${parseLocalDate(selectedDate).toLocaleDateString('es-MX')}`
                  : 'Cobros pendientes'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Cargando…</p>
              ) : filteredCommitments.length === 0 ? (
                <p className="text-muted-foreground">No hay cobros pendientes con estos filtros.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredCommitments.map((c) => {
                    const overdue = c.due_date != null && c.due_date < todayKey
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between border-b border-border py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">{c.clientName}</p>
                          <p className={overdue ? 'text-destructive' : 'text-muted-foreground'}>
                            {c.due_date
                              ? `Compromiso: ${parseLocalDate(c.due_date).toLocaleDateString('es-MX')}${overdue ? ' (atrasado)' : ''}`
                              : 'Sin fecha de compromiso'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium tabular-nums">${c.amount.toFixed(2)}</span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setCollectTarget({ id: c.id, amount: c.amount, due_date: c.due_date })
                              setCollectClientName(c.clientName)
                            }}
                          >
                            Cobrar
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="flex flex-col gap-6 pt-4">
          <div className="flex flex-col gap-2">
            <Select value={historyClientId || 'all'} onValueChange={(v) => setHistoryClientId(v === 'all' ? '' : (v ?? ''))}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: unknown) => (v === 'all' ? 'Todos' : (clients.find((c) => c.id === v)?.name ?? 'Todos'))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangeFilter value={historyRange} onChange={setHistoryRange} idPrefix="ledger-range" />
          </div>

          {!historyClientId && !ledgerLoading && (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Total Debe</p>
                <p className="text-h4">${ledgerTotals.debe.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Haber</p>
                <p className="text-h4">${ledgerTotals.haber.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Diferencia</p>
                <p className="text-h4">${(ledgerTotals.debe - ledgerTotals.haber).toFixed(2)}</p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              {ledgerLoading ? (
                <p className="text-muted-foreground">Cargando…</p>
              ) : ledger.length === 0 ? (
                <p className="text-muted-foreground">Sin movimientos en este periodo.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        {!historyClientId && <TableHead>Cliente</TableHead>}
                        <TableHead>Concepto</TableHead>
                        <TableHead>Debe</TableHead>
                        <TableHead>Haber</TableHead>
                        {historyClientId && <TableHead>Saldo</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedLedger.map((entry) => (
                        <TableRow
                          key={entry.id}
                          className={entry.commitmentId ? 'cursor-pointer' : ''}
                          onClick={() => entry.commitmentId && setSelectedCommitmentId(entry.commitmentId)}
                        >
                          <TableCell>{new Date(entry.date).toLocaleDateString('es-MX')}</TableCell>
                          {!historyClientId && <TableCell>{entry.clientName}</TableCell>}
                          <TableCell>{entry.concept}</TableCell>
                          <TableCell className={entry.debe > 0 ? 'text-destructive' : ''}>
                            {entry.debe > 0 ? `$${entry.debe.toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell className={entry.haber > 0 ? 'text-success' : ''}>
                            {entry.haber > 0 ? `$${entry.haber.toFixed(2)}` : '—'}
                          </TableCell>
                          {historyClientId && (
                            <TableCell className="tabular-nums">${entry.saldo.toFixed(2)}</TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </TabsContent>
      </Tabs>

      <CollectDebtSheet
        open={!!collectTarget}
        onOpenChange={(open) => !open && setCollectTarget(null)}
        commitment={collectTarget}
        clientName={collectClientName}
        onCollected={() => {
          load()
          loadLedger()
        }}
      />

      <DebtDetailDrawer
        open={!!selectedCommitmentId}
        onOpenChange={(o) => !o && setSelectedCommitmentId(null)}
        commitmentId={selectedCommitmentId}
        onCollect={(commitment) => {
          setSelectedCommitmentId(null)
          setCollectTarget(commitment)
          setCollectClientName(ledger.find((e) => e.commitmentId === commitment.id)?.clientName ?? '')
        }}
        onViewSale={(saleId) => {
          setSelectedCommitmentId(null)
          setSelectedSaleId(saleId)
        }}
      />

      <SaleTraceabilityDrawer
        open={!!selectedSaleId}
        onOpenChange={(o) => !o && setSelectedSaleId(null)}
        saleId={selectedSaleId}
      />
    </div>
  )
}
