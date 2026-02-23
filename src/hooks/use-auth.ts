'use client'
import { useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  phone: string | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => { setUser(data.user ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/'
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user ?? null)
    } catch {
      // ignore
    }
  }, [])

  return { user, loading, logout, refreshUser, status: loading ? 'loading' : user ? 'authenticated' : 'unauthenticated' }
}
