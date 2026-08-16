import { useEffect, useState } from 'react'
import { sileo } from 'sileo'
import { Ban, Share2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { parseLocalDate } from '@/lib/dates'
import { useShareImage } from '@/lib/use-share-image'
import { Ticket } from '@/components/Ticket'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

const methodLabel: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
}

type SaleDetail = {
  id: string
  created_at: string
  total: number
  discount_amount: number
  voided_at: string | null
  clientName: string | null
  cajeroName: string | null
  voidedByName: string | null
  items: { quantity: number; unit_price: number; unit_cost: number; name: string; unit: string }[]
  payments: { method: string; amount: number; commitment_date: string | null }[]
}

export function SaleTraceabilityDrawer({
  open,
  onOpenChange,
  saleId,
  onVoided,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  saleId: string | null
  onVoided?: () => void
}) {
  const { profile, session, hasPermission } = useAuth()
  const [sale, setSale] = useState<SaleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmingVoid, setConfirmingVoid] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [showTicket, setShowTicket] = useState(false)
  const [ticketSettings, setTicketSettings] = useState<{ logoUrl: string | null; message: string | null }>({
    logoUrl: null,
    message: null,
  })
  const { ref: ticketRef, shareImage } = useShareImage()

  useEffect(() => {
    if (!open || !saleId) return
    setLoading(true)
    setConfirmingVoid(false)
    setShowTicket(false)

    supabase
      .from('sales')
      .select(
        'id, created_at, total, discount_amount, voided_at, client:clients(name), cajero:users!sales_user_id_fkey(name), voided_by_user:users!sales_voided_by_fkey(name), sale_items(quantity, unit_price, unit_cost, product:products(name, unit)), sale_payments(method, amount, commitment_date)',
      )
      .eq('id', saleId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          sileo.error({ title: 'No se pudo cargar la venta.' })
          setLoading(false)
          return
        }
        const client = Array.isArray(data.client) ? data.client[0] : data.client
        const cajero = Array.isArray(data.cajero) ? data.cajero[0] : data.cajero
        const voidedByUser = Array.isArray(data.voided_by_user) ? data.voided_by_user[0] : data.voided_by_user
        setSale({
          id: data.id,
          created_at: data.created_at,
          total: data.total,
          discount_amount: data.discount_amount,
          voided_at: data.voided_at,
          clientName: client?.name ?? null,
          cajeroName: cajero?.name ?? null,
          voidedByName: voidedByUser?.name ?? null,
          items: data.sale_items.map((i) => {
            const product = Array.isArray(i.product) ? i.product[0] : i.product
            return {
              quantity: i.quantity,
              unit_price: i.unit_price,
              unit_cost: i.unit_cost,
              name: product?.name ?? '—',
              unit: product?.unit ?? '',
            }
          }),
          payments: data.sale_payments,
        })
        setLoading(false)
      })

    supabase
      .from('ticket_settings')
      .select('logo_url, message')
      .maybeSingle()
      .then(({ data }) => setTicketSettings({ logoUrl: data?.logo_url ?? null, message: data?.message ?? null }))
  }, [open, saleId])

  async function confirmVoid() {
    if (!sale || !session) return
    setVoiding(true)
    const { error } = await supabase
      .from('sales')
      .update({ voided_at: new Date().toISOString(), voided_by: session.user.id })
      .eq('id', sale.id)

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Venta cancelada. El stock ya se repuso.' })
      setSale({ ...sale, voided_at: new Date().toISOString() })
      setConfirmingVoid(false)
      onVoided?.()
    }
    setVoiding(false)
  }

  const net = sale ? sale.total - sale.discount_amount : 0
  const cost = sale ? sale.items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0) : 0
  const profit = net - cost

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Trazabilidad de venta</DrawerTitle>
          <DrawerDescription>
            {sale && `${new Date(sale.created_at).toLocaleString('es-MX')}`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4">
          {loading || !sale ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <>
              {sale.voided_at && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  Cancelada el {new Date(sale.voided_at).toLocaleString('es-MX')}
                  {sale.voidedByName && ` por ${sale.voidedByName}`}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p>{sale.clientName ?? 'Sin cliente'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cajero</p>
                  <p>{sale.cajeroName ?? '—'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-1 border-t border-border pt-3">
                <span className="text-sm font-medium">Productos</span>
                {sale.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>
                      {item.quantity} {item.unit} {item.name}
                    </span>
                    <span>${(item.quantity * item.unit_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
                {sale.discount_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Descuento</span>
                    <span>-${sale.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>${net.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Utilidad</span>
                  <span className={profit >= 0 ? 'text-success' : 'text-destructive'}>${profit.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 border-t border-border pt-3">
                <span className="text-sm font-medium">Pagos</span>
                {sale.payments.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>
                      {methodLabel[p.method] ?? p.method}
                      {p.commitment_date &&
                        ` · compromiso ${parseLocalDate(p.commitment_date).toLocaleDateString('es-MX')}`}
                    </span>
                    <span>${p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {showTicket && (
                <div className="flex flex-col items-center gap-2 border-t border-border pt-3">
                  <Ticket
                    ref={ticketRef}
                    companyName={profile?.companyName ?? ''}
                    logoUrl={ticketSettings.logoUrl}
                    message={ticketSettings.message}
                    date={new Date(sale.created_at)}
                    items={sale.items.map((i) => ({
                      name: i.name,
                      quantity: i.quantity,
                      unit: i.unit,
                      unitPrice: i.unit_price,
                    }))}
                    payments={sale.payments.map((p) => ({ method: p.method, amount: p.amount }))}
                    subtotal={sale.total}
                    discount={sale.discount_amount}
                    total={net}
                  />
                </div>
              )}

              {confirmingVoid && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-destructive/10 p-3 text-sm">
                  <span>¿Cancelar esta venta? El stock se repone.</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" disabled={voiding} onClick={confirmVoid}>
                      Confirmar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setConfirmingVoid(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <DrawerFooter className="flex-row gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => (showTicket ? shareImage('ticket.png', 'Ticket') : setShowTicket(true))}
          >
            <Share2 /> {showTicket ? 'Compartir ticket' : 'Ver ticket'}
          </Button>
          {sale && !sale.voided_at && hasPermission('sales.void') && (
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={() => setConfirmingVoid(true)}
            >
              <Ban /> Anular venta
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
