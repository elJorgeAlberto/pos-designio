import { useEffect, useMemo, useState } from 'react'
import { sileo } from 'sileo'
import { Archive, ArchiveRestore, Camera, Pencil, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { parseLocalDate, formatDateInput } from '@/lib/dates'
import { completedYearsOfService, currentCycleStart, lftVacationDays } from '@/lib/vacation-days'
import { DateRangeFilter, type DateRange } from '@/components/DateRangeFilter'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type EmployeeProfile = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  curp: string | null
  rfc: string | null
  nss: string | null
  position: string | null
  hire_date: string | null
  salary: number | null
  pay_frequency: 'semanal' | 'quincenal' | 'mensual' | null
  vacation_days_override: number | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  photo_url: string | null
  notes: string | null
  active: boolean
  user_id: string | null
}

type Schedule = { id: string; weekday: number; start_time: string; end_time: string }
type Attendance = { id: string; date: string; check_in: string | null; check_out: string | null; status: string; note: string | null }
type Loan = { id: string; amount: number; note: string | null; created_at: string; deductions: { id: string; amount: number; note: string | null; created_at: string }[] }
type VacationPeriod = { id: string; start_date: string; end_date: string; days: number; note: string | null }
type CompanyUser = { id: string; name: string | null }

const weekdayLabels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const attendanceStatusLabel: Record<string, string> = {
  present: 'Asistió',
  absent: 'Faltó',
  late: 'Retardo',
  permission: 'Permiso',
  vacation: 'Vacaciones',
}

