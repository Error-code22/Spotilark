import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: process.env.NEXT_PUBLIC_ENV !== 'export' ? undefined : 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'jsmediatags': require.resolve('jsmediatags/dist/jsmediatags.min.js'),
    };

    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
      };
    }

    return config;
  },
  turbopack: {
    resolveAlias: {
      'jsmediatags': 'jsmediatags/dist/jsmediatags.min.js',
    },
  },
  images: {
    unoptimized: true, // Always disable image optimization to avoid export issues
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
