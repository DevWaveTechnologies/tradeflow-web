import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId) {
    setProfileError('')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      setProfile(null)
      setProfileError(error.message)
      return
    }

    if (!data) {
      setProfile(null)
      setProfileError('No row in public.profiles for this account.')
      return
    }

    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession)
      if (currentSession?.user) {
        loadProfile(currentSession.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        setLoading(true)
        loadProfile(nextSession.user.id).finally(() => setLoading(false))
      } else {
        setProfile(null)
        setProfileError('')
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    return { error }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    setSession(null)
    setProfile(null)
    setProfileError('')
    setLoading(false)
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, profileError, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
