'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Step = {
  id?: string
  title: string
  content: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  correct_option: 'A' | 'B' | 'C'
  step_number?: number
}

export default function EditCoursePage() {
  const router = useRouter()
  const { id: courseId } = useParams()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kelas, setKelas] = useState('')
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourseAndSteps = async () => {
      const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).single()
      if (course) {
        setTitle(course.title)
        setDescription(course.description)
        setKelas(course.kelas)
      }

      const { data: stepData } = await supabase
        .from('course_steps')
        .select('*')
        .eq('course_id', courseId)
        .order('step_number')

      setSteps(stepData || [])
      setLoading(false)
    }
    fetchCourseAndSteps()
  }, [courseId])

  const updateStep = <K extends keyof Step>(index: number, field: K, value: Step[K]) => {
    const updated = [...steps]
    updated[index] = { ...updated[index], [field]: value }
    setSteps(updated)
  }

  const handleUpdate = async () => {
    const { error: courseError } = await supabase
      .from('courses')
      .update({ title, description, kelas })
      .eq('id', courseId)

    if (courseError) return alert('Gagal memperbarui kursus')

    await supabase.from('course_steps').delete().eq('course_id', courseId)

    const updatedSteps = steps.map((step, i) => ({
      ...step,
      course_id: courseId,
      step_number: i + 1,
    }))

    const { error: stepError } = await supabase.from('course_steps').insert(updatedSteps)

    if (stepError) return alert('Gagal memperbarui tahapan')

    router.push('/dashboard/manage-courses')
  }

  if (loading) return <p className="p-6">Memuat...</p>

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold">Edit Kursus</h2>

      <input
        className="input"
        placeholder="Judul Kursus"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="input"
        placeholder="Deskripsi Kursus"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <select
        className="input"
        value={kelas}
        onChange={(e) => setKelas(e.target.value)}
      >
        <option value="">Pilih Kelas</option>
        {[1, 2, 3, 4, 5, 6].map(k => (
          <option key={k} value={`Kelas ${k}`}>Kelas {k}</option>
        ))}
      </select>

      <div className="space-y-6">
        {steps.map((step, idx) => (
          <div key={idx} className="card space-y-2">
            <h4 className="font-bold">Tahap {idx + 1}</h4>

            <input
              className="input"
              placeholder="Judul Tahap"
              value={step.title}
              onChange={(e) => updateStep(idx, 'title', e.target.value)}
            />

            <textarea
              className="input"
              placeholder="Konten"
              value={step.content}
              onChange={(e) => updateStep(idx, 'content', e.target.value)}
            />

            <input
              className="input"
              placeholder="Soal"
              value={step.question}
              onChange={(e) => updateStep(idx, 'question', e.target.value)}
            />

            <input
              className="input"
              placeholder="Opsi A"
              value={step.option_a}
              onChange={(e) => updateStep(idx, 'option_a', e.target.value)}
            />

            <input
              className="input"
              placeholder="Opsi B"
              value={step.option_b}
              onChange={(e) => updateStep(idx, 'option_b', e.target.value)}
            />

            <input
              className="input"
              placeholder="Opsi C"
              value={step.option_c}
              onChange={(e) => updateStep(idx, 'option_c', e.target.value)}
            />

            <select
              className="input"
              value={step.correct_option}
              onChange={(e) => updateStep(idx, 'correct_option', e.target.value as 'A' | 'B' | 'C')}
            >
              <option value="A">Jawaban Benar: A</option>
              <option value="B">Jawaban Benar: B</option>
              <option value="C">Jawaban Benar: C</option>
            </select>
          </div>
        ))}
      </div>

      <button className="btn" onClick={handleUpdate}>💾 Simpan Perubahan</button>
    </div>
  )
}
