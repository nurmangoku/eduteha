import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const newUsers: any[] = await req.json();

    const createdUsers = [];
    const failedUsers = [];

    for (const user of newUsers) {
      try {
        const tempEmail = `${user.full_name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@sekolah.local`;
        const password = user.initial_password || 'password123';

        // Hanya buat user di auth dan sertakan full_name di metadata
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: tempEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name, // Ini akan ditangkap oleh trigger
            role: user.role,
            kelas: user.kelas
          }
        });

        if (authError) throw authError;

        createdUsers.push({ name: user.full_name, email: tempEmail, password: password });

      } catch (error) {
        failedUsers.push({ name: user.full_name, reason: error.message });
      }
    }
    return new Response(JSON.stringify({ createdUsers, failedUsers }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
})
