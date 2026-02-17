#!/usr/bin/env ts-node
import { loadEnvConfig } from '@next/env';

async function main() {
  // Match Next.js env loading so token signing and WS verification share the same secret.
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');

  try {
    const { startPlazaServer } = await import('./plazaServer');
    await startPlazaServer();
  } catch (err) {
    console.error('[mmo] failed to start plaza server', err);
    process.exitCode = 1;
  }
}

main();
