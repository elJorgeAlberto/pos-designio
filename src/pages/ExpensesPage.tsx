import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { sileo } from 'sileo'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBranchContext } from '@/lib/use-branch-context'
import { usePaymentMethods } from '@/lib/use-payment-methods'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

type ExpenseRow = {
  id: string
  amount: number
  methodLabel: string
  description: string | null
  created_at: string
  categoryName: string | null
}

type Category = { id: string; name: string }

export function ExpensesPage() {
  const { branchId, cashRegisterId } = useBranchContext()
  const { methods: paymentMethods } = usePaymentMethods()
  const [searchParams, setSearchParams] = useSearchParams()
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(searchParams.get('new') === '1')
  const [submitting, setSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const [categoryId, setCategoryId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [description, setDescription] = useState('')

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethodId)

  async function loadExpenses() {
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select(
        'id, amount, description, created_at, category:expense_categories(name), payment_method:payment_methods(label)',
      )
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      sileo.error({ title: 'No se pudieron cargar los gastos.' })
    } else {
      setExpenses(
        (data ?? []).map((e) => {
          const category = Array.isArray(e.category) ? e.category[0] : e.category
          const paymentMethod = Array.isArray(e.payment_method) ? e.payment_method[0] : e.payment_method
          return {
            id: e.id,
            amount: e.amount,
            methodLabel: paymentMethod?.label ?? '—',
            description: e.description,
            created_at: e.created_at,
            categoryName: category?.name ?? null,
          }
        }),
      )
    }
    setLoading(false)
  }

  async function loadCategories() {
    const { data } = await supabase.from('expense_categories').select('id, name').order('name')
    setCategories(data ?? [])
  }

  useEffect(() => {
    loadExpenses()
    loadCategories()
    if (searchParams.get('new') === '1') setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function openForm() {
    setCategoryId('')
    setAmount('')
    setPaymentMethodId(paymentMethods.find((m) => m.key === 'cash')?.id ?? paymentMethods[0]?.id ?? '')
    setDescription('')
    setAddingCategory(false)
    setNewCategoryName('')
    setOpen(true)
  }

  async function createCategory() {
    if (!newCategoryName.trim()) return
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ name: newCategoryName.trim() })
      .select('id, name')
      .single()

    if (error || !data) {
      sileo.error({ title: error?.message ?? 'No se pudo crear la categoría.' })
      return
    }
    setCategories((prev) => [...prev, data])
    setCategoryId(data.id)
    setAddingCategory(false)
    setNewCategoryName('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!branchId) {
      sileo.error({ title: 'No se encontró una sucursal para tu usuario.' })
      return
    }
    if (selectedMethod?.is_cash && !sessionId) {
      sileo.warning({ title: 'Abre la caja antes de registrar un gasto en efectivo.' })
      return
    }
    setSubmitting(true)

    const { error } = await supabase.from('expenses').insert({
      branch_id: branchId,
      category_id: categoryId || null,
      cash_register_session_id: selectedMethod?.is_cash ? sessionId : null,
      payment_method_id: paymentMethodId,
      amount: Number(amount) || 0,
      description: description || null,
    })

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Gasto registrado.' })
      setOpen(false)
      loadExpenses()
    }
    setSubmitting(false)
  }

  const { page, setPage, totalPages, pageItems: pagedExpenses } = usePagination(expenses)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">
          Gastos
        </h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button onClick={openForm}>
                <Plus /> Nuevo gasto
              </Button>
            }
          />
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Nuevo gasto</SheetTitle>
              <SheetDescription>
                Gasolina, renta, mantenimiento — cualquier salida de dinero que no sea una compra a
                proveedor.
              </SheetDescription>
            </SheetHeader>
            <form id="expense-form" onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="expense-category" help={fieldHelp.expenses.category}>
                  Categoría
                </FieldLabel>
                {addingCategory ? (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      placeholder="ej. Gasolina"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createCategory())}
                    />
                    <Button type="button" size="sm" onClick={createCategory}>
                      Crear
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setAddingCategory(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? '' : (v ?? ''))}>
                      <SelectTrigger id="expense-category" className="w-full">
                        <SelectValue>
                          {(v: unknown) => categories.find((c) => c.id === v)?.name ?? 'Sin categoría'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin categoría</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="secondary" size="icon" onClick={() => setAddingCategory(true)}>
                      <Plus />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="expense-method" help={fieldHelp.expenses.method}>
                  Método de pago
                </FieldLabel>
                <Select value={paymentMethodId} onValueChange={(v) => setPaymentMethodId(v ?? '')}>
                  <SelectTrigger id="expense-method" className="w-full">
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
                {selectedMethod?.is_cash && !sessionId && (
                  <p className="text-xs text-destructive">
                    La caja está cerrada — ábrela antes de registrar un gasto en efectivo.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="expense-amount" help={fieldHelp.expenses.amount}>
                  Monto
                </FieldLabel>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="expense-description" help={fieldHelp.expenses.description}>
                  Descripción
                </FieldLabel>
                <Input
                  id="expense-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </form>
            <SheetFooter>
              <Button
                type="submit"
                form="expense-form"
                disabled={submitting || !!(selectedMethod?.is_cash && !sessionId)}
              >
                {submitting ? 'Guardando…' : 'Registrar gasto'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos gastos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : expenses.length === 0 ? (
            <p className="text-muted-foreground">Todavía no hay gastos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedExpenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.created_at).toLocaleString('es-MX')}</TableCell>
                    <TableCell>
                      {e.categoryName ?? '—'}
                      {e.description && ` · ${e.description}`}
                    </TableCell>
                    <TableCell>{e.methodLabel}</TableCell>
                    <TableCell>${e.amount.toFixed(2)}</TableCell>
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
