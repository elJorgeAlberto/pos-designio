import { useEffect, useMemo, useState } from 'react'
import { sileo } from 'sileo'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { ProductStockSheet } from '@/components/ProductStockSheet'
import { TablePagination } from '@/components/TablePagination'
import { usePagination } from '@/lib/use-pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

type ProductRow = { id: string; name: string; unit: string; min_stock: number | null; stock: number }
type Branch = { id: string; name: string }
type Product = { id: string; name: string; unit: string }
type TransferLine = { id: string; productId: string; quantity: string }
type MovementRow = {
  type: string
  quantity: number
  reference_id: string | null
  created_at: string
  productName: string
  branchName: string
}
type TransferGroup = {
  referenceId: string
  created_at: string
  fromBranch: string
  toBranch: string
  lines: { productName: string; quantity: number }[]
}

export function InventoryPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [stockTarget, setStockTarget] = useState<ProductRow | null>(null)

  const [branches, setBranches] = useState<Branch[]>([])
  const [productOptions, setProductOptions] = useState<Product[]>([])
  const [movements, setMovements] = useState<MovementRow[]>([])
  const [loadingTransfers, setLoadingTransfers] = useState(true)
  const [fromBranchId, setFromBranchId] = useState('')
  const [toBranchId, setToBranchId] = useState('')
  const [transferLines, setTransferLines] = useState<TransferLine[]>([
    { id: crypto.randomUUID(), productId: '', quantity: '' },
  ])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadProducts() {
    setLoadingProducts(true)
    const { data, error } = await supabase
      .from('products')
      .select('id, name, unit, min_stock, product_stock(quantity)')
      .order('name')
    if (error) {
      sileo.error({ title: 'No se pudo cargar la existencia.' })
    } else {
      setProducts(
        (data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          min_stock: p.min_stock,
          stock: p.product_stock.reduce((sum, s) => sum + s.quantity, 0),
        })),
      )
    }
    setLoadingProducts(false)
  }

  async function loadTransfers() {
    setLoadingTransfers(true)
    const { data: branchRows } = await supabase.from('branches').select('id, name').order('name')
    setBranches(branchRows ?? [])
    if (branchRows && branchRows.length >= 2 && !fromBranchId) {
      setFromBranchId(branchRows[0].id)
      setToBranchId(branchRows[1].id)
    }

    const { data: productRows } = await supabase.from('products').select('id, name, unit').order('name')
    setProductOptions(productRows ?? [])

    const { data: movementRows, error } = await supabase
      .from('inventory_movements')
      .select('type, quantity, reference_id, created_at, product:products(name), branch:branches(name)')
      .in('type', ['transfer_in', 'transfer_out'])
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) {
      sileo.error({ title: 'No se pudieron cargar los traspasos.' })
    } else {
      setMovements(
        (movementRows ?? []).map((m) => {
          const product = Array.isArray(m.product) ? m.product[0] : m.product
          const branch = Array.isArray(m.branch) ? m.branch[0] : m.branch
          return {
            type: m.type,
            quantity: m.quantity,
            reference_id: m.reference_id,
            created_at: m.created_at,
            productName: product?.name ?? '—',
            branchName: branch?.name ?? '—',
          }
        }),
      )
    }
    setLoadingTransfers(false)
  }

  useEffect(() => {
    loadProducts()
    loadTransfers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lowStockIds = useMemo(
    () => new Set(products.filter((p) => p.min_stock != null && p.stock < p.min_stock).map((p) => p.id)),
    [products],
  )

  const transferGroups = useMemo(() => {
    const groups = new Map<string, TransferGroup>()
    for (const m of movements) {
      if (!m.reference_id) continue
      let g = groups.get(m.reference_id)
      if (!g) {
        g = { referenceId: m.reference_id, created_at: m.created_at, fromBranch: '', toBranch: '', lines: [] }
        groups.set(m.reference_id, g)
      }
      if (m.type === 'transfer_out') {
        g.fromBranch = m.branchName
        g.lines.push({ productName: m.productName, quantity: Math.abs(m.quantity) })
      } else {
        g.toBranch = m.branchName
      }
    }
    return [...groups.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [movements])

  function addTransferLine() {
    setTransferLines((prev) => [...prev, { id: crypto.randomUUID(), productId: '', quantity: '' }])
  }

  function updateTransferLine(id: string, patch: Partial<TransferLine>) {
    setTransferLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  async function confirmTransfer() {
    if (!fromBranchId || !toBranchId || fromBranchId === toBranchId) {
      sileo.warning({ title: 'Selecciona dos sucursales distintas.' })
      return
    }
    const validLines = transferLines.filter((l) => l.productId && Number(l.quantity) > 0)
    if (validLines.length === 0) {
      sileo.warning({ title: 'Agrega al menos un producto con cantidad.' })
      return
    }
    setSubmitting(true)

    const referenceId = crypto.randomUUID()
    const fromName = branches.find((b) => b.id === fromBranchId)?.name ?? ''
    const toName = branches.find((b) => b.id === toBranchId)?.name ?? ''

    const rows = [
      ...validLines.map((l) => ({
        product_id: l.productId,
        branch_id: fromBranchId,
        type: 'transfer_out',
        quantity: -Number(l.quantity),
        reference_id: referenceId,
        note: note || `Traspaso a ${toName}`,
      })),
      ...validLines.map((l) => ({
        product_id: l.productId,
        branch_id: toBranchId,
        type: 'transfer_in',
        quantity: Number(l.quantity),
        reference_id: referenceId,
        note: note || `Traspaso de ${fromName}`,
      })),
    ]

    const { error } = await supabase.from('inventory_movements').insert(rows)

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Traspaso registrado.' })
      setTransferLines([{ id: crypto.randomUUID(), productId: '', quantity: '' }])
      setNote('')
      loadTransfers()
      loadProducts()
    }
    setSubmitting(false)
  }

  const { page, setPage, totalPages, pageItems: pagedProducts } = usePagination(products)
  const {
    page: transferPage,
    setPage: setTransferPage,
    totalPages: transferTotalPages,
    pageItems: pagedTransfers,
  } = usePagination(transferGroups)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-h1">Inventario</h1>

      <Tabs defaultValue="existencias">
        <TabsList className="w-full">
          <TabsTrigger value="existencias">Existencias</TabsTrigger>
          <TabsTrigger value="traspasos">Traspasos</TabsTrigger>
        </TabsList>

        <TabsContent value="existencias" className="flex flex-col gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Existencia por producto</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <p className="text-muted-foreground">Cargando…</p>
              ) : products.length === 0 ? (
                <p className="text-muted-foreground">Todavía no hay productos.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Existencia</TableHead>
                      <TableHead>Mínimo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedProducts.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => setStockTarget(p)}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>
                          {p.stock} {p.unit}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.min_stock != null ? `${p.min_stock} ${p.unit}` : '—'}
                        </TableCell>
                        <TableCell>
                          {lowStockIds.has(p.id) ? (
                            <span className="text-destructive font-medium">Bajo</span>
                          ) : (
                            <span className="text-success">Normal</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </TabsContent>

        <TabsContent value="traspasos" className="flex flex-col gap-4 pt-4">
          {branches.length < 2 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                Necesitas al menos 2 sucursales para registrar un traspaso. Crea otra desde Sucursales.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Nuevo traspaso</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <FieldLabel htmlFor="from-branch" help={fieldHelp.transfers.fromBranch}>
                      De sucursal
                    </FieldLabel>
                    <Select value={fromBranchId} onValueChange={(v) => setFromBranchId(v ?? '')}>
                      <SelectTrigger id="from-branch" className="w-full">
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
                  </div>
                  <div className="flex flex-col gap-2">
                    <FieldLabel htmlFor="to-branch" help={fieldHelp.transfers.toBranch}>
                      A sucursal
                    </FieldLabel>
                    <Select value={toBranchId} onValueChange={(v) => setToBranchId(v ?? '')}>
                      <SelectTrigger id="to-branch" className="w-full">
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
                  </div>
                </div>

                {transferLines.map((line) => (
                  <div key={line.id} className="flex flex-col gap-2 border-b border-border pb-3">
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor={`transfer-product-${line.id}`} help={fieldHelp.transfers.product}>
                        Producto
                      </FieldLabel>
                      {transferLines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setTransferLines((prev) => prev.filter((l) => l.id !== line.id))}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      )}
                    </div>
                    <Select
                      value={line.productId || 'none'}
                      onValueChange={(v) => updateTransferLine(line.id, { productId: v === 'none' ? '' : (v ?? '') })}
                    >
                      <SelectTrigger id={`transfer-product-${line.id}`} className="w-full">
                        <SelectValue>
                          {(v: unknown) => productOptions.find((p) => p.id === v)?.name ?? 'Selecciona un producto'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecciona un producto</SelectItem>
                        {productOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldLabel htmlFor={`transfer-qty-${line.id}`} help={fieldHelp.transfers.quantity}>
                      Cantidad
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id={`transfer-qty-${line.id}`}
                        className="pr-12"
                        type="number"
                        step="0.001"
                        inputMode="decimal"
                        value={line.quantity}
                        onChange={(e) => updateTransferLine(line.id, { quantity: e.target.value })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                        {productOptions.find((p) => p.id === line.productId)?.unit ?? '—'}
                      </span>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={addTransferLine}>
                  <Plus /> Agregar producto
                </Button>

                <div className="flex flex-col gap-2">
                  <FieldLabel htmlFor="transfer-note" help={fieldHelp.expenses.description}>
                    Nota
                  </FieldLabel>
                  <Input id="transfer-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
                </div>

                <Button onClick={confirmTransfer} disabled={submitting}>
                  {submitting ? 'Guardando…' : 'Confirmar traspaso'}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Historial de traspasos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {loadingTransfers ? (
                <p className="text-muted-foreground">Cargando…</p>
              ) : transferGroups.length === 0 ? (
                <p className="text-muted-foreground">Todavía no hay traspasos registrados.</p>
              ) : (
                pagedTransfers.map((g) => (
                  <div key={g.referenceId} className="flex flex-col gap-1 border-b border-border py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {g.fromBranch} → {g.toBranch}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(g.created_at).toLocaleString('es-MX')}
                      </span>
                    </div>
                    {g.lines.map((l, i) => (
                      <div key={i} className="flex justify-between text-muted-foreground">
                        <span>{l.productName}</span>
                        <span>{l.quantity}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <TablePagination page={transferPage} totalPages={transferTotalPages} onPageChange={setTransferPage} />
        </TabsContent>
      </Tabs>

      <ProductStockSheet
        open={!!stockTarget}
        onOpenChange={(o) => !o && setStockTarget(null)}
        productId={stockTarget?.id ?? null}
        productName={stockTarget?.name ?? ''}
        unit={stockTarget?.unit ?? ''}
        onAdjusted={loadProducts}
      />
    </div>
  )
}
