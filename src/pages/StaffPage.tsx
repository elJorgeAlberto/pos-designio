import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { sileo } from 'sileo'
import { Plus, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseLocalDate, formatDateInput } from '@/lib/dates'
import { completedYearsOfService } from '@/lib/vacation-days'
import { StatTile } from '@/components/StatTile'
import { EmployeeProfileDrawer, type EmployeeProfile } from '@/components/EmployeeProfileDrawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { TablePagination } from '@/components/TablePagination'
import { usePagination } from '@/lib/use-pagination'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type EmployeeRow = {
  id: string
  name: string
  position: string | null
  phone: string | null
  hire_date: string | null
  active: boolean
  loanBalance: number
}

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  curp: '',
  rfc: '',
  nss: '',
  position: '',
  hireDate: '',
  salary: '',
  payFrequency: 'quincenal' as 'semanal' | 'quincenal' | 'mensual',
  vacationOverride: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  notes: '',
}

export function StaffPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const [detailId, setDetailId] = useState<string | null>(null)

  async function loadEmployees() {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('employees')
      .select('id, name, position, phone, hire_date, active')
      .order('name')

    if (error || !rows) {
      sileo.error({ title: 'No se pudo cargar el personal.' })
      setLoading(false)
      return
    }

    const [{ data: loans }, { data: deductions }] = await Promise.all([
      supabase.from('employee_loans').select('id, employee_id, amount'),
      supabase.from('loan_deductions').select('loan_id, amount'),
    ])

    const deductionsByLoan = new Map<string, number>()
    for (const d of deductions ?? []) {
      deductionsByLoan.set(d.loan_id, (deductionsByLoan.get(d.loan_id) ?? 0) + d.amount)
    }
    const balanceByEmployee = new Map<string, number>()
    for (const l of loans ?? []) {
      const remaining = l.amount - (deductionsByLoan.get(l.id) ?? 0)
      balanceByEmployee.set(l.employee_id, (balanceByEmployee.get(l.employee_id) ?? 0) + remaining)
    }

    setEmployees(
      rows.map((r) => ({ ...r, loanBalance: balanceByEmployee.get(r.id) ?? 0 })),
    )
    setLoading(false)
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  const filteredEmployees = useMemo(
    () => employees.filter((e) => (showInactive ? true : e.active)),
    [employees, showInactive],
  )

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.active)
    const withLoan = active.filter((e) => e.loanBalance > 0.01)
    const today = new Date()
    const in30 = new Date()
    in30.setDate(in30.getDate() + 30)
    const upcomingAnniversaries = active.filter((e) => {
      if (!e.hire_date) return false
      const hire = parseLocalDate(e.hire_date)
      const anniversary = new Date(today.getFullYear(), hire.getMonth(), hire.getDate())
      if (anniversary < today) anniversary.setFullYear(anniversary.getFullYear() + 1)
      return anniversary <= in30
    }).length
    const avgYears =
      active.length > 0
        ? active.reduce(
            (sum, e) => sum + (e.hire_date ? completedYearsOfService(parseLocalDate(e.hire_date)) : 0),
            0,
          ) / active.length
        : 0

    return {
      activeCount: active.length,
      withLoanCount: withLoan.length,
      loanTotal: withLoan.reduce((sum, e) => sum + e.loanBalance, 0),
      upcomingAnniversaries,
      avgYears,
    }
  }, [employees])

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  async function openEditForm(employee: EmployeeRow | EmployeeProfile) {
    setEditingId(employee.id)
    const { data: full } = await supabase
      .from('employees')
      .select(
        'name, phone, email, address, curp, rfc, nss, position, hire_date, salary, pay_frequency, vacation_days_override, emergency_contact_name, emergency_contact_phone, notes',
      )
      .eq('id', employee.id)
      .single()

    setForm({
      name: full?.name ?? employee.name,
      phone: full?.phone ?? '',
      email: full?.email ?? '',
      address: full?.address ?? '',
      curp: full?.curp ?? '',
      rfc: full?.rfc ?? '',
      nss: full?.nss ?? '',
      position: full?.position ?? '',
      hireDate: full?.hire_date ? formatDateInput(parseLocalDate(full.hire_date)) : '',
      salary: full?.salary != null ? String(full.salary) : '',
      payFrequency: (full?.pay_frequency as 'semanal' | 'quincenal' | 'mensual') ?? 'quincenal',
      vacationOverride: full?.vacation_days_override != null ? String(full.vacation_days_override) : '',
      emergencyContactName: full?.emergency_contact_name ?? '',
      emergencyContactPhone: full?.emergency_contact_phone ?? '',
      notes: full?.notes ?? '',
    })
    setFormOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    const payload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      curp: form.curp || null,
      rfc: form.rfc || null,
      nss: form.nss || null,
      position: form.position || null,
      hire_date: form.hireDate || null,
      salary: form.salary ? Number(form.salary) : null,
      pay_frequency: form.payFrequency,
      vacation_days_override: form.vacationOverride ? Number(form.vacationOverride) : null,
      emergency_contact_name: form.emergencyContactName || null,
      emergency_contact_phone: form.emergencyContactPhone || null,
      notes: form.notes || null,
    }

    const { error } = editingId
      ? await supabase.from('employees').update(payload).eq('id', editingId)
      : await supabase.from('employees').insert(payload)

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: editingId ? `"${form.name}" se actualizó.` : `"${form.name}" se agregó al personal.` })
      setFormOpen(false)
      loadEmployees()
    }
    setSubmitting(false)
  }

  const { page, setPage, totalPages, pageItems: pagedEmployees } = usePagination(filteredEmployees)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">Personal</h1>
        <Button onClick={openCreateForm}>
          <Plus /> Nuevo trabajador
        </Button>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        <div className="w-56 shrink-0 snap-start">
          <StatTile label="Trabajadores activos" value={stats.activeCount} isCurrency={false} />
        </div>
        <div className="w-56 shrink-0 snap-start">
          <StatTile label="Con préstamo pendiente" value={stats.withLoanCount} isCurrency={false} />
        </div>
        <div className="w-56 shrink-0 snap-start">
          <StatTile label="Saldo de préstamos" value={stats.loanTotal} />
        </div>
        <div className="w-56 shrink-0 snap-start">
          <StatTile label="Aniversarios (30 días)" value={stats.upcomingAnniversaries} isCurrency={false} />
        </div>
        <div className="w-56 shrink-0 snap-start">
          <StatTile label="Antigüedad promedio" value={Math.round(stats.avgYears)} isCurrency={false} suffix=" años" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={showInactive ? 'default' : 'secondary'}
          onClick={() => setShowInactive((v) => !v)}
        >
          Mostrar inactivos
        </Button>
      </div>

      <Sheet
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingId(null)
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingId ? 'Editar trabajador' : 'Nuevo trabajador'}</SheetTitle>
            <SheetDescription>
              {editingId ? 'Actualiza los datos del trabajador.' : 'Se agrega al directorio de personal.'}
            </SheetDescription>
          </SheetHeader>
          <form id="staff-form" onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto px-4">
            <p className="text-xs font-medium text-muted-foreground">Datos personales</p>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="staff-name" help={fieldHelp.staff.name}>
                Nombre
              </FieldLabel>
              <Input id="staff-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="staff-phone" help={fieldHelp.staff.phone}>
                  Teléfono
                </FieldLabel>
                <Input id="staff-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="staff-email" help={fieldHelp.staff.email}>
                  Correo
                </FieldLabel>
                <Input id="staff-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="staff-address" help={fieldHelp.staff.address}>
                Dirección
              </FieldLabel>
              <Input id="staff-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="staff-curp" help={fieldHelp.staff.curp}>
                  CURP
                </FieldLabel>
                <Input id="staff-curp" value={form.curp} onChange={(e) => setForm({ ...form, curp: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="staff-rfc" help={fieldHelp.staff.rfc}>
                  RFC
                </FieldLabel>
                <Input id="staff-rfc" value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="staff-nss" help={fieldHelp.staff.nss}>
                  NSS
                </FieldLabel>
                <Input id="staff-nss" value={form.nss} onChange={(e) => setForm({ ...form, nss: e.target.value })} />
              </div>
            </div>

            <p className="mt-2 text-xs font-medium text-muted-foreground">Datos laborales</p>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="staff-position" help={fieldHelp.staff.position}>
                Puesto
              </FieldLabel>
              <Input id="staff-position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="staff-hire-date" help={fieldHelp.staff.hireDate}>
                  Fecha de ingreso
                </FieldLabel>
                <Input
                  id="staff-hire-date"
                  type="date"
                  value={form.hireDate}
                  onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="staff-salary" help={fieldHelp.staff.salary}>
                  Sueldo
                </FieldLabel>
                <Input
                  id="staff-salary"
                  type="number"
                  step="0.01"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="staff-pay-frequency" help={fieldHelp.staff.payFrequency}>
                  Frecuencia de pago
                </FieldLabel>
                <Select
                  value={form.payFrequency}
                  onValueChange={(v) => setForm({ ...form, payFrequency: v as 'semanal' | 'quincenal' | 'mensual' })}
                >
                  <SelectTrigger id="staff-pay-frequency" className="w-full">
                    <SelectValue>
                      {(v: unknown) =>
                        v === 'semanal' ? 'Semanal' : v === 'mensual' ? 'Mensual' : 'Quincenal'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quincenal">Quincenal</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="staff-vacation-override" help={fieldHelp.staff.vacationOverride}>
                  Días de vacaciones (manual)
                </FieldLabel>
                <Input
                  id="staff-vacation-override"
                  type="number"
                  value={form.vacationOverride}
                  onChange={(e) => setForm({ ...form, vacationOverride: e.target.value })}
                  placeholder="Automático"
                />
              </div>
            </div>

            <p className="mt-2 text-xs font-medium text-muted-foreground">Contacto de emergencia</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="staff-emergency-name" help={fieldHelp.staff.emergencyContactName}>
                  Nombre
                </FieldLabel>
                <Input
                  id="staff-emergency-name"
                  value={form.emergencyContactName}
                  onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="staff-emergency-phone" help={fieldHelp.staff.emergencyContactPhone}>
                  Teléfono
                </FieldLabel>
                <Input
                  id="staff-emergency-phone"
                  type="tel"
                  value={form.emergencyContactPhone}
                  onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="staff-notes" help={fieldHelp.staff.notes}>
                Notas
              </FieldLabel>
              <Textarea id="staff-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </form>
          <SheetFooter>
            <Button type="submit" form="staff-form" disabled={submitting}>
              {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar trabajador'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Card>
        <CardHeader>
          <CardTitle>Directorio</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-muted-foreground">Todavía no hay personal registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Préstamo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedEmployees.map((e) => (
                  <TableRow
                    key={e.id}
                    className={`cursor-pointer ${!e.active ? 'opacity-50' : ''}`}
                    onClick={() => setDetailId(e.id)}
                  >
                    <TableCell>{e.name}</TableCell>
                    <TableCell className="text-muted-foreground">{e.position ?? '—'}</TableCell>
                    <TableCell className={e.loanBalance > 0.01 ? 'text-destructive' : ''}>
                      {e.loanBalance > 0.01 ? `$${e.loanBalance.toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell>
                      {e.active ? (
                        <span className="text-success">Activo</span>
                      ) : (
                        <span className="text-muted-foreground">Inactivo</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(ev) => ev.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar trabajador"
                        onClick={() => openEditForm(e)}
                      >
                        <Pencil />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <EmployeeProfileDrawer
        employeeId={detailId}
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
        onEdit={(employee) => {
          setDetailId(null)
          openEditForm(employee)
        }}
        onChanged={loadEmployees}
      />
    </div>
  )
}
