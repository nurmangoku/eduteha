'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase' // Pastikan path ini sesuai
import { useRouter } from 'next/navigation'
import RoleGuard from '@/components/RoleGuard' // Pastikan path ini sesuai

export default function CreateCoursePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kelas, setKelas] = useState('') // Default value untuk select
  const [steps, setSteps] = useState(['', '', '', '', '']) // 5 langkah default
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)


  const handleSubmit = async () => {
    setError(null)
    setSuccessMessage(null)

    if (!title.trim() || !description.trim() || !kelas) {
      setError('Judul, deskripsi, dan kelas tidak boleh kosong.')
      return
    }
    // Validasi konten langkah-langkah (tahap 1-4 wajib, tahap 5 opsional)
    for (let i = 0; i < steps.length; i++) {
        if (i < 4 && !steps[i].trim()) { // Tahap 1-4 wajib diisi
            setError(`Konten untuk Tahapan ${i + 1} tidak boleh kosong.`);
            return;
        }
        if (i === 4 && steps[i].trim()) { // Tahap ke-5 (link YouTube), validasi URL jika diisi
            try {
                new URL(steps[i]); // Validasi apakah ini URL yang valid
            } catch (_) {
                setError(`Tahapan 5 harus berisi link YouTube yang valid (contoh: https://www.youtube.com/watch?v=xxxx) atau dikosongkan.`);
                return;
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

    // Mulai transaksi database jika memungkinkan, atau lakukan langkah-langkah berurutan
    try {
      const { data: course, error: courseError } = await supabase.from('courses').insert({
        title,
        description,
        kelas, // Sekarang kelas akan memiliki format standar "Kelas X"
        created_by: user.id
      }).select().single()

      if (courseError) {
        throw courseError
      }

      if (!course) {
        throw new Error('Gagal membuat data kursus inti.')
      }

      // Tambah materi/langkah-langkah kursus
      const stepPromises = steps.map((stepContent, i) => {
        const contentToSave = stepContent.trim();
        // Tahap ke-5 (indeks 4) adalah video hanya jika ada isinya
        const isVideoStep = i === 4 && contentToSave !== ''; 
        
        // Jika tahap 1-4 kosong (seharusnya sudah divalidasi di atas, tapi sebagai pengaman)
        // atau jika tahap 5 kosong, kita tidak perlu menyimpannya sebagai langkah
        // Namun, untuk konsistensi 5 tahap, kita simpan tahap 1-4 meskipun kontennya bisa jadi string kosong jika validasi di atas diubah
        // Untuk tahap 5, jika kosong, kita simpan sebagai konten kosong dan is_video false
        if (i < 4 && !contentToSave && steps.length > i) { // Hanya untuk tahap 1-4, jika kosong tidak perlu insert (seharusnya tidak terjadi karena validasi)
            // Jika ingin skip insert untuk tahap 1-4 yang kosong:
            // return Promise.resolve({ data: null, error: null }); 
        }

        return supabase.from('course_steps').insert({
          course_id: course.id,
          step_number: i + 1,
          content: contentToSave, // Simpan konten yang sudah di-trim
          is_video: isVideoStep, 
        });
      });
      
      const stepResults = await Promise.all(stepPromises.filter(p => p !== null)); // Filter promise yang di-skip jika ada
      stepResults.forEach(result => {
        if (result && result.error) { // Tambahkan pengecekan null jika ada promise yang di-skip
            console.error('Gagal menyimpan salah satu langkah kursus:', result.error);
            // Pertimbangkan untuk menghapus kursus yang sudah dibuat jika salah satu langkah gagal
            // await supabase.from('courses').delete().eq('id', course.id);
            throw new Error(`Gagal menyimpan Tahapan: ${result.error.message}`);
        }
      });
      
      setSuccessMessage('Kursus berhasil dibuat! Mengarahkan ke dashboard...');
      setTitle('');
      setDescription('');
      setKelas('');
      setSteps(['', '', '', '', '']);

      setTimeout(() => {
        router.push('/dashboard'); // Arahkan ke dashboard atau halaman daftar kursus guru
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

          <h3 className="text-lg font-semibold pt-2 text-gray-700 dark:text-gray-300">Materi / Tahapan Kursus (5 Tahap)</h3>
          {steps.map((step, i) => (
            <div key={i}>
              <label htmlFor={`step-${i}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tahapan {i + 1} {i === 4 ? '(Link Video YouTube - Opsional)' : '(Konten Teks - Wajib)'}
              </label>
              <textarea 
                id={`step-${i}`}
                className="input w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder={i === 4 ? 'Contoh: https://www.youtube.com/watch?v=xyz123 (Kosongkan jika tidak ada)' : `Isi konten untuk tahapan ${i + 1}...`}
                value={step} 
                onChange={(e) => {
                  const newSteps = [...steps]
                  newSteps[i] = e.target.value
                  setSteps(newSteps)
                }} 
                rows={i === 4 ? 2 : 4}
                disabled={loading}
              />
            </div>
          ))}
          <button 
            onClick={handleSubmit} 
            className="btn w-full py-2.5"
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : 'Simpan Kursus'}
          </button>
        </div>
      </div>
    </RoleGuard>
  )
}
