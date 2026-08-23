import { useEffect, useState, type FormEvent } from 'react'
import { sileo } from 'sileo'
import { Plus, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { TablePagination } from '@/components/TablePagination'
import { usePagination } from '@/lib/use-pagination'
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

type Branch = { id: string; name: string; address: string | null }

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadBranches() {
    setLoading(true)
    const { data, error } = await supabase.from('branches').select('id, name, address').order('name')
    if (error) sileo.error({ title: 'No se pudieron cargar las sucursales.' })
    setBranches(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadBranches()
  }, [])

  function openCreateForm() {
    setEditingId(null)
    setName('')
    setAddress('')
    setOpen(true)
  }

  function openEditForm(branch: Branch) {
    setEditingId(branch.id)
    setName(branch.name)
    setAddress(branch.address ?? '')
    setOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    const payload = { name, address: address || null }
    const { error } = editingId
      ? await supabase.from('branches').update(payload).eq('id', editingId)
      : await supabase.from('branches').insert(payload)

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: editingId ? `"${name}" se actualizó.` : `"${name}" se agregó.` })
      setOpen(false)
      loadBranches()
    }
    setSubmitting(false)
  }

  const { page, setPage, totalPages, pageItems: pagedBranches } = usePagination(branches)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">Sucursales</h1>
        <Button onClick={openCreateForm}>
          <Plus /> Nueva sucursal
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingId ? 'Editar sucursal' : 'Nueva sucursal'}</SheetTitle>
            <SheetDescription>
              Cada sucursal tiene su propia existencia — útil para traspasos entre negocios.
            </SheetDescription>
          </SheetHeader>
          <form id="branch-form" onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="branch-name" help={fieldHelp.branches.name}>
                Nombre
              </FieldLabel>
              <Input id="branch-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="branch-address" help={fieldHelp.branches.address}>
                Dirección
              </FieldLabel>
              <Input id="branch-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </form>
          <SheetFooter>
            <Button type="submit" form="branch-form" disabled={submitting}>
              {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar sucursal'}
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
          ) : branches.length === 0 ? (
            <p className="text-muted-foreground">Todavía no hay sucursales.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedBranches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.name}</TableCell>
                    <TableCell className="text-muted-foreground">{b.address ?? '—'}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar sucursal"
                        onClick={() => openEditForm(b)}
                      >
                        <Pencil />
                      </Button>
                    </TableCell>
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
