'use client'
import { useState, useRef } from 'react' // Menambahkan useRef
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Definisikan tipe untuk props
interface UploadPhotoProps {
  onUploadSuccess?: () => void;
}

export default function UploadPhoto({ onUploadSuccess }: UploadPhotoProps) {
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null) //
  const [uploading, setUploading] = useState(false) // State untuk status unggah
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null) // Ref untuk file input

  const handleUpload = async () => {
    if (!file) {
      alert('Pilih file foto dulu')
      return
    }
    if (!caption.trim()) {
        alert('Keterangan tidak boleh kosong')
        return
    }

    setUploading(true) // Mulai proses unggah

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Tidak login')
      setUploading(false)
      return
    }

    const filename = `${user.id}-${Date.now()}-${file.name}` // Menambahkan nama file asli untuk keunikan
    
    // Upload ke storage
    const { error: uploadError } = await supabase.storage
      .from('gallery') // Pastikan bucket 'gallery' sudah ada dan memiliki policies yang sesuai
      .upload(`public/${filename}`, file, {
        cacheControl: '3600', // Contoh cache control
        upsert: false // Ganti ke true jika ingin menimpa file dengan nama sama
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      alert(`Gagal upload foto: ${uploadError.message}`)
      setUploading(false)
      return
    }

    // Ambil public URL
    const { data: urlData } = supabase
      .storage
      .from('gallery')
      .getPublicUrl(`public/${filename}`)
    
    if (!urlData?.publicUrl) {
        console.error('Gagal mendapatkan public URL foto')
        alert('Gagal mendapatkan public URL foto. Coba lagi.')
        // Pertimbangkan untuk menghapus file yang sudah terunggah jika URL tidak didapatkan
        // await supabase.storage.from('gallery').remove([`public/${filename}`]);
        setUploading(false)
        return
    }
    const publicUrl = urlData.publicUrl
    console.log('Public URL:', publicUrl) //

    // Simpan ke tabel gallery
    const { error: insertError, data: insertData } = await supabase //
      .from('gallery')
      .insert({
        user_id: user.id,
        caption,
        image_url: publicUrl,
      })
      .select() // Meminta data yang diinsert kembali (opsional)

    setUploading(false) // Selesai proses unggah

    if (insertError) {
      console.error('Insert gallery error:', insertError) //
      alert(`Gagal simpan data galeri: ${insertError.message}`) //
      // Pertimbangkan untuk menghapus file yang sudah terunggah jika insert ke DB gagal
      // await supabase.storage.from('gallery').remove([`public/${filename}`]);
      return
    }

    console.log('Insert gallery success:', insertData) //
    alert('Foto berhasil diunggah!');

    // Reset form fields
    setCaption('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Mereset tampilan file input
    }

    // Panggil callback onUploadSuccess jika ada
    if (onUploadSuccess) {
      onUploadSuccess();
    } else {
      // Fallback jika tidak ada callback, meskipun idealnya callback selalu ada dari GalleryPage
      router.push('/dashboard/gallery'); 
    }
  }

  return (
    <div className="text-black max-w-md mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">Unggah Foto Kegiatan</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-1">
            Pilih Foto
          </label>
          <input
            id="file-input"
            ref={fileInputRef} // Menggunakan ref
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)} //
            className="input w-full"
            disabled={uploading} // Nonaktifkan saat proses unggah
          />
          {file && <p className="text-xs text-gray-500 mt-1">File dipilih: {file.name}</p>}
        </div>
        <div>
          <label htmlFor="caption-input" className="block text-sm font-medium text-gray-700 mb-1">
            Keterangan
          </label>
          <textarea
            id="caption-input"
            className="input mb-2 w-full" // Menghapus mb-4, karena ada di parent space-y-4
            placeholder="Tulis keterangan foto..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            disabled={uploading} // Nonaktifkan saat proses unggah
          />
        </div>
        <button 
          className="btn w-full" 
          onClick={handleUpload}
          disabled={uploading || !file || !caption.trim()} // Nonaktifkan jika sedang unggah atau form tidak valid
        >
          {uploading ? 'Mengunggah...' : 'Unggah Foto'}
        </button>
      </div>
    </div>
  )
}
