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
  correct_answer: string
}

const CenteredMessage = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center justify-center min-h-[60vh] text-center p-6">
      <p className="text-xl text-gray-400 animate-pulse">{children}</p>
    </div>
);

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
    if (!step.correct_answer) { alert('Kunci jawaban belum tersedia.'); return; }

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
      const { data: profile } = await supabase.from('profiles').select('xp, badges').eq('id', userId).single()
      if (profile) {
        const newXp = (profile.xp ?? 0) + 10
        // --- PERBAIKAN DI SINI ---
        const badges = profile.badges ?? []
        if (newXp >= 50 && !badges.includes('Pemula')) badges.push('Pemula')
        if (newXp >= 100 && !badges.includes('Pejuang Belajar')) badges.push('Pejuang Belajar')
        await supabase.from('profiles').update({ xp: newXp, badges: badges }).eq('id', userId)
      }
    }
  }

  if (!stepParam || isNaN(stepNumber) || stepNumber < 1) return <CenteredMessage>Nomor tahap tidak valid.</CenteredMessage>
  if (loading) return <CenteredMessage>🔄 Memuat tahap...</CenteredMessage>
  if (!step) return <CenteredMessage>Tahap tidak ditemukan.</CenteredMessage>

  return (
    <div className="max-w-3xl mx-auto my-10 p-6 md:p-8 bg-[var(--card)] rounded-xl shadow-2xl shadow-black/20">
      <h2 className="text-3xl font-bold text-[--foreground]">Tahap {stepNumber}: {step.title}</h2>
      <p className="text-base text-gray-400 mt-2 mb-8">{step.content}</p>
      <div className="border-t border-[var(--border)] pt-6">
        <p className="text-lg font-semibold mb-4 text-[--foreground]">{step.question}</p>
        <div className="space-y-4">
          {['A', 'B', 'C'].map((opt) => (
            <label key={opt} className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${selected === opt ? 'bg-sky-500/20 border-sky-500 ring-2 ring-sky-500' : 'border-[var(--border)] hover:border-sky-500 hover:bg-white/5'} ${completed ? 'cursor-not-allowed opacity-70' : ''}`}>
              <input type="radio" name="answer" value={opt} checked={selected === opt} onChange={() => setSelected(opt)} disabled={completed} className="hidden" />
              <span className="font-bold text-lg mr-4">{opt}.</span>
              <span className="text-base">{step[`option_${opt.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c']}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="mt-8">
        {!completed ? (
          <button className="btn btn-primary w-full text-lg" onClick={handleSubmit} disabled={!selected}>Kirim Jawaban</button>
        ) : (
          <div className={`p-4 rounded-md flex items-center justify-center gap-3 font-medium border ${correct ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
            <span>{correct ? '✅' : '❌'}</span>
            <span>{correct ? 'Jawaban Anda benar!' : 'Jawaban Anda salah.'}</span>
          </div>
        )}
        {completed && (
          <div className="mt-6 text-center">
            {hasNextStep ? (
              <button className="btn btn-success" onClick={() => router.push(`/dashboard/courses/${courseId}/stages/${stepNumber + 1}`)}>Lanjut ke Tahap Berikutnya 👉</button>
            ) : (
              <button className="btn btn-primary" onClick={() => router.push(`/dashboard/courses/${courseId}`)}>🎉 Selesai! Kembali ke Daftar Kursus</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
