'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function EditCoursePage() {
  const { id } = useParams()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kelas, setKelas] = useState('')

  useEffect(() => {
    const fetchCourse = async () => {
      const { data } = await supabase.from('courses').select('*').eq('id', id).single()
      if (data) {
        setTitle(data.title)
        setDescription(data.description)
        setKelas(data.kelas)
      }
    }

    fetchCourse()
  }, [id])

  const handleUpdate = async () => {
    await supabase.from('courses').update({
      title,
      description,
      kelas,
    }).eq('id', id)
    router.push('/dashboard/manage-courses')
  }

  return (
    <div className="p-6 space-y-4 max-w-xl mx-auto">
      <h2 className="text-xl font-bold">Edit Kursus</h2>
      <input
        className="input"
        placeholder="Judul kursus"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="input"
        placeholder="Deskripsi kursus"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <select className="input" value={kelas} onChange={(e) => setKelas(e.target.value)}>
        {[1, 2, 3, 4, 5, 6].map(k => (
          <option key={k} value={`Kelas ${k}`}>Kelas {k}</option>
        ))}
      </select>
      <button className="btn" onClick={handleUpdate}>Simpan Perubahan</button>
    </div>
  )
}
