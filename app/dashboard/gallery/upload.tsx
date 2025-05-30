'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function UploadPhoto() {
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const router = useRouter()

  const handleUpload = async () => {
  if (!file) return alert('Pilih file foto dulu')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return alert('Tidak login')

  const filename = `${user.id}-${Date.now()}`

  // Upload ke storage
  const { error: uploadError } = await supabase.storage
    .from('gallery')
    .upload(`public/${filename}`, file)

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return alert('Gagal upload foto')
  }

  // Ambil public URL
  const { data: urlData } = supabase
    .storage
    .from('gallery')
    .getPublicUrl(`public/${filename}`)

  const publicUrl = urlData.publicUrl
  console.log('Public URL:', publicUrl)

  // Simpan ke tabel gallery
  const { error: insertError, data: insertData } = await supabase
    .from('gallery')
    .insert({
      user_id: user.id,
      caption,
      image_url: publicUrl,
    })

  console.log('Insert gallery:', insertData, insertError)

  if (insertError) {
    return alert('Gagal simpan data galeri')
  }

  // Kembali ke halaman galeri
  router.push('/dashboard/gallery')
}


  return (
    <div className="text-black max-w-md mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">Unggah Foto Kegiatan</h2>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="input mb-4 w-full"
      />
      <textarea
        className="input mb-4 w-full"
        placeholder="Tulis keterangan"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />
      <button className="btn w-full" onClick={handleUpload}>Unggah</button>
    </div>
  )
}
