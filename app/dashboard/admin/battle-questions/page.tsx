'use client'
import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { supabase } from '@/lib/supabase'
import RoleGuard from '@/components/RoleGuard'
import { Plus, Trash2, UploadCloud } from 'lucide-react'
import * as XLSX from 'xlsx' // Impor library untuk membaca Excel

// Tipe data untuk mempermudah
interface Subject { id: string; name: string; }
interface Question { id: string; question: string; }
interface Profile { id: string; }

// Tipe data untuk baris di file Excel
interface QuestionFromExcel {
  'Pertanyaan': string;
  'Opsi A': string;
  'Opsi B': string;
  'Opsi C': string;
  'Jawaban Benar (A/B/C)': 'A' | 'B' | 'C';
  'Kelas': 'Kelas 1' | 'Kelas 2' | 'Kelas 3' | 'Kelas 4' | 'Kelas 5' | 'Kelas 6';
  'Mata Pelajaran': string;
}

export default function ManageBattleQuestionsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  
  // State untuk form manual
  const [newSubject, setNewSubject] = useState('')
  const [newQuestion, setNewQuestion] = useState({
    question: '', option_a: '', option_b: '', option_c: '', correct_answer: 'A', kelas: 'Kelas 1'
  })
  
  // State untuk unggahan Excel
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(true)

  const classLevels = ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'];

  const refreshQuestions = async (subjectId: string) => {
    const { data } = await supabase.from('question_bank').select('id, question').eq('subject_id', subjectId);
    setQuestions(data || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('id').eq('id', user.id).single();
        setProfile(profileData);
      }
      const { data: subjectsData } = await supabase.from('subjects').select('*');
      setSubjects(subjectsData || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      refreshQuestions(selectedSubject);
    } else {
      setQuestions([]);
    }
  }, [selectedSubject]);

  // --- FUNGSI DIISI LENGKAP ---
  const handleAddSubject = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !profile) return;
    const { data, error } = await supabase
      .from('subjects')
      .insert({ name: newSubject, created_by: profile.id })
      .select()
      .single();
    
    if (data) {
      setSubjects([...subjects, data]);
      setNewSubject('');
      alert(`Mata pelajaran "${data.name}" berhasil ditambahkan.`);
    }
    if (error) {
      alert(`Gagal menambah mapel: ${error.message}`);
    }
  };
  
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Yakin ingin menghapus soal ini?")) return;
    const { error } = await supabase.from('question_bank').delete().eq('id', questionId);
    if (!error) {
      setQuestions(questions.filter(q => q.id !== questionId));
    } else {
      alert(`Gagal menghapus soal: ${error.message}`);
    }
  }

  const handleAddQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!newQuestion.question.trim() || !selectedSubject || !newQuestion.kelas.trim() || !profile) {
        alert("Harap isi semua kolom yang diperlukan.");
        return;
    }
    const { data, error } = await supabase.from('question_bank').insert({
      ...newQuestion,
      subject_id: selectedSubject,
      created_by: profile.id
    });
    if (!error) {
      alert('Soal berhasil ditambahkan!');
      await refreshQuestions(selectedSubject);
      setNewQuestion({ ...newQuestion, question: '', option_a: '', option_b: '', option_c: '' });
    } else {
      alert('Gagal menambah soal: ' + error.message);
    }
  };

  const handleExcelUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) {
      alert("Harap login dan coba lagi.");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Membaca file Excel...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: QuestionFromExcel[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) throw new Error("File Excel kosong atau format tidak sesuai.");
        
        setUploadStatus(`Memvalidasi ${json.length} soal...`);

        const subjectMap = new Map(subjects.map(s => [s.name.toLowerCase(), s.id]));

        const formattedQuestions = json.map(row => {
          const subjectName = row['Mata Pelajaran']?.trim().toLowerCase();
          const subjectId = subjectMap.get(subjectName);

          if (!subjectId) throw new Error(`Mata pelajaran "${row['Mata Pelajaran']}" tidak ditemukan.`);
          if (!row['Pertanyaan'] || !row['Opsi A'] || !row['Opsi B'] || !row['Opsi C'] || !row['Jawaban Benar (A/B/C)'] || !row['Kelas']) {
            throw new Error(`Data tidak lengkap pada pertanyaan: "${row['Pertanyaan'] || 'Tanpa Judul'}"`);
          }

          return {
            subject_id: subjectId,
            kelas: row['Kelas'],
            question: row['Pertanyaan'],
            option_a: row['Opsi A'],
            option_b: row['Opsi B'],
            option_c: row['Opsi C'],
            correct_answer: row['Jawaban Benar (A/B/C)'],
            created_by: profile.id
          };
        });

        setUploadStatus(`Menyimpan ${formattedQuestions.length} soal ke database...`);
        const { error } = await supabase.from('question_bank').insert(formattedQuestions);
        if (error) throw error;

        setUploadStatus(`Berhasil! ${formattedQuestions.length} soal telah ditambahkan.`);
        if (selectedSubject) await refreshQuestions(selectedSubject);

      } catch (error: any) {
        console.error("Error processing Excel file:", error);
        setUploadStatus(`Gagal: ${error.message}`);
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  if (loading) return <div className="p-6 text-center">Memuat...</div>;

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">Bank Soal Pertarungan</h1>
        
        <div className="card mb-8">
            <h2 className="text-xl font-semibold mb-4">Unggah Soal Massal dari Excel</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Cara tercepat untuk menambah banyak soal. Pastikan file Excel Anda memiliki kolom: <strong>Pertanyaan</strong>, <strong>Opsi A</strong>, <strong>Opsi B</strong>, <strong>Opsi C</strong>, <strong>Jawaban Benar (A/B/C)</strong>, <strong>Kelas</strong>, dan <strong>Mata Pelajaran</strong>.</p>
              <a href="/template-bank-soal.xlsx" download className="text-sky-500 hover:underline block">Unduh File Template Excel</a>
              <div>
                <label htmlFor="excel-upload" className="btn btn-success w-full flex items-center justify-center gap-2 cursor-pointer"><UploadCloud size={20} />Pilih File Excel untuk Diunggah</label>
                <input id="excel-upload" type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} disabled={isUploading} />
              </div>
              {uploadStatus && (
                  <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm"><p><strong>Status Unggahan:</strong> {isUploading ? 'Memproses...' : uploadStatus}</p></div>
              )}
            </div>
        </div>
        <hr className="my-12"/>
        
        <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Tambah Soal Secara Manual</h2>
            <div className="card mb-4">
                <h3 className="font-semibold mb-2">Langkah 1: Pilih atau Buat Mata Pelajaran</h3>
                <form onSubmit={handleAddSubject} className="flex gap-2 mb-4">
                    <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Nama mapel baru..." className="input flex-grow" />
                    <button type="submit" className="btn btn-primary flex-shrink-0">Tambah Mapel</button>
                </form>
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="input"><option value="">-- Pilih Mata Pelajaran --</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </div>
            {selectedSubject && (
                <div className="card">
                    <h3 className="font-semibold mb-2">Langkah 2: Isi Detail Soal</h3>
                    <form onSubmit={handleAddQuestion} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Untuk Kelas</label>
                            <select value={newQuestion.kelas} onChange={e => setNewQuestion({...newQuestion, kelas: e.target.value})} className="input w-full">{classLevels.map(level => <option key={level} value={level}>{level}</option>)}</select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Pertanyaan</label>
                            <textarea value={newQuestion.question} onChange={e => setNewQuestion({...newQuestion, question: e.target.value})} placeholder="Tulis pertanyaan di sini..." className="input" rows={3} required></textarea>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" value={newQuestion.option_a} onChange={e => setNewQuestion({...newQuestion, option_a: e.target.value})} placeholder="Opsi A" className="input" required/>
                            <input type="text" value={newQuestion.option_b} onChange={e => setNewQuestion({...newQuestion, option_b: e.target.value})} placeholder="Opsi B" className="input" required/>
                            <input type="text" value={newQuestion.option_c} onChange={e => setNewQuestion({...newQuestion, option_c: e.target.value})} placeholder="Opsi C" className="input" required/>
                            <div>
                                <label className="block text-sm font-medium mb-1">Jawaban Benar</label>
                                <select value={newQuestion.correct_answer} onChange={e => setNewQuestion({...newQuestion, correct_answer: e.target.value})} className="input"><option value="A">A</option><option value="B">B</option><option value="C">C</option></select>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary w-full">Simpan Soal ke Bank</button>
                    </form>
                </div>
            )}
        </div>
        
        {selectedSubject && (
            <div className="card mt-8">
              <h3 className="font-semibold mb-2">Daftar Soal Tersimpan untuk Mapel Ini</h3>
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {questions.length > 0 ? questions.map(q => (
                  <li key={q.id} className="flex justify-between items-center p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                    <span className="truncate pr-2">{q.question}</span>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"><Trash2 size={16}/></button>
                  </li>
                )) : <p className="text-sm text-gray-500">Belum ada soal.</p>}
              </ul>
            </div>
        )}
      </div>
    </RoleGuard>
  )
}
