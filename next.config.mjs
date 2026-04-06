/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["@prisma/client", "prisma", "stripe"],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
