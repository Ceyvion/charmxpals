const path = require('path');

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';
const uncryptoPath = path.resolve(__dirname, 'src/polyfills/uncrypto.ts');

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias.uncrypto = uncryptoPath;
    return config;
  },
  turbopack: {
    root: __dirname,
    resolveAlias: {
      uncrypto: uncryptoPath,
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  // Ensure ESM packages like three/drei/fiber are transpiled for dev (and turbopack).
  // Transpilation not required for Webpack dev by default; keep minimal to avoid slowing startup.
  // transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  env: {
    USE_MEMORY_DB: process.env.USE_MEMORY_DB ?? (isDev ? '1' : ''),
  },
};

module.exports = nextConfig;
