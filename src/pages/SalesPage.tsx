import { useEffect, useMemo, useRef, useState } from 'react'
import { sileo } from 'sileo'
import html2canvas from 'html2canvas'
import { Minus, Plus, Trash2, ShoppingCart, Share2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useBranchContext } from '@/lib/use-branch-context'
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

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit'
type PaymentLine = { id: string; method: PaymentMethod; amount: string; commitmentDate: string }
type Client = { id: string; name: string }

const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
}

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
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [payments, setPayments] = useState<PaymentLine[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState<string>('')
  const [ticketSettings, setTicketSettings] = useState<{ logoUrl: string | null; message: string | null }>({
    logoUrl: null,
    message: null,
  })
  const [lastSale, setLastSale] = useState<{
    date: Date
    items: { name: string; quantity: number; unit: string; unitPrice: number }[]
    payments: { method: string; amount: number }[]
    total: number
  } | null>(null)
  const ticketRef = useRef<HTMLDivElement>(null)

  const hasCredit = payments.some((p) => p.method === 'credit')

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity * line.product.price, 0),
    [cart],
  )
  const paid = useMemo(
    () => payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments],
  )
  const remaining = Math.round((total - paid) * 100) / 100

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
    setPayments([{ id: crypto.randomUUID(), method: 'cash', amount: total.toFixed(2), commitmentDate: '' }])
    setCheckoutOpen(true)
  }

  function addPaymentLine() {
    setPayments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        method: 'cash',
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
      payments.map((p) => ({
        sale_id: sale.id,
        method: p.method,
        amount: Number(p.amount) || 0,
        commitment_date: p.method === 'credit' && p.commitmentDate ? p.commitmentDate : null,
      })),
    )

    if (paymentsError) {
      sileo.error({ title: paymentsError.message })
      setSubmitting(false)
      return
    }

    sileo.success({ title: `Venta registrada por $${total.toFixed(2)}` })
    setLastSale({
      date: new Date(),
      items: cart.map((line) => ({
        name: line.product.name,
        quantity: line.quantity,
        unit: line.product.unit,
        unitPrice: line.product.price,
      })),
      payments: payments.map((p) => ({ method: p.method, amount: Number(p.amount) || 0 })),
      total,
    })
    setCart([])
    setPayments([])
    setClientId('')
    setCheckoutOpen(false)
    setSubmitting(false)
  }

  async function shareTicket() {
    if (!ticketRef.current) return
    const canvas = await html2canvas(ticketRef.current, { backgroundColor: '#ffffff' })
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'ticket.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Ticket' })
        } catch {
          // user cancelled the share sheet — not an error
        }
      } else {
        sileo.info({ title: 'Mantén presionada la imagen del ticket para guardarla.' })
      }
    })
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
                    size="icon-sm"
                    onClick={() =>
                      updateQuantity(
                        line.product.id,
                        line.quantity - (line.product.sale_type === 'weight' ? 0.5 : 1),
                      )
                    }
                  >
                    <Minus />
                  </Button>
                  <Input
                    className="w-16 text-center"
                    type="number"
                    step={line.product.sale_type === 'weight' ? '0.001' : '1'}
                    value={line.quantity}
                    onChange={(e) => updateQuantity(line.product.id, Number(e.target.value) || 0)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
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
                    size="icon-sm"
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
            <SheetDescription>Total a pagar: ${total.toFixed(2)}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4">
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
                <FieldLabel htmlFor={`method-${payment.id}`} help={fieldHelp.sales.paymentMethod}>
                  Método de pago
                </FieldLabel>
                <Select
                  value={payment.method}
                  onValueChange={(v) =>
                    setPayments((prev) =>
                      prev.map((p, i) => (i === index ? { ...p, method: v as PaymentMethod } : p)),
                    )
                  }
                >
                  <SelectTrigger id={`method-${payment.id}`} className="w-full">
                    <SelectValue>
                      {(value: unknown) => paymentMethodLabel[value as PaymentMethod]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
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
                {payment.method === 'credit' && (
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
                total={lastSale.total}
              />
            </div>
          )}
          <SheetFooter>
            <Button onClick={shareTicket}>
              <Share2 /> Compartir ticket
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      </div>
    </div>
  )
}
