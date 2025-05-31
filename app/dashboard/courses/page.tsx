'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Step {
  id: string
  title: string
  step_number: number
}

export default function CourseDetailPage() {
  const router = useRouter()
  const { id: courseId } = useParams()

  const [steps, setSteps] = useState<Step[]>([])
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      setUserId(user.id)

      const [{ data: stepData }, { data: progressData }] = await Promise.all([
        supabase.from('course_steps').select('id, title, step_number').eq('course_id', courseId).order('step_number'),
        supabase.from('course_progress').select('step_number').eq('course_id', courseId).eq('user_id', user.id)
      ])

      setSteps(stepData || [])
      setCompletedSteps((progressData || []).map(p => p.step_number))
      setLoading(false)
    }

    fetchData()
  }, [courseId, router])

  if (loading) return <p className="p-6">Memuat...</p>

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Tahapan Kursus</h2>
      <ul className="space-y-2">
        {steps.map(step => (
          <li key={step.id} className="card flex justify-between items-center">
            <div>
              <p className="font-medium">{step.step_number}. {step.title}</p>
              <p className="text-sm text-gray-400">
                {completedSteps.includes(step.step_number) ? '✅ Selesai' : '❌ Belum dikerjakan'}
              </p>
            </div>
            <Link
              href={`/dashboard/courses/${courseId}/stages/${step.step_number}`}
              className="btn text-sm"
            >
              Buka
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
