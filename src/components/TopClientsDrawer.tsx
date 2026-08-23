import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

export type ClientRanking = { clientId: string; name: string; total: number }

export function TopClientsDrawer({
  open,
  onOpenChange,
  ranking,
  onSelectClient,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ranking: ClientRanking[]
  onSelectClient: (clientId: string) => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Top clientes</DrawerTitle>
          <DrawerDescription>Por total comprado histórico.</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-1 overflow-y-auto px-4 pb-4">
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay compras ligadas a un cliente.</p>
          ) : (
            ranking.map((r, i) => (
              <button
                key={r.clientId}
                type="button"
                onClick={() => onSelectClient(r.clientId)}
                className="flex items-center justify-between border-b border-border py-2 text-left text-sm hover:text-primary"
              >
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground tabular-nums">{i + 1}.</span> {r.name}
                </span>
                <span className="font-medium tabular-nums">${r.total.toFixed(2)}</span>
              </button>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
