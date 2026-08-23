import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { sileo } from 'sileo'
import { Plus, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePaymentMethods } from '@/lib/use-payment-methods'
import { useBranchContext } from '@/lib/use-branch-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
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

type Supplier = { id: string; name: string; phone: string | null; notes: string | null; balance: number }
type PurchaseRow = { id: string; total: number; created_at: string }
type PaymentRow = { id: string; amount: number; methodLabel: string; created_at: string }

export function SuppliersPage() {
  const { cashRegisterId } = useBranchContext()
  const { methods: paymentMethods } = usePaymentMethods()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null)
  const [purchases, setPurchases] = useState<PurchaseRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const selectedPaymentMethod = paymentMethods.find((m) => m.id === paymentMethodId)

  async function loadSuppliers() {
    setLoading(true)
    const { data: supplierRows } = await supabase
      .from('suppliers')
      .select('id, name, phone, notes')
      .eq('active', true)
      .order('name')

    const { data: purchaseRows } = await supabase.from('purchases').select('supplier_id, total')
    const { data: paymentRows } = await supabase.from('supplier_payments').select('supplier_id, amount')

    const owed = new Map<string, number>()
    for (const p of purchaseRows ?? []) owed.set(p.supplier_id, (owed.get(p.supplier_id) ?? 0) + p.total)
    for (const p of paymentRows ?? []) owed.set(p.supplier_id, (owed.get(p.supplier_id) ?? 0) - p.amount)

    const withBalance = (supplierRows ?? []).map((s) => ({ ...s, balance: owed.get(s.id) ?? 0 }))
    setSuppliers(withBalance)
    setLoading(false)
    return withBalance
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  useEffect(() => {
    if (!cashRegisterId) return
    supabase
      .from('cash_register_sessions')
      .select('id')
      .eq('cash_register_id', cashRegisterId)
      .is('closed_at', null)
      .maybeSingle()
      .then(({ data }) => setSessionId(data?.id ?? null))
  }, [cashRegisterId])

  function openCreateForm() {
    setEditingId(null)
    setName('')
    setPhone('')
    setNotes('')
    setFormOpen(true)
  }

  function openEditForm(s: Supplier) {
    setEditingId(s.id)
    setName(s.name)
    setPhone(s.phone ?? '')
    setNotes(s.notes ?? '')
    setFormOpen(true)
  }

  async function handleSubmitForm(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    const payload = { name, phone: phone || null, notes: notes || null }
    const { error } = editingId
      ? await supabase.from('suppliers').update(payload).eq('id', editingId)
      : await supabase.from('suppliers').insert(payload)

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: editingId ? `"${name}" se actualizó.` : `"${name}" se agregó a tus proveedores.` })
      setFormOpen(false)
      loadSuppliers()
    }
    setSubmitting(false)
  }

  async function openDetail(supplier: Supplier) {
    setDetailSupplier(supplier)
    setPaymentAmount('')
    setPaymentMethodId(paymentMethods.find((m) => m.key === 'cash')?.id ?? paymentMethods[0]?.id ?? '')

    const { data: purchaseRows } = await supabase
      .from('purchases')
      .select('id, total, created_at')
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false })
    setPurchases(purchaseRows ?? [])

    const { data: paymentRows } = await supabase
      .from('supplier_payments')
      .select('id, amount, created_at, payment_method:payment_methods(label)')
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false })
    setPayments(
      (paymentRows ?? []).map((p) => {
        const paymentMethod = Array.isArray(p.payment_method) ? p.payment_method[0] : p.payment_method
        return { id: p.id, amount: p.amount, created_at: p.created_at, methodLabel: paymentMethod?.label ?? '—' }
      }),
    )
  }

  async function registerPayment() {
    if (!detailSupplier || !paymentAmount) return
    if (selectedPaymentMethod?.is_cash && !sessionId) {
      sileo.warning({ title: 'Abre la caja antes de pagar en efectivo.' })
      return
    }
    setSubmitting(true)

    const { error } = await supabase.from('supplier_payments').insert({
      supplier_id: detailSupplier.id,
      amount: Number(paymentAmount) || 0,
      payment_method_id: paymentMethodId,
      cash_register_session_id: selectedPaymentMethod?.is_cash ? sessionId : null,
    })

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Pago registrado.' })
      const updated = await loadSuppliers()
      const fresh = updated.find((s) => s.id === detailSupplier.id)
      if (fresh) {
        setDetailSupplier(fresh)
        openDetail(fresh)
      }
      setPaymentAmount('')
    }
    setSubmitting(false)
  }

  const { page, setPage, totalPages, pageItems: pagedSuppliers } = usePagination(suppliers)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">
          Proveedores
        </h1>
        <Button onClick={openCreateForm}>
          <Plus /> Nuevo proveedor
        </Button>
      </div>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingId ? 'Editar proveedor' : 'Nuevo proveedor'}</SheetTitle>
            <SheetDescription>Se agrega al directorio de la empresa.</SheetDescription>
          </SheetHeader>
          <form id="supplier-form" onSubmit={handleSubmitForm} className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="supplier-name" help={fieldHelp.suppliers.name}>
                Nombre
              </FieldLabel>
              <Input id="supplier-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="supplier-phone" help={fieldHelp.suppliers.phone}>
                Teléfono
              </FieldLabel>
              <Input id="supplier-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="supplier-notes" help={fieldHelp.suppliers.notes}>
                Notas
              </FieldLabel>
              <Textarea id="supplier-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </form>
          <SheetFooter>
            <Button type="submit" form="supplier-form" disabled={submitting}>
              {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar proveedor'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Card>
        <CardHeader>
          <CardTitle>Directorio</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : suppliers.length === 0 ? (
            <p className="text-muted-foreground">Todavía no hay proveedores.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Debes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedSuppliers.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => openDetail(s)}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.phone ?? '—'}</TableCell>
                    <TableCell className={s.balance > 0.01 ? 'text-destructive' : ''}>
                      ${s.balance.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Sheet open={!!detailSupplier} onOpenChange={(open) => !open && setDetailSupplier(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{detailSupplier?.name}</SheetTitle>
            <SheetDescription>Debes: ${detailSupplier?.balance.toFixed(2)}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                render={<Link to={`/compras?supplier=${detailSupplier?.id}`} />}
              >
                <ArrowRight /> Nueva compra
              </Button>
              {detailSupplier && (
                <Button type="button" variant="ghost" size="sm" onClick={() => openEditForm(detailSupplier)}>
                  Editar
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Registrar pago</span>
              <FieldLabel htmlFor="payment-amount" help={fieldHelp.suppliers.paymentAmount}>
                Monto
              </FieldLabel>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <Select value={paymentMethodId} onValueChange={(v) => setPaymentMethodId(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: unknown) => paymentMethods.find((m) => m.id === v)?.label ?? 'Selecciona un medio'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPaymentMethod?.is_cash && !sessionId && (
                <p className="text-xs text-destructive">La caja está cerrada — ábrela antes de pagar en efectivo.</p>
              )}
              <Button
                type="button"
                onClick={registerPayment}
                disabled={submitting || !paymentAmount || !!(selectedPaymentMethod?.is_cash && !sessionId)}
              >
                Registrar pago
              </Button>
            </div>

            <div className="flex flex-col gap-1 border-t border-border pt-3">
              <span className="text-sm font-medium">Compras</span>
              {purchases.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin compras registradas.</p>
              ) : (
                purchases.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span>{new Date(p.created_at).toLocaleDateString('es-MX')}</span>
                    <span>${p.total.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col gap-1 border-t border-border pt-3">
              <span className="text-sm font-medium">Pagos</span>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm text-success">
                    <span>
                      {new Date(p.created_at).toLocaleDateString('es-MX')} · {p.methodLabel}
                    </span>
                    <span>${p.amount.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
