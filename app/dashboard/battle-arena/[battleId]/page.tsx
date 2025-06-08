'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

// Tipe data untuk memastikan konsistensi
interface Profile { id: string; kelas: string; }
interface Question { id: string; question: string; option_a: string; option_b: string; option_c: string; }

export default function BattlePage() {
  const { battleId } = useParams();
  const router = useRouter();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);

  useEffect(() => {
    const loadPageData = async () => {
      if (typeof battleId !== 'string' || !battleId) { return; }
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: profileData } = await supabase.from('profiles').select('id, kelas').eq('id', user.id).single();
      setCurrentUser(profileData);
      const { data: battle } = await supabase.from('battles').select('*').eq('id', battleId).single();
      if (!battle || battle.status === 'completed' || (battle.challenger_id === user.id && battle.challenger_answers) || (battle.opponent_id === user.id && battle.opponent_answers)) {
        alert("Pertarungan ini tidak valid atau sudah Anda kerjakan.");
        router.push('/dashboard/battle-arena');
        return;
      }
      const { data: questionsData } = await supabase.from('question_bank').select('*').in('id', battle.question_ids);
      if (!questionsData || questionsData.length === 0) {
        setErrorState("Gagal memuat soal untuk pertarungan ini.");
        setLoading(false);
        return;
      }
      setQuestions(questionsData.sort(() => Math.random() - 0.5));
      setAnswers(new Array(questionsData.length).fill(null));
      setLoading(false);
    };
    loadPageData();
  }, [battleId, router]);

  const handleNextQuestion = () => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = selectedOption;
    setAnswers(newAnswers);
    setSelectedOption(null);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmitAnswers(newAnswers);
    }
  };

  const handleSubmitAnswers = async (finalAnswers: (string | null)[]) => {
    if (!currentUser || typeof battleId !== 'string') {
      alert("Gagal mengidentifikasi pengguna atau pertarungan. Coba lagi.");
      return;
    }
    setLoading(true);

    // --- PERBAIKAN PANGGILAN RPC ---
    const { data, error } = await supabase.rpc('handle_battle_action', {
      action: 'SUBMIT_ANSWERS',
      p_challenger_id: currentUser.id,
      p_challenger_kelas: currentUser.kelas,
      p_battle_id: battleId,
      p_answers: finalAnswers,
      p_opponent_id: null,
      p_subject_id: null
    });
    
    if (error || (data && data.status === 'error')) {
        alert(data?.message || error?.message || 'Terjadi kesalahan.');
        router.push('/dashboard/battle-arena');
    } else {
        setCorrectAnswers(data.correct_answers || []);
        setShowResults(true);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-xl">Mempersiapkan Pertarungan...</div>;
  if (errorState) return <div className="p-8 max-w-2xl mx-auto text-center card mt-10"><h1 className="text-2xl font-bold text-red-500 mb-4">Terjadi Kesalahan</h1><p className="mb-6">{errorState}</p><button onClick={() => router.push('/dashboard/battle-arena')} className="btn btn-primary">Kembali ke Arena</button></div>;
  if (showResults) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">Hasil Jawabanmu</h1>
        <div className="space-y-4">
          {questions.map((q, index) => {
            const userAnswer = answers[index];
            const correctAnswer = correctAnswers[index];
            const isCorrect = userAnswer === correctAnswer;
            return (
              <div key={q.id} className={`p-4 rounded-lg ${isCorrect ? 'bg-green-100 dark:bg-green-900/50 border-green-300' : 'bg-red-100 dark:bg-red-900/50 border-red-300'} border`}>
                <p className="font-semibold">{index + 1}. {q.question}</p>
                <p className={`text-sm mt-2 ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  Jawabanmu: <strong>{userAnswer || "(Tidak Dijawab)"}</strong>. 
                  {!isCorrect && <span> Jawaban Benar: <strong>{correctAnswer}</strong></span>}
                </p>
              </div>
            )
          })}
        </div>
        <button onClick={() => router.push('/dashboard/battle-arena')} className="btn btn-primary w-full mt-8">Kembali ke Arena</button>
      </div>
    )
  }
  if (questions.length === 0) return <div className="p-6 text-center text-xl">Gagal memuat soal pertarungan.</div>;

  const currentQuestion = questions[currentQuestionIndex];
  const options = [ { id: 'A', text: currentQuestion.option_a }, { id: 'B', text: currentQuestion.option_b }, { id: 'C', text: currentQuestion.option_c }, ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="card w-full max-w-2xl">
        <div className="mb-4 text-center"><p className="text-sm text-gray-500">Pertanyaan {currentQuestionIndex + 1} dari {questions.length}</p><div className="w-full bg-slate-200 rounded-full h-2.5 mt-2"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div></div></div>
        <h2 className="text-2xl font-semibold my-6 text-center">{currentQuestion.question}</h2>
        <div className="space-y-3">
          {options.map(opt => (
            <button key={opt.id} onClick={() => setSelectedOption(opt.id)} className={`block w-full text-left p-4 rounded-lg border-2 transition-all ${selectedOption === opt.id ? 'bg-sky-500/20 border-sky-500 ring-2 ring-sky-500' : 'border-[var(--border)] hover:border-sky-500'}`}>
              <span className="font-bold mr-2">{opt.id}.</span>{opt.text}
            </button>
          ))}
        </div>
        <button onClick={handleNextQuestion} disabled={!selectedOption} className="btn btn-primary w-full mt-8">
          {currentQuestionIndex < questions.length - 1 ? 'Selanjutnya' : 'Selesaikan Pertarungan'}
        </button>
      </div>
    </div>
  )
}
