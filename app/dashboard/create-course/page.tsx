'use client'
import { useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import RoleGuard from '@/components/RoleGuard'

// Tipe untuk setiap tahap
interface Stage {
  title: string;
  content: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  correct_answer: string;
}

// Komponen Form untuk satu tahap, agar bisa dipakai ulang
const StageForm = ({ stage, setStage }: { stage: Stage, setStage: (stage: Stage) => void }) => (
  <div className="space-y-4 p-4 border border-[var(--border)] rounded-lg">
    <input type="text" placeholder="Judul Tahap" value={stage.title} onChange={e => setStage({...stage, title: e.target.value})} className="input font-semibold" required />
    <textarea placeholder="Konten Materi" value={stage.content} onChange={e => setStage({...stage, content: e.target.value})} className="input h-24" required></textarea>
    <div className="pt-4 border-t border-[var(--border)] space-y-2">
      <p className="text-sm font-semibold">Soal Pilihan Ganda:</p>
      <input type="text" placeholder="Pertanyaan" value={stage.question} onChange={e => setStage({...stage, question: e.target.value})} className="input" required />
      <input type="text" placeholder="Opsi A" value={stage.option_a} onChange={e => setStage({...stage, option_a: e.target.value})} className="input" required />
      <input type="text" placeholder="Opsi B" value={stage.option_b} onChange={e => setStage({...stage, option_b: e.target.value})} className="input" required />
      <input type="text" placeholder="Opsi C" value={stage.option_c} onChange={e => setStage({...stage, option_c: e.target.value})} className="input" required />
      <select value={stage.correct_answer} onChange={e => setStage({...stage, correct_answer: e.target.value})} className="input w-full md:w-1/2">
        <option value="A">Jawaban Benar: A</option>
        <option value="B">Jawaban Benar: B</option>
        <option value="C">Jawaban Benar: C</option>
      </select>
    </div>
  </div>
);

export default function CreateCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kelas, setKelas] = useState('Kelas 1');
  const [loading, setLoading] = useState(false);

  // Daftar kelas yang tetap
  const classLevels = ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'];

  // State untuk 4 tahap wajib
  const [stages, setStages] = useState<Stage[]>(Array(4).fill({
    title: '', content: '', question: '', option_a: '', option_b: '', option_c: '', correct_answer: 'A'
  }));
  
  // State untuk tahap 5 opsional
  const [hasFifthStage, setHasFifthStage] = useState(false);
  const [fifthStage, setFifthStage] = useState<Stage>({
    title: 'Tahap Bonus',
    content: 'Kerjakan soal bonus di bawah ini untuk menguji pemahamanmu lebih dalam!',
    question: 'Siapakah presiden pertama Republik Indonesia?',
    option_a: 'Soeharto',
    option_b: 'Soekarno',
    option_c: 'B.J. Habibie',
    correct_answer: 'B'
  });

  const handleStageChange = (index: number, newStageData: Stage) => {
    const updatedStages = [...stages];
    updatedStages[index] = newStageData;
    setStages(updatedStages);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // 1. Buat kursus utama
    const { data: course, error: courseError } = await supabase.from('courses')
      .insert({ title, description, kelas, created_by: user.id })
      .select('id')
      .single();

    if (courseError || !course) {
      alert("Gagal membuat kursus: " + courseError?.message);
      setLoading(false);
      return;
    }

    // 2. Siapkan data semua tahap
    let allStages = stages.map((stage, index) => ({
      ...stage,
      course_id: course.id,
      step_number: index + 1
    }));
    
    // 3. Jika toggle aktif, tambahkan tahap 5
    if (hasFifthStage) {
      allStages.push({
        ...fifthStage,
        course_id: course.id,
        step_number: 5
      });
    }

    // 4. Masukkan semua tahap ke database
    const { error: stepsError } = await supabase.from('course_steps').insert(allStages);

    if (stepsError) {
      alert("Gagal menyimpan materi kursus: " + stepsError.message);
      // Hapus kursus yang sudah terbuat jika materi gagal
      await supabase.from('courses').delete().eq('id', course.id);
    } else {
      alert("Kursus berhasil dibuat!");
      router.push('/dashboard/manage-courses');
    }
    setLoading(false);
  };

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">Buat Kursus Baru</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-semibold">Informasi Dasar Kursus</h2>
            <input type="text" placeholder="Judul Kursus" value={title} onChange={e => setTitle(e.target.value)} className="input" required />
            <textarea placeholder="Deskripsi Singkat Kursus" value={description} onChange={e => setDescription(e.target.value)} className="input h-20" required></textarea>
            <select value={kelas} onChange={e => setKelas(e.target.value)} className="input">
              {classLevels.map(level => <option key={level} value={level}>{level}</option>)}
            </select>
          </div>
          
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-semibold">Tahap Pembelajaran (1-4)</h2>
            {stages.map((stage, index) => (
              <div key={index}>
                <h3 className="font-bold mb-2">Tahap {index + 1}</h3>
                <StageForm stage={stage} setStage={(newStage) => handleStageChange(index, newStage)} />
              </div>
            ))}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Tahap Bonus ke-5 (Opsional)</h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={hasFifthStage} onChange={() => setHasFifthStage(!hasFifthStage)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {hasFifthStage && (
              <div className="mt-4">
                 <StageForm stage={fifthStage} setStage={setFifthStage} />
              </div>
            )}
          </div>
          
          <button type="submit" disabled={loading} className="btn btn-primary w-full !mt-8 text-lg">
            {loading ? 'Menyimpan...' : 'Terbitkan Kursus'}
          </button>
        </form>
      </div>
    </RoleGuard>
  )
}
