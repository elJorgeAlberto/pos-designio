import { forwardRef } from 'react'
import { parseLocalDate } from '@/lib/dates'

export const CollectionReceipt = forwardRef<
  HTMLDivElement,
  {
    companyName: string
    logoUrl: string | null
    message: string | null
    date: Date
    clientName: string
    amountCollected: number
    paymentMethodLabel: string
    resolution:
      | { kind: 'paid' }
      | { kind: 'renegotiated'; amount: number; dueDate: string | null }
      | { kind: 'unpaid_remainder'; amount: number; dueDate: string | null }
  }
>(({ companyName, logoUrl, message, date, clientName, amountCollected, paymentMethodLabel, resolution }, ref) => {
  return (
    <div
      ref={ref}
      style={{ fontFamily: 'var(--font-sans)' }}
      className="flex w-80 flex-col gap-3 bg-white p-6 text-graphite"
    >
      {logoUrl && (
        <img src={logoUrl} alt={companyName} className="mx-auto h-16 w-16 object-contain" />
      )}
      <h2 style={{ fontFamily: 'var(--font-heading)' }} className="text-center text-lg font-semibold">
        {companyName}
      </h2>
      <p className="text-center text-xs text-smoke">{date.toLocaleString('es-MX')}</p>
      <div className="flex flex-col gap-1 border-y border-steel py-3 text-sm">
        <div className="flex justify-between">
          <span>Cliente</span>
          <span>{clientName}</span>
        </div>
        <div className="flex justify-between">
          <span>Abono a cuenta</span>
          <span>${amountCollected.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Medio de pago</span>
          <span>{paymentMethodLabel}</span>
        </div>
      </div>
      <div
        style={{ fontFamily: 'var(--font-display)' }}
        className="flex justify-between text-2xl text-azafran"
      >
        <span>Recibí</span>
        <span>${amountCollected.toFixed(2)}</span>
      </div>
      <div className="text-sm text-smoke">
        {resolution.kind === 'paid' && <p className="text-center text-success">Cuenta liquidada</p>}
        {resolution.kind === 'renegotiated' && (
          <div className="flex justify-between">
            <span>Nuevo compromiso</span>
            <span>
              ${resolution.amount.toFixed(2)}
              {resolution.dueDate && ` — ${parseLocalDate(resolution.dueDate).toLocaleDateString('es-MX')}`}
            </span>
          </div>
        )}
        {resolution.kind === 'unpaid_remainder' && (
          <div className="flex justify-between text-destructive">
            <span>Saldo pendiente</span>
            <span>
              ${resolution.amount.toFixed(2)}
              {resolution.dueDate && ` — ${parseLocalDate(resolution.dueDate).toLocaleDateString('es-MX')}`}
            </span>
          </div>
        )}
      </div>
      {message && <p className="text-center text-xs text-smoke">{message}</p>}
      <p className="text-center text-[10px] text-steel">Powered by esdesignio</p>
    </div>
  )
})
CollectionReceipt.displayName = 'CollectionReceipt'
