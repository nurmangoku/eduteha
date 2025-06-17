'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Upload from './upload'
import Image from 'next/image'
import { CommentModal } from './CommentModal'
import { Edit, Trash2, Settings } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Tipe data untuk konsistensi
interface Profile { id: string; full_name: string; role: 'guru' | 'murid'; kelas: string; }
interface Photo {
  id: string; image_url: string; caption: string; user_id: string; kelas: string;
  uploader_full_name: string; comments_count: number; gallery_comments: any[];
}
interface GallerySetting { kelas: string; can_upload: boolean; }

// Fungsi helper untuk optimasi gambar
const getOptimizedUrl = (url: string, width: number, quality: number = 75): string => {
  if (!url) return '';
  return `${url}?width=${width}&quality=${quality}`;
};

// Komponen untuk Pagination
const Pagination = ({ currentPage, totalPages, onPageChange, loading }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void, loading: boolean }) => {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          disabled={loading}
          className={`w-10 h-10 rounded-md transition-colors disabled:opacity-50 ${
            currentPage === page 
              ? 'bg-sky-500 text-white font-bold' 
              : 'bg-slate-200 dark:bg-slate-700 hover:bg-sky-200'
          }`}
        >
          {page}
        </button>
      ))}
    </div>
  );
};

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [canStudentUpload, setCanStudentUpload] = useState(false);
  const [gallerySettings, setGallerySettings] = useState<GallerySetting[]>([]);
  
  const PHOTOS_PER_PAGE = 9;
  const router = useRouter();

  // Fungsi untuk memuat data galeri untuk halaman tertentu
  const fetchPageData = useCallback(async (profile: Profile, page: number) => {
    setLoading(true);
    const { data: photosData, error } = await supabase.rpc('get_gallery_feed', {
        p_user_role: profile.role,
        p_user_kelas: profile.kelas,
        page_size: PHOTOS_PER_PAGE,
        page_number: page
    });

    if (error) {
      console.error("Error fetching gallery:", error);
      setPhotos([]);
    } else {
      setPhotos(photosData || []);
    }
    setLoading(false);
  }, []);

  // useEffect utama untuk inisialisasi halaman
  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!profileData) {
        setLoading(false);
        return;
      }
      setCurrentUser(profileData);
      
      // Ambil total hitungan untuk pagination
      const { data: totalCount } = await supabase.rpc('get_gallery_count', {
          p_user_role: profileData.role,
          p_user_kelas: profileData.kelas
      });
      setTotalPages(Math.ceil((totalCount || 1) / PHOTOS_PER_PAGE));

      // Ambil data untuk halaman pertama
      await fetchPageData(profileData, 1);
      
      // Ambil pengaturan sesuai peran
      if (profileData.role === 'guru') {
        const { data: settingsData } = await supabase.from('class_gallery_settings').select('*').order('kelas');
        setGallerySettings(settingsData || []);
      } else {
        const { data: setting } = await supabase.from('class_gallery_settings').select('can_upload').eq('kelas', profileData.kelas).single();
        const isAllowed = setting?.can_upload ?? false;
        const today = new Date().toISOString().slice(0, 10);
        const { count } = await supabase.from('gallery').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', `${today}T00:00:00Z`);
        setCanStudentUpload(isAllowed && (count === 0));
      }
    };
    initializePage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // useEffect terpisah untuk bereaksi saat halaman berubah
  useEffect(() => {
    if (currentUser) {
      fetchPageData(currentUser, currentPage);
    }
  }, [currentPage, currentUser, fetchPageData]);

  const handleToggleSetting = async (kelas: string, currentStatus: boolean) => {
    setGallerySettings(settings => settings.map(s => s.kelas === kelas ? {...s, can_upload: !currentStatus} : s));
    await supabase.from('class_gallery_settings').update({ can_upload: !currentStatus }).eq('kelas', kelas);
  };
  const handleOpenComments = async (photo: Photo) => {
    const { data: commentsData } = await supabase
      .from('gallery_comments')
      .select('*, profiles(full_name)')
      .eq('photo_id', photo.id)
      .order('created_at', { ascending: true });
    
    const photoWithFullComments = { ...photo, gallery_comments: commentsData || [] };
    setSelectedPhoto(photoWithFullComments);
  };
  const handleDeletePhoto = async (photoId: string, imageUrl: string) => {
      if (confirm('Yakin ingin menghapus foto ini?')) {
          setPhotos(currentPhotos => currentPhotos.filter(p => p.id !== photoId));
          const { error } = await supabase.from('gallery').delete().eq('id', photoId);
          if (error) { alert('Gagal hapus data.'); if (currentUser) fetchPageData(currentUser, 1); return; }
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
  
  const handleUploadSuccess = () => {
      if (currentUser) {
        if (currentPage !== 1) {
          setCurrentPage(1);
        } else {
          fetchPageData(currentUser, 1);
        }
        setCanStudentUpload(false);
      }
  }

  return (
    <div className="py-6 px-4 space-y-8">
      {/* Panel Kontrol Guru */}
      {currentUser?.role === 'guru' && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings size={20}/> Kontrol Izin Unggah Galeri</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {gallerySettings.map(setting => (
              <div key={setting.kelas} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <span className="font-semibold text-sm">{setting.kelas}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={setting.can_upload} onChange={() => handleToggleSetting(setting.kelas, setting.can_upload)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Komponen Upload */}
      {currentUser?.role === 'murid' && canStudentUpload && <Upload onUploadSuccess={handleUploadSuccess} />}
      {currentUser?.role === 'murid' && !canStudentUpload && (
          <div className="text-center card p-4 text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/30">
              <p>Kamu tidak bisa mengunggah foto saat ini. Izin ditutup atau kamu sudah mengunggah hari ini.</p>
          </div>
      )}
      
      {loading && photos.length === 0 ? <p className="text-center">Memuat galeri...</p> : photos.length === 0 ? <div className="text-center card py-12"><p className="text-xl">Belum ada foto di galeri.</p></div> : (
        <>
          {/* --- PERBAIKAN: Desain Kartu Galeri Baru --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {photos.map(photo => (
              <div key={photo.id} className="card p-0 flex flex-col overflow-hidden">
                {/* Bagian Gambar */}
                <div className="relative w-full h-56 group">
                  <Image
                    src={getOptimizedUrl(photo.image_url, 600)}
                    alt={photo.caption || 'Foto galeri'}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>

                {/* Bagian Konten Kartu */}
                <div className="p-4 flex flex-col flex-grow">
                    <div className="flex justify-between items-start gap-2">
                        <div>
                            <p className="font-semibold line-clamp-2">{photo.caption || "Tanpa Judul"}</p>
                            <p className="text-xs text-gray-500 mt-1">oleh {photo.uploader_full_name || '...'} (Kelas {photo.kelas})</p>
                        </div>
                        {currentUser && (currentUser.id === photo.user_id || currentUser.role === 'guru') && (
                            <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => handleEditCaption(photo.id)} title="Edit Caption" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><Edit size={16}/></button>
                                <button onClick={() => handleDeletePhoto(photo.id, photo.image_url)} title="Hapus Foto" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-red-500"><Trash2 size={16}/></button>
                            </div>
                        )}
                    </div>
                    <div className="mt-auto pt-4">
                        <button onClick={() => handleOpenComments(photo)} className="text-sm font-semibold text-sky-600 hover:underline w-full text-left">
                            Lihat {photo.comments_count > 0 ? `${photo.comments_count} Komentar` : 'dan Beri Komentar'}
                        </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
          
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} loading={loading} />
        </>
      )}
      {selectedPhoto && <CommentModal photo={selectedPhoto} currentUser={currentUser} onClose={() => setSelectedPhoto(null)}/>}
    </div>
  )
}
