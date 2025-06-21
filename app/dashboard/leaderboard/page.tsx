'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Trophy, Loader, ShieldAlert, User, UserCircle2 } from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';
import Link from 'next/link';

// --- DEFINISI TIPE DATA ---

interface LeaderboardEntry {
    id: string;
    full_name: string;
    xp: number;
    rank: number;
    kelas: string;
}

// --- KOMPONEN UTAMA ---
export default function LeaderboardPage() {
    const router = useRouter();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<'guru' | 'murid' | null>(null);
    const [timeframe, setTimeframe] = useState<'all-time' | 'weekly'>('all-time');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchLeaderboard = useCallback(async (userId: string, currentTimeframe: 'all-time' | 'weekly') => {
        setLoading(true);
        setError('');
        try {
            // Panggil fungsi RPC yang baru dan lebih cerdas
            const { data: leaderboardData, error: rpcError } = await supabase.rpc(
                'get_leaderboard',
                { 
                    p_user_id: userId,
                    p_timeframe: currentTimeframe
                }
            );

            if (rpcError) throw rpcError;
            
            setLeaderboard(leaderboardData || []);

        } catch (err: any) {
            console.error("Error fetching leaderboard:", err);
            setError(err.message || 'Gagal memuat papan peringkat.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setCurrentUser(user);

            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            setUserRole(profile?.role || null);

            // Panggil fetchLeaderboard setelah semua info user didapat
            fetchLeaderboard(user.id, timeframe);
        };
        init();
    }, [router, timeframe, fetchLeaderboard]);

    const getMedal = (rank: number) => {
        switch (rank) {
            case 1: return <Trophy size={24} className="text-yellow-400" fill="gold" />;
            case 2: return <Trophy size={24} className="text-gray-400" fill="silver" />;
            case 3: return <Trophy size={24} className="text-amber-600" fill="#cd7f32" />;
            default: return <span className="font-bold text-gray-500 w-6 text-center">{rank}</span>;
        }
    };
    
    if (loading && leaderboard.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader className="animate-spin mr-3" />
                <span>Memuat peringkat...</span>
            </div>
        );
    }

    if (error) {
        return (
             <div className="flex flex-col justify-center items-center h-screen text-center p-4">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold">Terjadi Kesalahan</h1>
                <p className="text-gray-600 mt-2">{error}</p>
            </div>
        );
    }

    return (
        <RoleGuard allowedRoles={['murid', 'guru']}>
            <div className="p-4 md:p-8 max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-center mb-4">🏆 Papan Peringkat</h1>
                
                <div className="flex justify-center mb-6 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                    <button onClick={() => setTimeframe('all-time')} className={`px-4 py-2 rounded-md transition-colors w-1/2 text-sm font-semibold ${timeframe === 'all-time' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-600 dark:text-gray-300'}`}>Sepanjang Waktu</button>
                    <button onClick={() => setTimeframe('weekly')} className={`px-4 py-2 rounded-md transition-colors w-1/2 text-sm font-semibold ${timeframe === 'weekly' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-600 dark:text-gray-300'}`}>Minggu Ini</button>
                </div>

                <div className="space-y-3">
                    {leaderboard.length > 0 ? (
                        leaderboard.map((student) => (
                            <div
                                key={student.id}
                                className={`card flex items-center p-3 gap-4 transition-all ${
                                    currentUser?.id === student.id ? 'border-2 border-sky-500 shadow-lg' : 'border-2 border-transparent'
                                }`}
                            >
                                <div className="w-8 flex justify-center items-center">
                                    {getMedal(student.rank)}
                                </div>
                                <div className="w-12 h-12 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                    <UserCircle2 size={28} className="text-gray-400"/>
                                </div>
                                <div className="flex-grow">
                                    <p className="font-bold">{student.full_name}</p>
                                    <p className="text-sm font-semibold text-yellow-500">{student.xp} XP</p>
                                </div>
                                {userRole === 'guru' && (
                                     <span className="text-xs font-semibold bg-sky-100 text-sky-800 px-2 py-1 rounded-full flex-shrink-0">
                                        {student.kelas}
                                     </span>
                                )}
                            </div>
                        ))
                    ) : (
                         <div className="text-center py-10 card">
                            <User size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-lg font-semibold">Peringkat Belum Tersedia</p>
                            {userRole === 'guru' && (
                                <p className="text-sm text-gray-500 mt-2">
                                    Pastikan Anda telah memilih kelas untuk dipantau di <Link href="/dashboard" className="text-sky-500 underline">dasbor Anda</Link>.
                                </p>
                            )}
                            {userRole === 'murid' && (
                                <p className="text-sm text-gray-500">Mulai kerjakan kursus untuk mendapatkan poin!</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </RoleGuard>
    );
}
