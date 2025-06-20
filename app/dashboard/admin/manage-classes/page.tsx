'use client'
import { useState, useEffect, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import RoleGuard from '@/components/RoleGuard'
import { Plus, Trash2 } from 'lucide-react'

// Tipe data untuk setiap kelas
interface SchoolClass {
  id: string;
  name: string;
}

export default function ManageClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [newClassName, setNewClassName] = useState('')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setProfile({ id: user.id });

      const { data: classData } = await supabase.from('school_classes').select('*').order('name');
      setClasses(classData || []);
      setLoading(false);
    }
    init();
  }, [])

  const handleAddClass = async (e: FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !profile) return;

    const { data, error } = await supabase
      .from('school_classes')
      .insert({ name: newClassName, created_by: profile.id })
      .select()
      .single();

    if (error) {
      alert(`Gagal menambah kelas: ${error.message}`);
    } else if (data) {
      setClasses([...classes, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewClassName('');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (confirm("Yakin ingin menghapus kelas ini? Ini tidak akan mengubah kelas siswa yang sudah ada, hanya menghapus dari daftar pilihan.")) {
      const { error } = await supabase.from('school_classes').delete().eq('id', classId);
      if (!error) {
        setClasses(classes.filter(c => c.id !== classId));
      } else {
        alert("Gagal menghapus kelas: " + error.message);
      }
    }
  };

  if (loading) return <p className="p-8 text-center">Memuat daftar kelas...</p>

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">Kelola Daftar Kelas</h1>
        
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Tambah Kelas Baru</h2>
          <form onSubmit={handleAddClass} className="flex gap-2">
            <input 
              type="text" 
              value={newClassName} 
              onChange={(e) => setNewClassName(e.target.value)} 
              placeholder="Contoh: Kelas 1 A, Kelas 2 Unggulan" 
              className="input flex-grow" 
            />
            <button type="submit" className="btn btn-primary flex-shrink-0 flex items-center gap-2">
              <Plus size={18}/> Tambah
            </button>
          </form>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Daftar Kelas Tersedia</h2>
          <ul className="space-y-2">
            {classes.map(cls => (
              <li key={cls.id} className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <span className="font-medium">{cls.name}</span>
                <button onClick={() => handleDeleteClass(cls.id)} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </RoleGuard>
  )
}
