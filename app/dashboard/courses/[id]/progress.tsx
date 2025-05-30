'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import RoleGuard from '@/components/RoleGuard'

export default function CourseProgress() {
  const { id } = useParams()
  const [progressList, setProgressList] = useState<any[]>([])

  useEffect(() => {
    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('course_progress')
        .select('*, profiles(full_name)')
        .eq('course_id', id)

      if (!error) setProgressList(data || [])
    }

    fetchProgress()
  }, [id])

  return (
    <RoleGuard allowedRoles={['teacher']}>
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-2">Progres Siswa</h3>
      <ul className="space-y-2">
        {progressList.map((item, index) => (
          <li key={index} className="p-2 border rounded">
            {item.profiles?.full_name || 'Tanpa Nama'} - {item.completed_steps} langkah selesai
          </li>
        ))}
      </ul>
    </div>
    </RoleGuard>
  )
}
