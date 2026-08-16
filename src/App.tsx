import { useAuth } from '@/lib/auth-context'
import { LoginForm } from '@/components/LoginForm'
import { AuthenticatedHome } from '@/components/AuthenticatedHome'

function App() {
  const { session, loading } = useAuth()

  if (loading) return null
  return session ? <AuthenticatedHome /> : <LoginForm />
}

export default App
