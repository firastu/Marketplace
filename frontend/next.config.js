/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');

// Where the Next.js server forwards /api/* requests. In Docker this is the
// backend service (http://backend:3001); locally the dev backend. Rewrites
// are resolved at build time, so set it when running `next build`.
const BACKEND_INTERNAL_URL = (
  process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001'
).replace(/\/$/, '');

const nextConfig = {
  // Self-contained server bundle for the Docker image.
  output: 'standalone',
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_INTERNAL_URL}/api/:path*`,
      },
    ];
  },
};

// Translations: src/i18n/request.ts loads messages/<locale>.json.
module.exports = createNextIntlPlugin({
  requestConfig: './src/i18n/request.ts',
  experimental: {
    messages: { format: 'json', path: './messages', locales: 'infer', precompile: true },
  },
})(nextConfig);
