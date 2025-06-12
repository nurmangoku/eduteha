// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lgnitspwkwkkgljrsgtz.supabase.co', // <-- Salin hostname dari error Anda ke sini
        port: '',
        pathname: '/storage/v1/object/public/**', // Izinkan semua gambar dari storage public
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/8.x/initials/svg/**',
      },
    ],
  },
};

export default nextConfig;