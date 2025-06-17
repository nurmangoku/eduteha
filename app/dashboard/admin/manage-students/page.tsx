'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import RoleGuard from '@/components/RoleGuard'
import Image from 'next/image'

interface StudentProfile {
  id: string;
  full_name: string;
  kelas: string;
  avatar_url: string;
}

export default function ManageStudentsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, kelas, avatar_url')
        .eq('role', 'murid')
        .order('full_name');
      
      if (data) setStudents(data);
      setLoading(false);
    }
    fetchStudents();
  }, [])

  if (loading) return <p className="p-8 text-center">Memuat daftar siswa...</p>

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">Kelola Akun Siswa</h1>
        <div className="card p-6">
          <ul className="space-y-4">
            {students.map(student => (
              <li key={student.id}>
                <Link href={`/dashboard/profile/${student.id}`}>
                  <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Image 
                      // --- PERBAIKAN DI SINI: Gunakan .trim() untuk menghapus spasi ---
                      src={student.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${student.full_name.trim()}`} 
                      alt={student.full_name}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div>
                      <p className="font-semibold">{student.full_name}</p>
                      <p className="text-sm text-gray-500">{student.kelas}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </RoleGuard>
  )
}
