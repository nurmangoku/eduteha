'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase' // Pastikan path ini sesuai
import { useRouter } from 'next/navigation'

type RoleGuardProps = {
  allowedRoles: ('guru' | 'murid')[]; // Menggunakan tipe peran yang konsisten ('guru', 'murid')
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkRole = async () => {
      setLoading(true); // Pastikan loading true di awal pengecekan
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('RoleGuard: User not found or error fetching user', userError);
        router.push('/login'); // Arahkan ke halaman login jika tidak ada user
        // setLoading(false) akan dipanggil di finally block jika ada
        // Namun, karena ada return, pastikan setLoading(false) dipanggil jika tidak ada finally
        // Untuk kasus ini, kita bisa langsung set loading false dan return
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('RoleGuard: Error fetching profile', profileError);
        // Jika error mengambil profil, anggap tidak berhak dan arahkan
        router.push('/dashboard'); 
        setLoading(false);
        return;
      }
      
      // Pastikan profile.role adalah salah satu dari 'guru' atau 'murid' sebelum includes
      const userRole = profile?.role as 'guru' | 'murid' | undefined;

      if (userRole && allowedRoles.includes(userRole)) {
        setAuthorized(true);
      } else {
        console.log(`RoleGuard: Unauthorized. User role: ${userRole}, Allowed: ${allowedRoles.join(', ')}`);
        setAuthorized(false); // Eksplisit set false
        router.push('/dashboard'); // Arahkan ke dashboard jika tidak berhak
      }
      setLoading(false);
    }

    checkRole();
  }, [allowedRoles, router]); // Dependencies

  if (loading) {
    return <p className="p-6 text-center text-gray-600 dark:text-gray-400">🔒 Memeriksa akses Anda...</p>;
  }

  return authorized ? <>{children}</> : null;
}
