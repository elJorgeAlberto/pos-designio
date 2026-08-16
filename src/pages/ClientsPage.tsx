import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { sileo } from 'sileo'
import { Plus, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseLocalDate } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { ClientLocationMap } from '@/components/ClientLocationMap'
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

type Client = {
  id: string
  name: string
  credit_limit: number | null
  address: string | null
  latitude: number | null
  longitude: number | null
  balance: number
}

type CreditSale = {
  sale_id: string
  created_at: string
  commitment_date: string | null
  credit_amount: number
  collected: number
}

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [newOpen, setNewOpen] = useState(searchParams.get('new') === '1')
  const [name, setName] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [detailClient, setDetailClient] = useState<Client | null>(null)
  const [creditSales, setCreditSales] = useState<CreditSale[]>([])
  const [collectSaleId, setCollectSaleId] = useState('')
  const [collectAmount, setCollectAmount] = useState('')

  async function loadClients() {
    setLoading(true)
    const { data: clientRows, error } = await supabase
      .from('clients')
      .select('id, name, credit_limit, address, latitude, longitude')
    if (error || !clientRows) {
      sileo.error({ title: 'No se pudieron cargar los clientes.' })
      setLoading(false)
      return
    }

    const { data: sales } = await supabase
      .from('sales')
      .select('client_id, sale_payments(method, amount)')
      .not('client_id', 'is', null)
      .is('voided_at', null)

    const { data: collections } = await supabase.from('collections').select('client_id, amount')

    const owedByClient = new Map<string, number>()
    for (const sale of sales ?? []) {
      if (!sale.client_id) continue
      const credit = sale.sale_payments
        .filter((p) => p.method === 'credit')
        .reduce((sum, p) => sum + p.amount, 0)
      owedByClient.set(sale.client_id, (owedByClient.get(sale.client_id) ?? 0) + credit)
    }
    const collectedByClient = new Map<string, number>()
    for (const c of collections ?? []) {
      collectedByClient.set(c.client_id, (collectedByClient.get(c.client_id) ?? 0) + c.amount)
    }

    setClients(
      clientRows.map((c) => ({
        ...c,
        balance: (owedByClient.get(c.id) ?? 0) - (collectedByClient.get(c.id) ?? 0),
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    loadClients()
    if (searchParams.get('new') === '1') setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    const { error } = await supabase.from('clients').insert({
      name,
      credit_limit: creditLimit ? Number(creditLimit) : null,
      address: address || null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    })

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: `"${name}" se agregó a tus clientes.` })
      setName('')
      setCreditLimit('')
      setAddress('')
      setCoords(null)
      setNewOpen(false)
      loadClients()
    }
    setSubmitting(false)
  }

  async function openDetail(client: Client) {
    setDetailClient(client)
    setCollectSaleId('')
    setCollectAmount('')

    const { data: sales } = await supabase
      .from('sales')
      .select('id, created_at, sale_payments(method, amount, commitment_date)')
      .eq('client_id', client.id)
      .is('voided_at', null)

    const { data: collections } = await supabase
      .from('collections')
      .select('sale_id, amount')
      .eq('client_id', client.id)

    const collectedBySale = new Map<string, number>()
    for (const c of collections ?? []) {
      collectedBySale.set(c.sale_id, (collectedBySale.get(c.sale_id) ?? 0) + c.amount)
    }

    const rows: CreditSale[] = []
    for (const sale of sales ?? []) {
      const creditPayment = sale.sale_payments.find((p) => p.method === 'credit')
      if (!creditPayment) continue
      rows.push({
        sale_id: sale.id,
        created_at: sale.created_at,
        commitment_date: creditPayment.commitment_date,
        credit_amount: creditPayment.amount,
        collected: collectedBySale.get(sale.id) ?? 0,
      })
    }
    setCreditSales(rows)
  }

  async function handleCollect() {
    if (!detailClient || !collectSaleId) return
    setSubmitting(true)

    const { error } = await supabase.from('collections').insert({
      client_id: detailClient.id,
      sale_id: collectSaleId,
      amount: Number(collectAmount) || 0,
    })

    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Cobro registrado.' })
      openDetail(detailClient)
      loadClients()
      setCollectSaleId('')
      setCollectAmount('')
    }
    setSubmitting(false)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: 'var(--font-heading)' }} className="text-2xl font-semibold">
          Clientes
        </h1>
        <Sheet open={newOpen} onOpenChange={setNewOpen}>
          <SheetTrigger
            render={
              <Button>
                <Plus /> Nuevo cliente
              </Button>
            }
          />
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Nuevo cliente</SheetTitle>
              <SheetDescription>Se agrega al directorio de la empresa.</SheetDescription>
            </SheetHeader>
            <form id="client-form" onSubmit={handleCreate} className="flex flex-col gap-4 px-4">
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
                {submitting ? 'Guardando…' : 'Agregar cliente'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directorio</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : clients.length === 0 ? (
            <p className="text-muted-foreground">Todavía no hay clientes.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Límite</TableHead>
                  <TableHead>Saldo pendiente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(client)}
                  >
                    <TableCell>{client.name}</TableCell>
                    <TableCell>
                      {client.credit_limit != null ? `$${client.credit_limit.toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell className={client.balance > 0 ? 'text-destructive' : ''}>
                      ${client.balance.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!detailClient} onOpenChange={(open) => !open && setDetailClient(null)}>
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
            {creditSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas a crédito.</p>
            ) : (
              creditSales.map((sale) => {
                const remaining = sale.credit_amount - sale.collected
                const overdue =
                  remaining > 0.01 &&
                  sale.commitment_date &&
                  parseLocalDate(sale.commitment_date) < new Date()
                return (
                  <div key={sale.sale_id} className="border-b border-border pb-2 text-sm">
                    <div className="flex justify-between">
                      <span>{new Date(sale.created_at).toLocaleDateString('es-MX')}</span>
                      <span>${sale.credit_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        {sale.commitment_date
                          ? `Compromiso: ${parseLocalDate(sale.commitment_date).toLocaleDateString('es-MX')}`
                          : 'Sin fecha de compromiso'}
                      </span>
                      <span
                        className={
                          remaining <= 0.01
                            ? 'text-success'
                            : overdue
                              ? 'text-destructive'
                              : ''
                        }
                      >
                        {remaining <= 0.01 ? 'Pagado' : overdue ? 'Atrasado' : `Falta $${remaining.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                )
              })
            )}

            <div className="flex flex-col gap-2 pt-2">
              <FieldLabel htmlFor="collect-sale" help={fieldHelp.collections.sale}>
                Registrar cobro
              </FieldLabel>
              <Select
                value={collectSaleId || 'none'}
                onValueChange={(v) => setCollectSaleId(v === 'none' ? '' : (v ?? ''))}
              >
                <SelectTrigger id="collect-sale" className="w-full">
                  <SelectValue>
                    {(value: unknown) => {
                      const sale = creditSales.find((s) => s.sale_id === value)
                      return sale
                        ? `${new Date(sale.created_at).toLocaleDateString('es-MX')} — falta $${(sale.credit_amount - sale.collected).toFixed(2)}`
                        : 'Selecciona una venta'
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecciona una venta</SelectItem>
                  {creditSales
                    .filter((s) => s.credit_amount - s.collected > 0.01)
                    .map((s) => (
                      <SelectItem key={s.sale_id} value={s.sale_id}>
                        {new Date(s.created_at).toLocaleDateString('es-MX')} — falta $
                        {(s.credit_amount - s.collected).toFixed(2)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FieldLabel htmlFor="collect-amount" help={fieldHelp.collections.amount}>
                Monto
              </FieldLabel>
              <Input
                id="collect-amount"
                type="number"
                step="0.01"
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleCollect} disabled={submitting || !collectSaleId || !collectAmount}>
              {submitting ? 'Guardando…' : 'Registrar cobro'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
