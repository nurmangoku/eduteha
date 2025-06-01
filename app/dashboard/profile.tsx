'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
// Impor useRouter jika Anda perlu redirect, tapi untuk ini mungkin tidak
// import { useRouter } from 'next/navigation'; 

// Definisikan tipe untuk profil agar lebih aman
interface ProfileData {
  full_name: string;
  avatar_url: string | null;
  xp: number | null;
  badges: string[] | null;
  kelas: string | null;
  role: 'guru' | 'murid' | null; // Tambahkan role
}

export default function Profile() {
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>('') // Izinkan null
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null)
  // const [newPassword, setNewPassword] = useState('') // Tidak ada di UI app.docx untuk profil ini
  const [profile, setProfile] = useState<ProfileData | null>(null) // Gunakan tipe ProfileData
  const [kelas, setKelas] = useState('')
  // const router = useRouter(); // Tidak digunakan di sini

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // router.push('/login'); // RoleGuard di layout dashboard seharusnya menangani ini
        setLoading(false);
        return;
      }

      // Ambil data profil lengkap termasuk role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, xp, badges, kelas, role') // Ambil role
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setLoading(false);
        return;
      }

      if (profileData) {
        setFullName(profileData.full_name || '');
        setAvatarUrl(profileData.avatar_url || null);
        setKelas(profileData.kelas || '');
        setProfile(profileData as ProfileData); // Casting ke ProfileData
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let updatedAvatarPublicUrl = profile?.avatar_url || null; // Ambil dari state profile

    if (newAvatarFile) {
      const filePath = `public/${user.id}/${newAvatarFile.name}`; // Path yang lebih unik
      const { error: uploadError } = await supabase.storage
        .from('avatars') // Pastikan bucket 'avatars' ada
        .upload(filePath, newAvatarFile, {
          cacheControl: '3600',
          upsert: true, // Upsert true agar bisa menimpa jika file sama
        });

      if (uploadError) {
        alert(`Gagal upload avatar: ${uploadError.message}`);
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      updatedAvatarPublicUrl = urlData?.publicUrl || null;
    }

    const { error: updateError } = await supabase.from('profiles').update({
      full_name: fullName,
      avatar_url: updatedAvatarPublicUrl,
      kelas: profile?.role === 'murid' ? kelas : null, // Hanya simpan kelas jika murid
    }).eq('id', user.id);

    if (updateError) {
      alert(`Gagal memperbarui profil: ${updateError.message}`);
    } else {
      alert('Profil berhasil diperbarui');
      // Perbarui avatarUrl di state jika berubah
      if (updatedAvatarPublicUrl !== avatarUrl) {
        setAvatarUrl(updatedAvatarPublicUrl);
      }
      // Perbarui profile state juga
      setProfile(prev => prev ? ({...prev, full_name: fullName, avatar_url: updatedAvatarPublicUrl, kelas: profile?.role === 'murid' ? kelas : null }) : null);
    }
  }

  if (loading) return <p className="p-6 text-center text-gray-600 dark:text-gray-400">Memuat profil...</p>;
  if (!profile) return <p className="p-6 text-center text-red-500 dark:text-red-400">Gagal memuat data profil.</p>;

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1 text-center">Profil Pengguna</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">Perbarui informasi akun Anda di sini.</p>
        </div>

        <div className="flex flex-col items-center space-y-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar Pengguna" className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 text-4xl">
              {fullName?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
           <input
            type="file"
            id="avatar-upload"
            className="hidden" // Sembunyikan input file asli
            accept="image/*"
            onChange={(e) => setNewAvatarFile(e.target.files?.[0] || null)}
          />
          <label 
            htmlFor="avatar-upload" 
            className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {newAvatarFile ? `File dipilih: ${newAvatarFile.name}` : "Ganti Foto Profil"}
          </label>
        </div>

        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
          <input
            type="text"
            id="fullName"
            className="input w-full"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama Lengkap Anda"
          />
        </div>

        {/* Hanya tampilkan pilihan kelas jika peran adalah murid */}
        {profile.role === 'murid' && (
          <div>
            <label htmlFor="kelas" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kelas</label>
            <select
              id="kelas"
              className="input w-full"
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
            >
              <option value="">-- Pilih Kelas --</option>
              {[1, 2, 3, 4, 5, 6].map(k => (
                <option key={k} value={`Kelas ${k}`}>Kelas {k}</option>
              ))}
            </select>
          </div>
        )}

        <button onClick={handleUpdate} className="btn w-full bg-green-600 hover:bg-green-700">
          Simpan Perubahan Profil
        </button>

        {/* Bagian Gamifikasi hanya untuk murid */}
        {profile.role === 'murid' && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">🎖️ Gamifikasi</h2>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-2">
              <p className="text-gray-700 dark:text-gray-200">Poin XP: <span className="font-semibold text-blue-600 dark:text-blue-400">{profile.xp || 0}</span></p>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Lencana:</h3>
                {(profile.badges && profile.badges.length > 0) ? (
                  <ul className="list-disc list-inside pl-1 space-y-1">
                    {profile.badges.map((badge: string, i: number) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-300">{badge}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">Belum ada lencana yang didapatkan.</p>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Bagian ganti password dan logout tidak ada di app.docx untuk /app/dashboard/profile.tsx, 
            biasanya ada di Navbar atau halaman pengaturan akun terpisah. 
            Jika ingin ditambahkan, bisa diletakkan di sini.
        */}
      </div>
    </div>
  )
}
