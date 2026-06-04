import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'server/**/*.test.ts',
      'server/**/*.test.tsx',
    ],
    exclude: [
      '.git',
      '.git/**',
      '.next',
      '.next/**',
      'node_modules',
      'node_modules/**',
      'node_modules_old_*',
      'node_modules_old_*/**',
      'public',
      'public/**',
      'e2e',
      'e2e/**',
      '**/*.e2e.*',
      'playwright.config.ts',
    ],
  },
  resolve: {
    alias: {
      '@/': path.join(__dirname, 'src/')
    },
  },
});
