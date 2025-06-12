'use client'

import Image from "next/image"
import Link from "next/link"

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gray-300 text-center px-6">
      
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/th.png" // Ganti dengan gambar background nanti
          alt="Background"
          fill
          className="object-contain opacity-10"
        />
      </div>

      {/* Content */}
      <div className="z-10 max-w-xl space-y-6">
        <div className="flex justify-center">
          <Image
            src="/th.png"
            alt="Logo"
            width={100}
            height={100}
            // className="dark:invert"
          />
        </div>

        <h1 className="text-4xl font-bold text-black">EDUTEHA</h1>
        <p className="text-lg text-gray-700">Aplikasi belajar SDN Tunas Harapan</p>

        <Link
          href="/login"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full transition"
        >
          Login
        </Link>

        {/* <p className="text-gray-700">
          Belum punya akun?{" "}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Daftar di sini
          </Link>
        </p> */}
      </div>
    </div>
  )
}
