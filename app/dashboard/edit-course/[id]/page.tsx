'use client'
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Pastikan path ini sesuai
import RoleGuard from '@/components/RoleGuard'; // Pastikan path ini sesuai

interface StepData {
  id?: string;
  content: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  correctAnswer: 'A' | 'B' | 'C' | '';
  is_video?: boolean;
}

const initialStepForm: StepData = {
  content: '',
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  correctAnswer: '',
  is_video: false,
};

type EditableStringStepField = Extract<keyof StepData, 'content' | 'question' | 'optionA' | 'optionB' | 'optionC' | 'correctAnswer'>;

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  // Mengambil 'id' dari params, sesuai dengan nama folder [id]
  // params.id bisa string, string[], atau undefined. Kita hanya tertarik pada string.
  const courseIdFromParams = typeof params.id === 'string' ? params.id : undefined; 

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kelas, setKelas] = useState('');
  const [formSteps, setFormSteps] = useState<StepData[]>(() => Array(5).fill(null).map(() => ({ ...initialStepForm })));
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCourseDetails = useCallback(async (currentCourseId: string) => {
    // Fungsi ini dipanggil dengan courseId yang sudah divalidasi sebagai string
    setLoading(true);
    setError(null);
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', currentCourseId)
        .single();

      if (courseError) throw courseError; // Akan ditangkap oleh blok catch
      if (!courseData) throw new Error('Kursus tidak ditemukan di database.');
      
      setTitle(courseData.title);
      setDescription(courseData.description);
      setKelas(courseData.kelas);

      const { data: stepsData, error: stepsError } = await supabase
        .from('course_steps')
        .select('*')
        .eq('course_id', currentCourseId)
        .order('step_number', { ascending: true });
      if (stepsError) throw stepsError; // Akan ditangkap oleh blok catch

      const newFormSteps = Array(5).fill(null).map(() => ({ ...initialStepForm }));
      (stepsData || []).forEach(step => {
        if (step.step_number >= 1 && step.step_number <= 5) {
          newFormSteps[step.step_number - 1] = {
            id: step.id,
            content: step.content || '',
            question: step.step_number === 5 ? '' : (step.question || ''),
            optionA: step.step_number === 5 ? '' : (step.option_a || ''),
            optionB: step.step_number === 5 ? '' : (step.option_b || ''),
            optionC: step.step_number === 5 ? '' : (step.option_c || ''),
            correctAnswer: step.step_number === 5 ? '' : ((step.correct_answer || '') as 'A' | 'B' | 'C' | ''),
            is_video: step.is_video || false,
          };
        }
      });
      setFormSteps(newFormSteps);

    } catch (err: any) {
      console.error('Error fetching course details:', err);
      setError(err.message || 'Gagal memuat detail kursus.');
    } finally {
      setLoading(false); // Selalu set loading false di akhir fetch
    }
  }, []); // useCallback tidak memiliki dependensi eksternal selain fungsi dari scope luar (supabase)

  useEffect(() => {
    // Efek ini akan berjalan ketika courseIdFromParams (dari params.id) berubah.
    if (courseIdFromParams) {
      fetchCourseDetails(courseIdFromParams);
    } else if (params.id !== undefined && !courseIdFromParams) {
      // params.id ada tapi bukan string (misal array, tidak diharapkan untuk [id])
      setError('ID Kursus pada rute tidak valid.');
      setLoading(false);
    }
    // Jika params.id === undefined, berarti router belum siap, loading tetap true (default).
    // Effect akan berjalan lagi saat params.id terisi.
  }, [courseIdFromParams, params.id, fetchCourseDetails]); // Dependensi utama adalah courseIdFromParams

  const handleStepChange = (
    index: number,
    field: EditableStringStepField,
    value: string
  ) => {
    if (index === 4 && (field === 'question' || field === 'optionA' || field === 'optionB' || field === 'optionC' || field === 'correctAnswer')) {
        return; 
    }
    setFormSteps(prevSteps =>
      prevSteps.map((step, i) => {
        if (i === index) {
          const updatedStep = { ...step };
          if (field === 'correctAnswer') {
            const validAnswers = ['A', 'B', 'C', ''];
            updatedStep[field] = validAnswers.includes(value.toUpperCase())
              ? (value.toUpperCase() as 'A' | 'B' | 'C' | '')
              : '';
          } else {
            updatedStep[field] = value;
          }
          return updatedStep;
        }
        return step;
      })
    );
  };

  const handleUpdateCourse = async () => {
    if (!courseIdFromParams) { // Pastikan courseId ada sebelum update
        setError("Tidak dapat memperbarui kursus, ID kursus tidak ditemukan.");
        return;
    }
    setError(null);
    setSuccessMessage(null);

    if (!title.trim() || !description.trim() || !kelas) {
      setError('Judul, deskripsi, dan kelas tidak boleh kosong.');
      return;
    }
    for (let i = 0; i < formSteps.length; i++) {
      const step = formSteps[i];
      if (i < 4) {
        if (!step.content.trim()) {
          setError(`Konten untuk Tahapan ${i + 1} tidak boleh kosong.`);
          return;
        }
        if (!step.question.trim() || !step.optionA.trim() || !step.optionB.trim() || !step.optionC.trim() || !step.correctAnswer) {
          setError(`Soal Pilihan Ganda untuk Tahapan ${i + 1} wajib diisi lengkap.`);
          return;
        }
      } else { 
        if (step.content.trim()) { 
          try { new URL(step.content); } catch (_) {
            setError(`Tahapan 5: Link YouTube tidak valid. Kosongkan jika tidak ada.`);
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      const { error: courseUpdateError } = await supabase
        .from('courses')
        .update({ title, description, kelas, updated_at: new Date().toISOString() })
        .eq('id', courseIdFromParams);
      if (courseUpdateError) throw courseUpdateError;
      
      const { error: deleteStepsError } = await supabase
        .from('course_steps')
        .delete()
        .eq('course_id', courseIdFromParams);
      if (deleteStepsError) throw deleteStepsError;

      const stepPromises = formSteps.map((stepData, i) => {
        const contentToSave = stepData.content.trim();
        const isVideoStep = i === 4 && contentToSave !== '';

        if (i === 4) { 
            return supabase.from('course_steps').insert({
                course_id: courseIdFromParams,
                step_number: i + 1,
                content: contentToSave,
                is_video: isVideoStep,
                question: null,
                option_a: null,
                option_b: null,
                option_c: null,
                correct_answer: null,
            });
        } else { 
            return supabase.from('course_steps').insert({
                course_id: courseIdFromParams,
                step_number: i + 1,
                content: contentToSave,
                is_video: false, 
                question: stepData.question.trim(),
                option_a: stepData.optionA.trim(),
                option_b: stepData.optionB.trim(),
                option_c: stepData.optionC.trim(),
                correct_answer: stepData.correctAnswer,
            });
        }
      });
      const stepResults = await Promise.all(stepPromises);
      for (const result of stepResults) {
        if (result.error) throw result.error;
      }

      setSuccessMessage('Kursus berhasil diperbarui! Mengarahkan...');
      setTimeout(() => {
        router.push('/dashboard/manage-courses'); 
      }, 2000);

    } catch (err: any) {
      console.error("Error updating course:", err);
      setError(err.message || "Gagal memperbarui kursus.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6 text-center text-gray-600 dark:text-gray-400">Memuat detail kursus...</p>;
  // Tampilkan error jika ada error DAN title belum terisi (artinya fetch gagal) DAN belum ada success message
  if (error && !title && !successMessage) return <p className="p-6 text-center text-red-500 dark:text-red-400">⚠️ {error}</p>;
  // Jika tidak loading, tidak error, title tidak ada (kursus tidak ditemukan), dan belum ada success message
  if (!loading && !error && !title && !successMessage) return <p className="p-6 text-center text-gray-600 dark:text-gray-400">Kursus tidak ditemukan atau ID tidak valid.</p>;

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="text-black max-w-xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-700 dark:text-white">Edit Kursus</h1>
        {/* Hanya tampilkan error jika tidak ada pesan sukses */}
        {error && !successMessage && <p className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-200 rounded-md">{error}</p>}
        {successMessage && <p className="mb-4 p-3 text-sm text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-200 rounded-md">{successMessage}</p>}
        
        {/* Form hanya ditampilkan jika title ada (artinya data kursus berhasil dimuat) atau jika sedang saving (untuk mencegah UI hilang saat submit) */}
        {(title || saving) && (
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Judul Kursus</label>
              <input id="edit-title" className="input w-full dark:bg-gray-700 dark:text-white dark:border-gray-600" value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
            </div>
            <div>
              <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi Singkat</label>
              <textarea id="edit-description" className="input w-full dark:bg-gray-700 dark:text-white dark:border-gray-600" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={saving} />
            </div>
            <div>
              <label htmlFor="edit-kelas" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pilih Kelas</label>
              <select id="edit-kelas" className="input w-full dark:bg-gray-700 dark:text-white dark:border-gray-600" value={kelas} onChange={(e) => setKelas(e.target.value)} disabled={saving}>
                <option value="">-- Pilih Kelas --</option>
                {[1, 2, 3, 4, 5, 6].map(k => (<option key={k} value={`Kelas ${k}`}>Kelas {k}</option>))}
              </select>
            </div>

            <h3 className="text-xl font-semibold pt-4 border-t mt-6 text-gray-700 dark:text-gray-300">Edit Materi & Soal per Tahapan</h3>
            {formSteps.map((stepData, i) => (
              <div key={stepData.id || `edit-form-step-${i}`} className="p-4 border rounded-lg space-y-3 bg-gray-50 dark:bg-gray-700/50">
                <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200">
                  Tahapan {i + 1}
                  {i < 4 && <span className="text-red-500 text-xs ml-1">(Konten & Soal Wajib)</span>}
                  {i === 4 && <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">(Link Video YouTube - Opsional, Tanpa Soal)</span>}
                </h4>
                <div>
                  <label htmlFor={`edit-step-content-${i}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Konten Tahapan {i + 1} {i === 4 ? '(Link Video YouTube, bisa dikosongkan)' : ''}
                  </label>
                  <textarea 
                    id={`edit-step-content-${i}`}
                    className="input w-full dark:bg-gray-600 dark:text-white dark:border-gray-500"
                    placeholder={i === 4 ? 'Contoh: https://www.youtube.com/watch?v=... (Kosongkan jika tidak ada)' : `Isi materi untuk tahapan ${i + 1}...`}
                    value={stepData.content} 
                    onChange={(e) => handleStepChange(i, 'content', e.target.value)} 
                    rows={i === 4 ? 2 : 4}
                    disabled={saving}
                  />
                </div>

                {i < 4 && (
                  <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Soal Pilihan Ganda untuk Tahapan {i + 1}
                      <span className="text-red-500 text-xs ml-1">(Wajib Diisi Lengkap)</span>
                    </p>
                    <div>
                      <label htmlFor={`edit-step-question-${i}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Pertanyaan</label>
                      <input id={`edit-step-question-${i}`} type="text" className="input input-sm w-full dark:bg-gray-600 dark:text-white dark:border-gray-500" placeholder="Tulis pertanyaan soal..." value={stepData.question} onChange={(e) => handleStepChange(i, 'question', e.target.value)} disabled={saving} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                          <label htmlFor={`edit-step-optA-${i}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Pilihan A</label>
                          <input id={`edit-step-optA-${i}`} type="text" className="input input-sm w-full dark:bg-gray-600 dark:text-white dark:border-gray-500" placeholder="Pilihan A" value={stepData.optionA} onChange={(e) => handleStepChange(i, 'optionA', e.target.value)} disabled={saving} />
                      </div>
                      <div>
                          <label htmlFor={`edit-step-optB-${i}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Pilihan B</label>
                          <input id={`edit-step-optB-${i}`} type="text" className="input input-sm w-full dark:bg-gray-600 dark:text-white dark:border-gray-500" placeholder="Pilihan B" value={stepData.optionB} onChange={(e) => handleStepChange(i, 'optionB', e.target.value)} disabled={saving} />
                      </div>
                      <div>
                          <label htmlFor={`edit-step-optC-${i}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Pilihan C</label>
                          <input id={`edit-step-optC-${i}`} type="text" className="input input-sm w-full dark:bg-gray-600 dark:text-white dark:border-gray-500" placeholder="Pilihan C" value={stepData.optionC} onChange={(e) => handleStepChange(i, 'optionC', e.target.value)} disabled={saving} />
                      </div>
                      <div>
                          <label htmlFor={`edit-step-correct-${i}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Jawaban Benar</label>
                          <select id={`edit-step-correct-${i}`} className="input input-sm w-full dark:bg-gray-600 dark:text-white dark:border-gray-500" value={stepData.correctAnswer} onChange={(e) => handleStepChange(i, 'correctAnswer', e.target.value)} disabled={saving}>
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
              onClick={handleUpdateCourse}
              className="btn w-full py-2.5 mt-6"
              disabled={saving || loading}
            >
              {saving ? 'Memperbarui...' : (loading ? 'Memuat...' : 'Simpan Perubahan')}
            </button>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
