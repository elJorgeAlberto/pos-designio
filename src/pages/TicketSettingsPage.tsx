import { useEffect, useRef, useState } from 'react'
import { sileo } from 'sileo'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TicketSettingsPage() {
  const { profile } = useAuth()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('ticket_settings')
      .select('logo_url, message')
      .maybeSingle()
      .then(({ data }) => {
        setLogoUrl(data?.logo_url ?? null)
        setMessage(data?.message ?? '')
        setLoading(false)
      })
  }, [])

  async function upsertSettings(patch: { logo_url?: string; message?: string }) {
    const { error } = await supabase
      .from('ticket_settings')
      .upsert(
        { company_id: profile?.companyId, logo_url: logoUrl, message, ...patch },
        { onConflict: 'company_id' },
      )
    return error
  }

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${profile.companyId}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('ticket-logos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      sileo.error({ title: uploadError.message })
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('ticket-logos').getPublicUrl(path)
    const url = `${data.publicUrl}?t=${Date.now()}`

    const error = await upsertSettings({ logo_url: url })
    if (error) {
      sileo.error({ title: error.message })
    } else {
      setLogoUrl(url)
      sileo.success({ title: 'Logo actualizado.' })
    }
    setUploading(false)
  }

  async function handleSaveMessage() {
    setSaving(true)
    const error = await upsertSettings({ message })
    if (error) {
      sileo.error({ title: error.message })
    } else {
      sileo.success({ title: 'Mensaje del ticket guardado.' })
    }
    setSaving(false)
  }

  if (loading) return <p className="text-muted-foreground">Cargando…</p>

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-h1">
        Ticket
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-24 w-24 object-contain" />}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
          />
          <FieldLabel htmlFor="logo-btn" help={fieldHelp.ticketSettings.logo}>
            &nbsp;
          </FieldLabel>
          <Button
            id="logo-btn"
            type="button"
            variant="secondary"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Subiendo…' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mensaje del ticket</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FieldLabel htmlFor="ticket-message" help={fieldHelp.ticketSettings.message}>
            Mensaje
          </FieldLabel>
          <Textarea
            id="ticket-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <Button onClick={handleSaveMessage} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar mensaje'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
