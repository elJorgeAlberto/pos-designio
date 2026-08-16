import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  companyId: string
  companyName: string
  roleName: string | null
  branchNames: string[]
}

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('users')
    .select(
      'id, company_id, company:companies(name), role:roles(name), user_branches(branch:branches(name))',
    )
    .eq('id', userId)
    .single()

  if (error || !data) return null

  const company = Array.isArray(data.company) ? data.company[0] : data.company
  const role = Array.isArray(data.role) ? data.role[0] : data.role

  return {
    id: data.id,
    companyId: data.company_id,
    companyName: company?.name ?? '—',
    roleName: role?.name ?? null,
    branchNames: data.user_branches
      .map((ub) => (Array.isArray(ub.branch) ? ub.branch[0]?.name : ub.branch?.name))
      .filter((name): name is string => Boolean(name)),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    setLoading(true)
    fetchProfile(session.user.id).then((result) => {
      setProfile(result)
      setLoading(false)
    })
  }, [session])

  return (
    <AuthContext.Provider value={{ session, profile, loading }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