export function EmployeeProfileDrawer({
  employeeId,
  open,
  onOpenChange,
  onEdit,
  onChanged,
}: {
  employeeId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (employee: EmployeeProfile) => void
  onChanged: () => void
}) {
  const { profile } = useAuth()
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null)
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [vacations, setVacations] = useState<VacationPeriod[]>([])
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([])
  const [loading, setLoading] = useState(true)
  const [attendanceRange, setAttendanceRange] = useState<DateRange>(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 29)
    return { start, end }
  })

  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [linkedUserId, setLinkedUserId] = useState('')
  const [savingLink, setSavingLink] = useState(false)

  const [scheduleForm, setScheduleForm] = useState({ weekday: '1', startTime: '09:00', endTime: '18:00' })
  const [addingSchedule, setAddingSchedule] = useState(false)

  const [attendanceForm, setAttendanceForm] = useState({ date: formatDateInput(new Date()), status: 'present', note: '' })
  const [addingAttendance, setAddingAttendance] = useState(false)

  const [loanForm, setLoanForm] = useState({ amount: '', note: '' })
  const [addingLoan, setAddingLoan] = useState(false)
  const [deductionForms, setDeductionForms] = useState<Record<string, { amount: string; note: string }>>({})
  const [addingDeductionFor, setAddingDeductionFor] = useState<string | null>(null)

  const [vacationForm, setVacationForm] = useState({ startDate: '', endDate: '', days: '', note: '' })
  const [addingVacation, setAddingVacation] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  async function load() {
    if (!employeeId) return
    setLoading(true)

    const { data: emp, error } = await supabase
      .from('employees')
      .select(
        'id, name, phone, email, address, curp, rfc, nss, position, hire_date, salary, pay_frequency, vacation_days_override, emergency_contact_name, emergency_contact_phone, photo_url, notes, active, user_id',
      )
      .eq('id', employeeId)
      .single()

    if (error || !emp) {
      sileo.error({ title: 'No se pudo cargar el trabajador.' })
      setLoading(false)
      return
    }
    setEmployee(emp as EmployeeProfile)
    setLinkedUserId(emp.user_id ?? '')

    if (emp.photo_url) {
      const { data: signed } = await supabase.storage.from('staff-documents').createSignedUrl(emp.photo_url, 3600)
      setPhotoSignedUrl(signed?.signedUrl ?? null)
    } else {
      setPhotoSignedUrl(null)
    }

    const [{ data: scheduleRows }, { data: loanRows }, { data: deductionRows }, { data: vacationRows }, { data: userRows }] =
      await Promise.all([
        supabase.from('employee_schedules').select('id, weekday, start_time, end_time').eq('employee_id', employeeId).order('weekday'),
        supabase.from('employee_loans').select('id, amount, note, created_at').eq('employee_id', employeeId).order('created_at', { ascending: false }),
        supabase.from('loan_deductions').select('id, loan_id, amount, note, created_at'),
        supabase.from('vacation_periods').select('id, start_date, end_date, days, note').eq('employee_id', employeeId).order('start_date', { ascending: false }),
        supabase.from('users').select('id, name'),
      ])

    setSchedules(scheduleRows ?? [])
    setVacations(vacationRows ?? [])
    setCompanyUsers(userRows ?? [])

    const deductionsByLoan = new Map<string, Loan['deductions']>()
    for (const d of deductionRows ?? []) {
      const list = deductionsByLoan.get(d.loan_id) ?? []
      list.push({ id: d.id, amount: d.amount, note: d.note, created_at: d.created_at })
      deductionsByLoan.set(d.loan_id, list)
    }
    setLoans(
      (loanRows ?? []).map((l) => ({ ...l, deductions: deductionsByLoan.get(l.id) ?? [] })),
    )

    setLoading(false)
  }

  async function loadAttendance() {
    if (!employeeId) return
    const { data } = await supabase
      .from('attendance_records')
      .select('id, date, check_in, check_out, status, note')
      .eq('employee_id', employeeId)
      .gte('date', formatDateInput(attendanceRange.start))
      .lte('date', formatDateInput(attendanceRange.end))
      .order('date', { ascending: false })
    setAttendance(data ?? [])
  }

  useEffect(() => {
    if (open && employeeId) {
      setConfirmingDeactivate(false)
      setAddingSchedule(false)
      setAddingAttendance(false)
      setAddingLoan(false)
      setAddingDeductionFor(null)
      setAddingVacation(false)
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employeeId])

  useEffect(() => {
    if (open && employeeId) loadAttendance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employeeId, attendanceRange])

  const vacationStats = useMemo(() => {
    if (!employee?.hire_date) return { allotted: 0, taken: 0, remaining: 0, cycleStart: null as Date | null }
    const hire = parseLocalDate(employee.hire_date)
    const cycleStart = currentCycleStart(hire)
    const completedYears = completedYearsOfService(hire, cycleStart)
    const allotted = employee.vacation_days_override ?? lftVacationDays(completedYears)
    const taken = vacations
      .filter((v) => parseLocalDate(v.start_date) >= cycleStart)
      .reduce((sum, v) => sum + v.days, 0)
    return { allotted, taken, remaining: allotted - taken, cycleStart }
  }, [employee, vacations])

  const loanTotals = useMemo(() => {
    const balances = loans.map((l) => l.amount - l.deductions.reduce((s, d) => s + d.amount, 0))
    return { total: balances.reduce((s, b) => s + b, 0) }
  }, [loans])

  async function toggleActive(active: boolean) {
    if (!employee) return
    const { error } = await supabase.from('employees').update({ active }).eq('id', employee.id)
    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: active ? `"${employee.name}" reactivado.` : `"${employee.name}" desactivado.` })
      setConfirmingDeactivate(false)
      setEmployee({ ...employee, active })
      onChanged()
    }
  }

  async function uploadPhoto(file: File) {
    if (!employee || !profile) return
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.companyId}/${employee.id}/${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('staff-documents').upload(path, file)
    if (uploadError) {
      sileo.error({ title: uploadError.message })
      setUploadingPhoto(false)
      return
    }
    const { error } = await supabase.from('employees').update({ photo_url: path }).eq('id', employee.id)
    if (error) {
      sileo.error({ title: error.message })
    } else {
      setEmployee({ ...employee, photo_url: path })
      const { data: signed } = await supabase.storage.from('staff-documents').createSignedUrl(path, 3600)
      setPhotoSignedUrl(signed?.signedUrl ?? null)
      sileo.success({ title: 'Foto actualizada.' })
    }
    setUploadingPhoto(false)
  }

  async function saveLinkedUser() {
    if (!employee) return
    setSavingLink(true)
    const { error } = await supabase
      .from('employees')
      .update({ user_id: linkedUserId || null })
      .eq('id', employee.id)
    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Cuenta vinculada actualizada.' })
      setEmployee({ ...employee, user_id: linkedUserId || null })
    }
    setSavingLink(false)
  }

  async function submitSchedule() {
    if (!employeeId) return
    setSubmitting(true)
    const { error } = await supabase.from('employee_schedules').insert({
      employee_id: employeeId,
      weekday: Number(scheduleForm.weekday),
      start_time: scheduleForm.startTime,
      end_time: scheduleForm.endTime,
    })
    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Horario agregado.' })
      setAddingSchedule(false)
      load()
    }
    setSubmitting(false)
  }

  async function removeSchedule(id: string) {
    const { error } = await supabase.from('employee_schedules').delete().eq('id', id)
    if (error) sileo.error({ title: error.message })
    else load()
  }

  async function submitAttendance() {
    if (!employeeId) return
    setSubmitting(true)
    const { error } = await supabase.from('attendance_records').upsert(
      {
        employee_id: employeeId,
        date: attendanceForm.date,
        status: attendanceForm.status,
        note: attendanceForm.note || null,
      },
      { onConflict: 'employee_id,date' },
    )
    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Asistencia registrada.' })
      setAddingAttendance(false)
      setAttendanceForm({ date: formatDateInput(new Date()), status: 'present', note: '' })
      loadAttendance()
    }
    setSubmitting(false)
  }

  async function submitLoan() {
    if (!employeeId || !loanForm.amount) return
    setSubmitting(true)
    const { error } = await supabase.from('employee_loans').insert({
      employee_id: employeeId,
      amount: Number(loanForm.amount),
      note: loanForm.note || null,
    })
    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Préstamo registrado.' })
      setAddingLoan(false)
      setLoanForm({ amount: '', note: '' })
      load()
      onChanged()
    }
    setSubmitting(false)
  }

  async function submitDeduction(loanId: string) {
    const form = deductionForms[loanId]
    if (!form?.amount) return
    setSubmitting(true)
    const { error } = await supabase.from('loan_deductions').insert({
      loan_id: loanId,
      amount: Number(form.amount),
      note: form.note || null,
    })
    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Descuento registrado.' })
      setAddingDeductionFor(null)
      setDeductionForms((prev) => ({ ...prev, [loanId]: { amount: '', note: '' } }))
      load()
      onChanged()
    }
    setSubmitting(false)
  }

  async function submitVacation() {
    if (!employeeId || !vacationForm.startDate || !vacationForm.endDate || !vacationForm.days) return
    setSubmitting(true)
    const { error } = await supabase.from('vacation_periods').insert({
      employee_id: employeeId,
      start_date: vacationForm.startDate,
      end_date: vacationForm.endDate,
      days: Number(vacationForm.days),
      note: vacationForm.note || null,
    })
    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Vacaciones registradas.' })
      setAddingVacation(false)
      setVacationForm({ startDate: '', endDate: '', days: '', note: '' })
      load()
    }
    setSubmitting(false)
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <DrawerTitle>{employee?.name ?? 'Trabajador'}</DrawerTitle>
                <DrawerDescription>
                  {employee?.position ?? 'Ficha del trabajador'}
                  {employee?.active === false && ' · Inactivo'}
                </DrawerDescription>
              </div>
              {employee && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onEdit(employee)}>
                  <Pencil />
                </Button>
              )}
            </div>
          </DrawerHeader>

          <div className="flex flex-col gap-4 overflow-y-auto px-4">
            {loading || !employee ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Antigüedad</p>
                    <p className="text-h4">
                      {employee.hire_date ? `${completedYearsOfService(parseLocalDate(employee.hire_date))} años` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Saldo de préstamos</p>
                    <p className={loanTotals.total > 0.01 ? 'text-h4 text-destructive' : 'text-h4'}>
                      ${loanTotals.total.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vacaciones disponibles</p>
                    <p className="text-h4">{vacationStats.remaining} días</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Días de vacaciones/año</p>
                    <p className="text-h4">{vacationStats.allotted}</p>
                  </div>
                </div>

                <Tabs defaultValue="datos">
                  <TabsList className="w-full">
                    <TabsTrigger value="datos">Datos</TabsTrigger>
                    <TabsTrigger value="horario">Horario</TabsTrigger>
                    <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
                    <TabsTrigger value="prestamos">Préstamos</TabsTrigger>
                    <TabsTrigger value="vacaciones">Vacaciones</TabsTrigger>
                  </TabsList>

                  <TabsContent value="datos" className="flex flex-col gap-3 pt-3 text-sm">
                    <div className="flex items-center gap-3">
                      {photoSignedUrl ? (
                        <img src={photoSignedUrl} alt="" className="size-16 rounded-full border border-border object-cover" />
                      ) : (
                        <div className="flex size-16 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                          <Camera className="size-5" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <span className="text-sm text-primary underline-offset-4 hover:underline">
                          {uploadingPhoto ? 'Subiendo…' : 'Cambiar foto'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingPhoto}
                          onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <p><span className="text-muted-foreground">Teléfono:</span> {employee.phone ?? '—'}</p>
                      <p><span className="text-muted-foreground">Correo:</span> {employee.email ?? '—'}</p>
                      <p><span className="text-muted-foreground">CURP:</span> {employee.curp ?? '—'}</p>
                      <p><span className="text-muted-foreground">RFC:</span> {employee.rfc ?? '—'}</p>
                      <p><span className="text-muted-foreground">NSS:</span> {employee.nss ?? '—'}</p>
                      <p><span className="text-muted-foreground">Sueldo:</span> {employee.salary != null ? `$${employee.salary.toFixed(2)} (${employee.pay_frequency})` : '—'}</p>
                      <p className="col-span-2"><span className="text-muted-foreground">Dirección:</span> {employee.address ?? '—'}</p>
                      <p className="col-span-2"><span className="text-muted-foreground">Ingreso:</span> {employee.hire_date ? parseLocalDate(employee.hire_date).toLocaleDateString('es-MX') : '—'}</p>
                      <p className="col-span-2"><span className="text-muted-foreground">Emergencia:</span> {employee.emergency_contact_name ? `${employee.emergency_contact_name} · ${employee.emergency_contact_phone ?? '—'}` : '—'}</p>
                      {employee.notes && <p className="col-span-2"><span className="text-muted-foreground">Notas:</span> {employee.notes}</p>}
                    </div>

                    <div className="flex flex-col gap-2 border-t border-border pt-3">
                      <FieldLabel htmlFor="linked-user" help={fieldHelp.staff.linkedUser}>
                        Cuenta de acceso vinculada
                      </FieldLabel>
                      <div className="flex gap-2">
                        <Select value={linkedUserId || 'none'} onValueChange={(v) => setLinkedUserId(v === 'none' ? '' : (v ?? ''))}>
                          <SelectTrigger id="linked-user" className="w-full">
                            <SelectValue>
                              {(v: unknown) => companyUsers.find((u) => u.id === v)?.name ?? 'Sin cuenta vinculada'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin cuenta vinculada</SelectItem>
                            {companyUsers.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name ?? u.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" size="sm" disabled={savingLink} onClick={saveLinkedUser}>
                          Guardar
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="horario" className="flex flex-col gap-2 pt-3">
                    {schedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin horario registrado.</p>
                    ) : (
                      schedules.map((s) => (
                        <div key={s.id} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                          <span>{weekdayLabels[s.weekday]}</span>
                          <span className="text-muted-foreground">
                            {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                          </span>
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeSchedule(s.id)}>
                            ×
                          </Button>
                        </div>
                      ))
                    )}
                    {addingSchedule ? (
                      <div className="flex flex-col gap-2 border-t border-border pt-3">
                        <Select value={scheduleForm.weekday} onValueChange={(v) => setScheduleForm({ ...scheduleForm, weekday: v ?? '1' })}>
                          <SelectTrigger className="w-full">
                            <SelectValue>{(v: unknown) => weekdayLabels[Number(v)]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {weekdayLabels.map((label, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <FieldLabel htmlFor="schedule-start" help={fieldHelp.schedules.startTime}>Entrada</FieldLabel>
                            <Input id="schedule-start" type="time" value={scheduleForm.startTime} onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <FieldLabel htmlFor="schedule-end" help={fieldHelp.schedules.endTime}>Salida</FieldLabel>
                            <Input id="schedule-end" type="time" value={scheduleForm.endTime} onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" disabled={submitting} onClick={submitSchedule}>Guardar</Button>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setAddingSchedule(false)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => setAddingSchedule(true)}>
                        <Plus /> Agregar día
                      </Button>
                    )}
                  </TabsContent>

                  <TabsContent value="asistencia" className="flex flex-col gap-3 pt-3">
                    <DateRangeFilter value={attendanceRange} onChange={setAttendanceRange} idPrefix="attendance-range" />
                    {addingAttendance ? (
                      <div className="flex flex-col gap-2 border-b border-border pb-3">
                        <Input type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })} />
                        <Select value={attendanceForm.status} onValueChange={(v) => setAttendanceForm({ ...attendanceForm, status: v ?? 'present' })}>
                          <SelectTrigger className="w-full">
                            <SelectValue>{(v: unknown) => attendanceStatusLabel[v as string] ?? 'Asistió'}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(attendanceStatusLabel).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input placeholder="Nota (opcional)" value={attendanceForm.note} onChange={(e) => setAttendanceForm({ ...attendanceForm, note: e.target.value })} />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" disabled={submitting} onClick={submitAttendance}>Guardar</Button>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setAddingAttendance(false)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => setAddingAttendance(true)}>
                        <Plus /> Registrar / corregir día
                      </Button>
                    )}
                    {attendance.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin asistencias en este periodo.</p>
                    ) : (
                      attendance.map((a) => (
                        <div key={a.id} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                          <div>
                            <p>{parseLocalDate(a.date).toLocaleDateString('es-MX')}</p>
                            {a.note && <p className="text-xs text-muted-foreground">{a.note}</p>}
                          </div>
                          <div className="text-right">
                            <p
                              className={
                                a.status === 'absent'
                                  ? 'text-destructive'
                                  : a.status === 'late'
                                    ? 'text-azafran'
                                    : 'text-success'
                              }
                            >
                              {attendanceStatusLabel[a.status]}
                            </p>
                            {(a.check_in || a.check_out) && (
                              <p className="text-xs text-muted-foreground">
                                {a.check_in ? new Date(a.check_in).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                {' – '}
                                {a.check_out ? new Date(a.check_out).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="prestamos" className="flex flex-col gap-3 pt-3">
                    {addingLoan ? (
                      <div className="flex flex-col gap-2 border-b border-border pb-3">
                        <FieldLabel htmlFor="loan-amount" help={fieldHelp.loans.amount}>Monto del préstamo</FieldLabel>
                        <Input id="loan-amount" type="number" step="0.01" value={loanForm.amount} onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })} />
                        <FieldLabel htmlFor="loan-note" help={fieldHelp.loans.note}>Nota</FieldLabel>
                        <Input id="loan-note" value={loanForm.note} onChange={(e) => setLoanForm({ ...loanForm, note: e.target.value })} />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" disabled={submitting} onClick={submitLoan}>Guardar</Button>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setAddingLoan(false)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => setAddingLoan(true)}>
                        <Plus /> Nuevo préstamo
                      </Button>
                    )}
                    {loans.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin préstamos registrados.</p>
                    ) : (
                      loans.map((l) => {
                        const deducted = l.deductions.reduce((s, d) => s + d.amount, 0)
                        const balance = l.amount - deducted
                        return (
                          <div key={l.id} className="flex flex-col gap-1 border-b border-border pb-3 text-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Préstamo ${l.amount.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(l.created_at).toLocaleDateString('es-MX')}
                                  {l.note && ` · ${l.note}`}
                                </p>
                              </div>
                              <p className={balance > 0.01 ? 'text-destructive' : 'text-success'}>
                                Saldo ${balance.toFixed(2)}
                              </p>
                            </div>
                            {l.deductions.map((d) => (
                              <div key={d.id} className="flex justify-between pl-3 text-xs text-muted-foreground">
                                <span>
                                  {new Date(d.created_at).toLocaleDateString('es-MX')}
                                  {d.note && ` · ${d.note}`}
                                </span>
                                <span>-${d.amount.toFixed(2)}</span>
                              </div>
                            ))}
                            {balance > 0.01 && (
                              addingDeductionFor === l.id ? (
                                <div className="mt-1 flex flex-col gap-2 pl-3">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Monto del descuento"
                                    value={deductionForms[l.id]?.amount ?? ''}
                                    onChange={(e) => setDeductionForms((prev) => ({ ...prev, [l.id]: { amount: e.target.value, note: prev[l.id]?.note ?? '' } }))}
                                  />
                                  <Input
                                    placeholder="Nota (opcional)"
                                    value={deductionForms[l.id]?.note ?? ''}
                                    onChange={(e) => setDeductionForms((prev) => ({ ...prev, [l.id]: { amount: prev[l.id]?.amount ?? '', note: e.target.value } }))}
                                  />
                                  <div className="flex gap-2">
                                    <Button type="button" size="sm" disabled={submitting} onClick={() => submitDeduction(l.id)}>Registrar</Button>
                                    <Button type="button" size="sm" variant="secondary" onClick={() => setAddingDeductionFor(null)}>Cancelar</Button>
                                  </div>
                                </div>
                              ) : (
                                <Button type="button" variant="secondary" size="sm" className="mt-1 ml-3 self-start" onClick={() => setAddingDeductionFor(l.id)}>
                                  Registrar descuento
                                </Button>
                              )
                            )}
                          </div>
                        )
                      })
                    )}
                  </TabsContent>

                  <TabsContent value="vacaciones" className="flex flex-col gap-3 pt-3">
                    <div className="flex justify-between border-b border-border pb-3 text-sm">
                      <span className="text-muted-foreground">Ciclo actual</span>
                      <span>
                        {vacationStats.cycleStart ? vacationStats.cycleStart.toLocaleDateString('es-MX') : '—'} ·{' '}
                        {vacationStats.taken}/{vacationStats.allotted} días tomados
                      </span>
                    </div>
                    {addingVacation ? (
                      <div className="flex flex-col gap-2 border-b border-border pb-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <FieldLabel htmlFor="vacation-start" help={fieldHelp.vacations.startDate}>Desde</FieldLabel>
                            <Input id="vacation-start" type="date" value={vacationForm.startDate} onChange={(e) => setVacationForm({ ...vacationForm, startDate: e.target.value })} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <FieldLabel htmlFor="vacation-end" help={fieldHelp.vacations.endDate}>Hasta</FieldLabel>
                            <Input id="vacation-end" type="date" value={vacationForm.endDate} onChange={(e) => setVacationForm({ ...vacationForm, endDate: e.target.value })} />
                          </div>
                        </div>
                        <FieldLabel htmlFor="vacation-days" help={fieldHelp.vacations.days}>Días</FieldLabel>
                        <Input id="vacation-days" type="number" step="0.5" value={vacationForm.days} onChange={(e) => setVacationForm({ ...vacationForm, days: e.target.value })} />
                        <Input placeholder="Nota (opcional)" value={vacationForm.note} onChange={(e) => setVacationForm({ ...vacationForm, note: e.target.value })} />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" disabled={submitting} onClick={submitVacation}>Guardar</Button>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setAddingVacation(false)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => setAddingVacation(true)}>
                        <Plus /> Registrar vacaciones
                      </Button>
                    )}
                    {vacations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin vacaciones registradas.</p>
                    ) : (
                      vacations.map((v) => (
                        <div key={v.id} className="flex justify-between border-b border-border pb-2 text-sm">
                          <span>
                            {parseLocalDate(v.start_date).toLocaleDateString('es-MX')} – {parseLocalDate(v.end_date).toLocaleDateString('es-MX')}
                            {v.note && ` · ${v.note}`}
                          </span>
                          <span>{v.days} días</span>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>

          <DrawerFooter>
            {employee &&
              (employee.active ? (
                <Button variant="destructive" onClick={() => setConfirmingDeactivate(true)}>
                  <Archive /> Desactivar trabajador
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => toggleActive(true)}>
                  <ArchiveRestore /> Reactivar trabajador
                </Button>
              ))}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmingDeactivate} onOpenChange={setConfirmingDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar a {employee?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Deja de aparecer en el directorio activo. Su historial, préstamos y vacaciones se
              conservan y puede reactivarse después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => toggleActive(false)}>
              Confirmar desactivación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
