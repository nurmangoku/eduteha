'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase' // Pastikan path ini sesuai
import Link from 'next/link'
import RoleGuard from '@/components/RoleGuard' // Impor RoleGuard
import { BookOpen } from 'lucide-react'; // Impor ikon

interface Step {
  id: string;
  // title: string; // Kolom ini yang menyebabkan error, kita ganti
  content: string; // Akan kita gunakan atau question sebagai pengganti title
  question?: string; // Tambahkan question, karena ini mungkin lebih cocok sebagai "judul" ringkas
  step_number: number;
}

interface CourseInfo { 
  title: string;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseIdParam = params.id; 
  const courseId = typeof courseIdParam === 'string' ? courseIdParam : undefined;

  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (currentCourseId: string, currentUserId: string) => {
    setLoading(true); 
    setError(null);
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('title')
        .eq('id', currentCourseId)
        .single();

      if (courseError) throw new Error(`Gagal memuat info kursus: ${courseError.message}`);
      if (!courseData) throw new Error('Kursus tidak ditemukan.');
      setCourseInfo(courseData);

      // Modifikasi SELECT: Ambil 'content' dan 'question', bukan 'title'
      const { data: stepData, error: stepsError } = await supabase
        .from('course_steps')
        .select('id, content, question, step_number') 
        .eq('course_id', currentCourseId)
        .order('step_number', { ascending: true });

      if (stepsError) throw new Error(`Gagal memuat tahapan kursus: ${stepsError.message}`);
      setSteps(stepData || []);

      const { data: progressData, error: progressError } = await supabase
        .from('course_progress')
        .select('step_number')
        .eq('course_id', currentCourseId)
        .eq('user_id', currentUserId);
      
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
        if (courseIdParam !== undefined && typeof courseIdParam !== 'string') {
            setError("ID Kursus tidak valid.");
        }
        if (typeof courseIdParam !== 'string' && courseIdParam !== undefined) setLoading(false);
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Gagal mendapatkan data pengguna. Silakan login kembali.");
        setLoading(false);
        router.push('/login');
        return;
      }
      
      fetchData(courseId, user.id);
    };

    initialize();
  }, [courseId, courseIdParam, router, fetchData]);


  if (loading) return <p className="p-6 text-center text-gray-600 dark:text-gray-400">🔄 Memuat detail kursus...</p>;
  if (error) return <p className="p-6 text-center text-red-500 dark:text-red-400">⚠️ {error}</p>;
  if (!courseId && !loading) return <p className="p-6 text-center text-gray-600 dark:text-gray-400">ID Kursus tidak ditemukan pada rute.</p>;
  if (!courseInfo && !loading && !error) return <p className="p-6 text-center text-gray-600 dark:text-gray-400">Kursus tidak ditemukan.</p>;

  const getStepDisplayTitle = (step: Step) => {
    if (step.question && step.question.trim() !== '') {
      return step.question;
    }
    if (step.content && step.content.trim() !== '') {
      // Ambil 50 karakter pertama dari konten sebagai fallback jika terlalu panjang
      return step.content.substring(0, 50) + (step.content.length > 50 ? '...' : '');
    }
    return 'Tahap tanpa judul'; // Fallback jika question dan content kosong
  };

  return (
    <RoleGuard allowedRoles={['murid']}> 
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-1">
          {courseInfo?.title || 'Detail Kursus'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Daftar tahapan untuk kursus ini. Selesaikan semua tahapan untuk menyelesaikan kursus.
        </p>

        {steps.length > 0 ? (
          <ul className="space-y-3">
            {steps.map(step => (
              <li key={step.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 flex justify-between items-center hover:shadow-lg transition-shadow duration-150">
                <div>
                  {/* Modifikasi Tampilan: Gunakan getStepDisplayTitle */}
                  <p className="font-medium text-gray-800 dark:text-gray-100">{step.step_number}. {getStepDisplayTitle(step)}</p>
                  <p className={`text-xs mt-1 ${completedSteps.includes(step.step_number) ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400'}`}>
                    {completedSteps.includes(step.step_number) ? '✅ Selesai' : '❌ Belum dikerjakan'}
                  </p>
                </div>
                <Link
                  href={`/dashboard/courses/${courseId}/stages/${step.step_number}`}
                  className="btn btn-sm text-xs px-3 py-1.5"
                >
                  Buka Tahap
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <BookOpen size={40} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
              <p className="text-gray-600 dark:text-gray-400">Belum ada tahapan yang ditambahkan untuk kursus ini.</p>
          </div>
        )}
        <div className="mt-8 text-center">
            <Link href="/dashboard/courses" className="text-blue-600 hover:underline dark:text-blue-400">
                &larr; Kembali ke Daftar Kursus
            </Link>
        </div>
      </div>
    </RoleGuard>
  );
}
