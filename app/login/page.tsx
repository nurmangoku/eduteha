// FILE: app/login/page.tsx (atau di mana pun file login Anda berada)

'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  // Ganti state 'email' menjadi 'username'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError(null)
    setLoading(true)

    try {
      // Langkah 1: Panggil Edge Function untuk mendapatkan email
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-email-from-username`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ username: username.toLowerCase().trim() }),
        }
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Username tidak ditemukan.')
      }

      const email = data.email

      // Langkah 2: Lakukan login dengan email yang didapat
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (loginError) {
        throw new Error(loginError.message)
      }

      router.push('/dashboard')
      
    } catch (err: any) {
      setError(err.message || 'Login gagal, periksa kembali username dan password Anda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 card mt-20">
      <h1 className="text-2xl font-bold mb-4">Masuk</h1>
      
      {/* Ganti input email menjadi input username */}
      <input 
        type="text" 
        placeholder="Nama Akun (username)" 
        value={username}
        onChange={(e) => setUsername(e.target.value)} 
        className="input mb-2" 
      />
      
      <input 
        type="password" 
        placeholder="Password" 
        value={password}
        onChange={(e) => setPassword(e.target.value)} 
        className="input mb-4" 
      />

      <button onClick={handleLogin} className="btn btn-primary w-full" disabled={loading}>
        {loading ? 'Memproses...' : 'Masuk'}
      </button>

      {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
    </div>
  )
}