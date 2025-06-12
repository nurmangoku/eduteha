'use client'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import RoleGuard from '@/components/RoleGuard'

// Tipe data yang sama seperti di file Excel
interface UserFromExcel {
  'Nama Lengkap': string
  'Kelas': string
  'Peran (guru/murid)': 'guru' | 'murid'
  'Password Awal (Opsional)': string
}

// Tipe data untuk hasil proses
interface ResultDetail {
  name: string;
  email?: string;
  password?: string;
  reason?: string;
}

export default function CreateUsersPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [createdUsers, setCreatedUsers] = useState<ResultDetail[]>([])
  const [failedUsers, setFailedUsers] = useState<ResultDetail[]>([])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return;

    setIsProcessing(true)
    setCreatedUsers([])
    setFailedUsers([])
    setStatusMessage('Membaca file Excel...')

    const reader = new FileReader()
    reader.onload = async (event) => {
      const data = event.target?.result
      const workbook = XLSX.read(data, { type: 'binary' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const json: UserFromExcel[] = XLSX.utils.sheet_to_json(worksheet)

      const formattedData = json.map(row => ({
        full_name: row['Nama Lengkap'],
        kelas: row['Kelas'],
        role: row['Peran (guru/murid)'],
        initial_password: row['Password Awal (Opsional)']
      }));
      
      setStatusMessage(`Mengirim ${formattedData.length} data pengguna ke server...`)

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-users-from-excel`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(formattedData),
          }
        )

        const responseData = await response.json()
        if (!response.ok) throw new Error(responseData.error || 'Terjadi kesalahan di server.')

        // --- PERBAIKAN: Baca `createdUsers` dan `failedUsers` ---
        // dan periksa apakah ada sebelum mengakses .length
        const createdCount = responseData.createdUsers?.length || 0;
        const failedCount = responseData.failedUsers?.length || 0;

        setStatusMessage(`Proses Selesai! Berhasil: ${createdCount}, Gagal: ${failedCount}.`);
        setCreatedUsers(responseData.createdUsers || [])
        setFailedUsers(responseData.failedUsers || [])

      } catch (error: any) {
        setStatusMessage(`Error: ${error.message}`)
      } finally {
        setIsProcessing(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="max-w-4xl mx-auto p-8 card mt-10">
        <h1 className="text-3xl font-bold mb-6">Buat Akun dari File Excel</h1>
        <p className="mb-4">Unggah file Excel (.xlsx) dengan kolom: <strong>&quot;Nama Lengkap&quot;</strong>, <strong>&quot;Kelas&quot;</strong>, <strong>&quot;Peran (guru/murid)&quot;</strong>, dan <strong>&quot;Password Awal (Opsional)&quot;</strong>.</p>
        <a href="/template-pendaftaran.xlsx" download className="text-sky-500 hover:underline mb-6 block">Unduh File Template Excel</a>

        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isProcessing} className="input"/>

        {statusMessage && (
          <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <p className="font-semibold">{statusMessage}</p>
          </div>
        )}

        {createdUsers.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-lg text-green-500 mb-2">Akun Berhasil Dibuat</h3>
            <p className="text-sm mb-4">Harap catat dan bagikan informasi login ini kepada pengguna baru.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-700"><tr><th className="p-2">Nama Lengkap</th><th className="p-2">Email Login (Sementara)</th><th className="p-2">Password Awal</th></tr></thead>
                <tbody>{createdUsers.map(user => (<tr key={user.email} className="border-b border-[var(--border)]"><td className="p-2">{user.name}</td><td className="p-2 font-mono">{user.email}</td><td className="p-2 font-mono">{user.password}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {failedUsers.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-lg text-red-500 mb-2">Akun Gagal Dibuat</h3>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 dark:bg-slate-700"><tr><th className="p-2">Nama Lengkap</th><th className="p-2">Alasan Kegagalan</th></tr></thead>
              <tbody>{failedUsers.map(user => (<tr key={user.name} className="border-b border-[var(--border)]"><td className="p-2">{user.name}</td><td className="p-2 text-red-500">{user.reason}</td></tr>))}</tbody>
            </table>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
