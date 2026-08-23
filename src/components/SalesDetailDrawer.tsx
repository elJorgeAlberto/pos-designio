import { useState } from 'react'
import { sileo } from 'sileo'
import { Ban } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export type SaleDetailRow = {
  id: string
  createdAt: string
  total: number
  discount: number
  cost: number
  clientName: string | null
  // Already-resolved payment method labels (the caller joins
  // payment_methods to get these — this component doesn't look up
  // codes, since custom tenant-created methods have no static mapping).
  methods: string[]
}

export function SalesDetailDrawer({
  open,
  onOpenChange,
  title,
  sales,
  onVoided,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  sales: SaleDetailRow[]
  onVoided?: () => void
}) {
  const { session, hasPermission } = useAuth()
  const [pendingVoidId, setPendingVoidId] = useState<string | null>(null)
  const [voiding, setVoiding] = useState(false)

  async function confirmVoid(saleId: string) {
    if (!session) return
    setVoiding(true)
    const { error } = await supabase
      .from('sales')
      .update({ voided_at: new Date().toISOString(), voided_by: session.user.id })
      .eq('id', saleId)

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Venta cancelada. El stock ya se repuso.' })
      setPendingVoidId(null)
      onVoided?.()
    }
    setVoiding(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{sales.length} venta(s) en el periodo seleccionado.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 overflow-y-auto px-4">
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin ventas en este periodo.</p>
          ) : (
            sales
              .slice()
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((sale) => {
                const net = sale.total - sale.discount
                const profit = net - sale.cost
                return (
                  <div key={sale.id} className="flex flex-col gap-1 border-b border-border pb-3 text-sm">
                    <div className="flex items-baseline justify-between">
                      <span>{new Date(sale.createdAt).toLocaleString('es-MX')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium tabular-nums">${net.toFixed(2)}</span>
                        {hasPermission('sales.void') && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Cancelar venta"
                            onClick={() => setPendingVoidId(sale.id)}
                          >
                            <Ban className="text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>
                        {sale.clientName ?? 'Sin cliente'} ·{' '}
                        {sale.methods.join(' + ')}
                        {sale.discount > 0 && ` · Descuento $${sale.discount.toFixed(2)}`}
                      </span>
                      <span className={profit >= 0 ? 'text-success' : 'text-destructive'}>
                        Utilidad ${profit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )
              })
          )}
        </div>
      </SheetContent>
      </Sheet>

      <AlertDialog
        open={pendingVoidId != null}
        onOpenChange={(o) => !o && setPendingVoidId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta venta?</AlertDialogTitle>
            <AlertDialogDescription>El stock de los productos vendidos se repone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={voiding}
              onClick={() => pendingVoidId && confirmVoid(pendingVoidId)}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
