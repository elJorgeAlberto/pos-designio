import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ShoppingCart, UserPlus, Lock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// §10: FAB anchored in thumb-reach (bottom-right, above safe-area-inset).
// Scoped to actions that actually exist in the app today — the doc also
// lists "entrada de dinero" and "compra", neither of which has any
// screen yet (no gastos/compras module), so they're left out rather
// than wired to a dead end.
const actions = [
  { label: 'Nueva venta', icon: ShoppingCart, to: '/ventas' },
  { label: 'Agregar cliente', icon: UserPlus, to: '/clientes?new=1' },
  { label: 'Caja', icon: Lock, to: '/caja' },
]

export function QuickActionsFab() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div
      className="fixed right-4 z-40 flex flex-col items-end gap-3"
      style={{ bottom: 'max(1.25rem, calc(env(safe-area-inset-bottom) + 1rem))' }}
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
              className="flex items-center gap-2 rounded-full bg-card py-2 pr-4 pl-3 text-sm font-medium text-foreground shadow-md ring-1 ring-border"
            >
              <action.icon className="size-4" />
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
