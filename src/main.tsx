import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sileo'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/lib/auth-context'
import { TooltipProvider } from '@/components/ui/tooltip'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <AuthProvider>
        <Toaster position="top-center" />
        <App />
      </AuthProvider>
    </TooltipProvider>
  </StrictMode>,
)
