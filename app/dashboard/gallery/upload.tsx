// FILE: app/dashboard/gallery/upload.tsx (Dengan Perbaikan Props)

'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// --- PERBAIKAN DI SINI: Definisikan tipe untuk props ---
interface UploadProps {
  onUploadSuccess: () => void;
}
// ----------------------------------------------------

// --- PERBAIKAN DI SINI: Terapkan tipe ke komponen ---
export default function Upload({ onUploadSuccess }: UploadProps) {
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!file || !caption.trim()) {
      alert('Pilih file dan isi caption terlebih dahulu.');
      return;
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Anda harus login untuk mengunggah foto.');
      setUploading(false);
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('kelas').eq('id', user.id).single();
    if (!profile) {
      alert('Gagal mengambil data profil Anda.');
      setUploading(false);
      return;
    }

    const filename = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('gallery').upload(`public/${filename}`, file);

    if (uploadError) {
      alert(`Gagal unggah foto: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(`public/${filename}`);

    const { error: insertError } = await supabase.from('gallery').insert({
        user_id: user.id,
        caption,
        image_url: publicUrl,
        kelas: profile.kelas
      });

    setUploading(false);

    if (insertError) {
      alert(`Gagal simpan data galeri: ${insertError.message}`);
      await supabase.storage.from('gallery').remove([`public/${filename}`]);
      return;
    }

    alert('Foto berhasil diunggah!');
    setCaption('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    // Panggil callback setelah sukses
    onUploadSuccess();
  }

  return (
    <div className="card max-w-lg mx-auto mb-8">
      <h2 className="text-xl font-bold mb-4">Unggah Foto Kegiatan</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Pilih Foto</label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input" disabled={uploading}/>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Keterangan</label>
          <textarea className="input w-full" placeholder="Tulis keterangan foto..." value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} disabled={uploading}/>
        </div>
        <button className="btn btn-primary w-full" onClick={handleUpload} disabled={uploading || !file || !caption.trim()}>
          {uploading ? 'Mengunggah...' : 'Unggah Foto'}
        </button>
      </div>
    </div>
  )
}