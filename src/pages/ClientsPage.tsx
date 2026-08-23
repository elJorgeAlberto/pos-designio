import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { sileo } from 'sileo'
import { Plus, MapPin, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseLocalDate } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { ClientLocationMap } from '@/components/ClientLocationMap'
import { ClientProfileDrawer, type ClientProfile } from '@/components/ClientProfileDrawer'
import { OrganizationFormFields } from '@/components/OrganizationFormFields'
import { StatTile } from '@/components/StatTile'
import { TablePagination } from '@/components/TablePagination'
import { TopClientsDrawer, type ClientRanking } from '@/components/TopClientsDrawer'
import { usePagination } from '@/lib/use-pagination'
import { useOrganizationForm } from '@/lib/use-organization-form'
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

type Client = {
  id: string
  name: string
  phone: string | null
  credit_limit: number | null
  address: string | null
  latitude: number | null
  longitude: number | null
  active: boolean
  created_at: string
  organization_id: string | null
  balance: number
  nextDueDate: string | null
  overdue: boolean
}

type Organization = { id: string; legal_name: string }

type StatusFilter = 'all' | 'debt' | 'overdue'

export function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [salesRows, setSalesRows] = useState<
    { client_id: string | null; total: number; discount_amount: number; voided_at: string | null }[]
  >([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [topClientsOpen, setTopClientsOpen] = useState(false)

  const [formOpen, setFormOpen] = useState(searchParams.get('new') === '1')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [organizationId, setOrganizationId] = useState('')
  const [addingOrg, setAddingOrg] = useState(false)
  const [creatingOrg, setCreatingOrg] = useState(false)
  const newOrgForm = useOrganizationForm()

  const [detailClientId, setDetailClientId] = useState<string | null>(null)

  async function loadClients() {
    setLoading(true)
    const { data: clientRows, error } = await supabase
      .from('clients')
      .select(
        'id, name, phone, credit_limit, address, latitude, longitude, active, created_at, organization_id',
      )
    if (error || !clientRows) {
      sileo.error({ title: 'No se pudieron cargar los clientes.' })
      setLoading(false)
      return
    }

    const [{ data: commitments }, { data: sales }, { data: orgs }] = await Promise.all([
      supabase.from('debt_commitments').select('client_id, amount, due_date').eq('status', 'pending'),
      supabase
        .from('sales')
        .select('client_id, total, discount_amount, voided_at')
        .not('client_id', 'is', null),
      supabase.from('client_organizations').select('id, legal_name').order('legal_name'),
    ])
    setSalesRows(sales ?? [])
    setOrganizations(orgs ?? [])

    const balanceByClient = new Map<string, number>()
    const nextDueByClient = new Map<string, string>()
    const overdueByClient = new Set<string>()
    const today = new Date()
    for (const c of commitments ?? []) {
      balanceByClient.set(c.client_id, (balanceByClient.get(c.client_id) ?? 0) + c.amount)
      if (c.due_date) {
        const current = nextDueByClient.get(c.client_id)
        if (!current || c.due_date < current) nextDueByClient.set(c.client_id, c.due_date)
        if (parseLocalDate(c.due_date) < today) overdueByClient.add(c.client_id)
      }
    }

    setClients(
      clientRows.map((c) => ({
        ...c,
        balance: balanceByClient.get(c.id) ?? 0,
        nextDueDate: nextDueByClient.get(c.id) ?? null,
        overdue: overdueByClient.has(c.id),
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    loadClients()
    if (searchParams.get('new') === '1') setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredClients = useMemo(() => {
    return clients
      .filter((c) => (showInactive ? true : c.active))
      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
      .filter((c) => {
        if (statusFilter === 'debt') return c.balance > 0.01
        if (statusFilter === 'overdue') return c.overdue
        return true
      })
      .sort((a, b) => b.balance - a.balance)
  }, [clients, search, statusFilter, showInactive])

  const { page, setPage, totalPages, pageItems: pagedClients } = usePagination(filteredClients)

  const stats = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const newCount = clients.filter((c) => new Date(c.created_at) >= cutoff).length
    const withDebtCount = clients.filter((c) => c.balance > 0.01).length
    const overdueCount = clients.filter((c) => c.overdue).length
    const totalPending = clients.reduce((sum, c) => sum + c.balance, 0)
    const inactiveCount = clients.filter((c) => !c.active).length
    const overdueRatio = withDebtCount > 0 ? (overdueCount / withDebtCount) * 100 : 0
    const linkedOrgCount = new Set(clients.map((c) => c.organization_id).filter(Boolean)).size

    const totalsByClient = new Map<string, number>()
    let purchaseCount = 0
    let purchaseTotal = 0
    for (const s of salesRows) {
      if (s.voided_at || !s.client_id) continue
      const net = s.total - s.discount_amount
      totalsByClient.set(s.client_id, (totalsByClient.get(s.client_id) ?? 0) + net)
      purchaseCount += 1
      purchaseTotal += net
    }
    const avgTicket = purchaseCount > 0 ? purchaseTotal / purchaseCount : 0
    const ranking: ClientRanking[] = [...totalsByClient.entries()]
      .map(([clientId, total]) => ({
        clientId,
        total,
        name: clients.find((c) => c.id === clientId)?.name ?? '—',
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    return {
      activeCount: clients.filter((c) => c.active).length,
      inactiveCount,
      newCount,
      withDebtCount,
      overdueCount,
      overdueRatio,
      totalPending,
      avgTicket,
      linkedOrgCount,
      ranking,
    }
  }, [clients, salesRows])

  function useMyLocation() {
    if (!navigator.geolocation) {
      sileo.error({ title: 'Este dispositivo no soporta geolocalización.' })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocating(false)
      },
      () => {
        sileo.error({ title: 'No se pudo obtener tu ubicación.' })
        setLocating(false)
      },
    )
  }

  function openCreateForm() {
    setEditingId(null)
    setName('')
    setPhone('')
    setCreditLimit('')
    setAddress('')
    setCoords(null)
    setOrganizationId('')
    setAddingOrg(false)
    newOrgForm.reset()
    setFormOpen(true)
  }

  function openEditForm(client: Client | ClientProfile) {
    setEditingId(client.id)
    setName(client.name)
    setPhone(client.phone ?? '')
    setCreditLimit(client.credit_limit != null ? String(client.credit_limit) : '')
    setAddress(client.address ?? '')
    setCoords(client.latitude != null && client.longitude != null ? { lat: client.latitude, lng: client.longitude } : null)
    setOrganizationId(client.organization_id ?? '')
    setAddingOrg(false)
    newOrgForm.reset()
    setFormOpen(true)
  }

  async function createOrganizationInline() {
    const payload = newOrgForm.toPayload()
    if (!payload.legal_name.trim()) {
      sileo.warning({ title: 'Captura la razón social.' })
      return
    }
    setCreatingOrg(true)
    const { data, error } = await supabase
      .from('client_organizations')
      .insert(payload)
      .select('id, legal_name')
      .single()

    if (error || !data) {
      sileo.error({ title: error?.message ?? 'No se pudo crear la empresa.' })
    } else {
      setOrganizations((prev) => [...prev, data].sort((a, b) => a.legal_name.localeCompare(b.legal_name)))
      setOrganizationId(data.id)
      setAddingOrg(false)
      newOrgForm.reset()
    }
    setCreatingOrg(false)
  }

  async function handleSubmitForm(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    const payload = {
      name,
      phone: phone || null,
      credit_limit: creditLimit ? Number(creditLimit) : null,
      address: address || null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      organization_id: organizationId || null,
    }

    const { error } = editingId
      ? await supabase.from('clients').update(payload).eq('id', editingId)
      : await supabase.from('clients').insert(payload)

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: editingId ? `"${name}" se actualizó.` : `"${name}" se agregó a tus clientes.` })
      setFormOpen(false)
      loadClients()
    }
    setSubmitting(false)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">
          Clientes
        </h1>
        <Button onClick={openCreateForm}>
          <Plus /> Nuevo cliente
        </Button>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        <div className="w-64 shrink-0 snap-start">
          <StatTile label="Clientes activos" value={stats.activeCount} isCurrency={false} />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile label="Nuevos (30 días)" value={stats.newCount} isCurrency={false} />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile
            label="Con adeudo"
            value={stats.withDebtCount}
            isCurrency={false}
            onClick={() => setStatusFilter(statusFilter === 'debt' ? 'all' : 'debt')}
          />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile label="Saldo pendiente total" value={stats.totalPending} />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile
            label="Atrasados"
            value={stats.overdueCount}
            isCurrency={false}
            onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
          />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile
            label={stats.ranking[0] ? `Mejor cliente: ${stats.ranking[0].name}` : 'Mejor cliente'}
            value={stats.ranking[0]?.total ?? 0}
            onClick={() => setTopClientsOpen(true)}
          />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile
            label="Inactivos"
            value={stats.inactiveCount}
            isCurrency={false}
            onClick={() => setShowInactive(true)}
          />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile
            label="% Cartera vencida"
            value={Math.round(stats.overdueRatio)}
            isCurrency={false}
            suffix="%"
          />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile label="Ticket promedio" value={stats.avgTicket} />
        </div>
        <div className="w-64 shrink-0 snap-start">
          <StatTile
            label="Empresas vinculadas"
            value={stats.linkedOrgCount}
            isCurrency={false}
            onClick={() => navigate('/empresas')}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-56"
        />
        <Button
          type="button"
          size="sm"
          variant={statusFilter === 'debt' ? 'default' : 'secondary'}
          onClick={() => setStatusFilter(statusFilter === 'debt' ? 'all' : 'debt')}
        >
          Ver pendientes
        </Button>
        <Button
          type="button"
          size="sm"
          variant={statusFilter === 'overdue' ? 'default' : 'secondary'}
          onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
        >
          Atrasados
        </Button>
        <Button
          type="button"
          size="sm"
          variant={showInactive ? 'default' : 'secondary'}
          onClick={() => setShowInactive((v) => !v)}
        >
          Mostrar inactivos
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
            <SheetTitle>{editingId ? 'Editar cliente' : 'Nuevo cliente'}</SheetTitle>
            <SheetDescription>
              {editingId ? 'Actualiza los datos del cliente.' : 'Se agrega al directorio de la empresa.'}
            </SheetDescription>
          </SheetHeader>
          <form
            id="client-form"
            onSubmit={handleSubmitForm}
            className="flex flex-col gap-4 overflow-y-auto px-4"
          >
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="client-name" help={fieldHelp.clients.name}>
                Nombre
              </FieldLabel>
              <Input id="client-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="client-phone" help={fieldHelp.clients.phone}>
                Teléfono
              </FieldLabel>
              <Input
                id="client-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="credit-limit" help={fieldHelp.clients.creditLimit}>
                Límite de crédito
              </FieldLabel>
              <Input
                id="credit-limit"
                type="number"
                step="0.01"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="client-address" help={fieldHelp.clients.address}>
                Dirección
              </FieldLabel>
              <Input
                id="client-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="use-location" help={fieldHelp.clients.location}>
                Ubicación
              </FieldLabel>
              <Button
                id="use-location"
                type="button"
                variant="secondary"
                disabled={locating}
                onClick={useMyLocation}
              >
                <MapPin /> {locating ? 'Obteniendo…' : coords ? 'Ubicación capturada' : 'Usar mi ubicación'}
              </Button>
              {coords && <ClientLocationMap latitude={coords.lat} longitude={coords.lng} />}
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="client-organization" help={fieldHelp.organizations.link}>
                Empresa
              </FieldLabel>
              {addingOrg ? (
                <div className="flex flex-col gap-4 rounded-lg border border-border p-3">
                  <OrganizationFormFields form={newOrgForm.fields} idPrefix="new-org" requireLegalName={false} />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={creatingOrg} onClick={createOrganizationInline}>
                      {creatingOrg ? 'Creando…' : 'Crear empresa'}
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setAddingOrg(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={organizationId || 'none'}
                    onValueChange={(v) => setOrganizationId(v === 'none' ? '' : (v ?? ''))}
                  >
                    <SelectTrigger id="client-organization" className="w-full">
                      <SelectValue>
                        {(v: unknown) => organizations.find((o) => o.id === v)?.legal_name ?? 'Sin empresa'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin empresa</SelectItem>
                      {organizations.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.legal_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="secondary" size="icon" onClick={() => setAddingOrg(true)}>
                    <Plus />
                  </Button>
                </div>
              )}
            </div>
          </form>
          <SheetFooter>
            <Button type="submit" form="client-form" disabled={submitting}>
              {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar cliente'}
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
          ) : filteredClients.length === 0 ? (
            <p className="text-muted-foreground">No hay clientes que coincidan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Saldo pendiente</TableHead>
                  <TableHead>Próximo compromiso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className={`cursor-pointer ${!client.active ? 'opacity-50' : ''}`}
                    onClick={() => setDetailClientId(client.id)}
                  >
                    <TableCell>{client.name}</TableCell>
                    <TableCell className={client.balance > 0 ? 'text-destructive' : ''}>
                      ${client.balance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {client.nextDueDate
                        ? parseLocalDate(client.nextDueDate).toLocaleDateString('es-MX')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {!client.active ? (
                        <span className="text-muted-foreground">Inactivo</span>
                      ) : client.overdue ? (
                        <span className="text-destructive">Atrasado</span>
                      ) : client.balance > 0.01 ? (
                        <span className="text-azafran">Pendiente</span>
                      ) : (
                        <span className="text-success">Al corriente</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar cliente"
                        onClick={() => openEditForm(client)}
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

      <ClientProfileDrawer
        clientId={detailClientId}
        open={!!detailClientId}
        onOpenChange={(open) => !open && setDetailClientId(null)}
        onEdit={(client) => {
          setDetailClientId(null)
          openEditForm(client)
        }}
        onChanged={loadClients}
      />

      <TopClientsDrawer
        open={topClientsOpen}
        onOpenChange={setTopClientsOpen}
        ranking={stats.ranking}
        onSelectClient={(clientId) => {
          setTopClientsOpen(false)
          setDetailClientId(clientId)
        }}
      />
    </div>
  )
}
