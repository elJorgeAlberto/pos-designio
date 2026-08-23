import { useEffect, useMemo, useState } from 'react'
import { sileo } from 'sileo'
import { Archive, ArchiveRestore, Building2, Pencil, Phone, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseLocalDate } from '@/lib/dates'
import { ClientLocationMap } from '@/components/ClientLocationMap'
import { CollectDebtSheet, type DebtCommitment } from '@/components/CollectDebtSheet'
import { AddLegacyDebtSheet } from '@/components/AddLegacyDebtSheet'
import { DebtDetailDrawer } from '@/components/DebtDetailDrawer'
import { SaleTraceabilityDrawer } from '@/components/SaleTraceabilityDrawer'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type ClientProfile = {
  id: string
  name: string
  phone: string | null
  credit_limit: number | null
  address: string | null
  latitude: number | null
  longitude: number | null
  active: boolean
  organization_id: string | null
  organization: { legal_name: string; tax_id: string | null } | null
}

type SaleRow = {
  id: string
  created_at: string
  total: number
  discount_amount: number
  voided_at: string | null
  methods: string[]
}

type CommitmentRow = {
  id: string
  amount: number
  due_date: string | null
  status: 'pending' | 'paid' | 'renegotiated' | 'cancelled'
  note: string | null
  created_at: string
  resolved_at: string | null
}

const statusLabel: Record<CommitmentRow['status'], string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  renegotiated: 'Renegociado',
  cancelled: 'Cancelado',
}

