import { useEffect, useState } from 'react'
import { sileo } from 'sileo'
import { supabase } from '@/lib/supabase'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

type BranchStock = { branch_id: string; branchName: string; quantity: number }
type Movement = {
  id: string
  type: string
  quantity: number
  note: string | null
  branchName: string
  created_at: string
}

const typeLabel: Record<string, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  transfer_in: 'Entrada por traspaso',
  transfer_out: 'Salida por traspaso',
  adjustment: 'Ajuste manual',
}

export function ProductStockSheet({
  open,
  onOpenChange,
  productId,
  productName,
  unit,
  onAdjusted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string | null
  productName: string
  unit: string
  onAdjusted: () => void
}) {
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [branchStock, setBranchStock] = useState<BranchStock[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [branchId, setBranchId] = useState('')
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    if (!productId) return
    setLoading(true)

    const { data: branchRows } = await supabase.from('branches').select('id, name').order('name')
    setBranches(branchRows ?? [])
    if (branchRows && branchRows.length > 0 && !branchId) setBranchId(branchRows[0].id)

    const { data: stockRows } = await supabase
      .from('product_stock')
      .select('branch_id, quantity, branch:branches(name)')
      .eq('product_id', productId)

    setBranchStock(
      (stockRows ?? []).map((s) => {
        const branch = Array.isArray(s.branch) ? s.branch[0] : s.branch
        return { branch_id: s.branch_id, branchName: branch?.name ?? '—', quantity: s.quantity }
      }),
    )

    const { data: movementRows } = await supabase
      .from('inventory_movements')
      .select('id, type, quantity, note, created_at, branch:branches(name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50)

    setMovements(
      (movementRows ?? []).map((m) => {
        const branch = Array.isArray(m.branch) ? m.branch[0] : m.branch
        return {
          id: m.id,
          type: m.type,
          quantity: m.quantity,
          note: m.note,
          branchName: branch?.name ?? '—',
          created_at: m.created_at,
        }
      }),
    )
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      setDelta('')
      setReason('')
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId])

  async function submitAdjustment() {
    if (!productId || !branchId || !delta) return
    setSubmitting(true)

    const { error } = await supabase.from('inventory_movements').insert({
      product_id: productId,
      branch_id: branchId,
      type: 'adjustment',
      quantity: Number(delta),
      note: reason || null,
    })

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Existencia ajustada.' })
      setDelta('')
      setReason('')
      load()
      onAdjusted()
    }
    setSubmitting(false)
  }

  const totalStock = branchStock.reduce((sum, b) => sum + b.quantity, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Existencia — {productName}</SheetTitle>
          <SheetDescription>
            Total: {totalStock} {unit}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <>
              {branches.length > 1 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Por sucursal</span>
                  {branchStock.map((b) => (
                    <div key={b.branch_id} className="flex justify-between text-sm">
                      <span>{b.branchName}</span>
                      <span className="tabular-nums">
                        {b.quantity} {unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <span className="text-sm font-medium">Ajustar existencia</span>
                {branches.length > 1 && (
                  <>
                    <FieldLabel htmlFor="adjust-branch" help={fieldHelp.products.stockBranch}>
                      Sucursal
                    </FieldLabel>
                    <Select value={branchId} onValueChange={(v) => setBranchId(v ?? '')}>
                      <SelectTrigger id="adjust-branch" className="w-full">
                        <SelectValue>
                          {(v: unknown) => branches.find((b) => b.id === v)?.name ?? 'Selecciona'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
                <FieldLabel htmlFor="adjust-delta" help={fieldHelp.products.stockDelta}>
                  Cantidad (+ entra, − sale)
                </FieldLabel>
                <Input
                  id="adjust-delta"
                  type="number"
                  step="0.001"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  placeholder={`ej. -0.5 (merma) o 10 (${unit})`}
                />
                <FieldLabel htmlFor="adjust-reason" help={fieldHelp.products.stockReason}>
                  Motivo
                </FieldLabel>
                <Input
                  id="adjust-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Merma, conteo físico, etc."
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting || !delta || !branchId}
                  onClick={submitAdjustment}
                >
                  {submitting ? 'Guardando…' : 'Registrar ajuste'}
                </Button>
              </div>

              <div className="flex flex-col gap-1 border-t border-border pt-4">
                <span className="text-sm font-medium">Historial de movimientos</span>
                {movements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
                ) : (
                  movements.map((m) => (
                    <div key={m.id} className="flex items-baseline justify-between border-b border-border py-2 text-sm">
                      <div>
                        <p>
                          {typeLabel[m.type] ?? m.type}
                          {m.note && ` · ${m.note}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.branchName} · {new Date(m.created_at).toLocaleString('es-MX')}
                        </p>
                      </div>
                      <span className={m.quantity >= 0 ? 'text-success' : 'text-destructive'}>
                        {m.quantity >= 0 ? '+' : ''}
                        {m.quantity} {unit}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
        <SheetFooter />
      </SheetContent>
    </Sheet>
  )
}
