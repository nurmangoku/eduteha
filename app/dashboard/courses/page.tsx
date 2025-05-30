'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CourseList() {
  const [courses, setCourses] = useState<any[]>([])
  const [kelasFilter, setKelasFilter] = useState('')

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .like('kelas', `%${kelasFilter}%`)
      setCourses(data || [])
    }

    fetchCourses()
  }, [kelasFilter])

  return (
    <div className="p-6">
      <input
        className="input mb-4"
        placeholder="Cari kelas (contoh: 5A)"
        value={kelasFilter}
        onChange={(e) => setKelasFilter(e.target.value)}
      />
      <ul className="space-y-4">
        {courses.map(course => (
          <li key={course.id} className="p-4 border rounded-xl shadow">
            <h3 className="font-bold text-lg">{course.title}</h3>
            <p>{course.description}</p>
            <a href={`/dashboard/courses/${course.id}`} className="text-blue-600 underline">Lihat Kursus</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
