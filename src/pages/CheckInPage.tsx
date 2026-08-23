import { useEffect, useState } from 'react'
import { sileo } from 'sileo'
import { LogIn, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDateInput } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Employee = { id: string; name: string; position: string | null }
type TodayRecord = { employee_id: string; check_in: string | null; check_out: string | null }

export function CheckInPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [today, setToday] = useState<Map<string, TodayRecord>>(new Map())
  const [loading, setLoading] = useState(true)
  const [markingId, setMarkingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data: employeeRows, error } = await supabase
      .from('employees')
      .select('id, name, position')
      .eq('active', true)
      .order('name')

    if (error) {
      sileo.error({ title: 'No se pudo cargar el personal.' })
      setLoading(false)
      return
    }
    setEmployees(employeeRows ?? [])

    const { data: recordRows } = await supabase
      .from('attendance_records')
      .select('employee_id, check_in, check_out')
      .eq('date', formatDateInput(new Date()))

    setToday(new Map((recordRows ?? []).map((r) => [r.employee_id, r])))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function mark(employeeId: string, field: 'check_in' | 'check_out') {
    setMarkingId(employeeId)
    const now = new Date().toISOString()
    const { error } = await supabase.from('attendance_records').upsert(
      field === 'check_in'
        ? { employee_id: employeeId, date: formatDateInput(new Date()), status: 'present', check_in: now }
        : { employee_id: employeeId, date: formatDateInput(new Date()), status: 'present', check_out: now },
      { onConflict: 'employee_id,date' },
    )
    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: field === 'check_in' ? 'Entrada marcada.' : 'Salida marcada.' })
      load()
    }
    setMarkingId(null)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-h1">Checador</h1>

      <Card>
        <CardHeader>
          <CardTitle>Marca tu entrada o salida de hoy</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : employees.length === 0 ? (
            <p className="text-muted-foreground">No hay trabajadores activos.</p>
          ) : (
            employees.map((e) => {
              const record = today.get(e.id)
              return (
                <div key={e.id} className="flex items-center gap-3 border-b border-border py-3">
                  <div className="flex-1">
                    <p className="font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.position ?? '—'}
                      {record?.check_in &&
                        ` · Entrada ${new Date(record.check_in).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`}
                      {record?.check_out &&
                        ` · Salida ${new Date(record.check_out).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={markingId === e.id || !!record?.check_in}
                    onClick={() => mark(e.id, 'check_in')}
                  >
                    <LogIn /> Entrada
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={markingId === e.id || !record?.check_in || !!record?.check_out}
                    onClick={() => mark(e.id, 'check_out')}
                  >
                    <LogOut /> Salida
                  </Button>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
