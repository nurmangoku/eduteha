'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CourseProgress() {
  const { id } = useParams()
  const [progressData, setProgressData] = useState<any[]>([])
  const [course, setCourse] = useState<any>(null)
  const [totalSteps, setTotalSteps] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single()

      const { data: steps } = await supabase
        .from('course_steps')
        .select('id')
        .eq('course_id', id)

      const { data: progress } = await supabase
        .from('course_progress')
        .select('user_id, completed_steps')

      const usersWithName = await Promise.all(
        (progress || []).map(async (entry) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', entry.user_id)
            .single()

          return {
            ...entry,
            name: profile?.full_name || 'Tanpa Nama'
          }
        })
      )

      setCourse(courseData)
      setTotalSteps(steps?.length || 0)
      setProgressData(usersWithName)
    }

    fetchData()
  }, [id])

  if (!course) return <p>Memuat...</p>

  return (
    <div className="p-6 max-w-3xl mx-auto text-black">
      <h2 className="text-2xl font-bold mb-4">📊 Progres Kursus: {course.title}</h2>
      <table className="w-full border rounded shadow bg-white">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Nama Siswa</th>
            <th className="p-2 text-left">Tahapan Selesai</th>
            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {progressData.map((entry, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">{entry.name}</td>
              <td className="p-2">{entry.completed_steps} / {totalSteps}</td>
              <td className="p-2">
                {entry.completed_steps >= totalSteps
                  ? '✅ Selesai'
                  : '⏳ Progres'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
