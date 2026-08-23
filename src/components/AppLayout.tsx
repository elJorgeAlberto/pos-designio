import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
  Wallet,
  Truck,
  Building2,
  CreditCard,
  ShoppingBasket,
  Warehouse,
  Store,
  Contact,
  Fingerprint,
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
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

// BRANDING.md §0: no navbar de sitio web. Móvil vive en un shell de app —
// tab bar inferior con los destinos de mayor uso diario + FAB. El resto
// de las pantallas cuelga de "Más". Desktop expande el mismo shell a un
// sidebar persistente (usa las variables --sidebar-* del tema, definidas
// desde el inicio pero sin consumidor hasta ahora) en vez de comprimirlo.
const primaryTabs = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/caja', label: 'Caja', icon: Lock },
  { to: '/clientes', label: 'Clientes', icon: Users },
]

const moreItems = [
  { to: '/empresas', label: 'Empresas', icon: Building2 },
  { to: '/cobros', label: 'Cobros pendientes', icon: CalendarClock },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/inventario', label: 'Inventario', icon: Warehouse },
  { to: '/gastos', label: 'Gastos', icon: Wallet },
  { to: '/proveedores', label: 'Proveedores', icon: Truck },
  { to: '/compras', label: 'Compras', icon: ShoppingBasket },
  { to: '/sucursales', label: 'Sucursales', icon: Store },
  { to: '/personal', label: 'Personal', icon: Contact },
  { to: '/checador', label: 'Checador', icon: Fingerprint },
  { to: '/historial', label: 'Historial de ventas', icon: History },
  { to: '/ticket', label: 'Ticket', icon: Receipt },
  { to: '/medios-pago', label: 'Medios de pago', icon: CreditCard },
]

const sidebarItems = [...primaryTabs, ...moreItems]

export function AppLayout() {
  const { profile } = useAuth()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const isMoreActive = moreItems.some((item) => item.to === location.pathname)

  function signOut() {
    setMoreOpen(false)
    supabase.auth.signOut()
  }

  return (
    <div className="flex min-h-svh overscroll-x-none">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="border-b border-sidebar-border px-4 py-4">
          <span
            style={{ fontFamily: 'var(--font-heading)' }}
            className="block truncate text-lg font-bold text-sidebar-foreground"
          >
            {profile?.companyName ?? 'POS Designio'}
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 px-3 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/40',
                )
              }
            >
              <item.icon className="size-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            className="min-h-11 w-full justify-start gap-3 px-3 text-sm text-sidebar-foreground hover:bg-sidebar-accent/40"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="size-5" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <span
            style={{ fontFamily: 'var(--font-heading)' }}
            className="truncate font-semibold"
          >
            {profile?.companyName ?? 'POS Designio'}
          </span>
        </header>

        <main className="flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-4">
          <Outlet />
        </main>

        <footer className="hidden border-t border-border py-4 text-center text-xs text-muted-foreground lg:block">
          Powered by esdesignio
        </footer>
      </div>

      <QuickActionsFab />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {primaryTabs.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px]',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <item.icon className="size-5" />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px]',
            isMoreActive ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <Menu className="size-5" />
          Más
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="flex max-h-[80vh] flex-col lg:hidden">
          <SheetHeader>
            <SheetTitle>Más</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 overflow-y-auto px-2 pb-2">
            {moreItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center gap-3 px-3 text-base',
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
              onClick={signOut}
            >
              <LogOut className="size-5" /> Cerrar sesión
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
