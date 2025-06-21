'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import RoleGuard from '@/components/RoleGuard';
import { BookOpen, Check, ChevronRight, Loader } from 'lucide-react';

// --- DEFINISI TIPE DATA ---

interface Step {
  id: string;
  title: string;
  step_number: number;
}

interface CourseInfo { 
  title: string;
  description: string;
}

// --- KOMPONEN UTAMA ---

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (currentCourseId: string, currentUserId: string) => {
    setLoading(true); 
    setError(null);
    try {
      // Ambil info kursus
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('title, description')
        .eq('id', currentCourseId)
        .single();

      if (courseError) throw new Error(`Gagal memuat info kursus: ${courseError.message}`);
      setCourseInfo(courseData);

      // Ambil semua tahapan untuk kursus ini
      const { data: stepData, error: stepsError } = await supabase
        .from('course_steps')
        .select('id, title, step_number') // Mengambil kolom 'title' yang baru
        .eq('course_id', currentCourseId)
        .order('step_number', { ascending: true });

      if (stepsError) throw new Error(`Gagal memuat tahapan kursus: ${stepsError.message}`);
      setSteps(stepData || []);

      // Ambil progres siswa
      const { data: progressData, error: progressError } = await supabase
        .from('course_progress')
        .select('step_number')
        .eq('course_id', currentCourseId)
        .eq('user_id', currentUserId)
        .eq('is_correct', true); // Hanya ambil yang sudah selesai dengan benar
      
      if (progressError) throw new Error(`Gagal memuat progres kursus: ${progressError.message}`);
      setCompletedSteps((progressData || []).map(p => p.step_number));

    } catch (err: any) {
      console.error("Error fetching course data:", err);
      setError(err.message || "Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false); 
    }
  }, []); 

  useEffect(() => {
    const initialize = async () => {
      if (!courseId) {
        setLoading(false);
        setError("ID Kursus tidak valid.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      fetchData(courseId, user.id);
    };

    initialize();
  }, [courseId, router, fetchData]);


  if (loading) return <p className="p-6 text-center">🔄 Memuat detail kursus...</p>;
  if (error) return <p className="p-6 text-center text-red-500">⚠️ {error}</p>;
  if (!courseInfo) return <p className="p-6 text-center">Kursus tidak ditemukan.</p>;

  return (
    <RoleGuard allowedRoles={['murid']}> 
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{courseInfo.title}</h1>
            <p className="text-gray-500">{courseInfo.description}</p>
        </div>

        {steps.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold mb-3">Daftar Tahapan</h2>
            {steps.map(step => {
              const isCompleted = completedSteps.includes(step.step_number);
              return (
                <Link
                  key={step.id}
                  href={`/dashboard/courses/${courseId}/stages/${step.step_number}`}
                  className="card flex items-center justify-between p-4 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all duration-200"
                >
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-4 ${isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                      {isCompleted ? <Check size={18} /> : <span className="font-bold">{step.step_number}</span>}
                    </div>
                    <div>
                      <p className="font-medium">{step.title || `Tahapan ${step.step_number}`}</p>
                      <p className={`text-xs mt-1 font-semibold ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                        {isCompleted ? 'Selesai' : 'Belum dikerjakan'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 card">
              <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-lg">Belum ada tahapan untuk kursus ini.</p>
          </div>
        )}

        <div className="mt-8 text-center">
            <Link href="/dashboard/courses" className="text-sky-600 hover:underline">
                &larr; Kembali ke Daftar Semua Kursus
            </Link>
        </div>
      </div>
    </RoleGuard>
  );
}
