'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import RoleGuard from '@/components/RoleGuard' // Pastikan path ini benar
import { Edit3, Trash2, PlusCircle, BookOpen as BookOpenIcon } from 'lucide-react' // Mengganti nama BookOpen agar tidak konflik

interface Course {
  id: string;
  title: string;
  description: string;
  kelas: string;
  created_at: string; // Menambahkan created_at untuk sorting atau tampilan
}

export default function ManageCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // const [userId, setUserId] = useState<string | null>(null) // Tidak perlu state userId jika hanya dipakai di 1 fungsi
  const router = useRouter()

  useEffect(() => {
    const fetchUserDataAndCourses = async () => {
      setLoading(true)
      setError(null); // Reset error setiap fetch
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Jika tidak ada user, arahkan ke login atau tampilkan pesan
        // Ini penting agar tidak error saat mencoba akses profile jika user tidak ada
        router.push('/login'); 
        return;
      }
      // setUserId(user.id); // Tidak perlu jika user.id langsung dipakai

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (courseError) {
        console.error('Error fetching courses:', courseError)
        setError('Gagal memuat daftar kursus Anda.')
      } else {
        setCourses(courseData || [])
      }
      setLoading(false)
    }

    fetchUserDataAndCourses()
  }, [router]) // Tambahkan router sebagai dependency jika digunakan di dalam useEffect

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    // Menggunakan window.confirm bawaan browser, bisa diganti custom modal jika diinginkan
    if (window.confirm(`Apakah Anda yakin ingin menghapus kursus "${courseTitle}"? Semua materi dan soal terkait akan ikut terhapus.`)) {
      try {
        setLoading(true) // Bisa juga state saving terpisah untuk delete
        setError(null);

        // 1. Hapus semua course_steps yang terkait dengan courseId
        const { error: stepsError } = await supabase
          .from('course_steps')
          .delete()
          .eq('course_id', courseId)

        if (stepsError) {
          throw new Error(`Gagal menghapus materi kursus: ${stepsError.message}`)
        }

        // 2. (Opsional) Hapus semua progress siswa yang terkait dengan courseId
        // const { error: progressError } = await supabase
        //   .from('progress')
        //   .delete()
        //   .eq('course_id', courseId)
        // if (progressError) {
        //   console.warn('Gagal menghapus progres siswa:', progressError.message);
        // }
        
        // 3. Hapus kursus itu sendiri
        const { error: courseError } = await supabase
          .from('courses')
          .delete()
          .eq('id', courseId)

        if (courseError) {
          throw new Error(`Gagal menghapus kursus: ${courseError.message}`)
        }

        setCourses(prevCourses => prevCourses.filter(course => course.id !== courseId))
        alert(`Kursus "${courseTitle}" berhasil dihapus.`) // Ganti dengan notifikasi yang lebih baik jika ada

      } catch (err: any) {
        console.error('Error deleting course:', err)
        setError(err.message || 'Terjadi kesalahan saat menghapus kursus.')
        alert(`Gagal menghapus kursus: ${err.message}`) // Ganti dengan notifikasi yang lebih baik
      } finally {
        setLoading(false)
      }
    }
  }

  if (loading && courses.length === 0) { // Tampilkan loading awal jika belum ada data
    return <p className="p-6 text-center text-gray-600 dark:text-gray-400">Memuat daftar kursus Anda...</p>
  }

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Kelola Kursus Saya</h1>
          <Link href="/dashboard/create-course" className="btn btn-primary flex items-center w-full sm:w-auto justify-center">
            <PlusCircle size={20} className="mr-2" />
            Buat Kursus Baru
          </Link>
        </div>

        {error && <p className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-200 rounded-md">{error}</p>}
        
        {!loading && courses.length === 0 && !error && (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <BookOpenIcon size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-lg text-gray-700 dark:text-gray-300">Anda belum membuat kursus apapun.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Mulai buat kursus pertama Anda agar siswa dapat belajar!</p>
          </div>
        )}

        {courses.length > 0 && (
          <div className="space-y-4">
            {courses.map(course => (
              <div key={course.id} className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4 md:p-6 hover:shadow-xl transition-shadow duration-200">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                  <div className="flex-grow mb-3 sm:mb-0">
                    <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-1">{course.title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Untuk Kelas: <span className="font-medium">{course.kelas}</span></p>
                    <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 line-clamp-2 leading-relaxed">{course.description}</p>
                  </div>
                  <div className="flex space-x-2 mt-3 sm:mt-0 flex-shrink-0">
                    <Link 
                        href={`/dashboard/edit-course/${course.id}`} 
                        className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-3 rounded-md flex items-center transition-colors"
                        aria-label={`Edit kursus ${course.title}`}
                    >
                      <Edit3 size={16} className="mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                    </Link>
                    <button
                      onClick={() => handleDeleteCourse(course.id, course.title)}
                      disabled={loading} // Bisa juga state saving terpisah
                      className="text-sm bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-md flex items-center transition-colors disabled:opacity-50"
                      aria-label={`Hapus kursus ${course.title}`}
                    >
                      <Trash2 size={16} className="mr-1 sm:mr-2" />
                       <span className="hidden sm:inline">Hapus</span>
                    </button>
                  </div>
                </div>
                 <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    Dibuat pada: {new Date(course.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                 </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
