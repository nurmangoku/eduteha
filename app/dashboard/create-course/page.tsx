'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import RoleGuard from '@/components/RoleGuard'

interface StepData {
  content: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  correctAnswer: 'A' | 'B' | 'C' | ''; // A, B, C, atau kosong
}

const initialStep: StepData = {
  content: '',
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  correctAnswer: '',
};

export default function CreateCoursePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kelas, setKelas] = useState('')
  // Inisialisasi 5 tahap, masing-masing dengan struktur StepData
  const [steps, setSteps] = useState<StepData[]>(() => Array(5).fill(null).map(() => ({ ...initialStep })));
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleStepChange = (index: number, field: keyof StepData, value: string) => {
    const newSteps = [...steps];
    // Pastikan correctAnswer adalah salah satu dari 'A', 'B', 'C', atau ''
    if (field === 'correctAnswer') {
        const validAnswers = ['A', 'B', 'C', ''];
        if (validAnswers.includes(value.toUpperCase())) {
            newSteps[index][field] = value.toUpperCase() as 'A' | 'B' | 'C' | '';
        } else {
            newSteps[index][field] = ''; // Default ke kosong jika tidak valid
        }
    } else {
        newSteps[index][field] = value;
    }
    setSteps(newSteps);
  };

  const handleSubmit = async () => {
    setError(null)
    setSuccessMessage(null)

    if (!title.trim() || !description.trim() || !kelas) {
      setError('Judul, deskripsi, dan kelas tidak boleh kosong.')
      return
    }

    // Validasi konten dan MCQ untuk tahap 1-4 (wajib)
    // Tahap 5 (video) kontennya opsional, MCQ juga opsional jika ada konten
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (i < 4) { // Tahap 1-4
        if (!step.content.trim()) {
          setError(`Konten untuk Tahapan ${i + 1} tidak boleh kosong.`);
          return;
        }
        if (!step.question.trim() || !step.optionA.trim() || !step.optionB.trim() || !step.optionC.trim() || !step.correctAnswer) {
          setError(`Soal Pilihan Ganda (pertanyaan, semua pilihan, dan jawaban benar) untuk Tahapan ${i + 1} tidak boleh kosong.`);
          return;
        }
      } else { // Tahap 5 (Link YouTube)
        if (step.content.trim()) { // Jika link YouTube diisi
          try {
            new URL(step.content); // Validasi URL
          } catch (_) {
            setError(`Tahapan 5 harus berisi link YouTube yang valid atau dikosongkan.`);
            return;
          }
          // Jika ada link YouTube, MCQ untuk tahap 5 menjadi opsional.
          // Jika MCQ diisi, harus lengkap.
          if (step.question.trim() || step.optionA.trim() || step.optionB.trim() || step.optionC.trim() || step.correctAnswer) {
            if (!step.question.trim() || !step.optionA.trim() || !step.optionB.trim() || !step.optionC.trim() || !step.correctAnswer) {
              setError(`Jika Soal Pilihan Ganda untuk Tahapan 5 diisi, maka pertanyaan, semua pilihan, dan jawaban benar tidak boleh kosong.`);
              return;
            }
          }
        } else {
            // Jika link YouTube kosong, pastikan MCQ juga kosong
            if (step.question.trim() || step.optionA.trim() || step.optionB.trim() || step.optionC.trim() || step.correctAnswer) {
                 setError(`Jika link YouTube untuk Tahapan 5 kosong, maka Soal Pilihan Ganda juga harus dikosongkan.`);
                 return;
            }
        }
      }
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Tidak terautentikasi. Silakan login kembali.')
      setLoading(false)
      return
    }

    try {
      const { data: course, error: courseError } = await supabase.from('courses').insert({
        title,
        description,
        kelas,
        created_by: user.id
      }).select().single()

      if (courseError) throw courseError;
      if (!course) throw new Error('Gagal membuat data kursus inti.');

      const stepPromises = steps.map((stepData, i) => {
        const contentToSave = stepData.content.trim();
        const isVideoStep = i === 4 && contentToSave !== '';
        
        // Hanya simpan MCQ jika pertanyaan diisi (untuk tahap 5 yang opsional MCQ nya)
        // Untuk tahap 1-4, validasi di atas sudah memastikan semua field MCQ terisi.
        const shouldSaveMcq = (i < 4) || (i === 4 && stepData.question.trim() !== '');

        return supabase.from('course_steps').insert({
          course_id: course.id,
          step_number: i + 1,
          content: contentToSave,
          is_video: isVideoStep,
          question: shouldSaveMcq ? stepData.question.trim() : null,
          option_a: shouldSaveMcq ? stepData.optionA.trim() : null,
          option_b: shouldSaveMcq ? stepData.optionB.trim() : null,
          option_c: shouldSaveMcq ? stepData.optionC.trim() : null,
          correct_answer: shouldSaveMcq ? stepData.correctAnswer : null,
        });
      });
      
      const stepResults = await Promise.all(stepPromises);
      stepResults.forEach(result => {
        if (result.error) {
            console.error('Gagal menyimpan salah satu langkah kursus:', result.error);
            throw new Error(`Gagal menyimpan Tahapan: ${result.error.message}`);
        }
      });
      
      setSuccessMessage('Kursus berhasil dibuat! Mengarahkan ke dashboard...');
      setTitle('');
      setDescription('');
      setKelas('');
      setSteps(Array(5).fill(null).map(() => ({ ...initialStep })));

      setTimeout(() => {
        router.push('/dashboard/manage-courses');
      }, 2000);

    } catch (e: any) {
      console.error('Error saat membuat kursus:', e)
      setError(e.message || 'Terjadi kesalahan saat membuat kursus.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="text-black max-w-xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-700 dark:text-white">Buat Kursus Baru</h2>
        
        {error && <p className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</p>}
        {successMessage && <p className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-md">{successMessage}</p>}

        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Judul Kursus</label>
            <input 
              id="title"
              className="input w-full dark:bg-gray-700 dark:text-white dark:border-gray-600" 
              placeholder="Contoh: Belajar Matematika Dasar"
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi Singkat</label>
            <textarea 
              id="description"
              className="input w-full dark:bg-gray-700 dark:text-white dark:border-gray-600" 
              placeholder="Jelaskan secara singkat tentang kursus ini"
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={3}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="kelas" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pilih Kelas</label>
            <select
              id="kelas"
              className="input w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Pilih Kelas --</option>
              {[1, 2, 3, 4, 5, 6].map(k => (
                <option key={k} value={`Kelas ${k}`}>Kelas {k}</option>
              ))}
            </select>
          </div>

          <h3 className="text-xl font-semibold pt-4 border-t mt-6 text-gray-700 dark:text-gray-300">Materi & Soal per Tahapan</h3>
          {steps.map((stepData, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3 bg-gray-50 dark:bg-gray-700/50">
              <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200">
                Tahapan {i + 1} 
                {i < 4 && <span className="text-red-500 text-xs ml-1">(Konten & Soal Wajib)</span>}
                {i === 4 && <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">(Link Video YouTube - Opsional, Soal Opsional jika ada video)</span>}
              </h4>
              <div>
                <label htmlFor={`step-content-${i}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Konten Tahapan {i + 1} {i === 4 ? '(Link Video YouTube)' : ''}
                </label>
                <textarea 
                  id={`step-content-${i}`}
                  className="input w-full dark:bg-gray-600 dark:text-white dark:border-gray-500"
                  placeholder={i === 4 ? 'Contoh: https://www.youtube.com/watch?v=xxxx (Kosongkan jika tidak ada video)' : `Isi materi untuk tahapan ${i + 1}...`}
                  value={stepData.content} 
                  onChange={(e) => handleStepChange(i, 'content', e.target.value)} 
                  rows={i === 4 ? 2 : 4}
                  disabled={loading}
                />
              </div>

              { (i < 4 || (i === 4 && steps[i].content.trim() !== '')) && ( // Tampilkan MCQ jika tahap 1-4, atau tahap 5 jika ada konten (link video)
                <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Soal Pilihan Ganda untuk Tahapan {i + 1} 
                    {i < 4 && <span className="text-red-500 text-xs ml-1">(Wajib Diisi Lengkap)</span>}
                    {i === 4 && <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">(Opsional, isi lengkap jika ada soal)</span>}
                  </p>
                  <div>
                    <label htmlFor={`step-question-${i}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Pertanyaan</label>
                    <input 
                      id={`step-question-${i}`}
                      type="text"
                      className="input input-sm w-full dark:bg-gray-600 dark:text-white dark:border-gray-500"
                      placeholder="Tulis pertanyaan soal..."
                      value={stepData.question}
                      onChange={(e) => handleStepChange(i, 'question', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        <label htmlFor={`step-optA-${i}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Pilihan A</label>
                        <input id={`step-optA-${i}`} type="text" className="input input-sm w-full dark:bg-gray-600 dark:text-white dark:border-gray-500" placeholder="Pilihan A" value={stepData.optionA} onChange={(e) => handleStepChange(i, 'optionA', e.target.value)} disabled={loading} />
                    </div>
                    <div>
                        <label htmlFor={`step-optB-${i}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Pilihan B</label>
                        <input id={`step-optB-${i}`} type="text" className="input input-sm w-full dark:bg-gray-600 dark:text-white dark:border-gray-500" placeholder="Pilihan B" value={stepData.optionB} onChange={(e) => handleStepChange(i, 'optionB', e.target.value)} disabled={loading} />
                    </div>
                    <div>
                        <label htmlFor={`step-optC-${i}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Pilihan C</label>
                        <input id={`step-optC-${i}`} type="text" className="input input-sm w-full dark:bg-gray-600 dark:text-white dark:border-gray-500" placeholder="Pilihan C" value={stepData.optionC} onChange={(e) => handleStepChange(i, 'optionC', e.target.value)} disabled={loading} />
                    </div>
                    <div>
                        <label htmlFor={`step-correct-${i}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Jawaban Benar</label>
                        <select id={`step-correct-${i}`} className="input input-sm w-full dark:bg-gray-600 dark:text-white dark:border-gray-500" value={stepData.correctAnswer} onChange={(e) => handleStepChange(i, 'correctAnswer', e.target.value)} disabled={loading}>
                            <option value="">-- Pilih Jawaban --</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                        </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button 
            onClick={handleSubmit} 
            className="btn w-full py-2.5 mt-6"
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : 'Simpan Kursus'}
          </button>
        </div>
      </div>
    </RoleGuard>
  )
}