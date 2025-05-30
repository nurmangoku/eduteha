'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import RoleGuard from '@/components/RoleGuard'


export default function CreateCoursePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kelas, setKelas] = useState('')
  const [steps, setSteps] = useState(['', '', '', '', '']) // 5 langkah

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Tidak terautentikasi')

    const { data: course, error } = await supabase.from('courses').insert({
      title,
      description,
      kelas,
      created_by: user.id
    }).select().single()

    if (error) return alert('Gagal membuat kursus')

    // Tambah materi
    for (let i = 0; i < 5; i++) {
      await supabase.from('course_steps').insert({
        course_id: course.id,
        step_number: i + 1,
        content: steps[i],
        is_video: i === 4,
      })
    }

    router.push('/dashboard')
  }

  return (
    <RoleGuard allowedRoles={['teacher']}>
    <div className="text-black max-w-xl mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4">Buat Kursus</h2>
      <input className="input mb-2 w-full" placeholder="Judul Kursus"
        value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className="input mb-2 w-full" placeholder="Deskripsi"
        value={description} onChange={(e) => setDescription(e.target.value)} />
      <input className="input mb-4 w-full" placeholder="Kelas (mis. 5A)"
        value={kelas} onChange={(e) => setKelas(e.target.value)} />

      {steps.map((step, i) => (
        <textarea key={i} className="input mb-2 w-full"
          placeholder={`Tahapan ${i + 1}${i === 4 ? ' (YouTube link)' : ''}`}
          value={step} onChange={(e) => {
            const newSteps = [...steps]
            newSteps[i] = e.target.value
            setSteps(newSteps)
          }} />
      ))}

      <button onClick={handleSubmit} className="btn w-full">Simpan Kursus</button>
    </div>
    </RoleGuard>
  )
}
