#!/usr/bin/env ts-node
import { startPlazaServer } from './plazaServer';

async function main() {
  try {
    await startPlazaServer();
  } catch (err) {
    console.error('[mmo] failed to start plaza server', err);
    process.exitCode = 1;
  }
}

main();

