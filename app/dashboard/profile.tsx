'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User, BookOpen, Users, Bell, Swords, CheckCircle, Award } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image' // Impor komponen Image

// --- Tipe Data untuk Dasbor ---
export interface ProfileData {
  id: string; full_name: string; role: 'guru' | 'murid'; kelas: string; xp: number; badges: string[]; avatar_url: string;
}
interface TeacherStats {
  student_distribution: { kelas: string; student_count: number }[] | null; total_courses: number; total_enrollments: number;
}
interface StudentStats {
  pending_challenges_count: number; new_courses_count: number; followed_courses: { title: string }[] | null;
}

// --- Komponen-komponen UI (StatCard, BarChart) ---
const StatCard = ({ title, value, icon, link }: { title: string; value: number | string; icon: React.ReactNode; link?: string }) => {
  const CardContent = () => ( <div className="card p-6 flex items-center gap-4 transition-all hover:shadow-lg hover:-translate-y-1"><div className="bg-sky-100 dark:bg-sky-900/50 p-3 rounded-lg text-sky-500">{icon}</div><div><p className="text-sm text-gray-500 dark:text-gray-400">{title}</p><p className="text-3xl font-bold">{value}</p></div></div> );
  return link ? <Link href={link}><CardContent /></Link> : <CardContent />;
};
const BarChart = ({ data }: { data: { kelas: string; student_count: number }[] }) => {
  if (!data || data.length === 0) return <p className="text-sm text-center text-gray-500">Data distribusi siswa belum tersedia.</p>;
  const maxValue = Math.max(...data.map(item => item.student_count), 1);
  return ( <div className="card p-6"><h3 className="font-bold text-lg mb-4">Distribusi Siswa per Kelas</h3><div className="space-y-4">{data.map((item, index) => ( <div key={index} className="grid grid-cols-4 items-center gap-2"><span className="text-sm font-semibold truncate col-span-1">{item.kelas}</span><div className="col-span-3 bg-slate-100 dark:bg-slate-700 rounded-full h-8"><div className="bg-sky-500 h-8 rounded-full flex items-center justify-end px-2 text-white text-xs font-bold transition-all duration-500" style={{ width: `${(item.student_count / maxValue) * 100}%` }}>{item.student_count}</div></div></div> ))}</div></div> );
};

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [kelas, setKelas] = useState('');
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileError || !profileData) { console.error("Gagal memuat profil:", profileError); setLoading(false); return; }
      setProfile(profileData as ProfileData);
      setFullName(profileData.full_name || '');
      setKelas(profileData.kelas || '');
      setAvatarUrl(profileData.avatar_url || null);
      if (profileData.role === 'guru') {
        const { data } = await supabase.rpc('get_teacher_dashboard_stats', { p_teacher_id: user.id });
        setDashboardData(data);
      } else {
        const { data } = await supabase.rpc('get_student_dashboard_stats', { p_student_id: user.id, p_student_kelas: profileData.kelas });
        setDashboardData(data);
      }
      setLoading(false);
    };
    fetchAllData();
  }, [router]);

  const handleUpdate = async () => {
    if (!profile) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let updatedAvatarPublicUrl = profile.avatar_url;
    if (newAvatarFile) {
      const filePath = `public/${user.id}/${Date.now()}-${newAvatarFile.name}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, newAvatarFile, { upsert: true });
      if (uploadError) { alert(`Gagal upload avatar: ${uploadError.message}`); return; }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      updatedAvatarPublicUrl = urlData.publicUrl;
    }
    const { data: updatedProfile, error: updateError } = await supabase.from('profiles').update({ full_name: fullName, avatar_url: updatedAvatarPublicUrl, kelas: profile.role === 'murid' ? kelas : null, }).eq('id', user.id).select().single();
    if (updateError) {
      alert(`Gagal memperbarui profil: ${updateError.message}`);
    } else {
      alert('Profil berhasil diperbarui');
      setProfile(updatedProfile as ProfileData);
      setAvatarUrl(updatedProfile.avatar_url);
    }
  };

  if (loading) return <p className="p-8 text-center">Memuat dasbor Anda...</p>;
  if (!profile) return <p className="p-8 text-center text-red-500">Gagal memuat profil. Silakan login kembali.</p>;

  const EditProfileSection = () => (
    <div className="p-4 md:p-6 max-w-lg mx-auto mt-10">
      <div className="card p-6 space-y-6">
        <div><h2 className="text-2xl font-bold text-center mb-1">Edit Profil Anda</h2></div>
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700">
            {/* --- PERBAIKAN DI SINI --- */}
            <Image src={avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${fullName}`} alt="Avatar" layout="fill" objectFit="cover" />
          </div>
          <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={(e) => setNewAvatarFile(e.target.files?.[0] || null)} />
          <label htmlFor="avatar-upload" className="cursor-pointer text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
            {newAvatarFile ? `File dipilih: ${newAvatarFile.name}` : "Ganti Foto Profil"}
          </label>
        </div>
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium mb-1">Nama Lengkap</label>
          <input type="text" id="fullName" className="input w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        {profile.role === 'murid' && (
          <div>
            <label htmlFor="kelas" className="block text-sm font-medium mb-1">Kelas</label>
            <select id="kelas" className="input w-full" value={kelas} onChange={(e) => setKelas(e.target.value)}>
              <option value="">-- Pilih Kelas --</option>
              {[1, 2, 3, 4, 5, 6].map(k => <option key={k} value={`Kelas ${k}`}>Kelas {k}</option>)}
            </select>
          </div>
        )}
        <button onClick={handleUpdate} className="btn btn-primary w-full">Simpan Perubahan</button>
      </div>
    </div>
  );

  if (profile.role === 'guru') {
    const data: TeacherStats = dashboardData;
    return ( <div className="p-4 md:p-8 space-y-8"><div><h1 className="text-4xl font-bold">Selamat Datang, Guru {profile.full_name}!</h1><p className="text-gray-500">Berikut adalah ringkasan aktivitas di sekolah Anda.</p></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><StatCard title="Total Siswa" value={data?.student_distribution?.reduce((sum, item) => sum + item.student_count, 0) || 0} icon={<Users size={28}/>} /><StatCard title="Kursus Dibuat" value={data?.total_courses || 0} icon={<BookOpen size={28}/>} link="/dashboard/manage-courses" /><StatCard title="Total Pengerjaan" value={data?.total_enrollments || 0} icon={<CheckCircle size={28}/>} /></div><div>{data?.student_distribution && <BarChart data={data.student_distribution} />}</div><EditProfileSection /></div> );
  }

  const data: StudentStats = dashboardData;
  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-sky-500/50">
          {/* --- PERBAIKAN DI SINI --- */}
          <Image src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name}`} alt="Avatar" layout="fill" objectFit="cover" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-center md:text-left">Halo, {profile.full_name}!</h1>
          <p className="text-gray-500 text-center md:text-left">Kelas: {profile.kelas}</p>
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
    </div>
  );
}
