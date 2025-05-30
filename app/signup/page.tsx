'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'guru' | 'murid'>('murid')
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async () => {
    setError(null)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message || 'Signup gagal')
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: fullName,
      role: role,
    })

    if (profileError) {
      setError(profileError.message)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Daftar</h1>
      <input type="text" placeholder="Nama Lengkap" value={fullName}
        onChange={(e) => setFullName(e.target.value)} className="input mb-2" />
      <input type="email" placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)} className="input mb-2" />
      <input type="password" placeholder="Password" value={password}
        onChange={(e) => setPassword(e.target.value)} className="input mb-2" />

      <select value={role} onChange={(e) => setRole(e.target.value as any)} className="input mb-4">
        <option value="murid">Murid</option>
        <option value="guru">Guru</option>
      </select>

      <button onClick={handleSignup} className="btn w-full">Daftar</button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  )
}
