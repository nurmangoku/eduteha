import Navbar from '@/components/Navbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-16 md:pt-20 pb-16 md:pb-6">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4">{children}</main>
    </div>
  )
}
