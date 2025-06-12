'use client'

import Link from 'next/link'
import { useEffect, useState, Fragment } from 'react' // Tambahkan Fragment
import { supabase } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import {
  User, BookOpen, GalleryHorizontalEnd, LogOut,
  Swords, List, Users as UsersIcon, ListPlus, Shield, Trophy, PlusCircle, X
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
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
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
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        await supabase.auth.signOut()
        router.push('/login')
    }
  }

  // --- PERBAIKAN: Struktur Navigasi Disesuaikan ---
  const navItems: NavItem[] = [
    // Main Section
    { href: '/dashboard', label: 'Profil', icon: <User size={22} />, roles: ['guru', 'murid'], section: 'main' },
    { href: '/dashboard/gallery', label: 'Galeri', icon: <GalleryHorizontalEnd size={22} />, roles: ['guru', 'murid'], section: 'main' },
    { href: '/dashboard/leaderboard', label: 'Peringkat', icon: <Trophy size={22} />, roles: ['guru', 'murid'], section: 'main' },
    
    // Siswa-only Main Section
    { href: '/dashboard/courses', label: 'Kursus', icon: <BookOpen size={22} />, roles: ['murid'], section: 'main' },
    { href: '/dashboard/battle-arena', label: 'Arena', icon: <Swords size={22} />, roles: ['murid'], section: 'main' },
    { href: '/dashboard/journal', label: 'Jurnal', icon: <List size={22} />, roles: ['murid'], section: 'main' },
    
    // Guru-only Main Section
    { href: '/dashboard/manage-courses', label: 'Kelola Kursus', icon: <BookOpen size={22} />, roles: ['guru'], section: 'main' },
    { href: '/dashboard/admin/manage-students', label: 'Kelola Siswa', icon: <UsersIcon size={22} />, roles: ['guru'], section: 'main' },

    // Admin Section (untuk sidebar desktop dan modal mobile)
    { href: '/dashboard/admin/create-users', label: 'Buat Akun', icon: <PlusCircle size={22} />, roles: ['guru'], section: 'admin' },
    { href: '/dashboard/admin/battle-questions', label: 'Bank Soal', icon: <ListPlus size={22} />, roles: ['guru'], section: 'admin' },
  ]
  
  const accessibleNavItems = navItems.filter(item => item.roles.includes(role!))

  // Helper komponen untuk link di sidebar desktop
  const NavLink = ({ item, onClick }: { item: NavItem, onClick?: () => void }) => {
    const isActive = pathname === item.href;
    return (
      <Link href={item.href} title={item.label} onClick={onClick} className={`flex items-center justify-start gap-4 p-3 rounded-lg transition-colors ${isActive ? 'bg-sky-500/20 text-sky-500' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
        {item.icon}
        <span className="font-semibold">{item.label}</span>
      </Link>
    )
  }
  
  // Helper komponen untuk link di navigasi mobile
  const MobileNavLink = ({ item }: { item: NavItem }) => {
      const isActive = pathname === item.href;
      return (
          <Link href={item.href} className={`flex flex-col items-center justify-center transition-colors w-full h-full ${isActive ? 'text-sky-500' : 'text-gray-500 hover:text-sky-500'}`}>
              {item.icon}
              <span className="text-[10px] leading-tight mt-1 text-center">{item.label}</span>
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

      {/* ===== Navigasi Bawah untuk Mobile (dirombak total) ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--card)] border-t border-[var(--border)] grid grid-cols-6 z-50">
          {role === 'murid' && (
            <>
              <MobileNavLink item={navItems.find(i => i.href === '/dashboard/courses')!} />
              <MobileNavLink item={navItems.find(i => i.href === '/dashboard/battle-arena')!} />
              <MobileNavLink item={navItems.find(i => i.href === '/dashboard/leaderboard')!} />
              <MobileNavLink item={navItems.find(i => i.href === '/dashboard/journal')!} />
              <MobileNavLink item={navItems.find(i => i.href === '/dashboard/gallery')!} />
              <MobileNavLink item={navItems.find(i => i.href === '/dashboard')!} />
            </>
          )}

          {role === 'guru' && (
            <>
              <MobileNavLink item={navItems.find(i => i.href === '/dashboard')!} />
              <MobileNavLink item={navItems.find(i => i.href === '/dashboard/manage-courses')!} />
              <MobileNavLink item={navItems.find(i => i.href === '/dashboard/admin/manage-students')!} />
              <MobileNavLink item={navItems.find(i => i.href === '/dashboard/leaderboard')!} />
              <MobileNavLink item={navItems.find(i => i.href === '/dashboard/gallery')!} />
              <button onClick={() => setIsAdminMenuOpen(true)} className={`flex flex-col items-center justify-center transition-colors w-full h-full text-gray-500 hover:text-sky-500`}>
                  <Shield size={22}/>
                  <span className="text-[10px] leading-tight mt-1">Admin</span>
              </button>
            </>
          )}
      </nav>
      
      {/* Modal untuk Menu Admin di Mobile */}
      {isAdminMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
            <div className="card w-full max-w-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Menu Admin</h2>
                    <button onClick={() => setIsAdminMenuOpen(false)} className="p-1"><X size={24} /></button>
                </div>
                <nav className="flex flex-col space-y-2">
                    {accessibleNavItems.filter(item => item.section === 'admin').map(item => (
                        <Link key={item.href} href={item.href} onClick={() => setIsAdminMenuOpen(false)} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                            {item.icon}
                            <span className="font-semibold">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
      )}
    </>
  )
}
