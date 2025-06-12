'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Award } from 'lucide-react'
import Image from 'next/image'

// Tipe data untuk setiap entri di leaderboard
interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name: string;
  total_xp: number;
  // Kita tambahkan avatar secara manual di frontend
  avatar_url?: string;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [timeframe, setTimeframe] = useState<'all-time' | 'weekly'>('all-time')
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    const { data: rpcData, error } = await supabase.rpc('get_leaderboard', {
      timeframe: timeframe === 'weekly' ? 'weekly' : 'all-time'
    });

    if (error) {
      console.error("Error fetching leaderboard:", error);
      setLeaderboard([]);
    } else if (rpcData) {
      // Ambil URL avatar untuk setiap pengguna di leaderboard
      const userIds = rpcData.map((entry: LeaderboardEntry) => entry.user_id);
      const { data: profilesData } = await supabase.from('profiles').select('id, avatar_url').in('id', userIds);
      
      const avatarMap = new Map(profilesData?.map(p => [p.id, p.avatar_url]));
      
      const leaderboardWithAvatars = rpcData.map((entry: LeaderboardEntry) => ({
        ...entry,
        avatar_url: avatarMap.get(entry.user_id)
      }));

      setLeaderboard(leaderboardWithAvatars);
    }
    setLoading(false);
  }, [timeframe]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-400 text-yellow-900';
    if (rank === 2) return 'bg-slate-300 text-slate-800';
    if (rank === 3) return 'bg-yellow-600/50 text-yellow-900';
    return 'bg-slate-100 dark:bg-slate-700';
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">🏆 Papan Peringkat 🏆</h1>
      
      {/* Tombol untuk mengganti rentang waktu */}
      <div className="flex justify-center mb-6 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
        <button onClick={() => setTimeframe('all-time')} className={`px-4 py-2 rounded-md transition-colors w-1/2 ${timeframe === 'all-time' ? 'bg-[var(--card)] shadow font-bold' : ''}`}>Sepanjang Masa</button>
        <button onClick={() => setTimeframe('weekly')} className={`px-4 py-2 rounded-md transition-colors w-1/2 ${timeframe === 'weekly' ? 'bg-[var(--card)] shadow font-bold' : ''}`}>Minggu Ini</button>
      </div>

      {loading ? (
        <p className="text-center">Memuat peringkat...</p>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((player, index) => (
            <div key={player.user_id} className={`card p-4 flex items-center gap-4 ${index === 0 ? 'border-2 border-yellow-400' : ''}`}>
              <div className={`flex-shrink-0 w-10 h-10 font-bold rounded-full flex items-center justify-center ${getRankColor(player.rank)}`}>
                {player.rank}
              </div>
              <Image 
                src={player.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${player.full_name}`}
                alt={player.full_name}
                width={48}
                height={48}
                className="rounded-full"
              />
              <div className="flex-grow">
                <p className={`font-bold ${index === 0 ? 'text-yellow-500' : ''}`}>
                  {player.full_name}
                  {index === 0 && <Award className="inline-block ml-2 text-yellow-500" />}
                </p>
                <p className="text-sm text-gray-500">{player.total_xp} XP</p>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && <p className="text-center text-gray-500 py-8">Belum ada data peringkat untuk ditampilkan.</p>}
        </div>
      )}
    </div>
  );
}
