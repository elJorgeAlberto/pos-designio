import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [branchId, setBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [saleType, setSaleType] = useState<'piece' | 'weight'>('piece')
  const [unit, setUnit] = useState('pz')
  const [barcode, setBarcode] = useState('')
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [initialStock, setInitialStock] = useState('')

  async function loadProducts() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('id, name, sale_type, unit, barcode, cost, price, product_stock(quantity)')
      .order('name')

    if (fetchError) {
      setError(fetchError.message)
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
    setError(null)

    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({
        name,
        sale_type: saleType,
        unit,
        barcode: barcode || null,
        cost: Number(cost) || 0,
        price: Number(price) || 0,
      })
      .select('id')
      .single()

    if (insertError || !product) {
      setError(insertError?.message ?? 'No se pudo crear el producto.')
      setSubmitting(false)
      return
    }

    const stockQty = Number(initialStock) || 0
    if (stockQty > 0 && branchId) {
      const { error: movementError } = await supabase.from('inventory_movements').insert({
        product_id: product.id,
        branch_id: branchId,
        type: 'adjustment',
        quantity: stockQty,
      })
      if (movementError) setError(movementError.message)
    }

    setName('')
    setSaleType('piece')
    setUnit('pz')
    setBarcode('')
    setCost('')
    setPrice('')
    setInitialStock('')
    setSubmitting(false)
    loadProducts()
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo producto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tipo de venta</Label>
              <Select value={saleType} onValueChange={(v) => setSaleType(v as 'piece' | 'weight')}>
                <SelectTrigger>
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
              <Label htmlFor="unit">Unidad (pz, kg, …)</Label>
              <Input id="unit" required value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="barcode">Código de barras (opcional)</Label>
              <Input id="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="stock">Stock inicial</Label>
              <Input
                id="stock"
                type="number"
                step="0.001"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cost">Costo</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                required
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Precio</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            {error && <p className="col-span-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting} className="col-span-2">
              {submitting ? 'Guardando…' : 'Agregar producto'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
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
