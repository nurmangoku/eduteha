'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Award, Trophy } from 'lucide-react'
import RoleGuard from '@/components/RoleGuard'
import Link from 'next/link'

// Tipe data untuk setiap entri di leaderboard
interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name: string;
  total_xp: number;
}

// Tipe data untuk profil pengguna yang login
interface UserProfile {
  role: 'guru' | 'murid';
  visible_classes: string[];
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [timeframe, setTimeframe] = useState<'all-time' | 'weekly'>('all-time')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Fungsi untuk mengambil data leaderboard, sekarang menerima kelas yang terlihat
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    
    // Jika profil belum dimuat, jangan lakukan apa-apa
    if (!profile) {
      setLoading(false);
      return;
    }
    
    // Hanya panggil RPC jika guru telah memilih setidaknya satu kelas, atau jika pengguna adalah murid
    if (profile.role === 'murid' || (profile.role === 'guru' && profile.visible_classes.length > 0)) {
        const { data: rpcData, error } = await supabase.rpc('get_leaderboard', {
          p_timeframe: timeframe,
          p_visible_classes: profile.visible_classes // Kirim daftar kelas yang terlihat
        });

        if (error) {
          console.error("Error fetching leaderboard:", error);
          setLeaderboard([]);
        } else {
          setLeaderboard(rpcData || []);
        }
    } else {
        // Jika guru tidak memilih kelas, tampilkan daftar kosong
        setLeaderboard([]);
    }
    
    setLoading(false);
  }, [timeframe, profile]);

  // useEffect utama untuk mengambil data awal (profil pengguna)
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('role, visible_classes').eq('id', user.id).single();
        if (profileData) {
          setProfile(profileData);
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  // useEffect terpisah untuk memuat ulang leaderboard saat profil atau rentang waktu berubah
  useEffect(() => {
    if (profile) {
      fetchLeaderboard();
    }
  }, [profile, fetchLeaderboard]);

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-400 text-yellow-900 border-yellow-500';
    if (rank === 2) return 'bg-slate-300 text-slate-800 border-slate-400';
    if (rank === 3) return 'bg-orange-400/50 text-orange-900 border-orange-600';
    return 'bg-slate-100 dark:bg-slate-700 border-transparent';
  };

  return (
    <RoleGuard allowedRoles={['guru', 'murid']}>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <h1 className="text-4xl font-bold mb-8 text-center">🏆 Papan Peringkat 🏆</h1>
        
        <div className="flex justify-center mb-6 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
          <button onClick={() => setTimeframe('all-time')} className={`px-4 py-2 rounded-md transition-colors w-1/2 ${timeframe === 'all-time' ? 'bg-[var(--card)] shadow font-bold' : ''}`}>Sepanjang Masa</button>
          <button onClick={() => setTimeframe('weekly')} className={`px-4 py-2 rounded-md transition-colors w-1/2 ${timeframe === 'weekly' ? 'bg-[var(--card)] shadow font-bold' : ''}`}>Minggu Ini</button>
        </div>

        {loading ? (
          <p className="text-center py-10">Memuat peringkat...</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.length > 0 ? leaderboard.map((player, index) => (
              <div key={player.user_id} className={`card p-4 flex items-center gap-4 border-l-4 ${getRankColor(player.rank)}`}>
                <div className={`flex-shrink-0 w-10 h-10 font-bold rounded-full flex items-center justify-center text-lg`}>
                  {player.rank}
                </div>
                <div className="flex-grow">
                  <p className={`font-bold text-lg ${index === 0 ? 'text-yellow-500' : ''}`}>
                    {player.full_name}
                    {index === 0 && <Award className="inline-block ml-2" />}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="font-bold text-lg">{player.total_xp}</p>
                    <p className="text-xs text-gray-500">XP</p>
                </div>
              </div>
            )) : (
                <div className="text-center text-gray-500 p-10 card">
                    <p>Belum ada data peringkat untuk ditampilkan.</p>
                    {profile?.role === 'guru' && (
                        <p className="text-sm mt-2">
                            Mungkin Anda belum memilih kelas untuk dipantau.
                            Silakan periksa <Link href="/dashboard" className="text-sky-500 hover:underline">Pengaturan Visibilitas Kelas</Link> Anda.
                        </p>
                    )}
                </div>
            )}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
