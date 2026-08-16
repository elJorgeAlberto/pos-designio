import { useEffect, useState, type FormEvent } from 'react'
import { sileo } from 'sileo'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
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
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ProductRow = {
  id: string
  name: string
  sale_type: string
  unit: string
  barcode: string | null
  cost: number
  price: number
  product_stock: { quantity: number }[]
}

const emptyForm = {
  name: '',
  saleType: 'piece' as 'piece' | 'weight',
  unit: 'pz',
  barcode: '',
  cost: '',
  price: '',
  initialStock: '',
}

export function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [branchId, setBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  async function loadProducts() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('id, name, sale_type, unit, barcode, cost, price, product_stock(quantity)')
      .order('name')

    if (fetchError) {
      sileo.error({ title: 'No se pudieron cargar los productos.' })
    } else {
      setProducts(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()

    supabase
      .from('user_branches')
      .select('branch_id')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setBranchId(data?.branch_id ?? null))
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({
        name: form.name,
        sale_type: form.saleType,
        unit: form.unit,
        barcode: form.barcode || null,
        cost: Number(form.cost) || 0,
        price: Number(form.price) || 0,
      })
      .select('id')
      .single()

    if (insertError || !product) {
      sileo.error({ title: insertError?.message ?? 'No se pudo crear el producto.' })
      setSubmitting(false)
      return
    }

    const stockQty = Number(form.initialStock) || 0
    if (stockQty > 0 && branchId) {
      const { error: movementError } = await supabase.from('inventory_movements').insert({
        product_id: product.id,
        branch_id: branchId,
        type: 'adjustment',
        quantity: stockQty,
      })
      if (movementError) sileo.error({ title: movementError.message })
    }

    sileo.success({ title: `"${form.name}" se agregó al catálogo.` })
    setForm(emptyForm)
    setSubmitting(false)
    setOpen(false)
    loadProducts()
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: 'var(--font-heading)' }} className="text-2xl font-semibold">
          Productos
        </h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button>
                <Plus /> Nuevo producto
              </Button>
            }
          />
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Nuevo producto</SheetTitle>
              <SheetDescription>Se agrega al catálogo de la empresa.</SheetDescription>
            </SheetHeader>
            <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto px-4">
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="name" help={fieldHelp.products.name}>
                  Nombre
                </FieldLabel>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="sale-type" help={fieldHelp.products.saleType}>
                  Tipo de venta
                </FieldLabel>
                <Select
                  value={form.saleType}
                  onValueChange={(v) => setForm({ ...form, saleType: v as 'piece' | 'weight' })}
                >
                  <SelectTrigger id="sale-type" className="w-full">
                    <SelectValue>
                      {(value: unknown) => (value === 'weight' ? 'Por peso' : 'Por pieza')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">Por pieza</SelectItem>
                    <SelectItem value="weight">Por peso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="unit" help={fieldHelp.products.unit}>
                  Unidad (pz, kg, …)
                </FieldLabel>
                <Input
                  id="unit"
                  required
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="barcode" help={fieldHelp.products.barcode}>
                  Código de barras
                </FieldLabel>
                <Input
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="stock" help={fieldHelp.products.initialStock}>
                  Stock inicial
                </FieldLabel>
                <Input
                  id="stock"
                  type="number"
                  step="0.001"
                  value={form.initialStock}
                  onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="cost" help={fieldHelp.products.cost}>
                  Costo
                </FieldLabel>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  required
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="price" help={fieldHelp.products.price}>
                  Precio
                </FieldLabel>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
            </form>
            <SheetFooter>
              <Button type="submit" form="product-form" disabled={submitting}>
                {submitting ? 'Guardando…' : 'Agregar producto'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : products.length === 0 ? (
            <p className="text-muted-foreground">Todavía no hay productos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.sale_type === 'piece' ? 'Pieza' : 'Peso'}</TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>${product.cost.toFixed(2)}</TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {product.product_stock.reduce((sum, s) => sum + s.quantity, 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
