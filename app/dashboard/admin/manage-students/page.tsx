'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import RoleGuard from '@/components/RoleGuard'
import Image from 'next/image'
import { Move, X } from 'lucide-react'

// Tipe data untuk siswa dan kelas
interface StudentProfile {
  id: string;
  full_name: string;
  kelas: string;
  avatar_url: string;
}
interface SchoolClass {
  id: string;
  name: string;
}

// Komponen Modal untuk memindahkan kelas
const MoveClassModal = ({ student, availableClasses, onClose, onMoved }: { student: StudentProfile, availableClasses: SchoolClass[], onClose: () => void, onMoved: () => void }) => {
  const [newClass, setNewClass] = useState(student.kelas);
  const [isSaving, setIsSaving] = useState(false);

  const handleMoveClass = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ kelas: newClass })
      .eq('id', student.id);
    
    if (error) {
      alert("Gagal memindahkan siswa: " + error.message);
    } else {
      alert(`${student.full_name} berhasil dipindahkan ke ${newClass}.`);
      onMoved(); // Panggil callback untuk refresh data di halaman utama
      onClose();
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <div className="card w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Pindahkan Kelas Siswa</h2>
          <button onClick={onClose} className="p-1 hover:text-red-500"><X size={24} /></button>
        </div>
        <p className="mb-4">Pindahkan <strong>{student.full_name}</strong> dari kelas {student.kelas} ke:</p>
        <select value={newClass} onChange={(e) => setNewClass(e.target.value)} className="input w-full mb-6">
          {availableClasses.map(level => <option key={level.id} value={level.name}>{level.name}</option>)}
        </select>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn bg-gray-400 hover:bg-gray-500">Batal</button>
          <button onClick={handleMoveClass} className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  )
};

export default function ManageStudentsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [availableClasses, setAvailableClasses] = useState<SchoolClass[]>([])
  const [loading, setLoading] = useState(true)
  const [studentToMove, setStudentToMove] = useState<StudentProfile | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    // Pertama, ambil pengaturan visibilitas dari guru yang login
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    
    const { data: guruProfile } = await supabase.from('profiles').select('visible_classes').eq('id', user.id).single();
    const visibleClasses = guruProfile?.visible_classes || [];

    if (visibleClasses.length > 0) {
      // Ambil hanya siswa dari kelas yang ada di `visible_classes`
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, kelas, avatar_url')
        .eq('role', 'murid')
        .in('kelas', visibleClasses) // Filter menggunakan .in()
        .order('kelas').order('full_name');
      setStudents(data || []);
    } else {
      setStudents([]); // Kosongkan jika tidak ada kelas yang dipilih
    }
    
    // Ambil juga daftar kelas yang tersedia untuk dropdown pindah kelas
    const { data: classData } = await supabase.from('school_classes').select('*').order('name');
    setAvailableClasses(classData || []);
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  if (loading) return <p className="p-8 text-center">Memuat daftar siswa...</p>

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">Kelola Akun Siswa</h1>
        <div className="card p-6">
          <ul className="space-y-2">
            {students.map(student => (
              <li key={student.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <Image 
                  src={student.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${student.full_name}`} 
                  alt={student.full_name}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
                <div className="flex-grow">
                  <p className="font-semibold">{student.full_name}</p>
                  <p className="text-sm text-gray-500">{student.kelas}</p>
                </div>
                <button onClick={() => setStudentToMove(student)} className="btn btn-primary text-sm p-2 flex items-center gap-1">
                  <Move size={14}/> <span className="hidden sm:inline">Pindahkan</span>
                </button>
              </li>
            ))}
            {students.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-gray-500">Tidak ada siswa untuk ditampilkan.</p>
                    <p className="text-sm text-gray-400 mt-2">
                        Coba sesuaikan <Link href="/dashboard" className="text-sky-500 hover:underline">Pengaturan Visibilitas Kelas</Link> Anda.
                    </p>
                </div>
            )}
          </ul>
        </div>
      </div>
      {studentToMove && <MoveClassModal student={studentToMove} availableClasses={availableClasses} onClose={() => setStudentToMove(null)} onMoved={fetchStudents} />}
    </RoleGuard>
  )
}
