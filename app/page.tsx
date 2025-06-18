import Link from 'next/link'
import Image from 'next/image' // Impor komponen Image dari Next.js

// Ini adalah komponen Server, sederhana dan cepat.
// Tugasnya hanya menampilkan halaman utama.
export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-center p-8">
      <div className="max-w-2xl">
        
        {/* --- BAGIAN LOGO BARU --- */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/th.png" // Pastikan nama file ini sesuai dengan nama file Anda di folder /public
            alt="Logo Eduteha"
            width={150} // Tentukan lebar logo
            height={150} // Tentukan tinggi logo
            priority // Prioritaskan pemuatan logo
          />
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-sky-500 to-emerald-500 text-transparent bg-clip-text">
          Selamat Datang di Eduteha
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
          Platform pembelajaran interaktif SDN Tunas Harapan yang dirancang oleh untuk membuat belajar menjadi menyenangkan dan efektif.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login" className="btn btn-primary w-full sm:w-auto text-lg">
            Masuk Sekarang
          </Link>
          <p className="text-sm text-gray-500">
            atau hubungi admin untuk pendaftaran.
          </p>
        </div>
      </div>
    </div>
  )
}
