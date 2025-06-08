// FILE: app/dashboard/manage-courses/page.tsx (Versi Final dengan RPC)

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import RoleGuard from '@/components/RoleGuard'
import { Edit3, Trash2, PlusCircle, BookOpen as BookOpenIcon, Users } from 'lucide-react'

// Tipe data disesuaikan dengan output dari fungsi RPC
interface Course {
  id: string;
  title: string;
  description: string;
  kelas: string;
  created_at: string;
  progress_details: { full_name: string }[] | null; // Ini adalah array nama siswa
}

export default function ManageCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchUserDataAndCourses = async () => {
      setLoading(true)
      setError(null);
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login'); 
        return;
      }

      // --- PERUBAHAN UTAMA: Panggil fungsi RPC ---
      const { data: courseData, error: courseError } = await supabase
        .rpc('get_courses_with_progress', {
          p_created_by_id: user.id // Kirim ID guru sebagai parameter
        })

      if (courseError) {
        console.error('Error fetching courses via RPC:', courseError)
        setError('Gagal memuat data kursus. Coba lagi nanti.')
      } else {
        setCourses(courseData || [])
      }
      setLoading(false)
    }

    fetchUserDataAndCourses()
  }, [router])

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus kursus "${courseTitle}"?`)) {
      setLoading(true);
      await supabase.from('course_progress').delete().eq('course_id', courseId);
      await supabase.from('course_steps').delete().eq('course_id', courseId);
      const { error: courseError } = await supabase.from('courses').delete().eq('id', courseId);
      
      if (courseError) {
        setError(courseError.message);
      } else {
        setCourses(prevCourses => prevCourses.filter(course => course.id !== courseId));
        alert(`Kursus "${courseTitle}" berhasil dihapus.`);
      }
      setLoading(false);
    }
  }

  if (loading && courses.length === 0) {
    return <p className="p-6 text-center">Memuat daftar kursus Anda...</p>
  }

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Kelola Kursus Saya</h1>
          <Link href="/dashboard/create-course" className="btn btn-primary flex items-center w-full sm:w-auto justify-center">
            <PlusCircle size={20} className="mr-2" />
            Buat Kursus Baru
          </Link>
        </div>

        {error && <p className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</p>}
        
        {!loading && courses.length === 0 && !error && (
          <div className="text-center py-10 card">
            <BookOpenIcon size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg">Anda belum membuat kursus apapun.</p>
          </div>
        )}

        {courses.length > 0 && (
          <div className="space-y-4">
            {courses.map(course => {
              // --- Logika baru untuk menampilkan nama siswa ---
              const completers = course.progress_details?.map(p => p.full_name) || [];
              const uniqueCompleters = [...new Set(completers)];

              return (
                <div key={course.id} className="card p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                    <div className="flex-grow mb-3 sm:mb-0">
                      <h2 className="text-xl font-semibold text-sky-600 dark:text-sky-400 mb-1">{course.title}</h2>
                      <p className="text-sm text-gray-500 mb-1">Untuk Kelas: <span className="font-medium">{course.kelas}</span></p>
                      <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 line-clamp-2">{course.description}</p>
                    </div>
                    <div className="flex space-x-2 mt-3 sm:mt-0 flex-shrink-0">
                      <Link href={`/dashboard/edit-course/${course.id}`} className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-3 rounded-md flex items-center">
                        <Edit3 size={16} className="mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Edit</span>
                      </Link>
                      <button onClick={() => handleDeleteCourse(course.id, course.title)} disabled={loading} className="text-sm bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-md flex items-center">
                        <Trash2 size={16} className="mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Hapus</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      <Users size={18} />
                      <span>{uniqueCompleters.length} Siswa Telah Mengerjakan</span>
                    </div>
                    {uniqueCompleters.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-slate-100 dark:bg-slate-700/50 p-3 rounded-md">
                        <strong>Siapa saja:</strong> {uniqueCompleters.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  )
}