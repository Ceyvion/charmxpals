import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    exclude: ['node_modules', 'node_modules/**', 'node_modules_old_*', 'node_modules_old_*/**'],
  },
  resolve: {
    alias: {
      '@/': path.join(__dirname, 'src/')
    },
  },
});
