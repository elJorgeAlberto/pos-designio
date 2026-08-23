import { useState, type FormEvent } from 'react'
import { sileo } from 'sileo'
import { Eye, EyeOff, Loader2, Lock, Mail, Store } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel } from '@/components/FieldLabel'
import { fieldHelp } from '@/lib/field-help'
import { Card, CardContent } from '@/components/ui/card'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      sileo.error({ title: 'Correo o contraseña incorrectos.' })
    }
    setSubmitting(false)
  }

  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-10"
      style={{
        paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="mb-3 flex size-16 items-center justify-center bg-primary">
          <Store className="size-8 text-primary-foreground" />
        </div>
        <span className="text-h0 leading-none text-primary">POS</span>
        <span className="-mt-2 text-h1 text-foreground">Designio</span>
        <span className="mt-1 text-body text-muted-foreground">Sistema de punto de venta</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="email" help={fieldHelp.login.email}>
                Correo
              </FieldLabel>
              <div className="relative flex items-center">
                <Mail className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="password" help={fieldHelp.login.password}>
                Contraseña
              </FieldLabel>
              <div className="relative flex items-center">
                <Lock className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-1 flex size-6 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="mt-2 min-h-11 w-full">
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" /> Entrando…
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <span className="text-caption text-muted-foreground">Powered by esdesignio</span>
    </div>
  )
}
