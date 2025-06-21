'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.replace('/dashboard')
      } else {
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  const handleLogin = async () => {
  setError(null)
  setLoading(true)

  // Bersihkan username: huruf kecil dan tanpa spasi
  const cleanedUsername = username.toLowerCase().replace(/\s+/g, '')

  // Validasi: tolak jika ada spasi di input asli
  if (cleanedUsername !== username.toLowerCase()) {
    setError('Nama akun tidak boleh mengandung spasi.')
    setLoading(false)
    return
  }

  try {
    // Panggil function Supabase untuk ambil email dari username
    const { data: emailData, error: emailError } = await supabase.functions.invoke('get-email-from-username', {
      body: { username: cleanedUsername }
    })

    if (emailError || emailData?.error) {
      throw new Error(emailData?.error || 'Nama akun tidak ditemukan.')
    }

    const email = emailData.email
    if (!email) {
      throw new Error('Gagal mengambil email untuk nama akun ini.')
    }

    // Login dengan email + password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      throw new Error('Nama akun atau password salah.')
    }

    window.location.href = '/dashboard'

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
