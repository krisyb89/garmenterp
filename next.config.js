/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prevent Cannot find module ./vendor-chunks/xxx.js errors in dev mode.
  // Next.js 14.2.x has a bug where server-side vendor chunks go stale during HMR.
  // Disabling server chunk splitting in dev avoids this entirely.
  webpack: (config, { isServer, dev }) => {
    if (isServer && dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
