import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export function AppLayout() {
  const { profile } = useAuth()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-6">
          <span style={{ fontFamily: 'var(--font-heading)' }} className="font-semibold">
            {profile?.companyName ?? 'POS Designio'}
          </span>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="text-foreground hover:text-primary">
              Inicio
            </Link>
            <Link to="/productos" className="text-foreground hover:text-primary">
              Productos
            </Link>
            <Link to="/ventas" className="text-foreground hover:text-primary">
              Ventas
            </Link>
            <Link to="/caja" className="text-foreground hover:text-primary">
              Caja
            </Link>
            <Link to="/clientes" className="text-foreground hover:text-primary">
              Clientes
            </Link>
          </nav>
        </div>
        <Button variant="secondary" size="sm" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </Button>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Powered by esdesignio
      </footer>
    </div>
  )
}
