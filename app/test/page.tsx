// app/test/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [users, setUsers] = useState<any[]>(["halo semua"])

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase.from('profiles').select('*')
      setUsers(data || [])
    }

    fetchUsers()
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Tes Supabase</h1>
      <pre>{JSON.stringify(users, null, 2)}</pre>
    </div>
  )
}
