'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Trash2 } from 'lucide-react'

interface Profile {
  id: string; full_name: string; kelas: string; role: 'guru' | 'murid'; avatar_url: string;
}

export default function ViewProfilePage() {
  const { id: profileId } = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [viewerRole, setViewerRole] = useState<'guru' | 'murid' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof profileId !== 'string') return;
    const fetchData = async () => {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', profileId).single();
      if (profileData) setProfile(profileData);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: viewerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setViewerRole(viewerProfile?.role || null);
      }
      setLoading(false);
    }
    fetchData();
  }, [profileId])
  
  const handleDeleteAccount = async () => {
    if (!profile) return;
    if (confirm(`PERINGATAN: Anda akan menghapus akun "${profile.full_name}" secara permanen. Aksi ini tidak bisa diurungkan. Lanjutkan?`)) {
        const { data, error } = await supabase.rpc('delete_student_account', { p_student_id: profile.id });
        if (error) {
            alert("Gagal menghapus akun: " + error.message);
        } else {
            alert(data);
            router.push('/dashboard/admin/manage-students');
        }
    }
  }

  if (loading) return <p className="p-8 text-center">Memuat profil...</p>
  if (!profile) return <p className="p-8 text-center text-red-500">Profil tidak ditemukan.</p>

  return (
    <div className="max-w-lg mx-auto p-8 mt-10 card">
        <div className="text-center">
            <Image 
                src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name}`}
                alt={profile.full_name}
                width={128}
                height={128}
                className="rounded-full mx-auto border-4"
            />
            <h1 className="text-3xl font-bold mt-4">{profile.full_name}</h1>
            <p className="text-gray-500">{profile.role === 'guru' ? 'Guru' : `Siswa ${profile.kelas}`}</p>
        </div>
        
        {viewerRole === 'guru' && profile.role === 'murid' && (
            <div className="mt-8 pt-6 border-t border-dashed">
                <h3 className="text-lg font-bold text-red-500 text-center mb-4">Zona Berbahaya (Admin)</h3>
                <button 
                    onClick={handleDeleteAccount}
                    className="btn bg-red-600 hover:bg-red-700 w-full flex items-center justify-center gap-2">
                    <Trash2 size={16}/> Hapus Akun Siswa Ini
                </button>
            </div>
        )}
    </div>
  )
}
