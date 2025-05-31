'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Course = {
  id: string
  title: string
  description: string
  kelas: string
}

export default function ManageCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchCourses = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('created_by', user.id)

      setCourses(data || [])
      setLoading(false)
    }

    fetchCourses()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kursus ini?')) return
    await supabase.from('courses').delete().eq('id', id)
    setCourses(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <p className="p-4">Memuat...</p>

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold">Kursus yang Anda Buat</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {courses.map(course => (
          <div key={course.id} className="card space-y-2">
            <h3 className="text-lg font-semibold">{course.title}</h3>
            <p className="text-sm">{course.description}</p>
            <p className="text-xs text-gray-400">Untuk {course.kelas}</p>

            <div className="flex justify-between text-sm mt-2">
              <Link
                href={`/dashboard/edit-course/${course.id}`}
                className="text-blue-600 hover:underline"
              >
                Edit
              </Link>
              <button
                onClick={() => handleDelete(course.id)}
                className="text-red-500 hover:underline"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
