'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RoleGuard from '@/components/RoleGuard'
import { BookCheck } from 'lucide-react'

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

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_journal_summary');
      if (error) {
        console.error("Error fetching journal summary:", error);
      } else {
        setSummary(data || []);
      }
      setLoading(false);
    }
    fetchSummary();
  }, [])

  if (loading) return <p className="p-8 text-center">Memuat rekap jurnal siswa...</p>

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">Pantau Jurnal Mingguan Siswa</h1>
        <div className="card p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="p-4 font-semibold">No</th>
                  <th className="p-4 font-semibold">Nama Siswa</th>
                  <th className="p-4 font-semibold">Kelas</th>
                  <th className="p-4 font-semibold text-center">Jumlah Jurnal Diisi</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((student, index) => (
                  <tr key={student.user_id} className="border-b border-[var(--border)]">
                    <td className="p-4">{index + 1}</td>
                    <td className="p-4 font-medium">{student.full_name}</td>
                    <td className="p-4 text-gray-500">{student.kelas}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-2 font-bold text-green-600">
                        <BookCheck size={16} /> {student.journal_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {summary.length === 0 && <p className="text-center text-gray-500 p-8">Belum ada siswa atau jurnal yang diisi.</p>}
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
