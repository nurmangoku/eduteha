import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Tangani preflight request untuk CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Ambil username dari request body
    const { username } = await req.json()
    if (!username) {
      throw new Error("Nama akun harus diisi.")
    }

    // Bersihkan input dari pengguna agar cocok dengan format di database
    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '')

    // Inisialisasi Supabase Admin Client untuk mengakses data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // --- METODE PALING STABIL: Mencari langsung ke tabel 'profiles' ---
    // Ini adalah sumber data yang paling bisa diandalkan.
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id') // Kita hanya butuh ID pengguna dari sini
      .eq('username', sanitizedUsername) // Cari di kolom 'username' yang sudah kita buat
      .single()

    // Jika profil tidak ditemukan, kembalikan error yang jelas
    if (profileError || !profileData) {
      throw new Error(`Nama akun tidak ditemukan. Sistem mencari username: "${sanitizedUsername}"`)
    }

    // Ambil data auth (termasuk email) berdasarkan ID yang ditemukan dari profil
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(
      profileData.id
    )
      
    if (authError || !authData.user) {
      throw new Error("Data otentikasi untuk pengguna tidak ditemukan.");
    }

    // Jika pengguna ditemukan, kembalikan emailnya
    return new Response(
      JSON.stringify({ email: authData.user.email }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    // Tangani semua kemungkinan error dan kembalikan pesan yang jelas
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
