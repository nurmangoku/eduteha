// FILE: app/dashboard/gallery/page.tsx (Dengan Perbaikan Scope Fungsi)

'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Upload from './upload'
import Image from 'next/image'
import { CommentModal } from './CommentModal'

// Tipe data yang sesuai
interface Profile { id: string; full_name: string; role: 'guru' | 'murid'; kelas: string; }
interface Comment { id: string; comment: string; user_id: string; profiles: { full_name: string } | null; }
interface Photo {
  id: string; image_url: string; caption: string; user_id: string; kelas: string;
  uploader_full_name: string; comments_count: number; gallery_comments: Comment[];
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // --- PERBAIKAN DI SINI: Fungsi dipindahkan ke luar useEffect ---
  // dan dibungkus dengan useCallback untuk stabilitas
  const fetchGalleryData = useCallback(async () => {
    // Jangan set loading di sini agar refresh realtime tidak menampilkan loading
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profileError || !profileData) {
      console.error("Gagal mengambil profil:", profileError);
      setLoading(false);
      return;
    }
    setCurrentUser(profileData);

    const { data: photosData, error: rpcError } = await supabase.rpc('get_gallery_for_user', {
      user_role: profileData.role,
      user_kelas: profileData.kelas
    });

    if (rpcError) {
      console.error("Error fetching gallery via RPC:", rpcError);
      setPhotos([]);
    } else {
      const photosWithEmptyComments = (photosData || []).map((p: any) => ({
        ...p, gallery_comments: [],
      }));
      setPhotos(photosWithEmptyComments);
    }
    setLoading(false);
  }, []);
  // -----------------------------------------------------------

  useEffect(() => {
    fetchGalleryData(); // Panggil saat komponen pertama kali dimuat

    const channel = supabase.channel('public:gallery-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, (payload) => {
        console.log('Perubahan di galeri, memuat ulang...');
        fetchGalleryData(); // Sekarang bisa dipanggil dari sini
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_comments' }, (payload) => {
        console.log('Perubahan di komentar, memuat ulang...');
        fetchGalleryData(); // Dan dari sini
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [fetchGalleryData]); // Tambahkan sebagai dependency

  const handleOpenComments = async (photo: Photo) => {
    const { data: commentsData } = await supabase.from('gallery_comments')
      .select('*, profiles(full_name)').eq('photo_id', photo.id).order('created_at', { ascending: true });
    const photoWithComments = { ...photo, gallery_comments: commentsData || [] };
    setSelectedPhoto(photoWithComments);
  }
  
  const handleDeletePhoto = async (photoId: string, imageUrl: string) => {
    if (confirm('Yakin ingin menghapus foto ini?')) {
      setPhotos(currentPhotos => currentPhotos.filter(p => p.id !== photoId));
      const { error } = await supabase.from('gallery').delete().eq('id', photoId);
      if (error) { alert('Gagal hapus data.'); fetchGalleryData(); return; }
      const filePath = imageUrl.split('/gallery/')[1];
      if (filePath) await supabase.storage.from('gallery').remove([filePath]);
    }
  };
  
  const handleEditCaption = async (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    const newCaption = prompt("Masukkan caption baru:", photo?.caption);
    if (newCaption !== null && photo) {
      setPhotos(photos.map(p => p.id === photoId ? { ...p, caption: newCaption } : p));
      await supabase.from('gallery').update({ caption: newCaption }).eq('id', photoId);
    }
  };

  if (loading) return <div className="p-6 text-center text-xl">🎨 Memuat Galeri...</div>;
  if (!currentUser) return <div className="p-6 text-center text-xl">Login untuk melihat galeri.</div>;

  return (
    <div className="py-6 px-4 space-y-8"> 
      {/* Panggil komponen Upload dengan prop yang benar */}
      <Upload onUploadSuccess={fetchGalleryData} />
      
      <h1 className="text-4xl font-bold text-center">
        {currentUser.role === 'guru' ? 'Galeri Semua Kelas' : `Galeri Kelas ${currentUser.kelas}`}
      </h1>
      {photos.length === 0 ? (
        <div className="text-center card py-12"><p className="text-xl">Belum ada foto.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {photos.map(photo => {
            const canDelete = currentUser.id === photo.user_id || currentUser.role === 'guru';
            const canEdit = currentUser.id === photo.user_id;

            return (
              <div key={photo.id} className="card flex flex-col">
                <div className="relative w-full h-64"><Image src={photo.image_url} alt={photo.caption || "Foto"} fill className="object-cover rounded-t-lg"/></div>
                <div className="p-4 flex justify-between items-center border-b">
                  <div>
                    <p className="text-sm text-gray-500">Oleh: <strong>{photo.uploader_full_name || '...'}</strong> (Kelas {photo.kelas || 'N/A'})</p>
                    <p className="font-semibold mt-1">{photo.caption}</p>
                  </div>
                  <div className="flex gap-2">
                    {canEdit && <button onClick={() => handleEditCaption(photo.id)} title="Edit" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">✏️</button>}
                    {canDelete && <button onClick={() => handleDeletePhoto(photo.id, photo.image_url)} title="Hapus" className="p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-800">🗑️</button>}
                  </div>
                </div>
                <div className="p-4 mt-auto">
                  <button onClick={() => handleOpenComments(photo)} className="text-sm font-semibold text-sky-600 hover:underline w-full text-left">
                    Lihat {photo.comments_count} Komentar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {selectedPhoto && <CommentModal photo={selectedPhoto} currentUser={currentUser} onClose={() => setSelectedPhoto(null)}/>}
    </div>
  )
}