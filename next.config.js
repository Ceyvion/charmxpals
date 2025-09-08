/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Ensure ESM packages like three/drei/fiber are transpiled for dev (and turbopack).
  // Transpilation not required for Webpack dev by default; keep minimal to avoid slowing startup.
  // transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  // Force memory repo to avoid any DB initialization during dev.
  env: {
    USE_MEMORY_DB: process.env.USE_MEMORY_DB || '1',
  },
};

module.exports = nextConfig;
