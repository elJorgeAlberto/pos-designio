import { useEffect, useState } from 'react'
import { sileo } from 'sileo'
import { Ban } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Sale = {
  id: string
  created_at: string
  total: number
  discount_amount: number
  voided_at: string | null
}

export function SalesHistoryPage() {
  const { session, hasPermission } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function loadSales() {
    setLoading(true)
    const { data, error } = await supabase
      .from('sales')
      .select('id, created_at, total, discount_amount, voided_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) sileo.error({ title: 'No se pudieron cargar las ventas.' })
    setSales(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadSales()
  }, [])

  async function confirmVoid() {
    if (!voidTarget || !session) return
    setSubmitting(true)

    const { error } = await supabase
      .from('sales')
      .update({ voided_at: new Date().toISOString(), voided_by: session.user.id })
      .eq('id', voidTarget.id)

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Venta cancelada. El stock ya se repuso.' })
      setVoidTarget(null)
      loadSales()
    }
    setSubmitting(false)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 style={{ fontFamily: 'var(--font-heading)' }} className="text-2xl font-semibold">
        Historial de ventas
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Últimas ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : sales.length === 0 ? (
            <p className="text-muted-foreground">Todavía no hay ventas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{new Date(sale.created_at).toLocaleString('es-MX')}</TableCell>
                    <TableCell>${(sale.total - sale.discount_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      {sale.voided_at ? (
                        <span className="text-destructive">Cancelada</span>
                      ) : (
                        <span className="text-success">Completada</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!sale.voided_at && hasPermission('sales.void') && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setVoidTarget(sale)}
                        >
                          <Ban className="text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!voidTarget} onOpenChange={(open) => !open && setVoidTarget(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Cancelar venta</SheetTitle>
            <SheetDescription>
              {voidTarget &&
                `Venta del ${new Date(voidTarget.created_at).toLocaleString('es-MX')} por $${(voidTarget.total - voidTarget.discount_amount).toFixed(2)}.`}{' '}
              El stock vendido se repone automáticamente. Esta acción queda registrada.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <Button variant="destructive" onClick={confirmVoid} disabled={submitting}>
              {submitting ? 'Cancelando…' : 'Confirmar cancelación'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
