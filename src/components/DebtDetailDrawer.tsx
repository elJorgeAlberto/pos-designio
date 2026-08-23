import { useEffect, useState } from 'react'
import { sileo } from 'sileo'
import { Receipt } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseLocalDate } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import type { DebtCommitment } from '@/components/CollectDebtSheet'

type Detail = {
  id: string
  amount: number
  due_date: string | null
  status: 'pending' | 'paid' | 'renegotiated' | 'cancelled'
  note: string | null
  created_at: string
  resolved_at: string | null
  sale_id: string | null
}

type CollectionRow = { id: string; amount: number; created_at: string }

const statusLabel: Record<Detail['status'], string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  renegotiated: 'Renegociado',
  cancelled: 'Cancelado',
}

export function DebtDetailDrawer({
  open,
  onOpenChange,
  commitmentId,
  onCollect,
  onViewSale,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  commitmentId: string | null
  onCollect: (commitment: DebtCommitment) => void
  onViewSale: (saleId: string) => void
}) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [collections, setCollections] = useState<CollectionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open || !commitmentId) return
    setLoading(true)

    supabase
      .from('debt_commitments')
      .select('id, amount, due_date, status, note, created_at, resolved_at, sale_id')
      .eq('id', commitmentId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          sileo.error({ title: 'No se pudo cargar el adeudo.' })
          return
        }
        setDetail(data as Detail)
      })

    supabase
      .from('collections')
      .select('id, amount, created_at')
      .eq('debt_commitment_id', commitmentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCollections(data ?? [])
        setLoading(false)
      })
  }, [open, commitmentId])

  const overdue =
    detail?.status === 'pending' && detail.due_date && parseLocalDate(detail.due_date) < new Date()

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Detalle del adeudo</DrawerTitle>
          <DrawerDescription>
            {detail && `Creado el ${new Date(detail.created_at).toLocaleDateString('es-MX')}`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4">
          {loading || !detail ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-h2">${detail.amount.toFixed(2)}</p>
                  <p className={overdue ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
                    {detail.due_date
                      ? `Compromiso: ${parseLocalDate(detail.due_date).toLocaleDateString('es-MX')}${overdue ? ' (atrasado)' : ''}`
                      : 'Sin fecha de compromiso'}
                  </p>
                </div>
                <span
                  className={
                    detail.status === 'pending'
                      ? overdue
                        ? 'text-destructive'
                        : 'text-azafran'
                      : detail.status === 'paid'
                        ? 'text-success'
                        : 'text-muted-foreground'
                  }
                >
                  {statusLabel[detail.status]}
                </span>
              </div>

              {detail.note && (
                <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{detail.note}</p>
              )}

              {detail.sale_id && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => detail.sale_id && onViewSale(detail.sale_id)}
                >
                  <Receipt /> Ver venta relacionada
                </Button>
              )}

              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <span className="text-sm font-medium">Abonos registrados</span>
                {collections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin abonos todavía.</p>
                ) : (
                  collections.map((c) => (
                    <div key={c.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString('es-MX')}
                      </span>
                      <span>${c.amount.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
        {detail?.status === 'pending' && (
          <DrawerFooter>
            <Button
              type="button"
              onClick={() => onCollect({ id: detail.id, amount: detail.amount, due_date: detail.due_date })}
            >
              Cobrar
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}
