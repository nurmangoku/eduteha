'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation'; // <-- 1. Impor useParams
import { PlusCircle, Trash2, FileText, Image as ImageIcon, Video, AlertCircle, Save } from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';

// --- DEFINISI TIPE DATA ---

interface ContentItem {
    type: 'text' | 'image' | 'video';
    value: string;
    temp_id?: string;
    loading?: boolean;
    error?: string;
}

interface Step {
    id?: string;
    temp_id: string;
    title: string;
    content: ContentItem[];
    question: string;
    options: {
        A: string;
        B: string;
        C: string;
    };
    correct_answer: string;
}

interface CourseDetails {
    id: string;
    title: string;
    description: string;
    kelas: string;
    created_at: string;
    created_by: string;
}


// --- KOMPONEN UTAMA ---
// --- PERBAIKAN: Gunakan hook useParams untuk menghindari peringatan ---
export default function EditCoursePage() {
    const router = useRouter();
    const params = useParams(); // <-- 2. Gunakan hook useParams
    const courseId = params.courseId as string; // <-- 3. Ambil courseId dari hasil hook

    const [loading, setLoading] = useState<boolean>(true);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    
    const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
    const [steps, setSteps] = useState<Step[]>([]);

    useEffect(() => {
        if (!courseId) return;

        const fetchCourseData = async () => {
            setLoading(true);
            try {
                const { data: courseData, error: courseError } = await supabase
                    .from('courses')
                    .select('*')
                    .eq('id', courseId)
                    .single();
                
                if (courseError) throw new Error(`Gagal memuat detail kursus: ${courseError.message}`);
                setCourseDetails(courseData);

                const { data: stepsData, error: stepsError } = await supabase
                    .from('course_steps')
                    .select('*')
                    .eq('course_id', courseId)
                    .order('step_number', { ascending: true });

                if (stepsError) throw new Error(`Gagal memuat tahapan kursus: ${stepsError.message}`);
                
                const typedSteps: Step[] = stepsData.map((s: any) => ({
                    ...s,
                    temp_id: `step-${s.id}-${Math.random()}`,
                    content: s.content || [],
                    options: s.options || { A: '', B: '', C: '' },
                }));
                setSteps(typedSteps);

            } catch (err: any) {
                setError(err.message);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCourseData();
    }, [courseId]);


    // --- FUNGSI-FUNGSI HELPER ---

    const handleCourseDetailChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCourseDetails(prev => (prev ? { ...prev, [name]: value } : null));
    };

    const addStep = () => {
        const newStep: Step = {
            temp_id: `step-new-${Date.now()}`, 
            title: '',
            content: [],
            question: '',
            options: { A: '', B: '', C: '' },
            correct_answer: '',
        };
        setSteps(prevSteps => [...prevSteps, newStep]);
    };

    const removeStep = (index: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus tahapan ini?')) {
            setSteps(prevSteps => prevSteps.filter((_, i) => i !== index));
        }
    };

    const handleStepChange = (index: number, field: keyof Step, value: any) => {
        const updatedSteps = [...steps];
        if (field === 'options') {
            const { optionKey, optionValue } = value;
            updatedSteps[index].options[optionKey as 'A' | 'B' | 'C'] = optionValue;
        } else {
            (updatedSteps[index] as any)[field] = value;
        }
        setSteps(updatedSteps);
    };

    const addContentToStep = (stepIndex: number, contentType: 'text' | 'image' | 'video') => {
        const updatedSteps = [...steps];
        updatedSteps[stepIndex].content.push({ type: contentType, value: '', temp_id: `content-${Date.now()}` });
        setSteps(updatedSteps);
    };

    const removeContentFromStep = (stepIndex: number, contentIndex: number) => {
        const updatedSteps = [...steps];
        updatedSteps[stepIndex].content = updatedSteps[stepIndex].content.filter((_, i) => i !== contentIndex);
        setSteps(updatedSteps);
    };
    
    const handleStepContentChange = (stepIndex: number, contentIndex: number, value: string) => {
        const updatedSteps = [...steps];
        updatedSteps[stepIndex].content[contentIndex].value = value;
        setSteps(updatedSteps);
    };

    const handleImageUpload = async (stepIndex: number, contentIndex: number, file: File | null) => {
        if (!file) return;

        const updatedSteps = [...steps];
        const contentItem = updatedSteps[stepIndex].content[contentIndex];
        
        try {
            contentItem.loading = true;
            setSteps([...updatedSteps]);

            const fileName = `${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('courseimages') // Nama bucket disesuaikan
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('courseimages') // Nama bucket disesuaikan
                .getPublicUrl(fileName);
            
            contentItem.value = publicUrl;

        } catch (error: any) {
            console.error('Error uploading image:', error);
            contentItem.error = 'Gagal unggah.';
        } finally {
            contentItem.loading = false;
            setSteps([...updatedSteps]);
        }
    };

    const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!courseDetails || courseDetails.title.trim() === '' || steps.length === 0) {
            setError('Judul kursus dan minimal satu tahapan harus diisi.');
            return;
        }
        setError('');
        setIsUpdating(true);

        try {
            const { error: courseUpdateError } = await supabase
                .from('courses')
                .update({
                    title: courseDetails.title,
                    description: courseDetails.description,
                    kelas: courseDetails.kelas,
                })
                .eq('id', courseId);
            if (courseUpdateError) throw courseUpdateError;

            const { error: deleteError } = await supabase
                .from('course_steps')
                .delete()
                .eq('course_id', courseId);
            if (deleteError) throw deleteError;

            const stepsToInsert = steps.map((step, index) => ({
                course_id: courseId,
                step_number: index + 1,
                title: step.title,
                content: step.content.map(c => ({ type: c.type, value: c.value })),
                question: step.question || null,
                options: (step.options.A || step.options.B || step.options.C) ? step.options : null,
                correct_answer: step.correct_answer || null,
            }));

            if (stepsToInsert.length > 0) {
                const { error: stepsInsertError } = await supabase
                    .from('course_steps')
                    .insert(stepsToInsert);
                if (stepsInsertError) throw stepsInsertError;
            }

            alert('Kursus berhasil diperbarui!');
            router.push('/dashboard/manage-courses/list');

        } catch (err: any) {
            console.error('Error updating course:', err);
            setError(`Gagal memperbarui kursus: ${err.message}`);
        } finally {
            setIsUpdating(false);
        }
    };
    
    // --- TAMPILAN / JSX ---
    if (loading) return <p className="p-8 text-center">Memuat data kursus...</p>;
    if (error && !courseDetails) return <p className="p-8 text-center text-red-500">{error}</p>;

    return (
        <RoleGuard allowedRoles={['guru']}>
            <div className="p-4 md:p-8 max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Edit Kursus</h1>
                
                <form onSubmit={handleUpdate} className="space-y-8">
                    {courseDetails && (
                        <div className="card p-6 space-y-4">
                            <h2 className="text-xl font-semibold">Informasi Umum Kursus</h2>
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium mb-1">Judul Kursus</label>
                                <input type="text" name="title" id="title" value={courseDetails.title} onChange={handleCourseDetailChange} className="input w-full" required />
                            </div>
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium mb-1">Deskripsi Singkat</label>
                                <textarea name="description" id="description" value={courseDetails.description} onChange={handleCourseDetailChange} className="input w-full" rows={3}></textarea>
                            </div>
                            <div>
                                <label htmlFor="kelas" className="block text-sm font-medium mb-1">Untuk Kelas</label>
                                <select name="kelas" id="kelas" value={courseDetails.kelas} onChange={handleCourseDetailChange} className="input w-full">
                                    {['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'].map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    <div>
                        <h2 className="text-xl font-semibold mb-4">Tahapan / Materi Kursus</h2>
                        <div className="space-y-6">
                            {steps.map((step, stepIndex) => (
                               <div key={step.temp_id} className="card p-5 border-l-4 border-sky-500">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold">Tahapan {stepIndex + 1}</h3>
                                        <button type="button" onClick={() => removeStep(stepIndex)} className="btn-icon text-red-500 hover:text-red-700">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <input type="text" value={step.title} onChange={(e) => handleStepChange(stepIndex, 'title', e.target.value)} className="input w-full" placeholder="Judul Tahapan" />
                                        
                                        <div className="space-y-3 pl-4 border-l-2">
                                            {step.content && step.content.map((content, contentIndex) => (
                                                <div key={content.temp_id || contentIndex} className="relative">
                                                     {content.type === 'text' && <textarea className="input w-full" placeholder="Ketik materi teks di sini..." value={content.value} onChange={(e) => handleStepContentChange(stepIndex, contentIndex, e.target.value)} rows={4}></textarea>}
                                                    {content.type === 'video' && <input className="input w-full" placeholder="Masukkan URL Video Youtube/Google Drive" value={content.value} onChange={(e) => handleStepContentChange(stepIndex, contentIndex, e.target.value)} />}
                                                    {content.type === 'image' && (
                                                        <div>
                                                            <input type="file" accept="image/*" className="input w-full" onChange={(e) => handleImageUpload(stepIndex, contentIndex, e.target.files ? e.target.files[0] : null)} disabled={content.loading} />
                                                            {content.loading && <p className="text-xs mt-1">Mengunggah...</p>}
                                                            {content.error && <p className="text-xs mt-1 text-red-500">{content.error}</p>}
                                                            {content.value && !content.loading && <img src={content.value} alt="Preview" className="mt-2 rounded-lg max-w-xs border" />}
                                                        </div>
                                                    )}
                                                    <button type="button" onClick={() => removeContentFromStep(stepIndex, contentIndex)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center text-xs">X</button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => addContentToStep(stepIndex, 'text')} className="btn btn-secondary text-xs flex items-center gap-1"><FileText size={14}/> Tambah Teks</button>
                                            <button type="button" onClick={() => addContentToStep(stepIndex, 'image')} className="btn btn-secondary text-xs flex items-center gap-1"><ImageIcon size={14}/> Tambah Gambar</button>
                                            <button type="button" onClick={() => addContentToStep(stepIndex, 'video')} className="btn btn-secondary text-xs flex items-center gap-1"><Video size={14}/> Tambah Video</button>
                                        </div>
                                        
                                        <div className="pt-4 border-t mt-4">
                                             <h4 className="font-semibold mb-2">Soal Latihan (Opsional)</h4>
                                             <textarea className="input w-full mb-2" placeholder="Tulis pertanyaan di sini..." value={step.question} onChange={(e) => handleStepChange(stepIndex, 'question', e.target.value)}></textarea>
                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <input className="input" placeholder="Opsi A" value={step.options?.A || ''} onChange={(e) => handleStepChange(stepIndex, 'options', {optionKey: 'A', optionValue: e.target.value})} />
                                                <input className="input" placeholder="Opsi B" value={step.options?.B || ''} onChange={(e) => handleStepChange(stepIndex, 'options', {optionKey: 'B', optionValue: e.target.value})} />
                                                <input className="input" placeholder="Opsi C" value={step.options?.C || ''} onChange={(e) => handleStepChange(stepIndex, 'options', {optionKey: 'C', optionValue: e.target.value})} />
                                                <select className="input" value={step.correct_answer || ''} onChange={(e) => handleStepChange(stepIndex, 'correct_answer', e.target.value)}>
                                                    <option value="">Pilih Jawaban Benar</option>
                                                    <option value="A">Jawaban A</option>
                                                    <option value="B">Jawaban B</option>
                                                    <option value="C">Jawaban C</option>
                                                </select>
                                             </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                         <button type="button" onClick={addStep} className="btn btn-secondary w-full mt-6 flex items-center justify-center gap-2">
                            <PlusCircle size={20} /> Tambah Tahapan Baru
                        </button>
                    </div>
                    
                    <div className="pt-6 border-t">
                        {error && 
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 flex items-center gap-2" role="alert">
                                <AlertCircle size={20}/>
                                <span className="block sm:inline">{error}</span>
                            </div>
                        }
                        <button type="submit" className="btn btn-primary w-full text-lg flex items-center justify-center gap-2" disabled={isUpdating}>
                            <Save size={20}/>
                            {isUpdating ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </div>
        </RoleGuard>
    );
}
