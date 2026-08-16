import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <p style={{ fontFamily: 'var(--font-display)' }} className="text-6xl text-primary">
          $128.50
        </p>
        <h1
          style={{ fontFamily: 'var(--font-heading)' }}
          className="text-3xl font-semibold"
        >
          POS Designio
        </h1>
        <p className="max-w-sm text-muted-foreground">
          Base del stack lista: React + Vite + Tailwind + shadcn/ui, con la
          paleta y tipografías del sistema de diseño.
        </p>
        <Button>Nueva venta</Button>
      </main>
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Powered by esdesignio
      </footer>
    </div>
  )
}

export default App
