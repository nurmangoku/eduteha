'use client'
import { useEffect, useState, useMemo } from 'react' // Tambahkan useMemo
import { supabase } from '@/lib/supabase' // Pastikan path ini sesuai
import { useRouter } from 'next/navigation'

type RoleGuardProps = {
  allowedRoles: ('guru' | 'murid')[]; 
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Memoize stringified version of allowedRoles to prevent unnecessary re-runs of useEffect
  // Urutkan array sebelum stringify untuk memastikan urutan tidak mempengaruhi hasil string
  const allowedRolesString = useMemo(() => JSON.stringify([...allowedRoles].sort()), [allowedRoles]);

  useEffect(() => {
    const checkRole = async () => {
      setLoading(true); 
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('RoleGuard: User not found or error fetching user', userError);
        router.push('/login'); 
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
        router.push('/dashboard'); 
        setLoading(false);
        return;
      }
      
      const userRole = profile?.role as 'guru' | 'murid' | undefined;

      // Parse allowedRolesString kembali ke array untuk pengecekan
      const currentAllowedRoles = JSON.parse(allowedRolesString) as ('guru' | 'murid')[];

      if (userRole && currentAllowedRoles.includes(userRole)) {
        setAuthorized(true);
      } else {
        console.log(`RoleGuard: Unauthorized. User role: "${userRole}", Allowed: "${currentAllowedRoles.join(', ')}"`);
        setAuthorized(false); 
        router.push('/dashboard'); 
      }
      setLoading(false);
    }

    checkRole();
  }, [allowedRolesString, router]); // Gunakan allowedRolesString sebagai dependency

  if (loading) {
    return <p className="p-6 text-center text-gray-600 dark:text-gray-400">🔒 Memeriksa akses Anda...</p>;
  }

  return authorized ? <>{children}</> : null;
}
