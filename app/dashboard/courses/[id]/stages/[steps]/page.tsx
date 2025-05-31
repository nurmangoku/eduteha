'use client'
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Pastikan path ini sesuai
import Link from 'next/link'; 
import { CheckCircle } from 'lucide-react';

interface Step {
  id: string;
  content: string;
  step_number: number;
  is_video?: boolean;
  question?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  correct_answer?: 'A' | 'B' | 'C'; // Atau correct_option sesuai DB Anda
}

export default function StagePage() {
  const router = useRouter();
  const params = useParams();
  
  // Mengambil parameter rute dengan benar sesuai definisi folder [id] dan [steps]
  // Di app.docx, halaman ini adalah /app/dashboard/courses/[id]/stages/[steps]/page.tsx
  // Jadi, params.id adalah courseId, dan params.steps adalah stepNumberParam
  const courseId = typeof params.id === 'string' ? params.id : undefined;
  const stepNumberParam = typeof params.steps === 'string' ? params.steps : undefined; // Menggunakan 'steps' dari params
  
  const [stepNumber, setStepNumber] = useState<number>(NaN); // State untuk stepNumber yang sudah di-parse

  const [step, setStep] = useState<Step | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStage5AutoCompleted, setIsStage5AutoCompleted] = useState(false);

  useEffect(() => {
    // Parse stepNumberParam ke integer saat komponen dimuat atau stepNumberParam berubah
    if (stepNumberParam) {
      const parsedStep = parseInt(stepNumberParam, 10);
      setStepNumber(parsedStep); // Bisa NaN jika parsing gagal
    } else {
      setStepNumber(NaN); // Jika stepNumberParam tidak ada
    }
  }, [stepNumberParam]);


  const markStepAsCompleted = useCallback(async (
    currentUserId: string, 
    currentCourseId: string, 
    currentStepNumber: number, 
    isCorrectAnswer: boolean | null, 
    answerGiven: string | null = null
  ) => {
    // Validasi di awal fungsi
    if (!currentUserId || !currentCourseId || isNaN(currentStepNumber)) {
        console.error("markStepAsCompleted: missing IDs or invalid stepNumber", { currentUserId, currentCourseId, currentStepNumber });
        // Tidak throw error di sini, tapi kembalikan status gagal
        return false; 
    }

    try {
        const { error: upsertError } = await supabase.from('course_progress').upsert({
            user_id: currentUserId,
            course_id: currentCourseId,
            step_number: currentStepNumber,
            answer: answerGiven,
            is_correct: isCorrectAnswer,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,course_id,step_number' }); // Pastikan constraint ini ada

        if (upsertError) throw new Error(`Gagal menyimpan progres tahap: ${upsertError.message}`);
        
        setIsCompleted(true);
        if (isCorrectAnswer !== null) setIsCorrect(isCorrectAnswer);

        // Cek dan update progres kursus keseluruhan
        const { data: courseStepsData, error: stepsSelectError } = await supabase
            .from('course_steps')
            .select('step_number', { count: 'exact' }) // Hitung jumlah total tahap
            .eq('course_id', currentCourseId);

        if (stepsSelectError) throw new Error("Gagal mengambil total tahap kursus.");
        
        const totalStepsInCourse = courseStepsData?.length || 0; // Atau gunakan count jika ada

        // Ambil semua progres tahap yang sudah benar atau tahap 5 untuk kursus ini
        const { data: allCorrectOrStage5Progress, error: allProgressError } = await supabase
            .from('course_progress')
            .select('step_number, is_correct')
            .eq('user_id', currentUserId)
            .eq('course_id', currentCourseId)
            .or('is_correct.is.true,step_number.eq.5'); // Tahap benar ATAU itu adalah tahap 5

        if (allProgressError) throw new Error("Gagal mengambil semua progres tahap untuk cek penyelesaian.");

        let maxCompletedStageForOverallProgress = 0;
        let allRequiredStepsDone = true;
        const completedStepNumbers = new Set(allCorrectOrStage5Progress?.map(p => p.step_number) || []);


        if (totalStepsInCourse > 0) {
            for (let i = 1; i <= totalStepsInCourse; i++) {
                if (!completedStepNumbers.has(i)) { // Jika ada tahap yang belum ada di progress (dan bukan tahap 5 yang auto)
                    if (i < 5) { // Tahap 1-4 wajib ada dan benar
                        allRequiredStepsDone = false;
                        break;
                    } else if (i === 5 && !completedStepNumbers.has(5)) { // Tahap 5 harus ada di progress (meskipun auto)
                        allRequiredStepsDone = false;
                        break;
                    }
                }
                // Tentukan stage_completed tertinggi untuk tabel 'progress'
                if (completedStepNumbers.has(i)) {
                    maxCompletedStageForOverallProgress = Math.max(maxCompletedStageForOverallProgress, i);
                }
            }
        } else { // Tidak ada step di kursus
            allRequiredStepsDone = true; // Anggap selesai jika tidak ada step
            maxCompletedStageForOverallProgress = 0;
        }


        await supabase.from('progress').upsert({
            user_id: currentUserId,
            course_id: currentCourseId,
            stage_completed: maxCompletedStageForOverallProgress,
            is_course_completed: allRequiredStepsDone,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,course_id' });

        return true; 
    } catch (err:any) {
        console.error("Error in markStepAsCompleted:", err);
        // setError(err.message || "Gagal menyimpan progres tahap."); // Bisa di set di sini jika ingin tampil di UI
        throw err; // Lempar error agar bisa ditangkap oleh pemanggil jika perlu
    }
  }, []); // useCallback dependencies kosong karena semua data dilewatkan sebagai argumen


  useEffect(() => {
    const loadStageData = async () => {
      setLoading(true);
      setError(null);
      setIsStage5AutoCompleted(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        setLoading(false);
        return;
      }
      // userId akan di-set di sini dan digunakan oleh markStepAsCompleted jika dipanggil
      const currentUserId = user.id; 
      setUserId(currentUserId);


      // Validasi courseId dan stepNumber yang sudah di-parse
      if (!courseId || isNaN(stepNumber)) {
        setError(isNaN(stepNumber) ? "Nomor tahap tidak valid dari URL." : "ID Kursus tidak valid dari URL.");
        setLoading(false);
        console.error("Invalid parameters for loading stage:", { courseId, stepNumberParam, parsedStepNumber: stepNumber });
        return;
      }

      try {
        const { data: stepData, error: stepError } = await supabase
          .from('course_steps')
          .select('*')
          .eq('course_id', courseId)
          .eq('step_number', stepNumber)
          .single();

        if (stepError) throw new Error(`Gagal memuat data tahap: ${stepError.message}`);
        if (!stepData) throw new Error('Tahap kursus tidak ditemukan.');
        
        // Pastikan nama kolom correct_answer/correct_option konsisten
        const mappedStepData: Step = {
            ...stepData,
            correct_answer: stepData.correct_answer || stepData.correct_option,
        };
        setStep(mappedStepData);

        const { data: progress, error: progressError } = await supabase
          .from('course_progress')
          .select('answer, is_correct')
          .eq('course_id', courseId)
          .eq('user_id', currentUserId)
          .eq('step_number', stepNumber)
          .single();

        if (progressError && progressError.code !== 'PGRST116') {
            throw new Error(`Gagal memuat progres tahap: ${progressError.message}`);
        }

        if (progress) {
          setIsCompleted(true);
          setSelectedAnswer(progress.answer || '');
          setIsCorrect(progress.is_correct);
        } else {
          if (stepNumber === 5) {
            // Panggil markStepAsCompleted dengan ID yang sudah valid
            const marked = await markStepAsCompleted(currentUserId, courseId, stepNumber, true, 'viewed_optional_stage_5');
            if (marked) setIsStage5AutoCompleted(true);
          } else {
            setIsCompleted(false);
            setSelectedAnswer('');
            setIsCorrect(null);
          }
        }
      } catch (err: any) {
        console.error("Error in loadStageData:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Hanya jalankan loadStageData jika stepNumber sudah valid (bukan NaN)
    if (!isNaN(stepNumber)) {
        loadStageData();
    } else if (stepNumberParam !== undefined) { // Jika stepNumberParam ada tapi menghasilkan NaN
        setError("Nomor tahap tidak valid pada URL.");
        setLoading(false);
    }
    // Jika stepNumberParam undefined, tunggu sampai useEffect parsing mengaturnya.
  }, [courseId, stepNumberParam, stepNumber, router, markStepAsCompleted]); // Tambahkan stepNumber

  const handleSubmitAnswer = async () => {
    if (!step || !selectedAnswer || !userId || !courseId || isNaN(stepNumber) || stepNumber === 5) {
        return;
    }
    // Pastikan step.correct_answer ada dan sesuai dengan nama kolom di DB
    const currentIsCorrect = selectedAnswer === step.correct_answer; 
    try {
      await markStepAsCompleted(userId, courseId, stepNumber, currentIsCorrect, selectedAnswer);
    } catch (err: any) {
         alert(err.message || "Terjadi kesalahan saat menyimpan jawaban.");
    }
  };

  if (loading) return <p className="p-6 text-center text-gray-600 dark:text-gray-400">🔄 Memuat tahap...</p>;
  if (error) return <p className="p-6 text-center text-red-500 dark:text-red-400">⚠️ {error}</p>;
  if (!step) return <p className="p-6 text-center text-gray-600 dark:text-gray-400">Tahap tidak ditemukan atau ID tidak valid.</p>;

  const questionText = step.question || "Tidak ada pertanyaan untuk tahap ini.";
  const options = [
    { key: 'A', value: step.option_a },
    { key: 'B', value: step.option_b },
    { key: 'C', value: step.option_c },
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6">
        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <Link href={`/dashboard/courses/${courseId}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400 mb-2 inline-block">
                ← Kembali ke Daftar Tahapan
            </Link>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                Tahap {step.step_number}: {step.question || step.content?.substring(0,30) + (step.content?.length > 30 ? "..." : "") || "Tahap Opsional"}
            </h2>
        </div>

        <div className="prose dark:prose-invert max-w-none mb-6">
          <h3 className="text-lg font-semibold mb-2">Materi:</h3>
          {step.is_video && step.content ? (
            <div className="aspect-video">
              <iframe 
                  width="100%" 
                  height="100%" 
                  src={step.content.replace("watch?v=", "embed/")}
                  title={`Video Tahap ${step.step_number}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
              ></iframe>
            </div>
          ) : step.content ? (
            <div dangerouslySetInnerHTML={{ __html: step.content.replace(/\n/g, '<br />') }} />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">Tidak ada materi untuk tahap ini (opsional).</p>
          )}
        </div>
        
        {stepNumber === 5 ? (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {isStage5AutoCompleted || isCompleted ? (
              <div className="flex items-center text-green-600 dark:text-green-400">
                <CheckCircle size={20} className="mr-2" />
                <p className="font-semibold">Tahap ini (opsional) telah ditandai selesai.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Memproses tahap opsional...</p>
            )}
          </div>
        ) : (
          <>
            {step.question && step.option_a && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Soal:</p>
                <p className="text-gray-800 dark:text-gray-100 mb-4">{questionText}</p>
                <div className="space-y-3">
                  {options.map(opt => {
                    if (!opt.value) return null;
                    
                    let buttonClass = "w-full text-left p-3 border rounded-lg transition-colors duration-150 ";
                    if (isCompleted) {
                        if (opt.key === step.correct_answer) {
                            buttonClass += "bg-green-100 border-green-400 text-green-700 dark:bg-green-700/50 dark:border-green-500 dark:text-green-200";
                        } else if (opt.key === selectedAnswer && selectedAnswer !== step.correct_answer) {
                            buttonClass += "bg-red-100 border-red-400 text-red-700 dark:bg-red-700/50 dark:border-red-500 dark:text-red-200";
                        } else {
                            buttonClass += "bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 opacity-75";
                        }
                    } else {
                        buttonClass += selectedAnswer === opt.key 
                            ? "bg-blue-500 border-blue-600 text-white dark:bg-blue-600 dark:border-blue-700" 
                            : "bg-white hover:bg-gray-50 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600";
                    }

                    return (
                      <label key={opt.key} className={`block cursor-pointer ${ (isCompleted) ? 'pointer-events-none' : ''}`}>
                        <input
                          type="radio"
                          name="answer"
                          value={opt.key}
                          checked={selectedAnswer === opt.key}
                          onChange={() => setSelectedAnswer(opt.key)}
                          disabled={isCompleted}
                          className="sr-only peer"
                        />
                        <div className={buttonClass}>
                          <strong>{opt.key}.</strong> {opt.value}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {!isCompleted && (
                  <button 
                    className="btn mt-6 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50" 
                    onClick={handleSubmitAnswer} 
                    disabled={!selectedAnswer || loading}
                  >
                    Kirim Jawaban
                  </button>
                )}

                {isCompleted && isCorrect !== null && (
                  <p className={`mt-4 text-md font-semibold p-3 rounded-md ${isCorrect ? 'bg-green-50 text-green-700 dark:bg-green-700/30 dark:text-green-200' : 'bg-red-50 text-red-700 dark:bg-red-700/30 dark:text-red-200'}`}>
                    {isCorrect ? '✅ Jawaban Anda benar!' : `❌ Jawaban Anda salah. Jawaban yang benar adalah: ${step.correct_answer || 'Tidak ditentukan'}`}
                  </p>
                )}
              </div>
            )}
            {!step.question && stepNumber < 5 && <p className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">Tidak ada soal untuk tahap ini.</p>}
          </>
        )}
      </div>
    </div>
  );
}

