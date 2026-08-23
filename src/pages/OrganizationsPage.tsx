import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { sileo } from 'sileo'
import { Plus, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { OrganizationFormFields } from '@/components/OrganizationFormFields'
import { useOrganizationForm } from '@/lib/use-organization-form'
import { StatTile } from '@/components/StatTile'
import { TablePagination } from '@/components/TablePagination'
import { usePagination } from '@/lib/use-pagination'
import { Button } from '@/components/ui/button'
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

type Organization = {
  id: string
  legal_name: string
  trade_name: string | null
  tax_id: string | null
  tax_regime: string | null
  postal_code: string | null
  address: string | null
  phone: string | null
  email: string | null
  contact_name: string | null
  notes: string | null
  created_at: string
}

export function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [clientCounts, setClientCounts] = useState<Map<string, number>>(new Map())
  const [clientNamesByOrg, setClientNamesByOrg] = useState<Map<string, string[]>>(new Map())
  const [purchasesByOrg, setPurchasesByOrg] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { fields, reset, toPayload } = useOrganizationForm()
  const [submitting, setSubmitting] = useState(false)

  const [detailOrg, setDetailOrg] = useState<Organization | null>(null)

  async function loadOrganizations() {
    setLoading(true)
    const { data, error } = await supabase
      .from('client_organizations')
      .select(
        'id, legal_name, trade_name, tax_id, tax_regime, postal_code, address, phone, email, contact_name, notes, created_at',
      )
      .order('legal_name')

    if (error || !data) {
      sileo.error({ title: 'No se pudieron cargar las empresas.' })
      setLoading(false)
      return
    }
    setOrganizations(data)

    const [{ data: clientRows }, { data: salesRows }] = await Promise.all([
      supabase.from('clients').select('id, name, organization_id').not('organization_id', 'is', null),
      supabase
        .from('sales')
        .select('client_id, total, discount_amount, voided_at')
        .not('client_id', 'is', null),
    ])

    const counts = new Map<string, number>()
    const names = new Map<string, string[]>()
    const orgByClient = new Map<string, string>()
    for (const c of clientRows ?? []) {
      if (!c.organization_id) continue
      counts.set(c.organization_id, (counts.get(c.organization_id) ?? 0) + 1)
      names.set(c.organization_id, [...(names.get(c.organization_id) ?? []), c.name])
      orgByClient.set(c.id, c.organization_id)
    }
    setClientCounts(counts)
    setClientNamesByOrg(names)

    const purchases = new Map<string, number>()
    for (const s of salesRows ?? []) {
      if (s.voided_at || !s.client_id) continue
      const orgId = orgByClient.get(s.client_id)
      if (!orgId) continue
      purchases.set(orgId, (purchases.get(orgId) ?? 0) + (s.total - s.discount_amount))
    }
    setPurchasesByOrg(purchases)

    setLoading(false)
  }

  useEffect(() => {
    loadOrganizations()
  }, [])

  const { page, setPage, totalPages, pageItems: pagedOrganizations } = usePagination(organizations)

  const stats = useMemo(() => {
    const withClients = organizations.filter((o) => (clientCounts.get(o.id) ?? 0) > 0).length
    const totalLinkedClients = [...clientCounts.values()].reduce((sum, n) => sum + n, 0)
    const avgClientsPerOrg = organizations.length > 0 ? totalLinkedClients / organizations.length : 0

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const newCount = organizations.filter((o) => new Date(o.created_at) >= cutoff).length

    const top = [...purchasesByOrg.entries()].sort((a, b) => b[1] - a[1])[0]
    const topOrg = top ? organizations.find((o) => o.id === top[0]) : undefined

    return {
      total: organizations.length,
      withClients,
      withoutClients: organizations.length - withClients,
      avgClientsPerOrg,
      newCount,
      topOrgName: topOrg?.legal_name,
      topOrgTotal: top?.[1] ?? 0,
    }
  }, [organizations, clientCounts, purchasesByOrg])

  function openCreateForm() {
    setEditingId(null)
    reset()
    setFormOpen(true)
  }

  function openEditForm(org: Organization) {
    setEditingId(org.id)
    reset(org)
    setFormOpen(true)
  }

  async function handleSubmitForm(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    const payload = toPayload()

    const { error } = editingId
      ? await supabase.from('client_organizations').update(payload).eq('id', editingId)
      : await supabase.from('client_organizations').insert(payload)

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({
        title: editingId
          ? `"${payload.legal_name}" se actualizó.`
          : `"${payload.legal_name}" se agregó a tus empresas.`,
      })
      setFormOpen(false)
      loadOrganizations()
    }
    setSubmitting(false)
  }

  const detailClientNames = useMemo(
    () => (detailOrg ? (clientNamesByOrg.get(detailOrg.id) ?? []) : []),
    [detailOrg, clientNamesByOrg],
  )

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">Empresas</h1>
        <Button onClick={openCreateForm}>
          <Plus /> Nueva empresa
        </Button>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        <div className="w-64 shrink-0 snap-start">
          <StatTile label="Total de empresas" value={stats.total} isCurrency={false} />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile label="Con clientes vinculados" value={stats.withClients} isCurrency={false} />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile label="Sin clientes" value={stats.withoutClients} isCurrency={false} />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile
            label="Promedio de clientes"
            value={Math.round(stats.avgClientsPerOrg * 10) / 10}
            isCurrency={false}
          />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile label="Nuevas (30 días)" value={stats.newCount} isCurrency={false} />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile
            label={stats.topOrgName ? `Mejor empresa: ${stats.topOrgName}` : 'Mejor empresa'}
            value={stats.topOrgTotal}
          />
        </div>
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
            <SheetTitle>{editingId ? 'Editar empresa' : 'Nueva empresa'}</SheetTitle>
            <SheetDescription>
              Agrupa varios clientes bajo un mismo negocio, principalmente para facturar.
            </SheetDescription>
          </SheetHeader>
          <form
            id="organization-form"
            onSubmit={handleSubmitForm}
            className="flex flex-col gap-4 overflow-y-auto px-4"
          >
            <OrganizationFormFields form={fields} idPrefix="org" />
          </form>
          <SheetFooter>
            <Button type="submit" form="organization-form" disabled={submitting}>
              {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar empresa'}
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
          ) : organizations.length === 0 ? (
            <p className="text-muted-foreground">Todavía no hay empresas registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razón social</TableHead>
                  <TableHead>Nombre comercial</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedOrganizations.map((org) => (
                  <TableRow key={org.id} className="cursor-pointer" onClick={() => setDetailOrg(org)}>
                    <TableCell>{org.legal_name}</TableCell>
                    <TableCell className="text-muted-foreground">{org.trade_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{org.tax_id ?? '—'}</TableCell>
                    <TableCell>{clientCounts.get(org.id) ?? 0}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar empresa"
                        onClick={() => openEditForm(org)}
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

      <Sheet open={!!detailOrg} onOpenChange={(open) => !open && setDetailOrg(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{detailOrg?.legal_name}</SheetTitle>
            <SheetDescription>{detailOrg?.trade_name ?? 'Empresa'}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4">
            <div className="flex flex-col gap-1 text-sm">
              {detailOrg?.tax_id && <p>RFC: {detailOrg.tax_id}</p>}
              {detailOrg?.tax_regime && <p className="text-muted-foreground">Régimen: {detailOrg.tax_regime}</p>}
              {detailOrg?.postal_code && <p className="text-muted-foreground">CP: {detailOrg.postal_code}</p>}
              {detailOrg?.phone && <p className="text-muted-foreground">{detailOrg.phone}</p>}
              {detailOrg?.email && <p className="text-muted-foreground">{detailOrg.email}</p>}
              {detailOrg?.address && <p className="text-muted-foreground">{detailOrg.address}</p>}
              {detailOrg?.contact_name && <p className="text-muted-foreground">Contacto: {detailOrg.contact_name}</p>}
              {detailOrg?.notes && <p className="text-muted-foreground">{detailOrg.notes}</p>}
            </div>
            <div className="flex flex-col gap-1 border-t border-border pt-3">
              <span className="text-sm font-medium">Clientes vinculados</span>
              {detailClientNames.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ningún cliente ligado todavía.</p>
              ) : (
                detailClientNames.map((name, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {name}
                  </p>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
