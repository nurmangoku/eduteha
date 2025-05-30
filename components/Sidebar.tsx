'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Sidebar() {
  const [role, setRole] = useState<'teacher' | 'student' | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setRole(profile?.role || null)
    }

    fetchRole()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64  shadow-lg p-4">
      <h1 className="text-xl font-bold mb-6">EduApp</h1>

      <nav className="space-y-3">
        <Link href="/dashboard" className="block">Profil</Link>
        <Link href="/dashboard/courses" className="block">Kursus</Link>
        <Link href="/dashboard/gallery" className="block">Galeri</Link>

        {role === 'teacher' && (
          <>
            <Link href="/dashboard/create-course" className="block">➕ Buat Kursus</Link>
          </>
        )}

        <button onClick={logout} className="mt-6 text-red-600">Logout</button>
      </nav>
    </aside>
  )
}
