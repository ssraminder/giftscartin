/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/**',
      },
      {
        protocol: 'https',
        hostname: 'saeditdtacprxcnlgips.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Limit image sizes to avoid generating too many variants
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
    // Use webp format for better compression
    formats: ['image/webp'],
  },
};

export default nextConfig;
