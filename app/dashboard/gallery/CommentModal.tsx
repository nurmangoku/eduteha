// FILE: app/dashboard/gallery/CommentModal.tsx

'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Sesuaikan path jika perlu

// Definisikan tipe data yang diperlukan oleh modal ini
interface Profile {
  full_name: string;
}

interface Comment {
  id: string;
  comment: string;
  user_id: string;
  profiles: Profile | null;
}

interface Photo {
  id: string;
  gallery_comments: Comment[];
}

interface CurrentUser {
    id: string;
}

interface Props {
  photo: Photo;
  currentUser: CurrentUser | null;
  onClose: () => void;
}

export function CommentModal({ photo, currentUser, onClose }: Props) {
  const [comments, setComments] = useState(photo.gallery_comments);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Efek ini akan menyinkronkan state komentar jika data dari parent berubah
  useEffect(() => {
    setComments(photo.gallery_comments);
  }, [photo.gallery_comments]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    setIsLoading(true);

    const optimisticComment = {
      id: `temp-${Date.now()}`,
      comment: newComment,
      user_id: currentUser.id,
      profiles: { full_name: 'Anda' }
    };

    // 1. Perbarui UI secara optimis
    setComments(currentComments => [...currentComments, optimisticComment]);
    setNewComment('');

    // 2. Kirim data ke database
    const { data, error } = await supabase
      .from('gallery_comments')
      .insert({ photo_id: photo.id, user_id: currentUser.id, comment: optimisticComment.comment })
      .select('*, profiles(full_name)')
      .single();

    if (error) {
      alert("Gagal mengirim komentar.");
      setComments(currentComments => currentComments.filter(c => c.id !== optimisticComment.id));
    } else {
      setComments(currentComments => 
        currentComments.map(c => c.id === optimisticComment.id ? data : c)
      );
    }
    setIsLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (confirm('Yakin ingin menghapus komentar ini?')) {
      const originalComments = comments;
      setComments(currentComments => currentComments.filter(c => c.id !== commentId));
      const { error } = await supabase.from('gallery_comments').delete().eq('id', commentId);
      if (error) {
        alert('Gagal menghapus komentar.');
        setComments(originalComments);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <div className="card w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Komentar</h2>
          <button onClick={onClose} className="text-3xl font-bold hover:text-red-500">&times;</button>
        </div>
        
        <div className="space-y-3 flex-grow overflow-y-auto pr-2 mb-4">
          {comments.length > 0 ? (
            comments.map(comment => (
              <div key={comment.id} className="text-sm flex justify-between items-start gap-2">
                <div>
                  <strong>{comment.profiles?.full_name || '... '}: </strong>
                  <span>{comment.comment}</span>
                </div>
                {currentUser?.id === comment.user_id && (
                  <button onClick={() => handleDeleteComment(comment.id)} className="text-xs text-red-500 hover:underline flex-shrink-0">
                    Hapus
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-center text-gray-500 py-8">Jadilah yang pertama berkomentar!</p>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
          <input
            className="input flex-grow text-sm"
            placeholder="Tulis komentar..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button
            className="btn btn-primary text-sm py-1.5 px-3"
            onClick={handleAddComment}
            disabled={isLoading}
          >
            {isLoading ? '...' : 'Kirim'}
          </button>
        </div>
      </div>
    </div>
  );
}