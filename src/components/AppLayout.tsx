import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Menu,
  LogOut,
  Home,
  Package,
  ShoppingCart,
  Lock,
  Users,
  Receipt,
  History,
  CalendarClock,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { QuickActionsFab } from '@/components/QuickActionsFab'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/caja', label: 'Caja', icon: Lock },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/cobros', label: 'Cobros', icon: CalendarClock },
  { to: '/ticket', label: 'Ticket', icon: Receipt },
  { to: '/historial', label: 'Historial', icon: History },
]

export function AppLayout() {
  const { profile } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-svh flex-col overscroll-x-none">
      <header
        className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex min-w-0 items-center gap-3 lg:gap-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                  <Menu />
                </Button>
              }
            />
            <SheetContent side="left" className="flex flex-col">
              <SheetHeader>
                <SheetTitle style={{ fontFamily: 'var(--font-heading)' }}>
                  {profile?.companyName ?? 'POS Designio'}
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-1 flex-col gap-1 px-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-11 items-center gap-3 rounded-lg px-3 text-base transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'text-foreground hover:bg-accent/40',
                      )
                    }
                  >
                    <item.icon className="size-5 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="border-t border-border p-2">
                <Button
                  variant="ghost"
                  className="min-h-11 w-full justify-start gap-3 px-3 text-base"
                  onClick={() => supabase.auth.signOut()}
                >
                  <LogOut className="size-5" /> Cerrar sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <span
            style={{ fontFamily: 'var(--font-heading)' }}
            className="truncate font-semibold"
          >
            {profile?.companyName ?? 'POS Designio'}
          </span>

          <nav className="hidden gap-4 text-sm lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'transition-colors',
                    isActive ? 'font-medium text-primary' : 'text-foreground hover:text-primary',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="hidden lg:inline-flex"
          onClick={() => supabase.auth.signOut()}
        >
          Cerrar sesión
        </Button>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
      <QuickActionsFab />
      <footer
        className="border-t border-border py-4 text-center text-xs text-muted-foreground"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        Powered by esdesignio
      </footer>
    </div>
  )
}
