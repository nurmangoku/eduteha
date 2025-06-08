// tailwind.config.ts

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}', // <-- PASTIKAN BARIS INI ADA!
  ],
  theme: {
    extend: {
      // Anda bisa menambahkan ekstensi tema di sini jika perlu
    },
  },
  plugins: [],
}
export default config