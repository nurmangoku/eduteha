'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { User, BookOpen, Users, Bell, Swords, CheckCircle, Award, LogOut, Edit } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// --- Tipe Data untuk Dasbor ---
export interface ProfileData {
  id: string;
  full_name: string;
  role: 'guru' | 'murid';
  kelas: string;
  xp: number;
  badges: string[];
  avatar_url: string;
  visible_classes: string[]; // Kolom untuk pengaturan guru
}
interface TeacherStats {
  student_distribution: { kelas: string; student_count: number }[] | null;
  total_courses: number;
  total_enrollments: number;
}
interface StudentStats {
  pending_challenges_count: number;
  new_courses_count: number;
  followed_courses: { title: string }[] | null;
}
interface SchoolClass {
  id: string;
  name: string;
}

// --- Komponen-komponen UI (StatCard, BarChart) ---
const StatCard = ({ title, value, icon, link }: { title: string; value: number | string; icon: React.ReactNode; link?: string }) => {
  const CardContent = () => (
    <div className="card p-6 flex items-center gap-4 transition-all hover:shadow-lg hover:-translate-y-1">
      <div className="bg-sky-100 dark:bg-sky-900/50 p-3 rounded-lg text-sky-500">{icon}</div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
  return link ? <Link href={link}><CardContent /></Link> : <CardContent />;
};

const BarChart = ({ data }: { data: { kelas: string; student_count: number }[] }) => {
  if (!data || data.length === 0) return <p className="text-sm text-center text-gray-500">Data distribusi siswa belum tersedia.</p>;
  const maxValue = Math.max(...data.map(item => item.student_count), 1);
  return (
    <div className="card p-6">
      <h3 className="font-bold text-lg mb-4">Distribusi Siswa per Kelas</h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="grid grid-cols-4 items-center gap-2">
            <span className="text-sm font-semibold truncate col-span-1">{item.kelas}</span>
            <div className="col-span-3 bg-slate-100 dark:bg-slate-700 rounded-full h-8">
              <div className="bg-sky-500 h-8 rounded-full flex items-center justify-end px-2 text-white text-xs font-bold transition-all duration-500" style={{ width: `${(item.student_count / maxValue) * 100}%` }}>{item.student_count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// Komponen Utama Profil yang mengambil datanya sendiri
export default function Profile() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // State untuk form edit
  const [fullName, setFullName] = useState('');
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // State untuk pengaturan guru
  const [visibleClasses, setVisibleClasses] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<SchoolClass[]>([]);

  // Fungsi yang dibungkus dengan useCallback untuk stabilitas
  const fetchAllData = useCallback(async () => {
    // Tidak set loading di sini agar tidak berkedip saat refresh
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileError) throw profileError;
      if (!profileData) throw new Error("Profil tidak ditemukan.");

      setProfile(profileData as ProfileData);
      setFullName(profileData.full_name || '');
      setAvatarUrl(profileData.avatar_url || null);

      if (profileData.role === 'guru') {
        setVisibleClasses(profileData.visible_classes || []);
        const { data: classData } = await supabase.from('school_classes').select('*').order('name');
        setAvailableClasses(classData || []);
        const { data } = await supabase.rpc('get_teacher_dashboard_stats', { p_teacher_id: user.id });
        setDashboardData(data);
      } else {
        const { data } = await supabase.rpc('get_student_dashboard_stats', { p_student_id: user.id, p_student_kelas: profileData.kelas });
        setDashboardData(data);
      }
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError("Gagal memuat data dasbor. Coba segarkan halaman.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- SEMUA FUNGSI HANDLER SEKARANG ADA DI SINI ---
  const handleUpdate = async () => {
    if (!profile) return;
    let updatedAvatarPublicUrl = avatarUrl;
    if (newAvatarFile) {
      const filePath = `public/${profile.id}/${Date.now()}-${newAvatarFile.name}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, newAvatarFile, { upsert: true });
      if (uploadError) { alert(`Gagal upload avatar: ${uploadError.message}`); return; }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      updatedAvatarPublicUrl = urlData.publicUrl;
    }
    const { data: updatedProfile, error: updateError } = await supabase.from('profiles').update({
      full_name: fullName,
      avatar_url: updatedAvatarPublicUrl,
    }).eq('id', profile.id).select().single();
    if (updateError) {
      alert(`Gagal memperbarui profil: ${updateError.message}`);
    } else {
      alert('Profil berhasil diperbarui!');
      setProfile(updatedProfile as ProfileData);
      setAvatarUrl(updatedProfile.avatar_url);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { alert('Password baru harus terdiri dari minimal 6 karakter.'); return; }
    if (newPassword !== confirmPassword) { alert('Password baru dan konfirmasi password tidak cocok.'); return; }
    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      alert(`Gagal mengubah password: ${error.message}`);
    } else {
      alert('Password berhasil diubah. Anda akan diarahkan ke halaman login untuk masuk kembali.');
      setNewPassword('');
      setConfirmPassword('');
      await supabase.auth.signOut();
      router.push('/login');
    }
    setIsUpdatingPassword(false);
  };
  
  const handleVisibilityChange = async (kelas: string) => {
    if (!profile || profile.role !== 'guru') return;
    const currentVisibleClasses = [...visibleClasses];
    const newVisibleClasses = currentVisibleClasses.includes(kelas)
      ? currentVisibleClasses.filter(c => c !== kelas)
      : [...currentVisibleClasses, kelas];
    
    setVisibleClasses(newVisibleClasses); // Update UI secara instan (optimistic update)
    
    // Kirim perubahan ke database
    const { error } = await supabase.from('profiles').update({ visible_classes: newVisibleClasses }).eq('id', profile.id);
    if (error) {
      alert("Gagal menyimpan pengaturan visibilitas: " + error.message);
      // Jika gagal, kembalikan state UI ke keadaan semula
      setVisibleClasses(currentVisibleClasses);
    }
  };

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      await supabase.auth.signOut();
      router.push('/login');
    }
  }

  if (loading) return <p className="p-8 text-center text-xl">Memuat dasbor Anda...</p>;
  if (error) return <p className="p-8 text-center text-red-500">{error}</p>;
  if (!profile) return <p className="p-8 text-center text-red-500">Gagal memuat profil.</p>;

  const EditProfileSection = () => (
    <div id="edit-profile" className="p-4 md:p-6 max-w-lg mx-auto mt-10">
      <div className="card p-6 space-y-6">
        <div><h2 className="text-2xl font-bold text-center mb-1">Edit Profil Anda</h2></div>
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4">
            <Image src={avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${fullName}`} alt="Avatar" layout="fill" objectFit="cover" />
          </div>
          <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={(e) => setNewAvatarFile(e.target.files?.[0] || null)} />
          <label htmlFor="avatar-upload" className="cursor-pointer text-sm text-sky-600 hover:underline">
            {newAvatarFile ? `File dipilih: ${newAvatarFile.name}` : "Ganti Foto Profil"}
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nama Lengkap</label>
          <input type="text" className="input w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        {profile.role === 'murid' && (
          <div>
            <label className="block text-sm font-medium mb-1">Kelas</label>
            <div className="input bg-slate-100 dark:bg-slate-700">{profile.kelas || 'Belum diatur'}</div>
            <p className="text-xs text-gray-500 mt-1">Hanya guru yang dapat mengubah kelas.</p>
          </div>
        )}
        <button onClick={handleUpdate} className="btn btn-primary w-full">Simpan Perubahan</button>
      </div>
    </div>
  );

  const ChangePasswordSection = () => (
    <div id="change-password" className="p-4 md:p-6 max-w-lg mx-auto mt-6">
       <div className="card p-6 space-y-6">
        <div><h2 className="text-2xl font-bold text-center mb-1">Ubah Password</h2></div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Password Baru</label>
            <input type="password" placeholder="Minimal 6 karakter" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Konfirmasi Password Baru</label>
            <input type="password" placeholder="Ketik ulang password baru Anda" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input w-full" />
          </div>
        </div>
        <button onClick={handleChangePassword} className="btn btn-primary w-full" disabled={isUpdatingPassword}>
          {isUpdatingPassword ? 'Memproses...' : 'Ubah Password'}
        </button>
       </div>
    </div>
  );

  if (profile.role === 'guru') {
    const data: TeacherStats = dashboardData;
    return (
      <div className="p-4 md:p-8 space-y-8">
        <div className="flex justify-between items-start gap-4">
          <div><h1 className="text-4xl font-bold">Selamat Datang, Guru {profile.full_name}!</h1></div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="#edit-profile" className="btn btn-primary p-2 flex items-center gap-2 text-sm"><Edit size={16}/> <span className="hidden md:inline">Edit Profil</span></Link>
            <button onClick={handleLogout} className="btn bg-red-500 hover:bg-red-600 p-2"><LogOut size={20}/></button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Total Siswa" value={data?.student_distribution?.reduce((sum, item) => sum + item.student_count, 0) || 0} icon={<Users size={28}/>} link="/dashboard/admin/manage-students" />
            <StatCard title="Kursus Dibuat" value={data?.total_courses || 0} icon={<BookOpen size={28}/>} link="/dashboard/manage-courses" />
            <StatCard title="Total Pengerjaan" value={data?.total_enrollments || 0} icon={<CheckCircle size={28}/>} />
        </div>
        <div>{data?.student_distribution && <BarChart data={data.student_distribution} />}</div>
        
        <div className="card p-6 max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Pengaturan Visibilitas Kelas</h2>
          <p className="text-sm text-center text-gray-500 mb-4">Pilih kelas yang ingin Anda pantau datanya.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {availableClasses.map(kelas => (
              <div key={kelas.id} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <span className="font-semibold text-sm">{kelas.name}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={visibleClasses.includes(kelas.name)} onChange={() => handleVisibilityChange(kelas.name)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 dark:bg-gray-600 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            ))}
            {availableClasses.length === 0 && <p className="text-sm text-gray-500 col-span-full text-center">Tidak ada kelas yang dibuat. Tambahkan di menu 'Kelola Kelas'.</p>}
          </div>
        </div>
        <EditProfileSection />
        <ChangePasswordSection />
      </div>
    );
  }

  // Tampilan untuk Siswa
  const data: StudentStats = dashboardData;
  return (
    <div className="p-4 md:p-8 space-y-8">
        <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-sky-500/50">
                    <Image src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name}`} alt="Avatar" layout="fill" objectFit="cover" />
                </div>
                <div>
                    <h1 className="text-4xl font-bold text-center md:text-left">Halo, {profile.full_name}!</h1>
                    <p className="text-gray-500 text-center md:text-left">Kelas: {profile.kelas}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Link href="#edit-profile" className="btn btn-primary p-2 flex items-center gap-2 text-sm"><Edit size={16}/> <span className="hidden md:inline">Edit Profil</span></Link>
                <button onClick={handleLogout} className="btn bg-red-500 hover:bg-red-600 p-2"><LogOut size={20}/></button>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/dashboard/battle-arena"><div className="card p-6 flex gap-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-lg text-red-500"><Swords size={28}/></div><div><p className="font-bold">Tantangan Baru</p><p className="text-sm text-gray-500">{data?.pending_challenges_count > 0 ? `${data.pending_challenges_count} tantangan menunggumu!` : "Tidak ada tantangan baru."}</p></div></div></Link>
            <Link href="/dashboard/courses"><div className="card p-6 flex gap-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg text-green-500"><Bell size={28}/></div><div><p className="font-bold">Kursus Baru</p><p className="text-sm text-gray-500">{data?.new_courses_count > 0 ? `${data.new_courses_count} kursus baru tersedia.` : "Tidak ada kursus baru."}</p></div></div></Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6"><h3 className="font-bold text-xl mb-4">Kursus yang Diikuti</h3>{data?.followed_courses && data.followed_courses.length > 0 ? (<ul className="space-y-2">{data.followed_courses.map((course, index) => (<li key={index} className="flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-700 rounded-md"><BookOpen size={16} className="text-gray-500"/><span className="text-sm font-medium truncate">{course.title}</span></li>))}</ul>) : <p className="text-sm text-center text-gray-500 py-4">Kamu belum mengikuti kursus apapun.</p>}</div>
            <div className="card p-6"><h3 className="font-bold text-xl mb-4">Pencapaianmu</h3><div className="space-y-4"><div className="flex items-center gap-3"><span className="font-bold text-lg text-yellow-500">{profile.xp || 0}</span><span className="text-sm">Poin XP</span></div><div><h4 className="font-semibold mb-2">Lencana:</h4>{(profile.badges && profile.badges.length > 0) ? (<div className="flex flex-wrap gap-2">{profile.badges.map((badge, i) => <span key={i} className="text-xs font-semibold bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200 px-2 py-1 rounded-full flex items-center gap-1"><Award size={14}/> {badge}</span>)}</div>) : <p className="text-sm text-gray-500 italic">Belum ada lencana.</p>}</div></div></div>
        </div>
        <EditProfileSection />
        <ChangePasswordSection />
    </div>
  );
}
