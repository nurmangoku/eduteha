// FILE: supabase/functions/get-email-from-username/index.ts (Disesuaikan)

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username } = await req.json()
    if (!username) {
      throw new Error("Username harus diisi.")
    }

    // Gunakan service_role key agar bisa mengakses data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Langkah 1: Cari profil berdasarkan username untuk mendapatkan ID pengguna
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase()) // Pastikan username yang dicari juga huruf kecil
      .single()

    if (profileError || !profileData) {
      throw new Error("Username tidak ditemukan.")
    }

    // Langkah 2: Gunakan ID pengguna untuk mengambil data auth, termasuk email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(
      profileData.id
    )
      
    if (authError || !authData.user) {
      throw new Error("Data otentikasi untuk pengguna tidak ditemukan.");
    }

    // Langkah 3: Kembalikan email yang ditemukan
    return new Response(
      JSON.stringify({ email: authData.user.email }),
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