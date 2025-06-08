// FILE: components/Navbar.tsx (Dengan Perbaikan Menu Admin Mobile)

'use client'

import Link from 'next/link'
import { useEffect, useState, Fragment } from 'react' // Tambahkan Fragment
import { supabase } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import {
  User, BookOpen, GalleryHorizontalEnd, LogOut,
  Swords, Users as UsersIcon, ListPlus, Shield, X
} from 'lucide-react'

// Tipe untuk setiap item navigasi
interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: ('guru' | 'murid')[];
  section?: 'main' | 'admin';
}

export default function Navbar() {
  const [role, setRole] = useState<'guru' | 'murid' | null>(null)
  const [loading, setLoading] = useState(true);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false); // State untuk modal admin
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setRole(profile?.role || null)
      }
      setLoading(false);
    }
    fetchRole()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Struktur Navigasi (tidak ada perubahan)
  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Profil', icon: <User size={24} />, roles: ['guru', 'murid'], section: 'main' },
    { href: '/dashboard/courses', label: 'Kursus', icon: <BookOpen size={24} />, roles: ['murid'], section: 'main' },
    { href: '/dashboard/manage-courses', label: 'Kelola Kursus', icon: <BookOpen size={24} />, roles: ['guru'], section: 'main' },
    { href: '/dashboard/gallery', label: 'Galeri', icon: <GalleryHorizontalEnd size={24} />, roles: ['guru', 'murid'], section: 'main' },
    { href: '/dashboard/battle-arena', label: 'Arena', icon: <Swords size={24} />, roles: ['murid'], section: 'main' },
    { href: '/dashboard/admin/create-users', label: 'Buat Akun', icon: <UsersIcon size={24} />, roles: ['guru'], section: 'admin' },
    { href: '/dashboard/admin/battle-questions', label: 'Bank Soal', icon: <ListPlus size={24} />, roles: ['guru'], section: 'admin' },
  ]
  
  const accessibleNavItems = navItems.filter(item => item.roles.includes(role!))

  const NavLink = ({ item, onClick }: { item: NavItem, onClick?: () => void }) => {
    const isActive = pathname === item.href;
    return (
      <Link href={item.href} title={item.label} onClick={onClick} className={`
        flex items-center justify-start gap-4 p-3 rounded-lg transition-colors
        ${isActive ? 'bg-sky-500/20 text-sky-500' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}
      `}>
        {item.icon}
        <span className="font-semibold">{item.label}</span>
      </Link>
    )
  }
  
  const MobileNavLink = ({ item }: { item: NavItem }) => {
      const isActive = pathname === item.href;
      return (
          <Link href={item.href} className={`flex flex-col items-center transition-colors w-16
            ${isActive ? 'text-sky-500' : 'text-gray-500 hover:text-sky-500'}
          `}>
              {item.icon}
              <span className="text-[10px] mt-1 truncate">{item.label}</span>
          </Link>
      )
  }

  if (loading) return null;

  return (
    <>
      {/* ===== Sidebar untuk Desktop (md dan lebih besar) ===== */}
      <aside className="hidden md:flex flex-col w-64 h-screen p-4 bg-[var(--card)] border-r border-[var(--border)] fixed">
        <div className="text-2xl font-bold mb-10 text-center">EdukasiApp</div>
        <nav className="flex flex-col flex-grow space-y-2">
          {accessibleNavItems.filter(item => item.section === 'main').map(item => <NavLink key={item.href} item={item} />)}
          {accessibleNavItems.some(item => item.section === 'admin') && (
            <div className="pt-6">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Admin</h3>
              <div className="space-y-2">
                 {accessibleNavItems.filter(item => item.section === 'admin').map(item => <NavLink key={item.href} item={item} />)}
              </div>
            </div>
          )}
        </nav>
        <div>
          <button onClick={logout} className="flex items-center justify-start gap-4 p-3 rounded-lg w-full text-red-500 hover:bg-red-500/10">
            <LogOut size={24} />
            <span className="font-semibold">Keluar</span>
          </button>
        </div>
      </aside>

      {/* ===== Bottom Nav untuk Mobile (di bawah md) ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--card)] border-t border-[var(--border)] flex justify-around items-center z-50">
          {accessibleNavItems.filter(item => item.section === 'main').map(item => <MobileNavLink key={item.href} item={item} />)}
          
          {/* --- TOMBOL BARU UNTUK MEMBUKA MENU ADMIN --- */}
          {role === 'guru' && (
             <button onClick={() => setIsAdminMenuOpen(true)} className={`flex flex-col items-center transition-colors w-16 text-gray-500 hover:text-sky-500`}>
                <Shield size={24}/>
                <span className="text-[10px] mt-1">Admin</span>
            </button>
          )}
          {/* ------------------------------------------- */}

          <button onClick={logout} className="flex flex-col items-center transition-colors w-16 text-gray-500 hover:text-red-500">
              <LogOut size={24}/>
              <span className="text-[10px] mt-1">Keluar</span>
          </button>
      </nav>
      
      {/* --- MODAL UNTUK MENU ADMIN DI MOBILE --- */}
      {isAdminMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
            <div className="card w-full max-w-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Menu Admin</h2>
                    <button onClick={() => setIsAdminMenuOpen(false)} className="p-1"><X size={24} /></button>
                </div>
                <nav className="flex flex-col space-y-2">
                    {accessibleNavItems.filter(item => item.section === 'admin').map(item => (
                        <NavLink key={item.href} item={item} onClick={() => setIsAdminMenuOpen(false)} />
                    ))}
                </nav>
            </div>
        </div>
      )}
      {/* ----------------------------------------- */}
    </>
  )
}