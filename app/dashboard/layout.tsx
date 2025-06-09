import Navbar from '@/components/Navbar' // Sesuaikan path jika berbeda

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      {/* Navbar akan ditampilkan di sini */}
      <Navbar />
      
      {/* Ini adalah area konten utama.
        - `md:pl-64`: Menambahkan margin kiri di desktop untuk memberi ruang bagi sidebar.
        - `pb-20`: Menambahkan padding bawah di mobile agar tidak tertutup navbar.
        - `md:pb-0`: Menghilangkan padding bawah di desktop.
      */}
      <main className="md:pl-64 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
