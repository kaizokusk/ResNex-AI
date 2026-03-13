// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai',
      },
    ],
  },
  serverExternalPackages: ['@prisma/client', 'bcrypt', 'pdf-parse'],
}

module.exports = nextConfig
