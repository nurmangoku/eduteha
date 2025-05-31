'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase' // Pastikan path ini sesuai
import RoleGuard from '@/components/RoleGuard' // Pastikan path ini sesuai
import Link from 'next/link'; // Impor Link
import { BookOpen } from 'lucide-react'; // Impor ikon

// Definisikan tipe untuk kursus agar lebih aman
interface Course {
  id: string;
  title: string;
  description: string;
  kelas: string;
  // created_at: string; // Bisa ditambahkan jika ingin menampilkan tanggal
}

export default function StudentCourseListPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [studentKelas, setStudentKelas] = useState<string | null>(null) // Gunakan null untuk kondisi awal belum diketahui
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null);
  // const router = useRouter(); // Tidak digunakan di versi ini, bisa dihapus jika tidak ada redirect dari sini

  useEffect(() => {
    const fetchStudentCourses = async () => {
      setLoading(true);
      setError(null); // Reset error setiap fetch

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("User not authenticated:", userError);
        setError("Anda harus login untuk melihat kursus.");
        setLoading(false);
        // RoleGuard seharusnya sudah menangani redirect ke login
        return;
      }

      // 1. Ambil kelas siswa dari profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('kelas')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Error fetching student profile:", profileError);
        setError("Gagal memuat profil Anda.");
        setLoading(false);
        return;
      }

      if (!profile || !profile.kelas) {
        setStudentKelas(null); // Siswa belum mengatur kelas
        setCourses([]); // Tidak ada kursus yang bisa ditampilkan
        setLoading(false);
        return;
      }
      setStudentKelas(profile.kelas);

      // 2. Ambil kursus yang sesuai dengan kelas siswa
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, description, kelas') // Pilih kolom yang dibutuhkan
        .eq('kelas', profile.kelas);

      if (courseError) {
        console.error("Error fetching courses:", courseError);
        setError("Gagal memuat daftar kursus.");
        setCourses([]);
      } else {
        setCourses(courseData || []);
      }
      setLoading(false);
    }

    fetchStudentCourses();
  }, []); // Jalankan sekali saat komponen dimuat

  if (loading) {
    return <p className="p-6 text-center text-gray-600 dark:text-gray-400">🔄 Memuat daftar kursus...</p>;
  }

  if (error) {
    return <p className="p-6 text-center text-red-500 dark:text-red-400">⚠️ {error}</p>;
  }

  if (studentKelas === null && !loading) { // Setelah loading selesai dan kelas masih null
    return (
      <div className="p-6 text-center">
        <p className="text-lg text-red-600 dark:text-red-400">⚠️ Anda belum memilih kelas di profil Anda.</p>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Silakan <Link href="/dashboard" className="text-blue-600 hover:underline dark:text-blue-400">perbarui profil</Link> Anda untuk melihat kursus yang tersedia.
        </p>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['murid']}>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-6">
          Kursus untuk Kelas: <span className="text-blue-600 dark:text-blue-400">{studentKelas}</span>
        </h1>
        
        {courses.length > 0 ? (
          <ul className="space-y-4">
            {courses.map(course => (
              <li key={course.id} className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4 md:p-6 hover:shadow-xl transition-shadow duration-200">
                <h2 className="font-bold text-xl text-gray-800 dark:text-white mb-1">{course.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 leading-relaxed">{course.description}</p>
                {/* Menggunakan Link dari next/link untuk navigasi sisi klien */}
                <Link href={`/dashboard/courses/${course.id}`} className="inline-flex items-center btn btn-sm text-sm px-4 py-1.5">
                  Lihat Kursus
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <BookOpen size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-lg text-gray-700 dark:text-gray-300">Tidak ada kursus yang tersedia untuk kelas <span className="font-semibold">{studentKelas}</span> saat ini.</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Silakan cek kembali nanti atau hubungi guru Anda.</p>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
