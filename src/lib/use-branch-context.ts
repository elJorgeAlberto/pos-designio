import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useBranchContext() {
  const [branchId, setBranchId] = useState<string | null>(null)
  const [cashRegisterId, setCashRegisterId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('user_branches')
      .select('branch_id')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.branch_id) {
          setLoading(false)
          return
        }
        setBranchId(data.branch_id)
        supabase
          .from('cash_registers')
          .select('id')
          .eq('branch_id', data.branch_id)
          .limit(1)
          .maybeSingle()
          .then(({ data: register }) => {
            setCashRegisterId(register?.id ?? null)
            setLoading(false)
          })
      })
  }, [])

  return { branchId, cashRegisterId, loading }
}
