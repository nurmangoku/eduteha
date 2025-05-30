'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CourseDetail() {
  const { id } = useParams()
  const [course, setCourse] = useState<any>(null)
  const [steps, setSteps] = useState<any[]>([])
  const [userId, setUserId] = useState('')
  const [completedSteps, setCompletedSteps] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single()

      const { data: stepsData } = await supabase
        .from('course_steps')
        .select('*')
        .eq('course_id', id)
        .order('step_number')

      const { data: progress } = await supabase
        .from('course_progress')
        .select('*')
        .eq('course_id', id)
        .eq('user_id', user.id)
        .single()

      setCourse(courseData)
      setSteps(stepsData || [])
      setCompletedSteps(progress?.completed_steps || 0)
    }

    fetchData()
  }, [id])

  const markNextStep = async () => {
    if (completedSteps >= steps.length) return

    const newCompleted = completedSteps + 1

    const { error } = await supabase
      .from('course_progress')
      .upsert({
        user_id: userId,
        course_id: id,
        completed_steps: newCompleted
      })

    if (!error) {
      setCompletedSteps(newCompleted)
    }
  }

  if (!course) return <p>Memuat...</p>

  return (
    <div className="text-black p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">{course.title}</h2>
      <p className="mb-4">{course.description}</p>

      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`mb-4 p-4 rounded-xl border ${index < completedSteps ? 'bg-green-100' : 'bg-gray-100'}`}
        >
          <h3 className="font-semibold">Tahapan {step.step_number}</h3>
          {step.is_video ? (
            <iframe
              className="w-full aspect-video mt-2"
              src={step.content.replace("watch?v=", "embed/")}
              allowFullScreen
            />
          ) : (
            <p className="mt-2">{step.content}</p>
          )}
        </div>
      ))}

      {completedSteps < steps.length && (
        <button onClick={markNextStep} className="btn mt-4">Tandai Tahapan {completedSteps + 1} Selesai</button>
      )}

      {completedSteps === steps.length && (
        <p className="text-green-600 font-bold mt-4">🎉 Kursus Selesai!</p>
      )}
    </div>
  )
}
