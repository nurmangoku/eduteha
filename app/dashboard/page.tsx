'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Profile from './profile'

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile) return router.push('/login')

      setRole(profile.role)
      setLoading(false)
    }

    checkProfile()
  }, [router])

  if (loading) return <p>Loading...</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard {role === 'guru' ? 'Guru' : 'Murid'}</h1>
      {/* Di sini nanti muncul menu berbeda untuk guru dan murid */}
      <Profile/>
    </div>
  )
}
