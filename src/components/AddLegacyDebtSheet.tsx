import { useEffect, useState, type FormEvent } from 'react'
import { sileo } from 'sileo'
import { supabase } from '@/lib/supabase'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const quickDates = [
  { label: 'Mañana', days: 1 },
  { label: '+1 mes', days: 30 },
]

export function AddLegacyDebtSheet({
  open,
  onOpenChange,
  clientId,
  clientName,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  onAdded: () => void
}) {
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setAmount('')
      setDueDate('')
      setNote('')
    }
  }, [open])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    const { error } = await supabase.from('debt_commitments').insert({
      client_id: clientId,
      sale_id: null,
      amount: Number(amount),
      due_date: dueDate || null,
      note: note || null,
      status: 'pending',
    })

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: `Adeudo agregado a "${clientName}".` })
      onOpenChange(false)
      onAdded()
    }
    setSubmitting(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Adeudo pasado</SheetTitle>
          <SheetDescription>
            Registra una deuda que ya existía antes de usar el sistema, para que {clientName} quede
            al día en Cobros pendientes.
          </SheetDescription>
        </SheetHeader>
        <form id="legacy-debt-form" onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="legacy-amount" help={fieldHelp.legacyDebt.amount}>
              Monto
            </FieldLabel>
            <Input
              id="legacy-amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="legacy-due-date" help={fieldHelp.legacyDebt.dueDate}>
              Fecha de compromiso
            </FieldLabel>
            <Input
              id="legacy-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
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
                    setDueDate(date.toISOString().slice(0, 10))
                  }}
                >
                  {q.label}
                </Button>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={() => setDueDate('')}>
                Sin fecha
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="legacy-note" help={fieldHelp.legacyDebt.note}>
              Nota
            </FieldLabel>
            <Textarea
              id="legacy-note"
              placeholder='Ej. "Saldo que quedó antes de usar el sistema"'
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </form>
        <SheetFooter>
          <Button type="submit" form="legacy-debt-form" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Agregar adeudo'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
