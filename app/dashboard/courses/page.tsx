'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RoleGuard from '@/components/RoleGuard'


export default function CourseList() {
  const [courses, setCourses] = useState<any[]>([])
  const [kelasFilter, setKelasFilter] = useState('')
  const [kelas, setKelas] = useState('')
  const [loading, setLoading] = useState(true)


  useEffect(() => {
  const fetchCourses = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('kelas')
      .eq('id', user.id)
      .single()

    if (!profile?.kelas) {
      setKelas('')
      setLoading(false)
      return
    }

    setKelas(profile.kelas)

    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('kelas', profile.kelas)

      setCourses(courseData || [])
      setLoading(false)
    }

    fetchCourses()
  }, [])

  if (loading) return <p className="p-6">🔄 Memuat data...</p>

  if (!kelas) {
    return (
      <div className="p-6 text-red-600">
        ⚠️ Anda belum memilih kelas.<br />
        Silakan <a href="/dashboard" className="text-blue-600 underline">perbarui profil</a> terlebih dahulu.
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={['murid']}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Kursus untuk {kelas}</h2>
        <ul className="space-y-4">
          {courses.map(course => (
            <li key={course.id} className="p-4 border rounded-xl shadow">
              <h3 className="font-bold text-lg">{course.title}</h3>
              <p>{course.description}</p>
              <a href={`/dashboard/courses/${course.id}`} className="text-blue-600 underline">
                Lihat Kursus
              </a>
            </li>
          ))}
        </ul>
      </div>
    </RoleGuard>
  )

}
