/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias.uncrypto = require('path').resolve(__dirname, 'src/polyfills/uncrypto.ts');
    return config;
  },
  // Ensure ESM packages like three/drei/fiber are transpiled for dev (and turbopack).
  // Transpilation not required for Webpack dev by default; keep minimal to avoid slowing startup.
  // transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  env: {
    USE_MEMORY_DB: process.env.USE_MEMORY_DB ?? (isDev ? '1' : ''),
  },
};

module.exports = nextConfig;
