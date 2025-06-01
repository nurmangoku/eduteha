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
  correct_answer: string // ✅ ganti dari correct_option
}

export default function StagePage() {
  const router = useRouter()
  const params = useParams()

  const courseId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
  const stepParam = typeof params.steps === 'string' ? params.steps : Array.isArray(params.steps) ? params.steps[0] : ''
  const stepNumber = parseInt(stepParam)

  const [step, setStep] = useState<Step | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [selected, setSelected] = useState('')
  const [completed, setCompleted] = useState(false)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasNextStep, setHasNextStep] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      setUserId(user.id)
    }
    fetchUser()
  }, [router])

  useEffect(() => {
    if (!courseId || isNaN(stepNumber) || stepNumber < 1 || userId === null) return

    const load = async () => {
      setLoading(true)

      // Ambil data tahap ini
      const { data: stepData, error: stepError } = await supabase
        .from('course_steps')
        .select('*')
        .eq('course_id', courseId)
        .eq('step_number', stepNumber)
        .single()

      if (stepError || !stepData) {
        alert('Tahap tidak ditemukan')
        return router.push(`/dashboard/courses/${courseId}`)
      }

      setStep(stepData)

      // Cek progres siswa
      const { data: progress } = await supabase
        .from('course_progress')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', userId)
        .eq('step_number', stepNumber)
        .single()

      if (progress) {
        setCompleted(true)
        setSelected(progress.answer)
        setCorrect(progress.is_correct)
      }

      // Cek apakah ada tahap berikutnya
      const { data: nextStep } = await supabase
        .from('course_steps')
        .select('id')
        .eq('course_id', courseId)
        .eq('step_number', stepNumber + 1)
        .single()

      setHasNextStep(!!nextStep)
      setLoading(false)
    }

    load()
  }, [courseId, stepNumber, userId, router])

  const handleSubmit = async () => {
    if (!step || !selected || !userId) return

    if (!step.correct_answer) {
      alert('Kunci jawaban belum tersedia untuk tahap ini.')
      return
    }

    const isCorrect = selected.trim().toUpperCase() === step.correct_answer.trim().toUpperCase()

    await supabase.from('course_progress').insert({
      user_id: userId,
      course_id: courseId,
      step_number: stepNumber,
      answer: selected,
      is_correct: isCorrect,
    })

    setCompleted(true)
    setCorrect(isCorrect)

    if (isCorrect) {
  // Ambil xp & badges sekarang
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp, badges')
    .eq('id', userId)
    .single()

  if (profile) {
    const newXp = (profile.xp ?? 0) + 10
    let badges = profile.badges ?? []

    // Tambah badge sesuai xp
    if (newXp >= 50 && !badges.includes('Pemula')) {
      badges.push('Pemula')
    }

    if (newXp >= 100 && !badges.includes('Pejuang Belajar')) {
      badges.push('Pejuang Belajar')
    }

    // Simpan update ke Supabase
    await supabase
      .from('profiles')
      .update({
        xp: newXp,
        badges: badges,
      })
      .eq('id', userId)
  }
}

  }

  if (!stepParam || isNaN(stepNumber) || stepNumber < 1) {
    return <p className="p-6 text-red-500">Nomor tahap tidak valid.</p>
  }

  if (loading) return <p className="p-6">🔄 Memuat tahap...</p>
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

      {completed && (
        <div className="mt-6">
          {hasNextStep ? (
            <button
              className="btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              onClick={() => router.push(`/dashboard/courses/${courseId}/stages/${stepNumber + 1}`)}
            >
              👉 Lanjut ke Tahap {stepNumber + 1}
            </button>
          ) : (
            <button
              className="btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={() => router.push(`/dashboard/courses/${courseId}`)}
            >
              ✅ Kembali ke Kursus
            </button>
          )}
        </div>
      )}
    </div>
  )
}
