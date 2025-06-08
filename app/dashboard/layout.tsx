import Navbar from '@/components/Navbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <Navbar />
      {/* Tambahkan padding kiri di desktop (md:pl-64) agar konten tidak tertutup sidebar */}
      <main className="md:pl-64">
        {children}
      </main>
    </div>
  )
}