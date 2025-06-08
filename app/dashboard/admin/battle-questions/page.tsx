'use client'
import { useState, useEffect, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import RoleGuard from '@/components/RoleGuard'
import { Plus, Trash2 } from 'lucide-react'

// Tipe data untuk mempermudah
interface Subject { id: string; name: string; }
interface Question { id: string; question: string; }
interface Profile { id: string; }

export default function ManageBattleQuestionsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  
  const [newSubject, setNewSubject] = useState('')
  const [newQuestion, setNewQuestion] = useState({
    question: '', option_a: '', option_b: '', option_c: '', correct_answer: 'A', kelas: 'Kelas 1'
  })
  const [loading, setLoading] = useState(true)

  // Poin 2: Daftar kelas yang tetap
  const classLevels = ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'];

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
    if (!selectedSubject) {
      setQuestions([]);
      return;
    }
    const fetchQuestions = async () => {
      const { data } = await supabase.from('question_bank').select('id, question').eq('subject_id', selectedSubject);
      setQuestions(data || []);
    }
    fetchQuestions();
  }, [selectedSubject]);

  const handleAddSubject = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !profile) return;
    const { data, error } = await supabase.from('subjects').insert({ name: newSubject, created_by: profile.id }).select().single();
    if (data) {
      setSubjects([...subjects, data]);
      setNewSubject('');
    }
  };

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
      const { data: questionsData } = await supabase.from('question_bank').select('id, question').eq('subject_id', selectedSubject);
      setQuestions(questionsData || []);
      setNewQuestion({ ...newQuestion, question: '', option_a: '', option_b: '', option_c: '', correct_answer: 'A' });
    } else {
      alert('Gagal menambah soal: ' + error.message);
    }
  };
  
  const handleDeleteQuestion = async (questionId: string) => {
      if (!confirm("Yakin ingin menghapus soal ini?")) return;
      await supabase.from('question_bank').delete().eq('id', questionId);
      setQuestions(questions.filter(q => q.id !== questionId));
  }

  if (loading) return <div className="p-6 text-center">Memuat...</div>;

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">Bank Soal Pertarungan</h1>

        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Langkah 1: Pilih atau Buat Mata Pelajaran</h2>
          <form onSubmit={handleAddSubject} className="flex gap-2 mb-4">
            <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Nama mapel baru..." className="input flex-grow" />
            <button type="submit" className="btn btn-primary flex-shrink-0">Tambah Mapel</button>
          </form>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="input">
            <option value="">-- Pilih Mata Pelajaran --</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {selectedSubject && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Langkah 2: Tambah Soal Baru</h2>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Untuk Kelas</label>
                <select value={newQuestion.kelas} onChange={e => setNewQuestion({...newQuestion, kelas: e.target.value})} className="input w-full">
                  {classLevels.map(level => <option key={level} value={level}>{level}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pertanyaan</label>
                <textarea value={newQuestion.question} onChange={e => setNewQuestion({...newQuestion, question: e.target.value})} placeholder="Tulis pertanyaan di sini..." className="input" rows={3}></textarea>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={newQuestion.option_a} onChange={e => setNewQuestion({...newQuestion, option_a: e.target.value})} placeholder="Opsi A" className="input" required/>
                <input type="text" value={newQuestion.option_b} onChange={e => setNewQuestion({...newQuestion, option_b: e.target.value})} placeholder="Opsi B" className="input" required/>
                <input type="text" value={newQuestion.option_c} onChange={e => setNewQuestion({...newQuestion, option_c: e.target.value})} placeholder="Opsi C" className="input" required/>
                <div>
                  <label className="block text-sm font-medium mb-1">Jawaban Benar</label>
                  <select value={newQuestion.correct_answer} onChange={e => setNewQuestion({...newQuestion, correct_answer: e.target.value})} className="input">
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full">Simpan Soal ke Bank</button>
            </form>
            
            <div className="mt-8">
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
          </div>
        )}
      </div>
    </RoleGuard>
  )
}