'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Swords, Check, X, Clock, Award } from 'lucide-react'

// Tipe data untuk memastikan konsistensi
interface Profile {
  id: string;
  full_name: string;
  kelas: string;
  role: 'guru' | 'murid';
}

interface Subject {
  id: string;
  name: string;
}

interface Battle {
  id: string;
  status: string;
  challenger: { id: string; full_name: string; } | null;
  opponent: { id: string; full_name: string; } | null;
  subjects: { name: string; } | null;
  winner: { full_name: string; } | null;
}

export default function BattleArenaPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [classmates, setClassmates] = useState<Profile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState({ opponentId: '', subjectId: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    // Tidak set loading di sini agar refresh realtime tidak berkedip
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); router.push('/login'); return; }

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setCurrentUser(profileData);

    if (profileData) {
      const { data: battleData } = await supabase
        .from('battles')
        .select('*, challenger:challenger_id(id, full_name), opponent:opponent_id(id, full_name), subjects(name), winner:winner_id(full_name)')
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      setBattles(battleData || []);

      const { data: classmatesData } = await supabase.from('profiles').select('id, full_name, kelas, role').eq('kelas', profileData.kelas).neq('id', user.id);
      setClassmates(classmatesData || []);
    }
    
    const { data: subjectsData } = await supabase.from('subjects').select('*');
    setSubjects(subjectsData || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('public:battles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battles' }, (payload) => {
        console.log('Perubahan terdeteksi di tabel battles, memuat ulang data...');
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); }
  }, [fetchData]);

  const handleCreateChallenge = async () => {
    if (!challengeTarget.opponentId || !challengeTarget.subjectId || !currentUser) {
      alert("Pilih teman dan mata pelajaran.");
      return;
    }
    setIsCreating(true);
    const { data, error } = await supabase.rpc('handle_battle_action', {
      action: 'CREATE',
      p_challenger_id: currentUser.id,
      p_challenger_kelas: currentUser.kelas,
      p_opponent_id: challengeTarget.opponentId,
      p_subject_id: challengeTarget.subjectId,
      p_battle_id: null,
      p_answers: null
    });
    
    if (data && data.status === 'success') {
      router.push(`/dashboard/battle-arena/${data.battle_id}`);
    } else {
      alert("Gagal membuat tantangan: " + (data?.message || error?.message || "Terjadi kesalahan."));
      setIsCreating(false);
    }
  };
  
  const handleDeclineChallenge = async (battleId: string) => {
    if (!currentUser) return;
    await supabase.rpc('handle_battle_action', {
      action: 'DECLINE',
      p_challenger_id: currentUser.id,
      p_challenger_kelas: currentUser.kelas,
      p_battle_id: battleId,
      p_opponent_id: null,
      p_subject_id: null,
      p_answers: null
    });
    alert("Anda telah menolak tantangan.");
    fetchData();
  }

  // Komponen untuk menampilkan label status yang informatif
  const StatusLabel = ({ battle }: { battle: Battle }) => {
    if (battle.status === 'completed') {
      const isWinner = battle.winner?.full_name === currentUser?.full_name;
      return <span className={`flex items-center gap-1 text-sm font-bold ${isWinner ? 'text-green-500' : 'text-red-500'}`}><Award size={16}/> {isWinner ? 'Menang' : 'Kalah'}</span>;
    }
    if (battle.status === 'declined') {
      return <span className="flex items-center gap-1 text-sm font-bold text-gray-500"><X size={16}/> Ditolak</span>;
    }
    if (battle.challenger?.id === currentUser?.id) {
        if (battle.status === 'pending') {
            return <span className="flex items-center gap-1 text-sm font-bold text-yellow-500"><Clock size={16}/> Menunggu Lawan</span>;
        }
        if (battle.status === 'ongoing') {
            return <span className="flex items-center gap-1 text-sm font-bold text-cyan-500"><Clock size={16}/> Lawan Mengerjakan</span>;
        }
    }
    if (battle.opponent?.id === currentUser?.id && battle.status === 'ongoing') {
        return <span className="flex items-center gap-1 text-sm font-bold text-blue-500"><Swords size={16}/> Giliranmu!</span>;
    }
    return <span className="flex items-center gap-1 text-sm font-bold text-gray-500">{battle.status}</span>; // Fallback
  }

  // Filter data untuk ditampilkan di UI
  const incomingChallenges = battles.filter(b => {
      // Tantangan untukmu adalah yang statusnya 'pending' ATAU 'ongoing'
      // di mana kamu adalah lawannya.
      return b.opponent?.id === currentUser?.id && (b.status === 'pending' || b.status === 'ongoing');
  });

  const otherBattles = battles.filter(b => !incomingChallenges.some(inc => inc.id === b.id));

  if (loading) return <div className="p-6 text-center text-xl">Memuat Arena...</div>;
  if (!currentUser) return <div className="p-6 text-center text-xl">Gagal memuat data pengguna.</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">⚔️ Arena Pertarungan ⚔️</h1>
      <div className="text-center mb-8">
        <button onClick={() => setShowChallengeModal(true)} className="btn btn-primary btn-lg flex items-center gap-2 mx-auto">
            <Swords /> Tantang Teman!
        </button>
      </div>
      
      {showChallengeModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
          <div className="card w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Pilih Lawan & Mapel</h2>
            <div className="space-y-4">
              <select onChange={(e) => setChallengeTarget({...challengeTarget, opponentId: e.target.value})} className="input w-full"><option value="">-- Pilih Teman Sekelas --</option>{classmates.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select>
              <select onChange={(e) => setChallengeTarget({...challengeTarget, subjectId: e.target.value})} className="input w-full"><option value="">-- Pilih Mata Pelajaran --</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowChallengeModal(false)} className="btn bg-gray-400 hover:bg-gray-500" disabled={isCreating}>Batal</button>
              <button onClick={handleCreateChallenge} className="btn btn-primary" disabled={isCreating}>{isCreating ? 'Membuat...' : 'Kirim Tantangan'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-2xl font-semibold mb-4">Tantangan Untukmu</h2>
          <div className="space-y-3">
            {incomingChallenges.length > 0 ? incomingChallenges.map(b => (
              <div key={b.id} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-md">
                <p><strong>{b.challenger?.full_name || 'Seseorang'}</strong> menantangmu di mapel <strong>{b.subjects?.name || 'Tidak Diketahui'}</strong>!</p>
                <div className="flex gap-2 mt-2">
                  <Link href={`/dashboard/battle-arena/${b.id}`} className="btn btn-success flex-1 text-sm py-1 px-3 flex items-center justify-center gap-1"><Check size={16}/> 
                    {b.status === 'pending' ? 'Terima' : 'Lanjutkan'}
                  </Link>
                  {/* --- PERBAIKAN DI SINI --- */}
                  {/* Tombol Tolak sekarang selalu ada untuk tantangan yang masuk, selama belum selesai */}
                  <button onClick={() => handleDeclineChallenge(b.id)} className="btn bg-red-500 hover:bg-red-600 flex-1 text-sm py-1 px-3 flex items-center justify-center gap-1"><X size={16}/> Tolak</button>
                </div>
              </div>
            )) : <p className="text-sm text-gray-500">Tidak ada tantangan baru.</p>}
          </div>
        </div>
        <div className="card">
          <h2 className="text-2xl font-semibold mb-4">Status Pertarungan</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {otherBattles.length > 0 ? otherBattles.map(b => (
               <div key={b.id} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-md text-sm">
                 <div className="flex justify-between items-center">
                    <p>vs <strong>{b.challenger?.id === currentUser?.id ? b.opponent?.full_name : b.challenger?.full_name}</strong></p>
                    <StatusLabel battle={b} />
                 </div>
                 {b.status === 'completed' && b.winner && (<p className="text-xs mt-1">Pemenang: <strong>{b.winner.full_name}</strong></p>)}
               </div>
            )) : <p className="text-sm text-gray-500">Belum ada riwayat pertarungan.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