export function ClientProfileDrawer({
  clientId,
  open,
  onOpenChange,
  onEdit,
  onChanged,
}: {
  clientId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (client: ClientProfile) => void
  onChanged: () => void
}) {
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [sales, setSales] = useState<SaleRow[]>([])
  const [commitments, setCommitments] = useState<CommitmentRow[]>([])
  const [loading, setLoading] = useState(true)

  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false)
  const [addDebtOpen, setAddDebtOpen] = useState(false)
  const [collectTarget, setCollectTarget] = useState<DebtCommitment | null>(null)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string | null>(null)

  function load() {
    if (!clientId) return
    setLoading(true)

    supabase
      .from('clients')
      .select(
        'id, name, phone, credit_limit, address, latitude, longitude, active, organization_id, organization:client_organizations(legal_name, tax_id)',
      )
      .eq('id', clientId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          sileo.error({ title: 'No se pudo cargar el cliente.' })
          return
        }
        const organization = Array.isArray(data.organization) ? data.organization[0] : data.organization
        setClient({ ...data, organization: organization ?? null })
      })

    supabase
      .from('sales')
      .select('id, created_at, total, discount_amount, voided_at, sale_payments(payment_method:payment_methods(label))')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSales(
          (data ?? []).map((s) => ({
            id: s.id,
            created_at: s.created_at,
            total: s.total,
            discount_amount: s.discount_amount,
            voided_at: s.voided_at,
            methods: s.sale_payments.map((p) => {
              const paymentMethod = Array.isArray(p.payment_method) ? p.payment_method[0] : p.payment_method
              return paymentMethod?.label ?? '—'
            }),
          })),
        )
      })

    supabase
      .from('debt_commitments')
      .select('id, amount, due_date, status, note, created_at, resolved_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCommitments((data ?? []) as CommitmentRow[])
        setLoading(false)
      })
  }

  useEffect(() => {
    if (open && clientId) {
      setConfirmingDeactivate(false)
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId])

  const stats = useMemo(() => {
    const pending = commitments.filter((c) => c.status === 'pending')
    const balance = pending.reduce((sum, c) => sum + c.amount, 0)
    const nextDue = pending
      .map((c) => c.due_date)
      .filter((d): d is string => !!d)
      .sort()[0]

    const activeSales = sales.filter((s) => !s.voided_at)
    const totalPurchased = activeSales.reduce((sum, s) => sum + (s.total - s.discount_amount), 0)

    const resolvedWithDueDate = commitments.filter(
      (c): c is CommitmentRow & { due_date: string; resolved_at: string } =>
        c.status === 'paid' && !!c.due_date && !!c.resolved_at,
    )
    const onTime = resolvedWithDueDate.filter(
      (c) => new Date(c.resolved_at) <= new Date(parseLocalDate(c.due_date).getTime() + 86_400_000),
    ).length

    return {
      balance,
      nextDue,
      totalPurchased,
      purchaseCount: activeSales.length,
      punctuality:
        resolvedWithDueDate.length > 0 ? { onTime, total: resolvedWithDueDate.length } : null,
    }
  }, [sales, commitments])

  async function toggleActive(active: boolean) {
    if (!client) return
    const { error } = await supabase.from('clients').update({ active }).eq('id', client.id)
    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: active ? `"${client.name}" reactivado.` : `"${client.name}" desactivado.` })
      setConfirmingDeactivate(false)
      setClient({ ...client, active })
      onChanged()
    }
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <DrawerTitle>{client?.name ?? 'Cliente'}</DrawerTitle>
                <DrawerDescription>
                  {client?.active === false ? 'Inactivo' : 'Ficha del cliente'}
                </DrawerDescription>
              </div>
              {client && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onEdit(client)}>
                  <Pencil />
                </Button>
              )}
            </div>
          </DrawerHeader>

          <div className="flex flex-col gap-4 overflow-y-auto px-4">
            {loading || !client ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (
              <>
                <div className="flex flex-col gap-1 text-sm">
                  {client.phone && (
                    <a
                      href={`tel:${client.phone}`}
                      className="flex items-center gap-2 text-foreground hover:text-primary"
                    >
                      <Phone className="size-4" /> {client.phone}
                    </a>
                  )}
                  {client.address && <p className="text-muted-foreground">{client.address}</p>}
                  {client.organization && (
                    <div className="mt-1 flex items-center gap-2 text-foreground">
                      <Building2 className="size-4" />
                      {client.organization.legal_name}
                      {client.organization.tax_id && (
                        <span className="text-muted-foreground">· RFC {client.organization.tax_id}</span>
                      )}
                    </div>
                  )}
                </div>

                {client.latitude != null && client.longitude != null && (
                  <ClientLocationMap latitude={client.latitude} longitude={client.longitude} />
                )}

                <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Saldo pendiente</p>
                    <p className={stats.balance > 0.01 ? 'text-h4 text-destructive' : 'text-h4'}>
                      ${stats.balance.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Próximo compromiso</p>
                    <p className="text-h4">
                      {stats.nextDue ? parseLocalDate(stats.nextDue).toLocaleDateString('es-MX') : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total comprado</p>
                    <p className="text-h4">${stats.totalPurchased.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Compras registradas</p>
                    <p className="text-h4">{stats.purchaseCount}</p>
                  </div>
                  {stats.punctuality && (
                    <div>
                      <p className="text-muted-foreground">Puntualidad</p>
                      <p className="text-h4">
                        {stats.punctuality.onTime}/{stats.punctuality.total} a tiempo
                      </p>
                    </div>
                  )}
                </div>

                <Tabs defaultValue="compras">
                  <TabsList className="w-full">
                    <TabsTrigger value="compras">Compras</TabsTrigger>
                    <TabsTrigger value="adeudos">Adeudos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="compras" className="flex flex-col gap-2 pt-3">
                    {sales.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin compras registradas.</p>
                    ) : (
                      sales.map((sale) => {
                        const net = sale.total - sale.discount_amount
                        return (
                          <button
                            key={sale.id}
                            type="button"
                            onClick={() => setSelectedSaleId(sale.id)}
                            className="flex items-center justify-between border-b border-border pb-2 text-left text-sm hover:text-primary"
                          >
                            <div>
                              <p>{new Date(sale.created_at).toLocaleDateString('es-MX')}</p>
                              <p className="text-muted-foreground">
                                {sale.methods.join(' + ') || '—'}
                                {sale.voided_at && ' · Cancelada'}
                              </p>
                            </div>
                            <span className={sale.voided_at ? 'text-muted-foreground line-through' : ''}>
                              ${net.toFixed(2)}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </TabsContent>

                  <TabsContent value="adeudos" className="flex flex-col gap-3 pt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="self-start"
                      onClick={() => setAddDebtOpen(true)}
                    >
                      <Plus /> Adeudo pasado
                    </Button>
                    {commitments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin adeudos registrados.</p>
                    ) : (
                      commitments.map((c) => {
                        const overdue =
                          c.status === 'pending' && c.due_date && parseLocalDate(c.due_date) < new Date()
                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between border-b border-border pb-2 text-sm"
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedCommitmentId(c.id)}
                              className="flex-1 text-left hover:text-primary"
                            >
                              <p className="font-medium">${c.amount.toFixed(2)}</p>
                              <p
                                className={
                                  overdue ? 'text-destructive' : 'text-muted-foreground'
                                }
                              >
                                {statusLabel[c.status]}
                                {c.due_date &&
                                  ` · ${parseLocalDate(c.due_date).toLocaleDateString('es-MX')}${overdue ? ' (atrasado)' : ''}`}
                              </p>
                            </button>
                            {c.status === 'pending' && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  setCollectTarget({ id: c.id, amount: c.amount, due_date: c.due_date })
                                }
                              >
                                Cobrar
                              </Button>
                            )}
                          </div>
                        )
                      })
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>

          <DrawerFooter>
            {client &&
              (client.active ? (
                <Button variant="destructive" onClick={() => setConfirmingDeactivate(true)}>
                  <Archive /> Desactivar cliente
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => toggleActive(true)}>
                  <ArchiveRestore /> Reactivar cliente
                </Button>
              ))}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmingDeactivate} onOpenChange={setConfirmingDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar a {client?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Deja de aparecer en las listas activas. Su historial y saldo pendiente se conservan y
              puede reactivarse después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => toggleActive(false)}>
              Confirmar desactivación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {client && (
        <AddLegacyDebtSheet
          open={addDebtOpen}
          onOpenChange={setAddDebtOpen}
          clientId={client.id}
          clientName={client.name}
          onAdded={() => {
            load()
            onChanged()
          }}
        />
      )}

      <CollectDebtSheet
        open={!!collectTarget}
        onOpenChange={(o) => !o && setCollectTarget(null)}
        commitment={collectTarget}
        clientName={client?.name ?? ''}
        onCollected={() => {
          load()
          onChanged()
        }}
      />

      <DebtDetailDrawer
        open={!!selectedCommitmentId}
        onOpenChange={(o) => !o && setSelectedCommitmentId(null)}
        commitmentId={selectedCommitmentId}
        onCollect={(commitment) => {
          setSelectedCommitmentId(null)
          setCollectTarget(commitment)
        }}
        onViewSale={(saleId) => {
          setSelectedCommitmentId(null)
          setSelectedSaleId(saleId)
        }}
      />

      <SaleTraceabilityDrawer
        open={!!selectedSaleId}
        onOpenChange={(o) => !o && setSelectedSaleId(null)}
        saleId={selectedSaleId}
        onVoided={load}
      />
    </>
  )
}
