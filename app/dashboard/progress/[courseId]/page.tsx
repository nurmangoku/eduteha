'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CourseProgressPage() {
  const { courseId } = useParams()
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    const fetchProgress = async () => {
      const { data } = await supabase
        .from('progress')
        .select('*, profiles(full_name)')
        .eq('course_id', courseId)

      setData(data || [])
    }

    fetchProgress()
  }, [courseId])

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Progres Siswa</h2>
      <table className="w-full bg-white rounded shadow">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Nama</th>
            <th className="p-2">Tahap Terakhir</th>
            <th className="p-2">Diperbarui</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.id} className="border-t">
              <td className="p-2">{row.profiles?.full_name}</td>
              <td className="p-2">Tahap {row.stage_completed}</td>
              <td className="p-2">{new Date(row.updated_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
