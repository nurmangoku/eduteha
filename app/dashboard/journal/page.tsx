'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import RoleGuard from '@/components/RoleGuard'
import { PlusCircle, BookText } from 'lucide-react'
import Link from 'next/link'

// Helper function untuk mendapatkan tanggal hari Senin dari minggu ini
const getMondayOfCurrentWeek = () => {
  const today = new Date();
  const day = today.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0]; // Format ke YYYY-MM-DD
};

// Tipe data untuk daftar jurnal
interface JournalEntry {
  id: string;
  week_start_date: string;
}

export default function JournalListPage() {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoize tanggal minggu ini agar tidak dihitung ulang pada setiap render
  const currentWeekStartDate = useMemo(() => getMondayOfCurrentWeek(), []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({ id: user.id });
        const { data } = await supabase
          .from('weekly_journals')
          .select('id, week_start_date')
          .eq('user_id', user.id)
          .order('week_start_date', { ascending: false });
        
        setJournals(data || []);
      }
      setLoading(false);
    };
    init();
  }, []);
  
  // Cek apakah jurnal untuk minggu ini sudah ada di dalam daftar
  const currentWeekJournalExists = journals.some(j => j.week_start_date === currentWeekStartDate);

  // Format tanggal agar lebih mudah dibaca
  const formatDateRange = (startDateStr: string) => {
    const startDate = new Date(startDateStr);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Minggu berakhir 6 hari setelah Senin
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return `${startDate.toLocaleDateString('id-ID', options)} - ${endDate.toLocaleDateString('id-ID', options)}`;
  }

  if (loading) return <div className="p-6 text-center">Memuat Daftar Jurnal...</div>;

  return (
    <RoleGuard allowedRoles={['murid']}>
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Jurnal Mingguan Saya</h1>
          {/* Tampilkan tombol hanya jika jurnal minggu ini belum dibuat */}
          {!currentWeekJournalExists && (
            <Link href={`/dashboard/journal/${currentWeekStartDate}`} className="btn btn-primary flex items-center gap-2">
              <PlusCircle size={20}/>
              <span>Buat Jurnal Minggu Ini</span>
            </Link>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-2xl font-semibold mb-4">Riwayat Jurnal</h2>
          <div className="space-y-3">
            {journals.length > 0 ? (
              journals.map(journal => (
                <Link key={journal.id} href={`/dashboard/journal/${journal.week_start_date}`}>
                  <div className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer">
                    <BookText className="text-sky-500" />
                    <div>
                      <p className="font-semibold">Jurnal Minggu</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatDateRange(journal.week_start_date)}</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">Kamu belum memiliki riwayat jurnal.</p>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
