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
      console.log("Data dari tabel gallery:", galleryData)


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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map(photo => (
          <div
            key={photo.id}
            className="bg-white rounded-xl shadow-md p-4 flex flex-col space-y-2"
          >
            <img
              src={photo.image_url}
              alt="Kegiatan"
              className="w-full h-48 object-cover rounded"
            />
            <p className="text-sm text-gray-700">
              <strong>{photo.user_id}</strong>: {photo.caption}
            </p>

            {/* Komentar */}
            <div className="space-y-1 text-sm text-gray-600">
              {(comments[photo.id] || []).map((c, i) => (
                <p key={i}>
                  <strong>{c.user_id}:</strong> {c.comment}
                </p>
              ))}
            </div>

            {/* Form Komentar */}
            <div>
              <input
                className="input w-full text-sm mt-2"
                placeholder="Tulis komentar..."
                value={newComment[photo.id] || ''}
                onChange={(e) =>
                  setNewComment({ ...newComment, [photo.id]: e.target.value })
                }
              />
              <button
                className="btn mt-2 w-full text-sm bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700"
                onClick={() => submitComment(photo.id)}
              >
                Kirim
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
