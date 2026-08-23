import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { LoginForm } from '@/components/LoginForm'
import { AppLayout } from '@/components/AppLayout'
import { Home } from '@/pages/Home'
import { ProductsPage } from '@/pages/ProductsPage'
import { SalesPage } from '@/pages/SalesPage'
import { CashRegisterPage } from '@/pages/CashRegisterPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { OrganizationsPage } from '@/pages/OrganizationsPage'
import { PaymentMethodsPage } from '@/pages/PaymentMethodsPage'
import { TicketSettingsPage } from '@/pages/TicketSettingsPage'
import { SalesHistoryPage } from '@/pages/SalesHistoryPage'
import { CobrosPendientesPage } from '@/pages/CobrosPendientesPage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { SuppliersPage } from '@/pages/SuppliersPage'
import { PurchasesPage } from '@/pages/PurchasesPage'
import { BranchesPage } from '@/pages/BranchesPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { StaffPage } from '@/pages/StaffPage'
import { CheckInPage } from '@/pages/CheckInPage'

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
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/empresas" element={<OrganizationsPage />} />
          <Route path="/medios-pago" element={<PaymentMethodsPage />} />
          <Route path="/cobros" element={<CobrosPendientesPage />} />
          <Route path="/gastos" element={<ExpensesPage />} />
          <Route path="/proveedores" element={<SuppliersPage />} />
          <Route path="/compras" element={<PurchasesPage />} />
          <Route path="/inventario" element={<InventoryPage />} />
          <Route path="/sucursales" element={<BranchesPage />} />
          <Route path="/personal" element={<StaffPage />} />
          <Route path="/checador" element={<CheckInPage />} />
          <Route path="/ticket" element={<TicketSettingsPage />} />
          <Route path="/historial" element={<SalesHistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
