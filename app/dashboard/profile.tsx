'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Profile() {
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [kelas, setKelas] = useState('')


  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, xp, badges, kelas')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setFullName(profileData.full_name)
        setAvatarUrl(profileData.avatar_url)
        setKelas(profileData.kelas || '')
        setProfile(profileData)
      }


      setLoading(false)
    }

    fetchProfile()
  }, [])

  const handleUpdate = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let updatedAvatarUrl = avatarUrl

    // Upload avatar jika ada file baru
    if (newAvatarFile) {
      const { error } = await supabase.storage
        .from('avatars')
        .upload(`public/${user.id}`, newAvatarFile, {
          upsert: true,
        })

      if (error) {
        alert('Gagal upload avatar')
        return
      }

      const { data: urlData } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(`public/${user.id}`)

      updatedAvatarUrl = urlData.publicUrl
      console.log('URL Avatar:', updatedAvatarUrl)
    }

    await supabase.from('profiles').update({
      full_name: fullName,
      avatar_url: updatedAvatarUrl,
      kelas,
    }).eq('id', user.id)

    alert('Profil berhasil diperbarui')
  }

  if (loading) return <p>Memuat profil...</p>

  return (
    <div className="p-4 border rounded-xl shadow bg-white max-w-md">
      <div className="mt-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-2">🎖 Gamifikasi</h2>
        <p>XP: {profile?.xp}</p>
        <div className="mt-2">
          <h3 className="font-semibold mb-1">Lencana:</h3>
          <ul className="list-disc list-inside">
            {profile?.badges?.map((badge: string, i: number) => (
              <li key={i}>{badge}</li>
            ))}
            {profile?.badges?.length === 0 && <li>Belum ada</li>}
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Profil Pengguna</h2>
      {avatarUrl && (
        <>
        {console.log("Render Avatar URL:", avatarUrl)}
        <img src={avatarUrl} alt="avatar" className="w-24 h-24 rounded-full mb-4" />
        </>
      )}
      <input
        type="text"
        className="input mb-2 w-full"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Nama Lengkap"
      />
      <input
        type="file"
        className="input mb-4 w-full"
        accept="image/*"
        onChange={(e) => setNewAvatarFile(e.target.files?.[0] || null)}
      />
      <select
        className="input mb-2 w-full"
        value={kelas}
        onChange={(e) => setKelas(e.target.value)}
      >
        <option value="">Pilih Kelas</option>
        {[1, 2, 3, 4, 5, 6].map(k => (
          <option key={k} value={`Kelas ${k}`}>Kelas {k}</option>
        ))}
      </select>

      <button onClick={handleUpdate} className="btn w-full">Simpan Perubahan</button>
      

      <input
        type="password"
        placeholder="Kata sandi baru"
        className="input mb-2 w-full"
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <button
          className="btn w-full mb-4"
          onClick={async () => {
              const { error } = await supabase.auth.updateUser({
              password: newPassword,
              })
              if (error) alert('Gagal ubah kata sandi')
              else alert('Kata sandi berhasil diubah')
          }}
          >
          Ubah Kata Sandi
      </button>
      <button
          className="btn bg-red-500 w-full"
          onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
          }}
      >
        Logout
      </button>
    </div>
  )
}
