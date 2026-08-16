import { useNavigate } from 'react-router-dom'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export type ReceivableRow = {
  clientId: string
  name: string
  balance: number
  overdue: boolean
}

export function ReceivablesDrawer({
  open,
  onOpenChange,
  clients,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: ReceivableRow[]
}) {
  const navigate = useNavigate()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Cuentas por cobrar</SheetTitle>
          <SheetDescription>Clientes con saldo pendiente, de mayor a menor.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-1 overflow-y-auto px-4">
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ningún cliente debe saldo.</p>
          ) : (
            clients
              .slice()
              .sort((a, b) => b.balance - a.balance)
              .map((c) => (
                <button
                  key={c.clientId}
                  type="button"
                  onClick={() => navigate('/clientes')}
                  className="flex items-center justify-between border-b border-border py-3 text-left text-sm hover:bg-accent/30"
                >
                  <span>{c.name}</span>
                  <span className="flex items-center gap-2">
                    {c.overdue && <span className="text-xs font-medium text-destructive">Atrasado</span>}
                    <span className="font-medium tabular-nums text-destructive">
                      ${c.balance.toFixed(2)}
                    </span>
                  </span>
                </button>
              ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
