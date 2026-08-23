import { useEffect, useState, type FormEvent } from 'react'
import { sileo } from 'sileo'
import { Plus, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
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

type PaymentMethodRow = {
  id: string
  label: string
  is_system: boolean
  is_cash: boolean
  is_credit: boolean
  active: boolean
}

export function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethodRow[]>([])
  const [loading, setLoading] = useState(true)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [countsAsCash, setCountsAsCash] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function loadMethods() {
    setLoading(true)
    const { data, error } = await supabase
      .from('payment_methods')
      .select('id, label, is_system, is_cash, is_credit, active')
      .order('created_at')

    if (error || !data) {
      sileo.error({ title: 'No se pudieron cargar los medios de pago.' })
      setLoading(false)
      return
    }
    setMethods(data)
    setLoading(false)
  }

  useEffect(() => {
    loadMethods()
  }, [])

  function openCreateForm() {
    setEditingId(null)
    setLabel('')
    setCountsAsCash(false)
    setFormOpen(true)
  }

  function openEditForm(method: PaymentMethodRow) {
    setEditingId(method.id)
    setLabel(method.label)
    setCountsAsCash(method.is_cash)
    setFormOpen(true)
  }

  async function handleSubmitForm(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    const editingMethod = editingId ? methods.find((m) => m.id === editingId) : null
    const payload = editingMethod?.is_system
      ? { label }
      : { label, is_cash: countsAsCash }

    const { error } = editingId
      ? await supabase.from('payment_methods').update(payload).eq('id', editingId)
      : await supabase.from('payment_methods').insert({ label, is_cash: countsAsCash, key: slugify(label) })

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: editingId ? `"${label}" se actualizó.` : `"${label}" se agregó.` })
      setFormOpen(false)
      loadMethods()
    }
    setSubmitting(false)
  }

  async function toggleActive(method: PaymentMethodRow) {
    const { error } = await supabase
      .from('payment_methods')
      .update({ active: !method.active })
      .eq('id', method.id)

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: method.active ? `"${method.label}" desactivado.` : `"${method.label}" reactivado.` })
      loadMethods()
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">Medios de pago</h1>
        <Button onClick={openCreateForm}>
          <Plus /> Nuevo medio
        </Button>
      </div>

      <Sheet
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingId(null)
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingId ? 'Editar medio de pago' : 'Nuevo medio de pago'}</SheetTitle>
            <SheetDescription>
              Cómo se puede cobrar una venta o pagar un gasto/proveedor.
            </SheetDescription>
          </SheetHeader>
          <form id="payment-method-form" onSubmit={handleSubmitForm} className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="pm-label" help={fieldHelp.paymentMethods.label}>
                Nombre
              </FieldLabel>
              <Input id="pm-label" required value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            {!methods.find((m) => m.id === editingId)?.is_system && (
              <label htmlFor="pm-counts-as-cash" className="flex items-center gap-2 text-sm">
                <Checkbox
                  id="pm-counts-as-cash"
                  checked={countsAsCash}
                  onCheckedChange={setCountsAsCash}
                />
                Cuenta como efectivo en el corte de caja
              </label>
            )}
          </form>
          <SheetFooter>
            <Button type="submit" form="payment-method-form" disabled={submitting}>
              {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar medio de pago'}
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell>{method.label}</TableCell>
                    <TableCell>
                      <Badge variant={method.is_system ? 'secondary' : 'outline'}>
                        {method.is_system ? 'Sistema' : 'Personalizado'}
                      </Badge>
                      {method.is_cash && (
                        <Badge variant="outline" className="ml-1">
                          Efectivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {method.active ? (
                        <span className="text-success">Activo</span>
                      ) : (
                        <span className="text-muted-foreground">Inactivo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Editar medio de pago"
                          onClick={() => openEditForm(method)}
                        >
                          <Pencil />
                        </Button>
                        {!method.is_system && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(method)}
                          >
                            {method.active ? 'Desactivar' : 'Reactivar'}
                          </Button>
                        )}
                      </div>
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

const DIACRITICS = /[\u0300-\u036f]/g

function slugify(label: string) {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'medio'}-${Math.random().toString(36).slice(2, 8)}`
}
