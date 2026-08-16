import { useAuth } from '@/lib/auth-context'

export function Home() {
  const { profile } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <h1 style={{ fontFamily: 'var(--font-heading)' }} className="text-3xl font-semibold">
        Bienvenido
      </h1>
      {profile && (
        <p className="text-muted-foreground">
          Rol: {profile.roleName ?? 'sin asignar'}
          {profile.branchNames.length > 0 && ` · ${profile.branchNames.join(', ')}`}
        </p>
      )}
    </div>
  )
}
