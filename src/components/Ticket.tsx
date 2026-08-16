import { forwardRef } from 'react'

type TicketItem = { name: string; quantity: number; unit: string; unitPrice: number }
type TicketPayment = { method: string; amount: number }

const paymentLabel: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
}

export const Ticket = forwardRef<
  HTMLDivElement,
  {
    companyName: string
    logoUrl: string | null
    message: string | null
    date: Date
    items: TicketItem[]
    payments: TicketPayment[]
    subtotal: number
    discount: number
    total: number
  }
>(({ companyName, logoUrl, message, date, items, payments, subtotal, discount, total }, ref) => {
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
        {items.map((item, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span>
              {item.quantity} {item.unit} {item.name}
            </span>
            <span>${(item.quantity * item.unitPrice).toFixed(2)}</span>
          </div>
        ))}
      </div>
      {discount > 0 && (
        <div className="flex flex-col gap-1 text-sm text-smoke">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Descuento</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        </div>
      )}
      <div
        style={{ fontFamily: 'var(--font-display)' }}
        className="flex justify-between text-2xl text-azafran"
      >
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>
      <div className="flex flex-col gap-1 text-sm text-smoke">
        {payments.map((p, i) => (
          <div key={i} className="flex justify-between">
            <span>{paymentLabel[p.method] ?? p.method}</span>
            <span>${p.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
      {message && <p className="text-center text-xs text-smoke">{message}</p>}
      <p className="text-center text-[10px] text-steel">Powered by esdesignio</p>
    </div>
  )
})
Ticket.displayName = 'Ticket'
