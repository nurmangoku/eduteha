// FILE: supabase/functions/create-users-from-excel/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface NewUser {
  full_name: string
  kelas: string
  role: 'murid' | 'guru'
  initial_password?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const newUsers: NewUser[] = await req.json()

    if (!newUsers || newUsers.length === 0) {
      throw new Error("Tidak ada data pengguna untuk dibuat.")
    }

    const createdUsers = []
    const failedUsers = []

    for (const user of newUsers) {
      const tempEmail = `${user.full_name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@sekolah.local`
      const password = user.initial_password || 'password123'

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: tempEmail,
        password: password,
        email_confirm: true,
      })

      if (authError || !authData.user) {
        failedUsers.push({ name: user.full_name, reason: authError?.message || 'Gagal membuat user auth.' })
        continue
      }

      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: authData.user.id,
        full_name: user.full_name,
        role: user.role,
        kelas: user.kelas,
      })

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        failedUsers.push({ name: user.full_name, reason: profileError.message })
      } else {
        createdUsers.push({ name: user.full_name, email: tempEmail, password: password })
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Proses selesai.",
        created_count: createdUsers.length,
        failed_count: failedUsers.length,
        created_details: createdUsers,
        failed_details: failedUsers,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})