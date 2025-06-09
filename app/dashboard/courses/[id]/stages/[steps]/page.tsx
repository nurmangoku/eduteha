'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// --- Tipe Step (tidak ada perubahan) ---
interface Step {
  id: string; title: string; content: string; is_video: boolean; question: string;
  option_a: string; option_b: string; option_c: string; correct_answer: string;
}

const CenteredMessage = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center justify-center min-h-[60vh] text-center p-6">
      <p className="text-xl text-gray-400">{children}</p>
    </div>
);

const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    let videoId = urlObj.searchParams.get('v') || (urlObj.hostname === 'youtu.be' ? urlObj.pathname.slice(1) : null);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch (error) {
    console.error("Invalid URL for YouTube embed:", error);
    return null;
  }
};

export default function StagePage() {
  const router = useRouter()
  const params = useParams()

  const courseId = typeof params.id === 'string' ? params.id : ''
  const stepParam = typeof params.steps === 'string' ? params.steps : ''
  const stepNumber = parseInt(stepParam)

  const [step, setStep] = useState<Step | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [selected, setSelected] = useState('')
  const [completed, setCompleted] = useState(false)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasNextStep, setHasNextStep] = useState(false)
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- PERBAIKAN LOGIKA PENGAMBILAN DATA ---
  const loadData = useCallback(async (currentUserId: string) => {
    setLoading(true);
    const { data: stepData } = await supabase.from('course_steps').select('*').eq('course_id', courseId).eq('step_number', stepNumber).single();
    if (!stepData) {
      alert('Tahap tidak ditemukan');
      return router.push(`/dashboard/courses/${courseId}`);
    }
    setStep(stepData);

    // Cek apakah ini tahap materi (tanpa soal) atau tahap kuis
    const isContentOnlyStage = !stepData.question;

    if (isContentOnlyStage) {
      // Jika ini hanya materi, langsung tandai sebagai selesai (is_correct: true)
      await supabase.from('course_progress').upsert({
        user_id: currentUserId,
        course_id: courseId,
        step_number: stepNumber,
        answer: 'viewed', // Tandai sebagai sudah dilihat
        is_correct: true
      }, { onConflict: 'user_id, course_id, step_number' });
      
      setCompleted(true);
      setCorrect(true);
    } else {
      // Jika ini tahap kuis, cek progres yang sudah ada
      const { data: progressData } = await supabase
        .from('course_progress')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', currentUserId)
        .eq('step_number', stepNumber)
        .limit(1);

      if (progressData && progressData.length > 0) {
        const progress = progressData[0];
        setCompleted(true);
        setSelected(progress.answer);
        setCorrect(progress.is_correct);
      }
    }
    
    // Pengecekan tahap selanjutnya tetap sama
    const { data: nextStepsData } = await supabase
      .from('course_steps')
      .select('id')
      .eq('course_id', courseId)
      .eq('step_number', stepNumber + 1)
      .limit(1);

    setHasNextStep(nextStepsData ? nextStepsData.length > 0 : false);
    setLoading(false);
  }, [courseId, stepNumber, router]);
  // ----------------------------------------------------

  useEffect(() => {
    const fetchUserAndLoadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);
      loadData(user.id);
    }
    fetchUserAndLoadData();
  }, [loadData, router]);

  const handleSubmit = async () => {
    if (!step || !selected || !userId) {
      alert("Terjadi kesalahan: data tidak lengkap. Coba segarkan halaman.");
      return;
    }

    setIsSubmitting(true);

    try {
      const isCorrect = selected.trim().toUpperCase() === step.correct_answer.trim().toUpperCase();
      
      const { error } = await supabase.from('course_progress').upsert({
        user_id: userId, course_id: courseId, step_number: stepNumber,
        answer: selected, is_correct: isCorrect,
      }, { onConflict: 'user_id, course_id, step_number' });

      if (error) { throw error; }

      setCompleted(true);
      setCorrect(isCorrect);

      if (isCorrect) {
        const { data: profile } = await supabase.from('profiles').select('xp, badges').eq('id', userId).single();
        if (profile) {
          const newXp = (profile.xp ?? 0) + 10;
          const badges = profile.badges ?? [];
          if (newXp >= 50 && !badges.includes('Pemula')) badges.push('Pemula');
          if (newXp >= 100 && !badges.includes('Pejuang Belajar')) badges.push('Pejuang Belajar');
          await supabase.from('profiles').update({ xp: newXp, badges: badges }).eq('id', userId);
        }
      }
    } catch (error: any) {
      console.error("Error submitting progress:", error);
      alert(`Gagal menyimpan progres Anda: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRetry = () => {
    setSelected('');
    setCorrect(null);
    setCompleted(false);
  };

  const getOptionText = (optionKey: 'A' | 'B' | 'C'): string => {
    if (!step) return '';
    switch (optionKey) {
      case 'A': return step.option_a;
      case 'B': return step.option_b;
      case 'C': return step.option_c;
      default: return '';
    }
  };

  if (loading) return <CenteredMessage>🔄 Memuat tahap...</CenteredMessage>;
  if (!step) return <CenteredMessage>Tahap tidak ditemukan.</CenteredMessage>;

  const embedUrl = step.is_video ? getYouTubeEmbedUrl(step.content) : null;

  return (
    <div className="max-w-3xl mx-auto my-10 p-6 md:p-8 bg-[var(--card)] rounded-xl shadow-2xl">
      <h2 className="text-3xl font-bold">{step.title}</h2>
      {step.is_video && embedUrl ? (
        <div className="relative w-full pt-[56.25%] my-6 rounded-lg overflow-hidden shadow-lg">
          <iframe src={embedUrl} title={step.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="absolute top-0 left-0 w-full h-full"></iframe>
        </div>
      ) : (
        <p className="text-base text-gray-400 mt-2 mb-8">{step.content}</p>
      )}

      {step.question && (
        <div className="border-t border-[var(--border)] pt-6">
          <p className="text-lg font-semibold mb-4">{step.question}</p>
          <div className="space-y-4">
            {(['A', 'B', 'C'] as const).map((opt) => (
              <label key={opt} className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${selected === opt ? 'bg-sky-500/20 border-sky-500 ring-2 ring-sky-500' : 'border-[var(--border)] hover:border-sky-500'} ${completed ? 'cursor-not-allowed opacity-70' : ''}`}>
                <input type="radio" name="answer" value={opt} checked={selected === opt} onChange={() => setSelected(opt)} disabled={completed} className="hidden" />
                <span className="font-bold text-lg mr-4">{opt}.</span>
                <span className="text-base">{getOptionText(opt)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        {step.question ? (
          <>
            {!completed ? (
              <button className="btn btn-primary w-full text-lg" onClick={handleSubmit} disabled={!selected || isSubmitting}>
                {isSubmitting ? 'Mengirim...' : 'Kirim Jawaban'}
              </button>
            ) : (
              <div className={`p-4 rounded-md text-center font-medium border ${correct ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                <span>{correct ? '✅ Jawaban Anda benar!' : '❌ Jawaban Anda salah. Silakan coba lagi.'}</span>
              </div>
            )}
            {completed && (
              <div className="mt-6 text-center">
                {correct ? (
                  hasNextStep ? (
                    <button className="btn btn-success" onClick={() => router.push(`/dashboard/courses/${courseId}/stages/${stepNumber + 1}`)}>Lanjut ke Tahap Berikutnya 👉</button>
                  ) : (
                    <button className="btn btn-primary" onClick={() => router.push(`/dashboard/courses`)}>🎉 Selesai! Kembali ke Daftar Kursus</button>
                  )
                ) : (
                  <button onClick={handleRetry} className="btn btn-primary">Coba Lagi</button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            {hasNextStep ? (
              <button className="btn btn-success" onClick={() => router.push(`/dashboard/courses/${courseId}/stages/${stepNumber + 1}`)}>Lanjut ke Tahap Berikutnya 👉</button>
            ) : (
              <button className="btn btn-primary" onClick={() => router.push(`/dashboard/courses`)}>🎉 Selesai! Kembali ke Daftar Kursus</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
