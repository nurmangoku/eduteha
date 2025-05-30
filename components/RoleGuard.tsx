'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type RoleGuardProps = {
  allowedRoles: ('guru' | 'murid')[]
  children: React.ReactNode
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile && allowedRoles.includes(profile.role)) {
        setAuthorized(true)
      } else {
        router.push('/dashboard') // arahkan ke dashboard jika tidak berhak
      }

      setLoading(false)
    }

    checkRole()
  }, [allowedRoles, router])

  if (loading) return <p className="p-4">🔒 Memeriksa akses...</p>

  return authorized ? <>{children}</> : null
}
