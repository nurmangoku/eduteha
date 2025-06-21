'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; // Sesuaikan path jika perlu
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link'; // <-- PERBAIKAN: Import Link ditambahkan di sini
import { Loader, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// --- DEFINISI TIPE DATA ---

interface ContentItem {
    type: 'text' | 'image' | 'video';
    value: string;
}

interface StepData {
    id: string;
    course_id: string;
    step_number: number;
    title: string;
    content: ContentItem[] | null;
    question: string | null;
    options: { [key: string]: string } | null; // e.g., { "A": "Jawaban A", "B": "Jawaban B" }
    correct_answer: string | null;
}

// --- KOMPONEN HELPER ---

// Komponen untuk pesan di tengah layar
const CenteredMessage = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center justify-center min-h-[60vh] text-center p-6">
        <p className="text-xl text-gray-400">{children}</p>
    </div>
);

// Helper function untuk mengubah URL YouTube menjadi URL embed
const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const videoId = urlObj.searchParams.get('v') || (urlObj.hostname === 'youtu.be' ? urlObj.pathname.slice(1) : null);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url; // Fallback to original url if not a standard YouTube link
  } catch (error) {
    // If URL is not valid, it might be a direct embed link already
    return url;
  }
};


// --- KOMPONEN UTAMA ---

