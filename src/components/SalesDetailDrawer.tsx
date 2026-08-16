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
  methods: string[]
}

const methodLabel: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
}

export function SalesDetailDrawer({
  open,
  onOpenChange,
  title,
  sales,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  sales: SaleDetailRow[]
}) {
  return (
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
                      <span className="font-medium tabular-nums">${net.toFixed(2)}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>
                        {sale.clientName ?? 'Sin cliente'} ·{' '}
                        {sale.methods.map((m) => methodLabel[m] ?? m).join(' + ')}
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
  )
}
