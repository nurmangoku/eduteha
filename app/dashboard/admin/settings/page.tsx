'use client'
import { useState, useEffect, ChangeEvent } from 'react'
import { supabase } from '@/lib/supabase'
import RoleGuard from '@/components/RoleGuard'
import Image from 'next/image'
import { Save, UploadCloud } from 'lucide-react'

interface AppSettings {
  school_name: string;
  logo_url: string | null;
}

export default function AppSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .single()
      
      if (data) setSettings(data)
      setLoading(false)
    }
    fetchSettings()
  }, [])

  const handleSaveChanges = async () => {
    if (!settings) return;
    setSaving(true);
    let updatedLogoUrl = settings.logo_url;

    // Jika ada file logo baru yang dipilih, unggah terlebih dahulu
    if (newLogoFile) {
      const filePath = `public/logo-${Date.now()}`
      const { error: uploadError } = await supabase.storage
        .from('branding') // Unggah ke bucket 'branding'
        .upload(filePath, newLogoFile, { upsert: true });

      if (uploadError) {
        alert("Gagal mengunggah logo baru: " + uploadError.message);
        setSaving(false);
        return;
      }
      
      const { data: urlData } = supabase.storage.from('branding').getPublicUrl(filePath);
      updatedLogoUrl = urlData.publicUrl;
    }

    // Simpan perubahan ke database
    const { error: updateError } = await supabase
      .from('app_settings')
      .update({
        school_name: settings.school_name,
        logo_url: updatedLogoUrl,
      })
      .eq('id', 1);

    if (updateError) {
      alert("Gagal menyimpan pengaturan: " + updateError.message);
    } else {
      alert("Pengaturan berhasil disimpan!");
      // Perbarui tampilan logo jika berubah
      if (updatedLogoUrl !== settings.logo_url) {
        setSettings({...settings, logo_url: updatedLogoUrl});
      }
    }
    setSaving(false);
  }

  if (loading) return <p className="p-8 text-center">Memuat pengaturan...</p>

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">Pengaturan Aplikasi</h1>
        <div className="card p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Nama Sekolah</label>
            <input
              type="text"
              value={settings?.school_name || ''}
              onChange={(e) => setSettings(s => s ? { ...s, school_name: e.target.value } : null)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Logo Sekolah</label>
            <div className="flex items-center gap-4">
              {settings?.logo_url && (
                <Image src={settings.logo_url} alt="Logo Sekolah" width={64} height={64} className="rounded-md object-contain bg-slate-100" />
              )}
              <input type="file" id="logo-upload" accept="image/png, image/jpeg" className="hidden" onChange={(e) => setNewLogoFile(e.target.files?.[0] || null)} />
              <label htmlFor="logo-upload" className="btn btn-success flex-grow flex items-center justify-center gap-2 cursor-pointer">
                <UploadCloud size={18} /> Ganti Logo
              </label>
            </div>
            {newLogoFile && <p className="text-xs text-gray-500 mt-2">File baru dipilih: {newLogoFile.name}</p>}
          </div>
          <button onClick={handleSaveChanges} disabled={saving} className="btn btn-primary w-full text-lg">
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>
    </RoleGuard>
  )
}
