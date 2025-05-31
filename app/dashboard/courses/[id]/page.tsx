'use client'
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import RoleGuard from '@/components/RoleGuard';
import Link from 'next/link'; // <-- Tambahkan impor ini
import { Lock, CheckCircle, ArrowLeft, ArrowRight, HelpCircle, Video, FileText } from 'lucide-react';

interface Step {
  id: string;
  step_number: number;
  content: string;
  is_video: boolean;
  question?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  correct_answer?: 'A' | 'B' | 'C';
}

interface Course {
  id: string;
  title: string;
  description: string;
}

interface Progress {
  stage_completed: number;
  is_course_completed: boolean;
}

export default function StudentCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userProgress, setUserProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<string | null>(null);
  const [isMcqSubmitted, setIsMcqSubmitted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchCourseAndProgress = useCallback(async () => {
    if (!courseId || !userId) return;

    setLoading(true);
    setError(null);
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      if (courseError) throw courseError;
      if (!courseData) throw new Error('Kursus tidak ditemukan.');
      setCourse(courseData);

      const { data: stepsData, error: stepsError } = await supabase
        .from('course_steps')
        .select('*')
        .eq('course_id', courseId)
        .order('step_number', { ascending: true });
      if (stepsError) throw stepsError;
      setSteps(stepsData || []);

      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select('stage_completed, is_course_completed')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();
      
      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }
      setUserProgress(progressData || { stage_completed: 0, is_course_completed: false });
      setCurrentStepIndex(progressData?.stage_completed || 0);

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Gagal memuat data kursus.');
    } finally {
      setLoading(false);
    }
  }, [courseId, userId]);

  useEffect(() => {
    const getUserId = async () => {
        const {data: {user}} = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
        } else {
            router.push('/login');
        }
    }
    getUserId();
  }, [router]);

  useEffect(() => {
    if (userId) {
        fetchCourseAndProgress();
    }
  }, [userId, fetchCourseAndProgress]);

  useEffect(() => {
    setSelectedAnswer(null);
    setAnswerFeedback(null);
    setIsMcqSubmitted(false);
  }, [currentStepIndex]);

  const currentDisplayedStep = steps[currentStepIndex];
  const isStepMcq = currentDisplayedStep?.question && currentDisplayedStep?.option_a;
  const isCurrentStepMcqCompleted = userProgress ? currentStepIndex < userProgress.stage_completed : false;

  const handleAnswerSubmit = async () => {
    if (!selectedAnswer || !currentDisplayedStep || !currentDisplayedStep.correct_answer || !userId) return;

    setIsMcqSubmitted(true);
    const isCorrect = selectedAnswer === currentDisplayedStep.correct_answer;

    if (isCorrect) {
      setAnswerFeedback('Jawaban Benar! 🎉 Silakan lanjut ke tahap berikutnya.');
      const nextStageCompleted = currentStepIndex + 1;
      let newIsCourseCompleted = userProgress?.is_course_completed || false;
      if (nextStageCompleted >= steps.length) {
        newIsCourseCompleted = true;
      }

      const { error: progressUpdateError } = await supabase
        .from('progress')
        .upsert({
          user_id: userId,
          course_id: courseId,
          stage_completed: nextStageCompleted,
          updated_at: new Date().toISOString(),
          is_course_completed: newIsCourseCompleted
        }, { onConflict: 'user_id,course_id' });

      if (progressUpdateError) {
        console.error("Gagal update progres:", progressUpdateError);
        setAnswerFeedback(`Gagal menyimpan progres: ${progressUpdateError.message}`);
      } else {
         setUserProgress(prev => ({
            ...prev,
            stage_completed: nextStageCompleted,
            is_course_completed: newIsCourseCompleted
        }));
      }
    } else {
      setAnswerFeedback('Jawaban Salah. Coba perhatikan kembali materinya. Anda tidak dapat melanjutkan sebelum menjawab benar.');
    }
  };

  const navigateStep = (direction: 'next' | 'prev') => {
    setAnswerFeedback(null);
    setSelectedAnswer(null);
    setIsMcqSubmitted(false);

    if (direction === 'next') {
      if (!isStepMcq || (userProgress && currentStepIndex < userProgress.stage_completed) || (userProgress?.is_course_completed)) {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1);
        }
      } else {
        alert("Anda harus menyelesaikan soal ini dengan benar untuk melanjutkan.");
      }
    } else if (direction === 'prev') {
      if (currentStepIndex > 0) {
        setCurrentStepIndex(currentStepIndex - 1);
      }
    }
  };
  
  const isCourseCompletedOverall = userProgress?.is_course_completed || false;

  if (loading) return <div className="p-6 text-center">🔄 Memuat kursus...</div>;
  if (error) return <div className="p-6 text-center text-red-500">⚠️ {error}</div>;
  if (!course || !currentDisplayedStep || !userProgress) return <div className="p-6 text-center">Data kursus tidak lengkap atau tidak ada progres.</div>;

  const disableMcqSubmission = isCourseCompletedOverall || (isCurrentStepMcqCompleted && ! (isMcqSubmitted && selectedAnswer === currentDisplayedStep.correct_answer) );

  // Perbaikan Error 1: Pastikan kondisi untuk disabled adalah boolean murni
  const isNextButtonDisabled = Boolean(
    currentStepIndex === steps.length - 1 || 
    loading || 
    (isStepMcq && !(userProgress.stage_completed > currentStepIndex) && !isCourseCompletedOverall)
  );

  return (
    <RoleGuard allowedRoles={['murid']}>
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden">
          <div className="p-5 md:p-8">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{course.title}</h1>
                {isCourseCompletedOverall && (
                    <span className="flex items-center text-sm bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100 font-semibold px-3 py-1 rounded-full">
                        <CheckCircle size={16} className="mr-1.5" /> Selesai
                    </span>
                )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Tahap {currentDisplayedStep.step_number} dari {steps.length}</p>

            <div className="prose dark:prose-invert max-w-none mb-6 bg-gray-50 dark:bg-gray-700/60 p-4 rounded-md">
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                {currentDisplayedStep.is_video ? <Video size={20} className="mr-2 text-red-500"/> : <FileText size={20} className="mr-2 text-blue-500"/>}
                Materi Tahap {currentDisplayedStep.step_number}
              </h3>
              {currentDisplayedStep.is_video ? (
                currentDisplayedStep.content ? (
                  <div className="aspect-video">
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src={currentDisplayedStep.content.replace("watch?v=", "embed/")}
                        title={`Video Tahap ${currentDisplayedStep.step_number}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                    ></iframe>
                  </div>
                ) : <p className="text-gray-500 italic">Tidak ada video untuk tahap ini.</p>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: currentDisplayedStep.content.replace(/\n/g, '<br />') }} />
              )}
            </div>

            {isStepMcq && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-md font-semibold mb-3 flex items-center text-gray-700 dark:text-gray-300">
                    <HelpCircle size={18} className="mr-2 text-purple-500"/>
                    Pertanyaan Tahap {currentDisplayedStep.step_number}:
                </h4>
                <p className="mb-4 text-gray-800 dark:text-gray-100">{currentDisplayedStep.question}</p>
                <div className="space-y-3">
                  {['A', 'B', 'C'].map(optionKey => {
                    const optionValue = currentDisplayedStep[`option_${optionKey.toLowerCase()}` as keyof Step];
                    if (!optionValue) return null;
                    
                    let buttonClass = "w-full text-left p-3 border rounded-lg transition-colors duration-150 ";
                    if (isMcqSubmitted || isCourseCompletedOverall || isCurrentStepMcqCompleted) {
                        if (optionKey === currentDisplayedStep.correct_answer) {
                            buttonClass += "bg-green-100 border-green-400 text-green-700 dark:bg-green-700/50 dark:border-green-500 dark:text-green-200";
                        } else if (optionKey === selectedAnswer && selectedAnswer !== currentDisplayedStep.correct_answer) {
                            buttonClass += "bg-red-100 border-red-400 text-red-700 dark:bg-red-700/50 dark:border-red-500 dark:text-red-200";
                        } else {
                             buttonClass += "bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 opacity-75";
                        }
                    } else {
                         buttonClass += selectedAnswer === optionKey 
                            ? "bg-blue-500 border-blue-600 text-white dark:bg-blue-600 dark:border-blue-700" 
                            : "bg-white hover:bg-gray-50 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600";
                    }

                    return (
                      <button
                        key={optionKey}
                        onClick={() => setSelectedAnswer(optionKey as 'A' | 'B' | 'C')}
                        disabled={isMcqSubmitted || isCourseCompletedOverall || isCurrentStepMcqCompleted}
                        className={buttonClass}
                      >
                        <strong>{optionKey}.</strong> {optionValue}
                      </button>
                    );
                  })}
                </div>
                
                {!isCourseCompletedOverall && !isCurrentStepMcqCompleted && (
                  <button
                    onClick={handleAnswerSubmit}
                    disabled={!selectedAnswer || isMcqSubmitted || loading}
                    className="btn mt-6 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isMcqSubmitted ? (selectedAnswer === currentDisplayedStep.correct_answer ? "Benar!" : "Salah, Coba Lagi Nanti") : "Kirim Jawaban"}
                  </button>
                )}

                {answerFeedback && (
                  <p className={`mt-4 text-sm p-3 rounded-md ${selectedAnswer === currentDisplayedStep.correct_answer && isMcqSubmitted ? 'bg-green-50 text-green-700 dark:bg-green-700/30 dark:text-green-200' : 'bg-red-50 text-red-700 dark:bg-red-700/30 dark:text-red-200'}`}>
                    {answerFeedback}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 px-5 py-4 md:px-8 md:py-5 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigateStep('prev')}
                disabled={currentStepIndex === 0 || loading} // Baris sekitar 320-an
                className="btn bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100 disabled:opacity-50 flex items-center"
              >
                <ArrowLeft size={18} className="mr-2" />
                Sebelumnya
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Tahap {currentDisplayedStep.step_number}/{steps.length}
              </span>
              <button
                onClick={() => navigateStep('next')}
                disabled={isNextButtonDisabled} // <-- Menggunakan variabel yang sudah di-boolean-kan (Error 1)
                className="btn bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center"
              >
                {currentStepIndex === steps.length - 1 ? (isCourseCompletedOverall ? "Selesai" : (isStepMcq && userProgress.stage_completed > currentStepIndex ? "Selesai" : "Selesaikan Soal")) : "Lanjut"}
                <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          </div>
        </div>
        {/* Perbaikan Error 2 & 3: Komponen Link digunakan di sini */}
         <Link href="/dashboard/courses" className="block text-center mt-8 text-blue-600 hover:underline text-sm">
            Kembali ke Daftar Kursus
        </Link>
      </div>
    </RoleGuard>
  );
}