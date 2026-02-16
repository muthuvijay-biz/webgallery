import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'rmhjtozbrgwkjhreibii.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
    ],
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Increase body size limit for file uploads
    },
  },

  // Prevent native `canvas` (optional dep of pdfjs-dist) from being bundled into
  // client/server bundles where it's not available. This tells webpack to
  // fallback `canvas` to `false` so require('canvas') won't try to resolve
  // native bindings during build.
  webpack(config) {
    if (config.resolve) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        canvas: false,
      };
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        // explicit no-op alias for platforms that attempt to import canvas
        canvas: false,
      };
    }
    return config;
  },
};

export default nextConfig;