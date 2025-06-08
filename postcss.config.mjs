// postcss.config.mjs
// Konfigurasi ini sudah BENAR.
// Error sebelumnya terjadi karena paketnya belum terinstal.

export default {
  plugins: {
    'postcss-nesting': {},
    '@tailwindcss/postcss': {},
    'autoprefixer': {}, // <-- Paket ini yang baru saja Anda install
  },
}