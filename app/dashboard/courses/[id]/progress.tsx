'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import RoleGuard from '@/components/RoleGuard';
import { Users, BarChart, Check, Loader, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

// --- DEFINISI TIPE DATA ---

interface CourseInfo {
    title: string;
    total_steps: number;
}

interface ProgressEntry {
    user_id: string;
    full_name: string;
    completed_steps: number;
}

// --- KOMPONEN UTAMA ---

export default function CourseProgressPage() {
    const params = useParams();
    const courseId = params.id as string;

    const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
    const [progressData, setProgressData] = useState<ProgressEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async (currentCourseId: string) => {
        setLoading(true);
        setError('');
        try {
            // 1. Ambil info kursus dan hitung total tahapannya
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('title, course_steps(count)')
                .eq('id', currentCourseId)
                .single();
                
            if (courseError) throw new Error(`Gagal memuat info kursus: ${courseError.message}`);
            
            const totalSteps = courseData.course_steps[0]?.count || 0;
            setCourseInfo({ title: courseData.title, total_steps: totalSteps });

            // 2. Panggil fungsi RPC untuk mendapatkan ringkasan progres
            const { data: progressSummary, error: rpcError } = await supabase.rpc(
                'get_course_progress_summary',
                { p_course_id: currentCourseId }
            );

            if (rpcError) throw new Error(`Gagal memuat progres siswa: ${rpcError.message}`);
            setProgressData(progressSummary || []);

        } catch (err: any) {
            console.error("Error fetching progress:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (courseId) {
            fetchData(courseId);
        } else {
            setError("ID Kursus tidak ditemukan di URL.");
            setLoading(false);
        }
    }, [courseId, fetchData]);


    if (loading) return <p className="p-6 text-center">🔄 Memuat progres kursus...</p>;
    if (error) return <p className="p-6 text-center text-red-500">⚠️ {error}</p>;
    if (!courseInfo) return <p className="p-6 text-center">Kursus tidak ditemukan.</p>;

    const { title, total_steps } = courseInfo;

    return (
        <RoleGuard allowedRoles={['guru']}>
            <div className="p-4 md:p-8 max-w-4xl mx-auto">
                <div className="mb-8">
                    <p className="text-sky-600 font-semibold">Laporan Progres</p>
                    <h1 className="text-3xl font-bold">{title}</h1>
                    <p className="text-gray-500">Total Tahapan: {total_steps}</p>
                </div>

                {progressData.length > 0 ? (
                    <div className="card p-6">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-3 font-semibold">Nama Siswa</th>
                                    <th className="p-3 font-semibold text-center">Tahapan Selesai</th>
                                    <th className="p-3 font-semibold">Progres</th>
                                </tr>
                            </thead>
                            <tbody>
                                {progressData.map((entry) => {
                                    const progressPercentage = total_steps > 0 ? (entry.completed_steps / total_steps) * 100 : 0;
                                    return (
                                        <tr key={entry.user_id} className="border-b last:border-none">
                                            <td className="p-3 font-medium">{entry.full_name}</td>
                                            <td className="p-3 text-center">
                                                <span className="font-mono font-semibold">{entry.completed_steps} / {total_steps}</span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                                        <div
                                                            className="bg-green-500 h-2.5 rounded-full"
                                                            style={{ width: `${progressPercentage}%` }}
                                                        ></div>
                                                    </div>
                                                    {progressPercentage === 100 && <Check size={18} className="text-green-500 flex-shrink-0" />}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-10 card">
                        <Users size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-lg">Belum ada siswa yang mengerjakan kursus ini.</p>
                    </div>
                )}
                <div className="mt-8 text-center">
                    <Link href="/dashboard/manage-courses/list" className="text-sky-600 hover:underline">
                        &larr; Kembali ke Kelola Kursus
                    </Link>
                </div>
            </div>
        </RoleGuard>
    );
}
