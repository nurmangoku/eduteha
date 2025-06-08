// FILE: lib/types.ts

// Tipe untuk profil pengguna, termasuk kolom baru kita
export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string;
  role: 'student' | 'teacher'; // Peran pengguna
  class_level: number;        // Tingkatan kelas
};

// Tipe untuk setiap komentar di galeri
export type GalleryComment = {
  id: string;
  created_at: string;
  comment: string;
  user_id: string;
  photo_id: string;
  profiles: Pick<Profile, 'full_name' | 'avatar_url'>; // Profil singkat penulis komentar
};

// Tipe untuk setiap foto di galeri, termasuk komentar terkait
export type GalleryPhoto = {
  id: string;
  created_at: string;
  caption: string;
  image_url: string;
  user_id: string;
  class_level: number;
  profiles: Pick<Profile, 'full_name' | 'avatar_url'>; // Profil singkat pengunggah
  gallery_comments: GalleryComment[]; // Daftar komentar
};