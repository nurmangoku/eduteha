'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import RoleGuard from '@/components/RoleGuard'
import { BookCheck, Users } from 'lucide-react'
import Link from 'next/link'

// Tipe data untuk hasil rekap jurnal
interface JournalSummary {
  user_id: string;
  full_name: string;
  kelas: string;
  journal_count: number;
}

export default function JournalMonitoringPage() {
  const [summary, setSummary] = useState<JournalSummary[]>([])
  const [loading, setLoading] = useState(true)

  // Fungsi untuk mengambil data rekap jurnal
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    
    // 1. Ambil profil guru yang sedang login untuk mendapatkan visible_classes
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data: guruProfile } = await supabase
      .from('profiles')
      .select('visible_classes')
      .eq('id', user.id)
      .single();

    const visibleClasses = guruProfile?.visible_classes || [];

    // 2. Hanya panggil RPC jika guru telah memilih setidaknya satu kelas
    if (visibleClasses.length > 0) {
      const { data, error } = await supabase.rpc('get_journal_summary', {
        p_visible_classes: visibleClasses
      });
      if (error) {
        console.error("Error fetching journal summary:", error);
        setSummary([]);
      } else {
        setSummary(data || []);
      }
    } else {
        // Jika tidak ada kelas yang dipilih, tampilkan daftar kosong
        setSummary([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);


  if (loading) return <p className="p-8 text-center text-xl">Memuat rekap jurnal siswa...</p>

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-4 mb-8">
            <Users size={40} className="text-sky-500"/>
            <div>
                <h1 className="text-3xl font-bold">Pantau Jurnal Siswa</h1>
                <p className="text-gray-500">Lihat rekapitulasi pengisian jurnal mingguan oleh siswa di kelas yang Anda pilih.</p>
            </div>
        </div>
        
        <div className="card p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="p-4 font-semibold text-sm">No</th>
                  <th className="p-4 font-semibold text-sm">Nama Siswa</th>
                  <th className="p-4 font-semibold text-sm">Kelas</th>
                  <th className="p-4 font-semibold text-sm text-center">Jumlah Jurnal Diisi</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((student, index) => (
                  <tr key={student.user_id} className="border-b border-[var(--border)]">
                    <td className="p-4 w-12">{index + 1}</td>
                    <td className="p-4 font-medium">{student.full_name}</td>
                    <td className="p-4 text-gray-500">{student.kelas}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-2 font-bold text-green-600 bg-green-100 dark:bg-green-900/50 px-3 py-1 rounded-full">
                        <BookCheck size={16} /> {student.journal_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {summary.length === 0 && !loading && (
                <div className="text-center text-gray-500 p-10">
                    <p>Tidak ada data jurnal untuk ditampilkan.</p>
                    <p className="text-sm mt-2">
                        Ini bisa terjadi karena belum ada siswa yang mengisi jurnal, atau Anda belum memilih kelas untuk dipantau.
                        Silakan periksa <Link href="/dashboard" className="text-sky-500 hover:underline">Pengaturan Visibilitas Kelas</Link> Anda.
                    </p>
                </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
