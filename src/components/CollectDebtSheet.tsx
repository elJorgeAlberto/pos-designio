import { useEffect, useState } from 'react'
import { sileo } from 'sileo'
import { Share2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { parseLocalDate } from '@/lib/dates'
import { useShareImage } from '@/lib/use-share-image'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { CollectionReceipt } from '@/components/CollectionReceipt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export type DebtCommitment = {
  id: string
  amount: number
  due_date: string | null
}

const quickDates = [
  { label: 'Mañana', days: 1 },
  { label: '+1 mes', days: 30 },
]
const NEXT_VISIT = 'Próxima visita'

type Step = 'amount' | 'authorize' | 'receipt'

type Resolution =
  | { kind: 'paid' }
  | { kind: 'renegotiated'; amount: number; dueDate: string | null }
  | { kind: 'unpaid_remainder'; amount: number; dueDate: string | null }

export function CollectDebtSheet({
  open,
  onOpenChange,
  commitment,
  clientName,
  onCollected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  commitment: DebtCommitment | null
  clientName: string
  onCollected: () => void
}) {
  const { profile } = useAuth()
  const [step, setStep] = useState<Step>('amount')
  const [amount, setAmount] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [collected, setCollected] = useState(0)
  const [resolution, setResolution] = useState<Resolution | null>(null)
  const [ticketSettings, setTicketSettings] = useState<{ logoUrl: string | null; message: string | null }>({
    logoUrl: null,
    message: null,
  })
  const { ref: receiptRef, shareImage } = useShareImage()

  useEffect(() => {
    if (!open || !commitment) return
    setStep('amount')
    setAmount(commitment.amount.toFixed(2))
    setNewDueDate('')
    setResolution(null)
    supabase
      .from('ticket_settings')
      .select('logo_url, message')
      .maybeSingle()
      .then(({ data }) =>
        setTicketSettings({ logoUrl: data?.logo_url ?? null, message: data?.message ?? null }),
      )
  }, [open, commitment])

  if (!commitment) return null

  const entered = Number(amount) || 0
  const remainder = Math.round((commitment.amount - entered) * 100) / 100

  function submitAmount() {
    if (entered <= 0 || entered > commitment!.amount + 0.01) {
      sileo.warning({ title: 'Captura un monto válido.' })
      return
    }
    if (remainder > 0.01) {
      setStep('authorize')
    } else {
      void doCollect(false, null)
    }
  }

  async function doCollect(authorizeRemainder: boolean, dueDate: string | null) {
    setSubmitting(true)
    const { data, error } = await supabase.rpc('collect_debt', {
      p_commitment_id: commitment!.id,
      p_amount: entered,
      p_authorize_remainder: authorizeRemainder,
      p_new_due_date: dueDate ?? undefined,
    })

    if (error || !data) {
      sileo.error({ title: error?.message ?? 'No se pudo registrar el cobro.' })
      setSubmitting(false)
      return
    }

    setCollected(entered)
    if (data.status === 'paid') {
      setResolution({ kind: 'paid' })
    } else if (data.status === 'renegotiated' || authorizeRemainder) {
      setResolution({ kind: 'renegotiated', amount: data.amount, dueDate: data.due_date })
    } else {
      setResolution({ kind: 'unpaid_remainder', amount: data.amount, dueDate: data.due_date })
    }
    sileo.success({ title: 'Cobro registrado.' })
    setStep('receipt')
    setSubmitting(false)
    onCollected()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Registrar cobro</SheetTitle>
          <SheetDescription>
            {clientName} · debe ${commitment.amount.toFixed(2)}
            {commitment.due_date &&
              ` · compromiso ${parseLocalDate(commitment.due_date).toLocaleDateString('es-MX')}`}
          </SheetDescription>
        </SheetHeader>

        {step === 'amount' && (
          <>
            <div className="flex flex-col gap-2 px-4">
              <FieldLabel htmlFor="collect-amount" help={fieldHelp.collections.amount}>
                Monto recibido
              </FieldLabel>
              <Input
                id="collect-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <SheetFooter>
              <Button onClick={submitAmount} disabled={submitting}>
                {submitting ? 'Guardando…' : 'Registrar cobro'}
              </Button>
            </SheetFooter>
          </>
        )}

        {step === 'authorize' && (
          <>
            <div className="flex flex-col gap-3 px-4 text-sm">
              <p>
                Debía ${commitment.amount.toFixed(2)}, pagó ${entered.toFixed(2)}. Quedan $
                {remainder.toFixed(2)} pendientes.
              </p>
              <p className="text-muted-foreground">
                ¿Autorizas que el restante se convierta en un nuevo crédito con nueva fecha de
                compromiso?
              </p>
              <FieldLabel htmlFor="new-due-date" help={fieldHelp.collections.newDueDate}>
                Nueva fecha de compromiso
              </FieldLabel>
              <Input
                id="new-due-date"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
              <div className="flex gap-2">
                {quickDates.map((q) => (
                  <Button
                    key={q.label}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const date = new Date()
                      date.setDate(date.getDate() + q.days)
                      setNewDueDate(date.toISOString().slice(0, 10))
                    }}
                  >
                    {q.label}
                  </Button>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={() => setNewDueDate('')}>
                  {NEXT_VISIT}
                </Button>
              </div>
            </div>
            <SheetFooter>
              <Button
                onClick={() => void doCollect(true, newDueDate || null)}
                disabled={submitting}
              >
                {submitting ? 'Guardando…' : 'Sí, autorizar nuevo crédito'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void doCollect(false, null)}
                disabled={submitting}
              >
                No, dejar la deuda igual
              </Button>
            </SheetFooter>
          </>
        )}

        {step === 'receipt' && resolution && (
          <>
            <div className="flex flex-col items-center gap-4 overflow-y-auto px-4">
              <CollectionReceipt
                ref={receiptRef}
                companyName={profile?.companyName ?? ''}
                logoUrl={ticketSettings.logoUrl}
                message={ticketSettings.message}
                date={new Date()}
                clientName={clientName}
                amountCollected={collected}
                resolution={resolution}
              />
            </div>
            <SheetFooter>
              <Button onClick={() => shareImage('cobro.png', 'Recibo de cobro')}>
                <Share2 /> Compartir recibo
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
