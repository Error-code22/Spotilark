import type { NextConfig } from 'next';

const isExport = process.env.NEXT_PUBLIC_ENV === 'export';

const nextConfig: NextConfig = {
  output: isExport ? 'export' : 'standalone',
  transpilePackages: ['lucide-react'],
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
  env: {
    NEXT_PUBLIC_TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  },
  serverExternalPackages: ['cheerio', 'yt-search'],
};

export default nextConfig;
