import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ShoppingCart, UserPlus, Wallet, Truck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// BRANDING.md §6: fan-out is "nueva venta, entrada de dinero, agregar
// cliente, compra" with nueva venta the primary/biggest item. "Compra"
// routes to the Proveedores directory rather than auto-opening a form —
// registering a purchase always starts by picking a supplier first, so
// there's no standalone "new purchase" screen to jump to.
const actions = [
  { label: 'Nueva venta', icon: ShoppingCart, to: '/ventas', primary: true },
  { label: 'Registrar gasto', icon: Wallet, to: '/gastos?new=1', primary: false },
  { label: 'Agregar cliente', icon: UserPlus, to: '/clientes?new=1', primary: false },
  { label: 'Compra a proveedor', icon: Truck, to: '/proveedores', primary: false },
]

export function QuickActionsFab() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div
      className={cn(
        'fixed right-4 z-40 flex flex-col items-end gap-3',
        'bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5.25rem))]',
        'lg:bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+1.25rem))]',
      )}
    >
      {open && (
        <div className="flex flex-col items-end gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                setOpen(false)
                navigate(action.to)
              }}
              className={cn(
                'flex items-center gap-2 py-2 pr-4 pl-3 text-sm shadow-md ring-1 ring-border',
                action.primary
                  ? 'bg-primary text-primary-foreground text-base font-semibold'
                  : 'bg-card font-medium text-foreground',
              )}
            >
              <action.icon className={action.primary ? 'size-5' : 'size-4'} />
              {action.label}
            </button>
          ))}
        </div>
      )}
      <Button
        type="button"
        size="icon"
        className="size-14 rounded-full shadow-lg"
        aria-label={open ? 'Cerrar acciones rápidas' : 'Acciones rápidas'}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="size-6" /> : <Plus className="size-6" />}
      </Button>
    </div>
  )
}
