import { useEffect, useState } from 'react'
import { sileo } from 'sileo'
import { Lock, LockOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useBranchContext } from '@/lib/use-branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

type Session = {
  id: string
  opening_amount: number
  opened_at: string
  counted_amount: number | null
  expected_amount: number | null
  difference: number | null
  closed_at: string | null
}

export function CashRegisterPage() {
  const { session: authSession } = useAuth()
  const { cashRegisterId, loading: branchLoading } = useBranchContext()
  const [session, setSession] = useState<Session | null>(null)
  const [lastClosed, setLastClosed] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [openSheet, setOpenSheet] = useState(false)
  const [closeSheet, setCloseSheet] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('')
  const [countedAmount, setCountedAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadSession() {
    if (!cashRegisterId) return
    setLoading(true)
    const { data } = await supabase
      .from('cash_register_sessions')
      .select('id, opening_amount, opened_at, counted_amount, expected_amount, difference, closed_at')
      .eq('cash_register_id', cashRegisterId)
      .is('closed_at', null)
      .maybeSingle()
    setSession(data ?? null)
    setLoading(false)
  }

  useEffect(() => {
    if (!branchLoading) loadSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashRegisterId, branchLoading])

  async function handleOpen() {
    if (!cashRegisterId) return
    setSubmitting(true)

    const { error } = await supabase
      .from('cash_register_sessions')
      .insert({ cash_register_id: cashRegisterId, opening_amount: Number(openingAmount) || 0 })

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Caja abierta.' })
      setOpeningAmount('')
      setOpenSheet(false)
      loadSession()
    }
    setSubmitting(false)
  }

  async function handleClose() {
    if (!session || !authSession) return
    setSubmitting(true)

    const { data, error } = await supabase
      .from('cash_register_sessions')
      .update({
        counted_amount: Number(countedAmount) || 0,
        closed_by: authSession.user.id,
        closed_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .select('id, opening_amount, opened_at, counted_amount, expected_amount, difference, closed_at')
      .single()

    if (error || !data) {
      sileo.error({ title: error?.message ?? 'No se pudo cerrar la caja.' })
    } else {
      const diff = data.difference ?? 0
      if (Math.abs(diff) < 0.01) {
        sileo.success({ title: 'Caja cerrada. Cuadró exacto.' })
      } else {
        sileo.warning({
          title: `Caja cerrada con descuadre de $${Math.abs(diff).toFixed(2)} ${diff > 0 ? 'sobrante' : 'faltante'}.`,
        })
      }
      setLastClosed(data)
      setCountedAmount('')
      setCloseSheet(false)
      setSession(null)
    }
    setSubmitting(false)
  }

  if (branchLoading || loading) {
    return <p className="text-muted-foreground">Cargando…</p>
  }

  if (!cashRegisterId) {
    return <p className="text-muted-foreground">Tu usuario no tiene una caja asignada.</p>
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {session ? <LockOpen className="size-4 text-success" /> : <Lock className="size-4" />}
            {session ? 'Caja abierta' : 'Caja cerrada'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {session ? (
            <>
              <div className="text-sm text-muted-foreground">
                <p>Abierta: {new Date(session.opened_at).toLocaleString('es-MX')}</p>
                <p>Fondo inicial: ${session.opening_amount.toFixed(2)}</p>
              </div>
              <Sheet open={closeSheet} onOpenChange={setCloseSheet}>
                <SheetTrigger render={<Button variant="secondary">Cerrar caja</Button>} />
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Cerrar caja</SheetTitle>
                    <SheetDescription>
                      Cuenta el efectivo físico y captúralo — el sistema calcula solo lo esperado.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col gap-2 px-4">
                    <FieldLabel htmlFor="counted" help={fieldHelp.cashRegister.countedAmount}>
                      Efectivo contado
                    </FieldLabel>
                    <Input
                      id="counted"
                      type="number"
                      step="0.01"
                      required
                      value={countedAmount}
                      onChange={(e) => setCountedAmount(e.target.value)}
                    />
                  </div>
                  <SheetFooter>
                    <Button onClick={handleClose} disabled={submitting || !countedAmount}>
                      {submitting ? 'Cerrando…' : 'Confirmar cierre'}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <Sheet open={openSheet} onOpenChange={setOpenSheet}>
              <SheetTrigger render={<Button>Abrir caja</Button>} />
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Abrir caja</SheetTitle>
                  <SheetDescription>Captura el fondo inicial para arrancar el turno.</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-2 px-4">
                  <FieldLabel htmlFor="opening" help={fieldHelp.cashRegister.openingAmount}>
                    Fondo inicial
                  </FieldLabel>
                  <Input
                    id="opening"
                    type="number"
                    step="0.01"
                    required
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                  />
                </div>
                <SheetFooter>
                  <Button onClick={handleOpen} disabled={submitting || !openingAmount}>
                    {submitting ? 'Abriendo…' : 'Confirmar apertura'}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          )}
        </CardContent>
      </Card>

      {lastClosed && (
        <Card>
          <CardHeader>
            <CardTitle>Último corte</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Esperado</span>
              <span>${(lastClosed.expected_amount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contado</span>
              <span>${(lastClosed.counted_amount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Diferencia</span>
              <span
                className={
                  Math.abs(lastClosed.difference ?? 0) < 0.01 ? 'text-success' : 'text-destructive'
                }
              >
                ${(lastClosed.difference ?? 0).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