export default function CourseStagePage() {
    const router = useRouter();
    const params = useParams();
    
    const courseId = params.id as string;
    const stepNumber = parseInt(params.steps as string, 10);

    const [step, setStep] = useState<StepData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [userId, setUserId] = useState<string | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string>('');
    const [isCompleted, setIsCompleted] = useState<boolean>(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [hasNextStep, setHasNextStep] = useState<boolean>(false);

    // Fungsi untuk mengambil data utama
    const loadStepData = useCallback(async (currentUserId: string) => {
        if (!courseId || isNaN(stepNumber)) {
            setError("ID Kursus atau nomor tahapan tidak valid.");
            setLoading(false);
            return;
        }

        try {
            // 1. Ambil data tahapan saat ini
            const { data: stepData, error: stepError } = await supabase
                .from('course_steps')
                .select('*')
                .eq('course_id', courseId)
                .eq('step_number', stepNumber)
                .single();

            if (stepError || !stepData) throw new Error("Tahapan ini tidak dapat ditemukan.");
            setStep(stepData as StepData);

            // 2. Cek apakah ada tahapan selanjutnya
            const { data: nextStepData } = await supabase
                .from('course_steps')
                .select('id')
                .eq('course_id', courseId)
                .eq('step_number', stepNumber + 1)
                .limit(1);
            setHasNextStep(!!nextStepData && nextStepData.length > 0);
            
            // 3. Cek progres pengguna
            const isContentOnlyStage = !stepData.question;
            if (isContentOnlyStage) {
                // Jika hanya materi, tandai otomatis selesai saat dilihat
                await supabase.from('course_progress').upsert({
                    user_id: currentUserId, course_id: courseId, step_number: stepNumber,
                    answer: 'viewed', is_correct: true
                }, { onConflict: 'user_id, course_id, step_number' });
                setIsCompleted(true);
                setIsCorrect(true);
            } else {
                // Jika ada soal, cek apakah sudah pernah dijawab
                const { data: progressData } = await supabase
                    .from('course_progress')
                    .select('*')
                    .eq('user_id', currentUserId)
                    .eq('course_id', courseId)
                    .eq('step_number', stepNumber)
                    .single();
                
                if (progressData) {
                    setIsCompleted(true);
                    setSelectedAnswer(progressData.answer);
                    setIsCorrect(progressData.is_correct);
                }
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [courseId, stepNumber]);

    // Effect untuk mengambil data user dan tahapan
    useEffect(() => {
        const fetchUserAndLoadData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUserId(user.id);
            loadStepData(user.id);
        };
        fetchUserAndLoadData();
    }, [loadStepData, router]);

    const handleSubmit = async () => {
        if (!step || !selectedAnswer || !userId || !step.correct_answer) return;
        setIsSubmitting(true);

        try {
            const isAnswerCorrect = selectedAnswer.toUpperCase() === step.correct_answer.toUpperCase();
            setIsCorrect(isAnswerCorrect);
            setIsCompleted(true);

            // Simpan progres ke database
            const { error: upsertError } = await supabase.from('course_progress').upsert({
                user_id: userId, course_id: courseId, step_number: stepNumber,
                answer: selectedAnswer, is_correct: isAnswerCorrect,
            }, { onConflict: 'user_id, course_id, step_number' });

            if (upsertError) throw upsertError;

            // Tambah XP jika jawaban benar
            if (isAnswerCorrect) {
                const { data: profile } = await supabase.from('profiles').select('xp').eq('id', userId).single();
                if (profile) {
                    const newXp = (profile.xp || 0) + 10;
                    await supabase.from('profiles').update({ xp: newXp }).eq('id', userId);
                }
            }
        } catch (err: any) {
            alert(`Gagal menyimpan progres: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleRetry = () => {
        setSelectedAnswer('');
        setIsCorrect(null);
        setIsCompleted(false);
    };

    // --- RENDER LOGIC ---

    if (loading) return <CenteredMessage>🔄 Memuat materi...</CenteredMessage>;
    if (error) return <CenteredMessage>⚠️ {error}</CenteredMessage>;
    if (!step) return <CenteredMessage>Materi tidak ditemukan.</CenteredMessage>;

    return (
        <div className="max-w-3xl mx-auto my-10 p-6 md:p-8 card shadow-2xl">
            <h1 className="text-3xl font-bold mb-6">{step.title}</h1>

            {/* Render Konten Dinamis */}
            <div className="prose prose-lg dark:prose-invert max-w-none space-y-4 mb-8">
                {step.content?.map((item, index) => {
                    switch (item.type) {
                        case 'text':
                            return <p key={index}>{item.value}</p>;
                        case 'image':
                            return <img key={index} src={item.value} alt={`Materi gambar ${index + 1}`} className="rounded-lg shadow-md" />;
                        case 'video':
                            const embedUrl = getYouTubeEmbedUrl(item.value);
                            return embedUrl ? (
                                <div key={index} className="relative w-full pt-[56.25%] my-6 rounded-lg overflow-hidden shadow-lg">
                                    <iframe src={embedUrl} title={`Materi video ${index + 1}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="absolute top-0 left-0 w-full h-full"></iframe>
                                </div>
                            ) : null;
                        default:
                            return null;
                    }
                })}
            </div>

            {/* Render Soal Jika Ada */}
            {step.question && step.options && (
                <div className="border-t pt-6">
                    <p className="text-xl font-semibold mb-4">{step.question}</p>
                    <div className="space-y-4">
                        {Object.entries(step.options).map(([key, value]) => (
                            <label key={key} className={`flex items-center p-4 rounded-lg border-2 transition-all ${isCompleted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-sky-500'} ${selectedAnswer === key ? 'bg-sky-500/20 border-sky-500 ring-2 ring-sky-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                <input
                                    type="radio"
                                    name="answer"
                                    value={key}
                                    checked={selectedAnswer === key}
                                    onChange={(e) => setSelectedAnswer(e.target.value)}
                                    disabled={isCompleted}
                                    className="hidden"
                                />
                                <span className="font-bold text-lg mr-4">{key}.</span>
                                <span className="text-base">{value}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Render Tombol Aksi */}
            <div className="mt-8">
                {step.question && !isCompleted && (
                    <button className="btn btn-primary w-full text-lg" onClick={handleSubmit} disabled={!selectedAnswer || isSubmitting}>
                        {isSubmitting ? 'Memeriksa...' : 'Kirim Jawaban'}
                    </button>
                )}

                {isCompleted && (
                    <div className="text-center space-y-4">
                        {isCorrect !== null && step.question && (
                             <div className={`p-4 rounded-md font-medium border ${isCorrect ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                {isCorrect ? '✅ Jawaban Anda benar!' : '❌ Jawaban Anda salah.'}
                            </div>
                        )}
                       
                        {isCorrect ? (
                            hasNextStep ? (
                                <button className="btn btn-success" onClick={() => router.push(`/dashboard/courses/${courseId}/stages/${stepNumber + 1}`)}>Lanjut ke Tahap Berikutnya 👉</button>
                            ) : (
                                <Link href="/dashboard/courses" className="btn btn-primary">🎉 Selesai! Kembali ke Daftar Kursus</Link>
                            )
                        ) : (
                           step.question && <button onClick={handleRetry} className="btn btn-primary">Coba Lagi</button>
                        )}

                        {/* Tombol untuk stage tanpa soal */}
                        {!step.question && hasNextStep && (
                             <button className="btn btn-success" onClick={() => router.push(`/dashboard/courses/${courseId}/stages/${stepNumber + 1}`)}>Lanjut ke Tahap Berikutnya 👉</button>
                        )}
                        {!step.question && !hasNextStep && (
                            <Link href="/dashboard/courses" className="btn btn-primary">🎉 Selesai! Kembali ke Daftar Kursus</Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
