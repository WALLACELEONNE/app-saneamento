/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7700',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7700'}/api/:path*`,
      },
    ]
  },
  images: {
    domains: ['localhost'],
  },
  typescript: {
    // Durante o build, ignora erros de TypeScript se necessário
    ignoreBuildErrors: false,
  },
  eslint: {
    // Durante o build, ignora erros de ESLint se necessário
    ignoreDuringBuilds: false,
  },
  // Configurações de performance
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig