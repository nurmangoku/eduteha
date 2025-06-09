'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import RoleGuard from '@/components/RoleGuard'
import { Save } from 'lucide-react'
import Link from 'next/link'

// Tipe data untuk jurnal
interface JournalData {
  id?: string;
  prayer_checklist: boolean[];
  quran_checklist: boolean[];
  reflection_happy_moment: string;
  reflection_learned: string;
  reflection_good_deeds: string;
  reflection_improvement: string;
  good_deeds_home: string;
}

export default function JournalEditorPage() {
  const { week: weekStartDate } = useParams();
  const router = useRouter();

  const [journal, setJournal] = useState<JournalData | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);

  const loadJournal = useCallback(async (userId: string, week: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('weekly_journals')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', week)
      .single();
    
    if (data) {
      setJournal(data);
      setIsNew(false);
    } else {
      setJournal({
        prayer_checklist: Array(7).fill(false),
        quran_checklist: Array(7).fill(false),
        reflection_happy_moment: '',
        reflection_learned: '',
        reflection_good_deeds: '',
        reflection_improvement: '',
        good_deeds_home: '',
      });
      setIsNew(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (typeof weekStartDate !== 'string') return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({ id: user.id });
        loadJournal(user.id, weekStartDate);
      } else {
        setLoading(false);
      }
    };
    init();
  }, [weekStartDate, loadJournal]);

  const handleSaveJournal = async () => {
    if (!journal || !currentUser || typeof weekStartDate !== 'string') return;
    
    const { error } = await supabase
      .from('weekly_journals')
      .upsert({
        ...journal,
        user_id: currentUser.id,
        week_start_date: weekStartDate,
      }, {
        onConflict: 'user_id, week_start_date'
      });

    if (error) {
      alert('Gagal menyimpan: ' + error.message);
    } else {
      alert('Jurnal berhasil disimpan!');
      router.push('/dashboard/journal');
    }
  };

  const handleCheckboxChange = (field: 'prayer_checklist' | 'quran_checklist', index: number) => {
    if (!journal) return;
    const newList = [...journal[field]];
    newList[index] = !newList[index];
    setJournal({ ...journal, [field]: newList });
  };
  
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  if (loading) return <div className="p-6 text-center">Memuat Jurnal...</div>;
  if (!journal) return <div className="p-6 text-center">Gagal memuat data jurnal. <Link href="/dashboard/journal" className="text-sky-500">Kembali</Link></div>;

  return (
    <RoleGuard allowedRoles={['murid']}>
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        <h1 className="text-4xl font-bold">
          {isNew ? "Buat Jurnal Baru" : "Edit Jurnal"}
        </h1>
        <p className="text-gray-500">Untuk Minggu Mulai: {new Date(weekStartDate as string).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-2xl font-semibold mb-4">Ceklis Ibadah Harian</h2>
            <div className="space-y-3">
              <p className="font-medium">Salat 5 Waktu</p>
              <div className="flex flex-wrap gap-2">{days.map((day, i) => <div key={i} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-md"><input type="checkbox" checked={journal.prayer_checklist[i]} onChange={() => handleCheckboxChange('prayer_checklist', i)} className="w-5 h-5"/> <label>{day}</label></div>)}</div>
              {/* --- PERBAIKAN DI SINI --- */}
              <p className="font-medium">Membaca Al-Qur&apos;an</p>
              <div className="flex flex-wrap gap-2">{days.map((day, i) => <div key={i} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-md"><input type="checkbox" checked={journal.quran_checklist[i]} onChange={() => handleCheckboxChange('quran_checklist', i)} className="w-5 h-5"/> <label>{day}</label></div>)}</div>
            </div>
          </div>
          <div className="card p-6 space-y-4">
            <h2 className="text-2xl font-semibold">Refleksi Diri</h2>
            <textarea value={journal.reflection_happy_moment || ''} onChange={e => setJournal({...journal, reflection_happy_moment: e.target.value})} className="input h-24" placeholder="Apa momen paling menyenangkan di sekolah minggu ini?" />
            <textarea value={journal.reflection_learned || ''} onChange={e => setJournal({...journal, reflection_learned: e.target.value})} className="input h-24" placeholder="Apa yang saya pelajari minggu ini?" />
            <textarea value={journal.reflection_good_deeds || ''} onChange={e => setJournal({...journal, reflection_good_deeds: e.target.value})} className="input h-24" placeholder="Hal baik apa yang saya lakukan minggu ini?" />
            <textarea value={journal.reflection_improvement || ''} onChange={e => setJournal({...journal, reflection_improvement: e.target.value})} className="input h-24" placeholder="Apa yang bisa saya perbaiki minggu depan?" />
          </div>
          <div className="card p-6 space-y-4">
            <h2 className="text-2xl font-semibold">Perbuatan Baik di Rumah</h2>
            <textarea value={journal.good_deeds_home || ''} onChange={e => setJournal({...journal, good_deeds_home: e.target.value})} className="input h-24" placeholder="Perbuatan baik apa yang saya lakukan di rumah minggu ini?" />
          </div>
          <button onClick={handleSaveJournal} className="btn btn-primary w-full !mt-8 text-lg flex items-center justify-center gap-2"><Save /> Simpan Jurnal</button>
        </div>
      </div>
    </RoleGuard>
  )
}
