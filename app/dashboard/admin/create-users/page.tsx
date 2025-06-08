// FILE: app/dashboard/admin/create-users/page.tsx

'use client'
import { useState } from 'react'
import * as XLSX from 'xlsx' // Impor library xlsx
import RoleGuard from '@/components/RoleGuard' // Gunakan RoleGuard Anda

// Tipe data yang diharapkan dari file Excel
interface UserFromExcel {
  'Nama Lengkap': string
  'Kelas': string // Pastikan nama kolom di Excel cocok
  'Peran (guru/murid)': 'guru' | 'murid'
  'Password Awal (Opsional)': string
}

export default function CreateUsersPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      setIsProcessing(true)
      setResult('Membaca file...')

      const data = event.target?.result
      const workbook = XLSX.read(data, { type: 'binary' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const json: UserFromExcel[] = XLSX.utils.sheet_to_json(worksheet)

      // Format data agar sesuai dengan yang diharapkan oleh Edge Function
      const formattedData = json.map(row => ({
        full_name: row['Nama Lengkap'],
        kelas: row['Kelas'],
        role: row['Peran (guru/murid)'],
        initial_password: row['Password Awal (Opsional)']
      }));
      
      setResult(`Memproses ${formattedData.length} pengguna...`)

      try {
        // Panggil Edge Function
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
        if (!response.ok) throw new Error(responseData.error)

        setResult(`Proses Selesai! Berhasil: ${responseData.created_count}, Gagal: ${responseData.failed_count}. Lihat konsol untuk detail.`);
        console.log("Detail Berhasil:", responseData.created_details)
        if (responseData.failed_details.length > 0) {
            console.error("Detail Gagal:", responseData.failed_details);
        } else {
            console.log("Detail Gagal:", responseData.failed_details);
        }

      } catch (error: any) {
        setResult(`Error: ${error.message}`)
      } finally {
        setIsProcessing(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  return (
    <RoleGuard allowedRoles={['guru']}>
      <div className="max-w-2xl mx-auto p-8 card mt-10">
        <h1 className="text-3xl font-bold mb-6">Buat Akun dari File Excel</h1>
        
        <p className="mb-4">
          Unggah file Excel (.xlsx) dengan kolom: <strong>"Nama Lengkap"</strong>, <strong>"Kelas"</strong>, <strong>"Peran (guru/murid)"</strong>, dan <strong>"Password Awal (Opsional)"</strong>.
        </p>
        
        <a href="/template-pendaftaran.xlsx" download className="text-sky-500 hover:underline mb-6 block">
          Unduh File Template Excel
        </a>

        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          disabled={isProcessing}
          className="input"
        />

        {result && (
          <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <p className="font-semibold">Status Proses:</p>
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}