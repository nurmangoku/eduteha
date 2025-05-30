import { supabase } from './supabase'

export async function updateProgress(userId: string, courseId: string, stage: number) {
  const { data, error } = await supabase
    .from('progress')
    .upsert([
      {
        user_id: userId,
        course_id: courseId,
        stage_completed: stage,
        updated_at: new Date().toISOString(),
      }
    ], {
      onConflict: 'user_id,course_id'
    })

  if (error) {
    console.error('Gagal update progres:', error)
    return
  }

  // Tambah XP (misal 20 per tahap)
  await supabase.rpc('add_xp', { uid: userId, amount: 20 })

  // Jika stage == 5, beri badge
  if (stage === 5) {
    await supabase.rpc('give_badge', { uid: userId, badge: `Selesai Kursus ${courseId}` })
  }

  return data
}
