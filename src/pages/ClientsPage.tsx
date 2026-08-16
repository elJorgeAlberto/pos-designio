import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { sileo } from 'sileo'
import { Plus, MapPin, Pencil, Archive, ArchiveRestore } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseLocalDate } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { ClientLocationMap } from '@/components/ClientLocationMap'
import { CollectDebtSheet, type DebtCommitment } from '@/components/CollectDebtSheet'
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

type Client = {
  id: string
  name: string
  credit_limit: number | null
  address: string | null
  latitude: number | null
  longitude: number | null
  active: boolean
  balance: number
  nextDueDate: string | null
  overdue: boolean
}

type StatusFilter = 'all' | 'debt' | 'overdue'

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showInactive, setShowInactive] = useState(false)

  const [formOpen, setFormOpen] = useState(searchParams.get('new') === '1')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [detailClient, setDetailClient] = useState<Client | null>(null)
  const [detailCommitments, setDetailCommitments] = useState<DebtCommitment[]>([])
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false)
  const [collectTarget, setCollectTarget] = useState<DebtCommitment | null>(null)

  async function loadClients() {
    setLoading(true)
    const { data: clientRows, error } = await supabase
      .from('clients')
      .select('id, name, credit_limit, address, latitude, longitude, active')
    if (error || !clientRows) {
      sileo.error({ title: 'No se pudieron cargar los clientes.' })
      setLoading(false)
      return
    }

    const { data: commitments } = await supabase
      .from('debt_commitments')
      .select('client_id, amount, due_date')
      .eq('status', 'pending')

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
    setCreditLimit('')
    setAddress('')
    setCoords(null)
    setFormOpen(true)
  }

  function openEditForm(client: Client) {
    setEditingId(client.id)
    setName(client.name)
    setCreditLimit(client.credit_limit != null ? String(client.credit_limit) : '')
    setAddress(client.address ?? '')
    setCoords(client.latitude != null && client.longitude != null ? { lat: client.latitude, lng: client.longitude } : null)
    setFormOpen(true)
  }

  async function handleSubmitForm(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    const payload = {
      name,
      credit_limit: creditLimit ? Number(creditLimit) : null,
      address: address || null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
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

  async function toggleActive(client: Client, active: boolean) {
    const { error } = await supabase.from('clients').update({ active }).eq('id', client.id)
    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: active ? `"${client.name}" reactivado.` : `"${client.name}" desactivado.` })
      setConfirmingDeactivate(false)
      setDetailClient(null)
      loadClients()
    }
  }

  async function openDetail(client: Client) {
    setDetailClient(client)
    setConfirmingDeactivate(false)

    const { data } = await supabase
      .from('debt_commitments')
      .select('id, amount, due_date')
      .eq('client_id', client.id)
      .eq('status', 'pending')
      .order('due_date')
    setDetailCommitments(data ?? [])
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: 'var(--font-heading)' }} className="text-2xl font-semibold">
          Clientes
        </h1>
        <Button onClick={openCreateForm}>
          <Plus /> Nuevo cliente
        </Button>
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
          <form id="client-form" onSubmit={handleSubmitForm} className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="client-name" help={fieldHelp.clients.name}>
                Nombre
              </FieldLabel>
              <Input id="client-name" required value={name} onChange={(e) => setName(e.target.value)} />
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
                {filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className={`cursor-pointer ${!client.active ? 'opacity-50' : ''}`}
                    onClick={() => openDetail(client)}
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

      <Sheet
        open={!!detailClient}
        onOpenChange={(open) => {
          if (!open) {
            setDetailClient(null)
            setConfirmingDeactivate(false)
          }
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{detailClient?.name}</SheetTitle>
            <SheetDescription>Saldo pendiente: ${detailClient?.balance.toFixed(2)}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4">
            {detailClient?.address && (
              <p className="text-sm text-muted-foreground">{detailClient.address}</p>
            )}
            {detailClient?.latitude != null && detailClient?.longitude != null && (
              <ClientLocationMap latitude={detailClient.latitude} longitude={detailClient.longitude} />
            )}
            {detailCommitments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin deuda pendiente.</p>
            ) : (
              detailCommitments.map((commitment) => {
                const overdue = commitment.due_date && parseLocalDate(commitment.due_date) < new Date()
                return (
                  <div
                    key={commitment.id}
                    className="flex items-center justify-between border-b border-border pb-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">${commitment.amount.toFixed(2)}</p>
                      <p className={overdue ? 'text-destructive' : 'text-muted-foreground'}>
                        {commitment.due_date
                          ? `Compromiso: ${parseLocalDate(commitment.due_date).toLocaleDateString('es-MX')}${overdue ? ' (atrasado)' : ''}`
                          : 'Sin fecha de compromiso'}
                      </p>
                    </div>
                    <Button type="button" size="sm" onClick={() => setCollectTarget(commitment)}>
                      Cobrar
                    </Button>
                  </div>
                )
              })
            )}
          </div>
          <SheetFooter>
            {detailClient && (
              <>
                {confirmingDeactivate ? (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => toggleActive(detailClient, false)}
                    >
                      Confirmar desactivación
                    </Button>
                    <Button variant="secondary" onClick={() => setConfirmingDeactivate(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : detailClient.active ? (
                  <Button variant="destructive" onClick={() => setConfirmingDeactivate(true)}>
                    <Archive /> Desactivar cliente
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => toggleActive(detailClient, true)}>
                    <ArchiveRestore /> Reactivar cliente
                  </Button>
                )}
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <CollectDebtSheet
        open={!!collectTarget}
        onOpenChange={(open) => !open && setCollectTarget(null)}
        commitment={collectTarget}
        clientName={detailClient?.name ?? ''}
        onCollected={() => {
          loadClients()
          if (detailClient) openDetail(detailClient)
        }}
      />
    </div>
  )
}
