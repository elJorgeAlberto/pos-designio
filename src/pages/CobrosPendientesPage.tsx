import { useEffect, useMemo, useState } from 'react'
import { sileo } from 'sileo'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseLocalDate } from '@/lib/dates'
import { CollectDebtSheet, type DebtCommitment } from '@/components/CollectDebtSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type PendingCommitment = {
  id: string
  client_id: string
  clientName: string
  amount: number
  due_date: string | null
}

type QuickFilter = 'all' | 'overdue' | 'today' | 'week'

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

  useEffect(() => {
    load()
  }, [])

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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-h1">
        Cobros pendientes
      </h1>

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

      <CollectDebtSheet
        open={!!collectTarget}
        onOpenChange={(open) => !open && setCollectTarget(null)}
        commitment={collectTarget}
        clientName={collectClientName}
        onCollected={load}
      />
    </div>
  )
}
