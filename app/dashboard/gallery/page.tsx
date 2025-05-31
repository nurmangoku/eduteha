'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase' // Pastikan path ini sesuai
import Upload from './upload' // Pastikan path ini sesuai

// Definisikan tipe untuk foto dan komentar
interface Profile {
  full_name: string;
}

interface Comment {
  id: string;
  photo_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles: Profile | null;
}

interface Photo {
  id: string;
  image_url: string;
  caption: string;
  user_id: string;
  profiles: Profile | null;
  created_at: string;
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true);

  const fetchGallery = async () => {
    setLoading(true);
    const { data: galleryData, error: galleryError } = await supabase
      .from('gallery')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })

    if (galleryError) {
      console.error("Error fetching gallery data:", galleryError);
      setPhotos([]);
    } else {
      setPhotos(galleryData || [])
    }

    const { data: commentData, error: commentError } = await supabase
      .from('gallery_comments')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: true })

    if (commentError) {
      console.error("Error fetching comments data:", commentError);
    } else {
      const groupedComments: Record<string, Comment[]> = {}
      if (commentData) {
        for (const comment of commentData) {
          const photoId = comment.photo_id
          if (!groupedComments[photoId]) {
            groupedComments[photoId] = []
          }
          groupedComments[photoId].push(comment)
        }
      }
      setComments(groupedComments)
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchGallery()

    const gallerySubscription = supabase
      .channel('public:gallery')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, payload => {
        fetchGallery()
      })
      .subscribe()

    const commentsSubscription = supabase
      .channel('public:gallery_comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_comments' }, payload => {
        fetchGallery()
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(gallerySubscription);
      supabase.removeChannel(commentsSubscription);
    }
  }, [])

  const submitComment = async (photoId: string) => {
    const text = newComment[photoId]
    const { data: { user } } = await supabase.auth.getUser()
    if (!text || !user) {
      alert(user ? "Komentar tidak boleh kosong." : "Anda harus login untuk berkomentar.");
      return;
    }

    const { error } = await supabase.from('gallery_comments').insert({
      photo_id: photoId,
      user_id: user.id,
      comment: text
    })

    if (error) {
      console.error("Error submitting comment:", error);
      alert("Gagal mengirim komentar.");
    } else {
      setNewComment({ ...newComment, [photoId]: '' })
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Memuat galeri...</div>;
  }

  return (

    <div className="py-6 px-2 sm:px-4 space-y-6"> 
      <Upload onUploadSuccess={fetchGallery} />
      
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Galeri Kegiatan</h2>
      {photos.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Belum ada foto di galeri.</p>
      ) : (
        <div className="flex flex-wrap gap-6"> {/* Menggunakan Flexbox untuk layout */}
          {photos.map(photo => (
            <div
              key={photo.id}
              className="w-full sm:w-[calc((100%-4.5rem)/4)] bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col"
            >
              <img
                src={photo.image_url}
                alt={photo.caption || "Kegiatan"}
                className="w-full h-56 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/cccccc/ffffff?text=Gambar+Rusak';
                  (e.target as HTMLImageElement).alt = 'Gambar tidak dapat dimuat';
                }}
              />
              <div className="p-4 flex flex-col flex-grow space-y-3">
                <div className="flex-grow">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Diunggah oleh: <strong>{photo.profiles?.full_name || photo.user_id}</strong>
                  </p>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">{photo.caption}</p>
                </div>
                
                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto">
                  {(comments[photo.id] || []).length > 0 ? (
                    (comments[photo.id] || []).map((c) => (
                      <div key={c.id} className="text-xs">
                        <strong className="text-gray-700 dark:text-gray-300">{c.profiles?.full_name || c.user_id}:</strong>
                        <span className="text-gray-600 dark:text-gray-400 ml-1">{c.comment}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Belum ada komentar.</p>
                  )}
                </div>

                <div className="pt-2">
                  <textarea
                    className="input w-full text-sm resize-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="Tulis komentar..."
                    rows={2}
                    value={newComment[photo.id] || ''}
                    onChange={(e) =>
                      setNewComment({ ...newComment, [photo.id]: e.target.value })
                    }
                  />
                  <button
                    className="btn mt-2 w-full text-sm py-1.5"
                    onClick={() => submitComment(photo.id)}
                  >
                    Kirim Komentar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
