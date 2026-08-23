import { useEffect, useMemo, useState } from 'react'
import { sileo } from 'sileo'
import { Minus, Plus, Trash2, ShoppingCart, Share2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useBranchContext } from '@/lib/use-branch-context'
import { usePaymentMethods } from '@/lib/use-payment-methods'
import { useShareImage } from '@/lib/use-share-image'
import { Ticket } from '@/components/Ticket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
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

type Product = {
  id: string
  name: string
  sale_type: string
  unit: string
  price: number
  cost: number
}

type CartLine = {
  product: Product
  quantity: number
}

type PaymentLine = { id: string; paymentMethodId: string; amount: string; commitmentDate: string }
type Client = { id: string; name: string }

const quickCommitmentDates = [
  { label: 'Mañana', days: 1 },
  { label: '+1 mes', days: 30 },
]
const NEXT_VISIT = 'Próxima visita'

export function SalesPage() {
  const { profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartLine[]>([])
  const { branchId, cashRegisterId } = useBranchContext()
  const { methods: paymentMethods } = usePaymentMethods()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [payments, setPayments] = useState<PaymentLine[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState<string>('')
  const [discount, setDiscount] = useState('')
  const [ticketSettings, setTicketSettings] = useState<{ logoUrl: string | null; message: string | null }>({
    logoUrl: null,
    message: null,
  })
  const [lastSale, setLastSale] = useState<{
    date: Date
    items: { name: string; quantity: number; unit: string; unitPrice: number }[]
    payments: { method: string; amount: number }[]
    subtotal: number
    discount: number
    total: number
  } | null>(null)
  const { ref: ticketRef, shareImage } = useShareImage()

  const defaultCashMethodId =
    paymentMethods.find((m) => m.key === 'cash')?.id ?? paymentMethods[0]?.id ?? ''
  const hasCredit = payments.some(
    (p) => paymentMethods.find((m) => m.id === p.paymentMethodId)?.is_credit,
  )

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity * line.product.price, 0),
    [cart],
  )
  const discountAmount = Math.min(Number(discount) || 0, total)
  const amountDue = total - discountAmount
  const paid = useMemo(
    () => payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments],
  )
  const remaining = Math.round((amountDue - paid) * 100) / 100

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, sale_type, unit, price, cost')
      .order('name')
      .then(({ data, error }) => {
        if (error) sileo.error({ title: 'No se pudieron cargar los productos.' })
        setProducts(data ?? [])
        setLoading(false)
      })

    supabase
      .from('clients')
      .select('id, name')
      .order('name')
      .then(({ data }) => setClients(data ?? []))

    supabase
      .from('ticket_settings')
      .select('logo_url, message')
      .maybeSingle()
      .then(({ data }) =>
        setTicketSettings({ logoUrl: data?.logo_url ?? null, message: data?.message ?? null }),
      )
  }, [])

  useEffect(() => {
    if (!cashRegisterId) return
    supabase
      .from('cash_register_sessions')
      .select('id')
      .eq('cash_register_id', cashRegisterId)
      .is('closed_at', null)
      .maybeSingle()
      .then(({ data }) => {
        setSessionId(data?.id ?? null)
        setSessionChecked(true)
      })
  }, [cashRegisterId])

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((line) => line.product.id === product.id)
      if (existing) {
        return prev.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + (product.sale_type === 'weight' ? 0.5 : 1) }
            : line,
        )
      }
      return [...prev, { product, quantity: product.sale_type === 'weight' ? 0.5 : 1 }]
    })
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((line) => line.product.id !== productId))
      return
    }
    setCart((prev) =>
      prev.map((line) => (line.product.id === productId ? { ...line, quantity } : line)),
    )
  }

  function openCheckout() {
    if (cart.length === 0) {
      sileo.warning({ title: 'Agrega al menos un producto antes de cobrar.' })
      return
    }
    if (!sessionId) {
      sileo.warning({ title: 'Abre la caja antes de vender.' })
      return
    }
    setClientId('')
    setDiscount('')
    setPayments([
      { id: crypto.randomUUID(), paymentMethodId: defaultCashMethodId, amount: total.toFixed(2), commitmentDate: '' },
    ])
    setCheckoutOpen(true)
  }

  function addPaymentLine() {
    setPayments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        paymentMethodId: defaultCashMethodId,
        amount: remaining > 0 ? remaining.toFixed(2) : '0',
        commitmentDate: '',
      },
    ])
  }

  async function confirmSale() {
    if (!branchId || !cashRegisterId || !sessionId) {
      sileo.error({ title: 'No se encontró una caja abierta para tu usuario.' })
      return
    }
    if (Math.abs(remaining) > 0.01) {
      sileo.warning({ title: 'Los pagos no cubren el total de la venta.' })
      return
    }
    if (hasCredit && !clientId) {
      sileo.warning({ title: 'Selecciona un cliente para la parte a crédito.' })
      return
    }

    setSubmitting(true)

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        branch_id: branchId,
        cash_register_id: cashRegisterId,
        cash_register_session_id: sessionId,
        client_id: clientId || null,
        discount_amount: discountAmount,
      })
      .select('id')
      .single()

    if (saleError || !sale) {
      sileo.error({ title: saleError?.message ?? 'No se pudo registrar la venta.' })
      setSubmitting(false)
      return
    }

    const { error: itemsError } = await supabase.from('sale_items').insert(
      cart.map((line) => ({
        sale_id: sale.id,
        product_id: line.product.id,
        quantity: line.quantity,
        unit_price: line.product.price,
        unit_cost: line.product.cost,
      })),
    )

    if (itemsError) {
      sileo.error({ title: itemsError.message })
      setSubmitting(false)
      return
    }

    const { error: paymentsError } = await supabase.from('sale_payments').insert(
      payments.map((p) => {
        const isCredit = paymentMethods.find((m) => m.id === p.paymentMethodId)?.is_credit
        return {
          sale_id: sale.id,
          payment_method_id: p.paymentMethodId,
          amount: Number(p.amount) || 0,
          commitment_date: isCredit && p.commitmentDate ? p.commitmentDate : null,
        }
      }),
    )

    if (paymentsError) {
      sileo.error({ title: paymentsError.message })
      setSubmitting(false)
      return
    }

    sileo.success({ title: `Venta registrada por $${amountDue.toFixed(2)}` })
    setLastSale({
      date: new Date(),
      items: cart.map((line) => ({
        name: line.product.name,
        quantity: line.quantity,
        unit: line.product.unit,
        unitPrice: line.product.price,
      })),
      payments: payments.map((p) => ({
        method: paymentMethods.find((m) => m.id === p.paymentMethodId)?.label ?? '—',
        amount: Number(p.amount) || 0,
      })),
      subtotal: total,
      discount: discountAmount,
      total: amountDue,
    })
    setCart([])
    setPayments([])
    setClientId('')
    setDiscount('')
    setCheckoutOpen(false)
    setSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {sessionChecked && !sessionId && (
        <div className="border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          La caja está cerrada — ábrela desde la sección Caja antes de vender.
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle>Catálogo</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className="flex flex-col items-start gap-1 border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent/40"
                >
                  <span className="font-medium">{product.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ${product.price.toFixed(2)} / {product.unit}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="h-fit lg:sticky lg:top-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="size-4" /> Carrito
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {cart.length === 0 ? (
            <p className="text-muted-foreground">Toca un producto del catálogo para agregarlo.</p>
          ) : (
            <>
              {cart.map((line) => (
                <div key={line.product.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{line.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${(line.quantity * line.product.price).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="size-11 shrink-0"
                    onClick={() =>
                      updateQuantity(
                        line.product.id,
                        line.quantity - (line.product.sale_type === 'weight' ? 0.5 : 1),
                      )
                    }
                  >
                    <Minus />
                  </Button>
                  <div className="relative shrink-0">
                    <Input
                      className="h-11 w-28 pr-9 text-center text-base"
                      type="number"
                      inputMode={line.product.sale_type === 'weight' ? 'decimal' : 'numeric'}
                      step={line.product.sale_type === 'weight' ? '0.001' : '1'}
                      value={line.quantity}
                      onChange={(e) => updateQuantity(line.product.id, Number(e.target.value) || 0)}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
                      {line.product.unit}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="size-11 shrink-0"
                    onClick={() =>
                      updateQuantity(
                        line.product.id,
                        line.quantity + (line.product.sale_type === 'weight' ? 0.5 : 1),
                      )
                    }
                  >
                    <Plus />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    onClick={() => updateQuantity(line.product.id, 0)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-semibold">
                <span>Total</span>
                <span style={{ fontFamily: 'var(--font-display)' }} className="text-2xl text-primary">
                  ${total.toFixed(2)}
                </span>
              </div>
              <Button onClick={openCheckout}>Cobrar</Button>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Cobrar</SheetTitle>
            {discountAmount > 0 && (
              <SheetDescription>
                Subtotal: ${total.toFixed(2)} · Descuento: -${discountAmount.toFixed(2)}
              </SheetDescription>
            )}
          </SheetHeader>
          {/* BRANDING.md §8: el total en la pantalla de cobro es el
              elemento visualmente más importante — H0/Handjet/--primary. */}
          <div className="flex flex-col items-center gap-0.5 border-b border-border px-4 pb-4">
            <span className="text-caption text-muted-foreground">Total a pagar</span>
            <span className="text-h0 text-primary">${amountDue.toFixed(2)}</span>
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto px-4">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="sale-discount" help={fieldHelp.sales.discount}>
                Descuento
              </FieldLabel>
              <Input
                id="sale-discount"
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="sale-client" help={fieldHelp.salesClient.client}>
                Cliente
              </FieldLabel>
              <Select value={clientId || 'none'} onValueChange={(v) => setClientId(v === 'none' ? '' : (v ?? ''))}>
                <SelectTrigger id="sale-client" className="w-full">
                  <SelectValue>
                    {(value: unknown) =>
                      clients.find((c) => c.id === value)?.name ?? 'Sin cliente'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {payments.map((payment, index) => (
              <div key={payment.id} className="flex flex-col gap-2 border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor={`method-${payment.id}`} help={fieldHelp.sales.paymentMethod}>
                    Método de pago
                  </FieldLabel>
                  {payments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="Quitar método de pago"
                      onClick={() =>
                        setPayments((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  )}
                </div>
                <Select
                  value={payment.paymentMethodId}
                  onValueChange={(v) =>
                    setPayments((prev) =>
                      prev.map((p, i) => (i === index ? { ...p, paymentMethodId: v ?? '' } : p)),
                    )
                  }
                >
                  <SelectTrigger id={`method-${payment.id}`} className="w-full">
                    <SelectValue>
                      {(value: unknown) =>
                        paymentMethods.find((m) => m.id === value)?.label ?? 'Selecciona un medio'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldLabel htmlFor={`amount-${payment.id}`} help={fieldHelp.sales.paymentAmount}>
                  Monto
                </FieldLabel>
                <Input
                  id={`amount-${payment.id}`}
                  type="number"
                  step="0.01"
                  value={payment.amount}
                  onChange={(e) =>
                    setPayments((prev) =>
                      prev.map((p, i) => (i === index ? { ...p, amount: e.target.value } : p)),
                    )
                  }
                />
                {paymentMethods.find((m) => m.id === payment.paymentMethodId)?.is_credit && (
                  <>
                    <FieldLabel
                      htmlFor={`commitment-${payment.id}`}
                      help={fieldHelp.salesClient.commitmentDate}
                    >
                      Fecha de compromiso
                    </FieldLabel>
                    <Input
                      id={`commitment-${payment.id}`}
                      type="date"
                      value={payment.commitmentDate}
                      onChange={(e) =>
                        setPayments((prev) =>
                          prev.map((p, i) =>
                            i === index ? { ...p, commitmentDate: e.target.value } : p,
                          ),
                        )
                      }
                    />
                    <div className="flex gap-2">
                      {quickCommitmentDates.map((q) => (
                        <Button
                          key={q.label}
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const date = new Date()
                            date.setDate(date.getDate() + q.days)
                            const iso = date.toISOString().slice(0, 10)
                            setPayments((prev) =>
                              prev.map((p, i) => (i === index ? { ...p, commitmentDate: iso } : p)),
                            )
                          }}
                        >
                          {q.label}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setPayments((prev) =>
                            prev.map((p, i) => (i === index ? { ...p, commitmentDate: '' } : p)),
                          )
                        }
                      >
                        {NEXT_VISIT}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addPaymentLine}>
              <Plus /> Agregar método de pago
            </Button>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {remaining > 0.01 ? 'Falta por pagar' : remaining < -0.01 ? 'Cambio' : 'Cubierto'}
              </span>
              <span className="font-medium">${Math.abs(remaining).toFixed(2)}</span>
            </div>
          </div>
          <SheetFooter>
            <Button onClick={confirmSale} disabled={submitting || Math.abs(remaining) > 0.01}>
              {submitting ? 'Guardando…' : 'Confirmar venta'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!lastSale} onOpenChange={(open) => !open && setLastSale(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Venta registrada</SheetTitle>
            <SheetDescription>Comparte el ticket con el cliente.</SheetDescription>
          </SheetHeader>
          {lastSale && (
            <div className="flex flex-col items-center gap-4 overflow-y-auto px-4">
              <Ticket
                ref={ticketRef}
                companyName={profile?.companyName ?? ''}
                logoUrl={ticketSettings.logoUrl}
                message={ticketSettings.message}
                date={lastSale.date}
                items={lastSale.items}
                payments={lastSale.payments}
                subtotal={lastSale.subtotal}
                discount={lastSale.discount}
                total={lastSale.total}
              />
            </div>
          )}
          <SheetFooter>
            <Button onClick={() => shareImage('ticket.png', 'Ticket')}>
              <Share2 /> Compartir ticket
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      </div>
    </div>
  )
}
