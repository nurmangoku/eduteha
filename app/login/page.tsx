'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError(null)
    setLoading(true)

    try {
      // Langkah 1: Panggil Edge Function untuk mendapatkan email
      const { data: emailData, error: emailError } = await supabase.functions.invoke('get-email-from-username', {
        body: { username }
      });

      if (emailError || emailData.error) {
        throw new Error(emailData?.error || 'Nama akun tidak ditemukan.');
      }

      const email = emailData.email;
      if (!email) {
        throw new Error("Gagal mengambil email untuk nama akun ini.");
      }

      // Langkah 2: Lakukan login langsung dari klien
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw new Error('Nama akun atau password salah.')
      }

      // Langkah 3: Paksa muat ulang halaman ke dasbor.
      // Ini adalah cara paling andal untuk memastikan sesi baru dikenali.
      window.location.href = '/dashboard';
      
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md mx-auto p-8 card">
        <h1 className="text-3xl font-bold mb-6 text-center">Masuk ke Akun</h1>
        <div className="space-y-4">
          <div>
              <label className="text-sm font-medium">Nama Akun</label>
              <input 
                type="text" 
                placeholder="Contoh: budisantoso" 
                value={username}
                onChange={(e) => setUsername(e.target.value)} 
                className="input mt-1" 
              />
          </div>
          <div>
              <label className="text-sm font-medium">Password</label>
              <input 
                type="password" 
                placeholder="******" 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                className="input mt-1" 
              />
          </div>
        </div>
        <button onClick={handleLogin} className="btn btn-primary w-full mt-6 text-lg" disabled={loading}>
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
        {error && <p className="text-red-500 mt-4 text-center text-sm">{error}</p>}
      </div>
    </div>
  )
}
