import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { LoginForm } from '@/components/LoginForm'
import { AppLayout } from '@/components/AppLayout'
import { Home } from '@/pages/Home'
import { ProductsPage } from '@/pages/ProductsPage'
import { SalesPage } from '@/pages/SalesPage'
import { CashRegisterPage } from '@/pages/CashRegisterPage'

function App() {
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return <LoginForm />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/productos" element={<ProductsPage />} />
          <Route path="/ventas" element={<SalesPage />} />
          <Route path="/caja" element={<CashRegisterPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
