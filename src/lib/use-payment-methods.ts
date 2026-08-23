import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type PaymentMethodOption = {
  id: string
  key: string
  label: string
  is_cash: boolean
  is_credit: boolean
}

// Active payment methods for the current company, for input Selects.
// Read-only displays don't need this — they embed payment_methods(label)
// directly in their own query instead.
export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethodOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('payment_methods')
      .select('id, key, label, is_cash, is_credit')
      .eq('active', true)
      .order('created_at')
      .then(({ data }) => {
        setMethods(data ?? [])
        setLoading(false)
      })
  }, [])

  return { methods, loading }
}
