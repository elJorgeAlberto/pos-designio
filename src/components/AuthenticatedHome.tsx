import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export function AuthenticatedHome() {
  const { profile } = useAuth()

  return (
    <div className="flex min-h-svh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <h1
          style={{ fontFamily: 'var(--font-heading)' }}
          className="text-3xl font-semibold"
        >
          Bienvenido
        </h1>
        {profile && (
          <div className="text-muted-foreground">
            <p>{profile.companyName}</p>
            <p>
              Rol: {profile.roleName ?? 'sin asignar'}
              {profile.branchNames.length > 0 && ` · ${profile.branchNames.join(', ')}`}
            </p>
          </div>
        )}
        <Button variant="secondary" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </Button>
      </main>
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Powered by esdesignio
      </footer>
    </div>
  )
}
