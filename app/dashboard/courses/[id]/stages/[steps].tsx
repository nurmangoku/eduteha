'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Step {
  id: string
  title: string
  content: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  correct_option: 'A' | 'B' | 'C'
}

export default function StagePage() {
  const router = useRouter()
  const { id: courseId, step: stepNumberParam } = useParams()
  const stepNumber = parseInt(stepNumberParam as string)

  const [step, setStep] = useState<Step | null>(null)
  const [userId, setUserId] = useState('')
  const [selected, setSelected] = useState('')
  const [completed, setCompleted] = useState(false)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      setUserId(user.id)

      const { data: stepData } = await supabase
        .from('course_steps')
        .select('*')
        .eq('course_id', courseId)
        .eq('step_number', stepNumber)
        .single()

      if (!stepData) return alert('Tahap tidak ditemukan')
      setStep(stepData)

      const { data: progress } = await supabase
        .from('course_progress')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .eq('step_number', stepNumber)
        .single()

      if (progress) {
        setCompleted(true)
        setSelected(progress.answer)
        setCorrect(progress.is_correct)
      }

      setLoading(false)
    }

    load()
  }, [courseId, stepNumber, router])

  const handleSubmit = async () => {
    if (!step || !selected) return
    const isCorrect = selected === step.correct_option

    await supabase.from('course_progress').insert({
      user_id: userId,
      course_id: courseId,
      step_number: stepNumber,
      answer: selected,
      is_correct: isCorrect,
    })

    setCompleted(true)
    setCorrect(isCorrect)
  }

  if (loading) return <p className="p-6">Memuat tahap...</p>
  if (!step) return <p className="p-6 text-red-500">Tahap tidak ditemukan.</p>

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">Tahap {stepNumber}: {step.title}</h2>
      <p>{step.content}</p>

      <div className="mt-4 space-y-2">
        <p className="font-medium">Soal: {step.question}</p>
        {['A', 'B', 'C'].map(opt => (
          <label key={opt} className="block">
            <input
              type="radio"
              name="answer"
              value={opt}
              checked={selected === opt}
              onChange={() => setSelected(opt)}
              disabled={completed}
            />
            <span className="ml-2">{opt}. {step[`option_${opt.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c']}</span>
          </label>
        ))}
      </div>

      {!completed ? (
        <button className="btn mt-4" onClick={handleSubmit} disabled={!selected}>
          Kirim Jawaban
        </button>
      ) : (
        <p className={`mt-4 font-medium ${correct ? 'text-green-600' : 'text-red-600'}`}>
          {correct ? '✅ Jawaban Anda benar' : '❌ Jawaban Anda salah'}
        </p>
      )}
    </div>
  )
}
