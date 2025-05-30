'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Upload from './upload'

export default function GalleryPage() {
  const [photos, setPhotos] = useState<any[]>([])
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchGallery = async () => {
      const { data: galleryData } = await supabase
        .from('gallery')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })

      setPhotos(galleryData || [])

      // Ambil semua komentar
      const { data: commentData } = await supabase
        .from('gallery_comments')
        .select('*, profiles(full_name)')
        .order('created_at')

      const grouped: Record<string, any[]> = {}
      for (const comment of commentData || []) {
        const pid = comment.photo_id
        if (!grouped[pid]) grouped[pid] = []
        grouped[pid].push(comment)
      }

      setComments(grouped)
    }

    fetchGallery()
  }, [])

  const submitComment = async (photoId: string) => {
    const text = newComment[photoId]
    const { data: { user } } = await supabase.auth.getUser()
    if (!text || !user) return

    await supabase.from('gallery_comments').insert({
      photo_id: photoId,
      user_id: user.id,
      comment: text
    })

    setNewComment({ ...newComment, [photoId]: '' })
    location.reload()
  }

  return (
    <div className="p-6 space-y-6">
        <Upload />
      <h2 className="text-2xl font-bold mb-4">Galeri Kegiatan</h2>
      {photos.map(photo => (
        <div key={photo.id} className="p-4 bg-white rounded-xl shadow space-y-2">
          <img src={photo.image_url} alt="Kegiatan" className="w-full rounded" />
          <p><strong>{photo.profiles?.full_name}</strong>: {photo.caption}</p>

          <div className="mt-2 space-y-1">
            {(comments[photo.id] || []).map((c, i) => (
              <p key={i} className="text-sm"><strong>{c.profiles?.full_name}:</strong> {c.comment}</p>
            ))}
          </div>

          <div className="mt-2">
            <input
              className="input w-full"
              placeholder="Tulis komentar..."
              value={newComment[photo.id] || ''}
              onChange={(e) => setNewComment({ ...newComment, [photo.id]: e.target.value })}
            />
            <button
              className="btn mt-2"
              onClick={() => submitComment(photo.id)}
            >Kirim</button>
          </div>
        </div>
      ))}
    </div>
  )
}
