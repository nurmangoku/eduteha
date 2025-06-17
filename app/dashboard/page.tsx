'use client'
import Profile from './profile'

export default function Dashboard() {
  // Komponen ini sekarang sangat sederhana.
  // Ia hanya perlu me-render komponen Profile.
  // Semua logika loading dan pengambilan data sudah ditangani di dalam Profile.
  return (
    <div>
      <Profile />
    </div>
  )
}
