import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { sileo } from 'sileo'
import { Plus, Pencil, Boxes } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { CategoryPicker } from '@/components/CategoryPicker'
import { ProductImageGallery, type GalleryImage } from '@/components/ProductImageGallery'
import { ProductStockSheet } from '@/components/ProductStockSheet'
import { TablePagination } from '@/components/TablePagination'
import { usePagination } from '@/lib/use-pagination'
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
  min_stock: number | null
  category_id: string | null
  categoryName: string | null
  primaryImageUrl: string | null
  stock: number
}

const unitOptionsByType: Record<'piece' | 'weight', string[]> = {
  piece: ['pz', 'caja', 'paquete', 'docena'],
  weight: ['kg', 'g'],
}

const emptyForm = {
  name: '',
  saleType: 'piece' as 'piece' | 'weight',
  unit: 'pz',
  barcode: '',
  cost: '',
  price: '',
  marginPercent: '',
  initialStock: '',
  description: '',
  brand: '',
  sku: '',
  minStock: '',
  categoryId: null as string | null,
}

export function ProductsPage() {
  const { profile } = useAuth()
  const [products, setProducts] = useState<ProductRow[]>([])
  const [branchId, setBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [unitMode, setUnitMode] = useState<'preset' | 'custom'>('preset')
  const [images, setImages] = useState<GalleryImage[]>([])
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([])
  const [stockTarget, setStockTarget] = useState<ProductRow | null>(null)

  async function loadProducts() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('products')
      .select(
        'id, name, sale_type, unit, barcode, cost, price, min_stock, category_id, category:product_categories(name), product_stock(quantity), product_images(url, is_primary)',
      )
      .order('name')

    if (fetchError) {
      sileo.error({ title: 'No se pudieron cargar los productos.' })
    } else {
      setProducts(
        (data ?? []).map((p) => {
          const category = Array.isArray(p.category) ? p.category[0] : p.category
          const primary = p.product_images.find((img) => img.is_primary) ?? p.product_images[0]
          return {
            id: p.id,
            name: p.name,
            sale_type: p.sale_type,
            unit: p.unit,
            barcode: p.barcode,
            cost: p.cost,
            price: p.price,
            min_stock: p.min_stock,
            category_id: p.category_id,
            categoryName: category?.name ?? null,
            primaryImageUrl: primary?.url ?? null,
            stock: p.product_stock.reduce((sum, s) => sum + s.quantity, 0),
          }
        }),
      )
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

  function handleSaleTypeChange(v: 'piece' | 'weight') {
    setForm((prev) => {
      const presets = unitOptionsByType[v]
      const nextUnit = unitMode === 'preset' && !presets.includes(prev.unit) ? presets[0] : prev.unit
      return { ...prev, saleType: v, unit: nextUnit }
    })
  }

  function handleCostChange(value: string) {
    setForm((prev) => {
      const cost = Number(value) || 0
      const margin = Number(prev.marginPercent) || 0
      const price = prev.marginPercent ? (cost * (1 + margin / 100)).toFixed(2) : prev.price
      return { ...prev, cost: value, price }
    })
  }

  function handleMarginChange(value: string) {
    setForm((prev) => {
      const cost = Number(prev.cost) || 0
      const margin = Number(value) || 0
      const price = cost > 0 && value ? (cost * (1 + margin / 100)).toFixed(2) : prev.price
      return { ...prev, marginPercent: value, price }
    })
  }

  function handlePriceChange(value: string) {
    setForm((prev) => {
      const cost = Number(prev.cost) || 0
      const price = Number(value) || 0
      const margin = cost > 0 ? (((price - cost) / cost) * 100).toFixed(2) : prev.marginPercent
      return { ...prev, price: value, marginPercent: margin }
    })
  }

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setUnitMode('preset')
    setImages([])
    setRemovedImageIds([])
    setOpen(true)
  }

  async function openEditForm(product: ProductRow) {
    setEditingId(product.id)
    const presets = unitOptionsByType[product.sale_type as 'piece' | 'weight']
    setUnitMode(presets.includes(product.unit) ? 'preset' : 'custom')
    setRemovedImageIds([])

    const { data: full } = await supabase
      .from('products')
      .select('description, brand, sku, margin_percent')
      .eq('id', product.id)
      .single()

    const { data: imageRows } = await supabase
      .from('product_images')
      .select('id, url, is_primary')
      .eq('product_id', product.id)
      .order('created_at')

    setForm({
      name: product.name,
      saleType: product.sale_type as 'piece' | 'weight',
      unit: product.unit,
      barcode: product.barcode ?? '',
      cost: String(product.cost),
      price: String(product.price),
      marginPercent: full?.margin_percent != null ? String(full.margin_percent) : '',
      initialStock: '',
      description: full?.description ?? '',
      brand: full?.brand ?? '',
      sku: full?.sku ?? '',
      minStock: product.min_stock != null ? String(product.min_stock) : '',
      categoryId: product.category_id,
    })
    setImages(
      (imageRows ?? []).map((img) => ({ id: img.id, url: img.url, file: null, isPrimary: img.is_primary })),
    )
    setOpen(true)
  }

  async function persistImages(productId: string) {
    if (removedImageIds.length > 0) {
      await supabase.from('product_images').delete().in('id', removedImageIds)
    }

    for (const img of images) {
      if (img.file) {
        const ext = img.file.name.split('.').pop()
        const path = `${profile?.companyId}/${productId}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('product-images').upload(path, img.file)
        if (uploadError) {
          sileo.error({ title: uploadError.message })
          continue
        }
        const { data } = supabase.storage.from('product-images').getPublicUrl(path)
        await supabase
          .from('product_images')
          .insert({ product_id: productId, url: data.publicUrl, is_primary: img.isPrimary })
      } else if (img.id) {
        await supabase.from('product_images').update({ is_primary: img.isPrimary }).eq('id', img.id)
      }
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    const payload = {
      name: form.name,
      sale_type: form.saleType,
      unit: form.unit,
      barcode: form.barcode || null,
      cost: Number(form.cost) || 0,
      price: Number(form.price) || 0,
      margin_percent: form.marginPercent ? Number(form.marginPercent) : null,
      description: form.description || null,
      brand: form.brand || null,
      sku: form.sku || null,
      min_stock: form.minStock ? Number(form.minStock) : null,
      category_id: form.categoryId,
    }

    let productId = editingId
    if (editingId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingId)
      if (error) {
        sileo.error({ title: error.message })
        setSubmitting(false)
        return
      }
    } else {
      const { data: product, error: insertError } = await supabase
        .from('products')
        .insert(payload)
        .select('id')
        .single()

      if (insertError || !product) {
        sileo.error({ title: insertError?.message ?? 'No se pudo crear el producto.' })
        setSubmitting(false)
        return
      }
      productId = product.id

      const stockQty = Number(form.initialStock) || 0
      if (stockQty > 0 && branchId) {
        const { error: movementError } = await supabase.from('inventory_movements').insert({
          product_id: productId,
          branch_id: branchId,
          type: 'adjustment',
          quantity: stockQty,
          note: 'Existencia inicial',
        })
        if (movementError) sileo.error({ title: movementError.message })
      }
    }

    if (productId) await persistImages(productId)

    sileo.success({ title: editingId ? `"${form.name}" se actualizó.` : `"${form.name}" se agregó al catálogo.` })
    setSubmitting(false)
    setOpen(false)
    loadProducts()
  }

  const lowStockIds = useMemo(
    () => new Set(products.filter((p) => p.min_stock != null && p.stock < p.min_stock).map((p) => p.id)),
    [products],
  )

  const { page, setPage, totalPages, pageItems: pagedProducts } = usePagination(products)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">
          Productos
        </h1>
        <Button onClick={openCreateForm}>
          <Plus /> Nuevo producto
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingId ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
            <SheetDescription>
              {editingId ? 'Actualiza los datos del producto.' : 'Se agrega al catálogo de la empresa.'}
            </SheetDescription>
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
              <FieldLabel htmlFor="images" help={fieldHelp.products.images}>
                Fotos
              </FieldLabel>
              <ProductImageGallery
                images={images}
                onChange={(next) => {
                  const removed = images.filter((img) => img.id && !next.some((n) => n.id === img.id))
                  if (removed.length > 0) {
                    setRemovedImageIds((prev) => [...prev, ...removed.map((r) => r.id!)])
                  }
                  setImages(next)
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="category" help={fieldHelp.products.category}>
                Categoría
              </FieldLabel>
              <CategoryPicker value={form.categoryId} onChange={(id) => setForm({ ...form, categoryId: id })} />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="sale-type" help={fieldHelp.products.saleType}>
                Tipo de venta
              </FieldLabel>
              <Select value={form.saleType} onValueChange={(v) => handleSaleTypeChange(v as 'piece' | 'weight')}>
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
                Unidad
              </FieldLabel>
              <Select
                value={unitMode === 'custom' ? 'other' : form.unit}
                onValueChange={(v) => {
                  if (v === 'other') {
                    setUnitMode('custom')
                    setForm({ ...form, unit: '' })
                  } else {
                    setUnitMode('preset')
                    setForm({ ...form, unit: v! })
                  }
                }}
              >
                <SelectTrigger id="unit" className="w-full">
                  <SelectValue>
                    {() => (unitMode === 'custom' ? 'Otro' : form.unit)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {unitOptionsByType[form.saleType].map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Otro…</SelectItem>
                </SelectContent>
              </Select>
              {unitMode === 'custom' && (
                <Input
                  required
                  placeholder="ej. docena, caja de 24…"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="description" help={fieldHelp.products.description}>
                Descripción
              </FieldLabel>
              <Textarea
                id="description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="brand" help={fieldHelp.products.brand}>
                  Marca
                </FieldLabel>
                <Input id="brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="sku" help={fieldHelp.products.sku}>
                  SKU / código interno
                </FieldLabel>
                <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
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

            {!editingId && (
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="stock" help={fieldHelp.products.initialStock}>
                  Stock inicial
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="stock"
                    className="pr-12"
                    type="number"
                    step="0.001"
                    inputMode="decimal"
                    value={form.initialStock}
                    onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    {form.unit || '—'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="min-stock" help={fieldHelp.products.minStock}>
                Existencia mínima
              </FieldLabel>
              <Input
                id="min-stock"
                type="number"
                step="0.001"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
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
                  onChange={(e) => handleCostChange(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="margin" help={fieldHelp.products.marginPercent}>
                  Margen %
                </FieldLabel>
                <Input
                  id="margin"
                  type="number"
                  step="0.1"
                  placeholder="ej. 30"
                  value={form.marginPercent}
                  onChange={(e) => handleMarginChange(e.target.value)}
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
                  onChange={(e) => handlePriceChange(e.target.value)}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              El costo se actualiza solo con cada compra a proveedor — es siempre el que se usa para
              calcular la utilidad de una venta.
            </p>
          </form>
          <SheetFooter>
            <Button type="submit" form="product-form" disabled={submitting}>
              {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar producto'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
                  <TableHead></TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.primaryImageUrl ? (
                        <img
                          src={product.primaryImageUrl}
                          alt=""
                          className="size-9 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <div className="size-9 rounded-md border border-dashed border-border" />
                      )}
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.categoryName ?? '—'}</TableCell>
                    <TableCell>${product.cost.toFixed(2)}</TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell className={lowStockIds.has(product.id) ? 'text-destructive font-medium' : ''}>
                      {product.stock} {product.unit}
                      {lowStockIds.has(product.id) && ' · Bajo'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Ver existencia"
                          onClick={() => setStockTarget(product)}
                        >
                          <Boxes />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Editar producto"
                          onClick={() => openEditForm(product)}
                        >
                          <Pencil />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />

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
