'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import {
  User,
  BookOpen,
  GalleryHorizontalEnd,
  LogOut,
  PlusCircle,
} from 'lucide-react'

export default function Navbar() {
  const [role, setRole] = useState<'guru' | 'murid' | null>(null)
  const router = useRouter()
  const pathname = usePathname()

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

  const navItems = [
    {
      href: '/dashboard',
      label: 'Profil',
      icon: <User size={20} />,
      show: true,
    },
    {
      href: '/dashboard/courses',
      label: 'Kursus',
      icon: <BookOpen size={20} />,
      show: role === 'murid',
    },
    {
      href: '/dashboard/create-course',
      label: 'Buat Kursus',
      icon: <PlusCircle size={20} />,
      show: role === 'guru',
    },
    {
      href: '/dashboard/gallery',
      label: 'Galeri',
      icon: <GalleryHorizontalEnd size={20} />,
      show: true,
    },
  ]

  return (
    <nav className="fixed z-50 bottom-0 md:top-0 md:bottom-auto left-0 right-0 bg-white border-t md:border-b border-gray-200 shadow flex justify-around md:justify-center md:space-x-6 py-2 px-4 md:px-8">
      {navItems.map(
        (item) =>
          item.show && (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center text-sm transition ${
                pathname.startsWith(item.href)
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-600 hover:text-blue-500'
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1 hidden md:inline">{item.label}</span>
            </Link>
          )
      )}

      {/* Tombol logout */}
      <button
        onClick={logout}
        className="flex flex-col items-center text-sm text-red-500 hover:text-red-600"
      >
        <LogOut size={20} />
        <span className="text-xs mt-1 hidden md:inline">Keluar</span>
      </button>
    </nav>
  )
}
