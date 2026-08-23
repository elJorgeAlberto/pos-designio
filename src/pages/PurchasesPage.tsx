import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { sileo } from 'sileo'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBranchContext } from '@/lib/use-branch-context'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { TablePagination } from '@/components/TablePagination'
import { usePagination } from '@/lib/use-pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Supplier = { id: string; name: string }
type Product = { id: string; name: string; unit: string; cost: number }
type PurchaseLine = { id: string; productId: string; quantity: string; unitCost: string }
type PurchaseRow = { id: string; total: number; created_at: string; supplierName: string }

export function PurchasesPage() {
  const { branchId } = useBranchContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [purchases, setPurchases] = useState<PurchaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [supplierId, setSupplierId] = useState(searchParams.get('supplier') ?? '')
  const [lines, setLines] = useState<PurchaseLine[]>([
    { id: crypto.randomUUID(), productId: '', quantity: '', unitCost: '' },
  ])

  async function loadPurchases() {
    setLoading(true)
    const { data, error } = await supabase
      .from('purchases')
      .select('id, total, created_at, supplier:suppliers(name)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      sileo.error({ title: 'No se pudieron cargar las compras.' })
    } else {
      setPurchases(
        (data ?? []).map((p) => {
          const supplier = Array.isArray(p.supplier) ? p.supplier[0] : p.supplier
          return { id: p.id, total: p.total, created_at: p.created_at, supplierName: supplier?.name ?? '—' }
        }),
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    supabase.from('suppliers').select('id, name').eq('active', true).order('name').then(({ data }) => setSuppliers(data ?? []))
    supabase.from('products').select('id, name, unit, cost').order('name').then(({ data }) => setProducts(data ?? []))
    loadPurchases()
    if (searchParams.get('supplier')) setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addLine() {
    setLines((prev) => [...prev, { id: crypto.randomUUID(), productId: '', quantity: '', unitCost: '' }])
  }

  function updateLine(id: string, patch: Partial<PurchaseLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const purchaseTotal = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0)

  async function confirmPurchase() {
    if (!supplierId || !branchId) {
      sileo.warning({ title: 'Selecciona un proveedor.' })
      return
    }
    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0 && Number(l.unitCost) >= 0)
    if (validLines.length === 0) {
      sileo.warning({ title: 'Agrega al menos un producto con cantidad y costo.' })
      return
    }
    setSubmitting(true)

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({ supplier_id: supplierId, branch_id: branchId })
      .select('id')
      .single()

    if (purchaseError || !purchase) {
      sileo.error({ title: purchaseError?.message ?? 'No se pudo registrar la compra.' })
      setSubmitting(false)
      return
    }

    const { error: itemsError } = await supabase.from('purchase_items').insert(
      validLines.map((l) => ({
        purchase_id: purchase.id,
        product_id: l.productId,
        quantity: Number(l.quantity),
        unit_cost: Number(l.unitCost),
      })),
    )

    if (itemsError) {
      sileo.error({ title: itemsError.message })
      setSubmitting(false)
      return
    }

    sileo.success({ title: 'Compra registrada — la existencia ya se actualizó.' })
    setLines([{ id: crypto.randomUUID(), productId: '', quantity: '', unitCost: '' }])
    loadPurchases()
    setSubmitting(false)
  }

  const { page, setPage, totalPages, pageItems: pagedPurchases } = usePagination(purchases)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-h1">Compras</h1>

      <Card>
        <CardHeader>
          <CardTitle>Nueva compra</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="purchase-supplier" help={fieldHelp.suppliers.name}>
              Proveedor
            </FieldLabel>
            <Select value={supplierId || 'none'} onValueChange={(v) => setSupplierId(v === 'none' ? '' : (v ?? ''))}>
              <SelectTrigger id="purchase-supplier" className="w-full">
                <SelectValue>
                  {(v: unknown) => suppliers.find((s) => s.id === v)?.name ?? 'Selecciona un proveedor'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecciona un proveedor</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {lines.map((line) => (
            <div key={line.id} className="flex flex-col gap-2 border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor={`product-${line.id}`} help={fieldHelp.suppliers.purchaseProduct}>
                  Producto
                </FieldLabel>
                {lines.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                )}
              </div>
              <Select
                value={line.productId || 'none'}
                onValueChange={(v) => {
                  const product = products.find((p) => p.id === v)
                  updateLine(line.id, {
                    productId: v === 'none' ? '' : (v ?? ''),
                    unitCost: product ? String(product.cost) : line.unitCost,
                  })
                }}
              >
                <SelectTrigger id={`product-${line.id}`} className="w-full">
                  <SelectValue>
                    {(v: unknown) => products.find((p) => p.id === v)?.name ?? 'Selecciona un producto'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecciona un producto</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor={`qty-${line.id}`} help={fieldHelp.suppliers.purchaseQuantity}>
                    Cantidad
                  </FieldLabel>
                  <Input
                    id={`qty-${line.id}`}
                    type="number"
                    step="0.001"
                    inputMode="decimal"
                    value={line.quantity}
                    onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor={`cost-${line.id}`} help={fieldHelp.suppliers.purchaseCost}>
                    Costo unitario
                  </FieldLabel>
                  <Input
                    id={`cost-${line.id}`}
                    type="number"
                    step="0.01"
                    value={line.unitCost}
                    onChange={(e) => updateLine(line.id, { unitCost: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={addLine}>
            <Plus /> Agregar producto
          </Button>
          <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-semibold">
            <span>Total</span>
            <span>${purchaseTotal.toFixed(2)}</span>
          </div>
          <Button onClick={confirmPurchase} disabled={submitting}>
            {submitting ? 'Guardando…' : 'Confirmar compra'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compras recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : purchases.length === 0 ? (
            <p className="text-muted-foreground">Todavía no hay compras registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedPurchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.created_at).toLocaleString('es-MX')}</TableCell>
                    <TableCell>{p.supplierName}</TableCell>
                    <TableCell>${p.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
