#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createHmac } from 'node:crypto';

import { Redis } from '@upstash/redis';

const secret = process.env.CODE_HASH_SECRET;

if (!secret) {
  console.error('[import-codes] CODE_HASH_SECRET is required to hash codes before upload.');
  process.exit(1);
}

const defaultFile = path.resolve(process.cwd(), 'cxp_codes.ndjson');
const fileArg = process.argv[2];
const filePath = path.resolve(fileArg || process.env.CXP_CODES_FILE || defaultFile);

if (!fs.existsSync(filePath)) {
  console.error(`[import-codes] Could not find NDJSON file at ${filePath}. Pass a path as the first argument, e.g.\n  node scripts/import-codes.mjs ./path/to/cxp_codes.ndjson`);
  process.exit(1);
}

const redis = Redis.fromEnv();

const CODE_PREFIX = process.env.REDEEM_CODE_PREFIX || 'redeem:code';

function hashCode(raw) {
  const code = String(raw || '').trim().toUpperCase();
  if (!code) throw new Error('Empty code');
  return createHmac('sha256', secret).update(code).digest('hex');
}

async function importCodes() {
  const startedAt = Date.now();
  let processed = 0;
  let inserted = 0;
  let skipped = 0;
  let errored = 0;

  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    processed += 1;
    try {
      const payload = JSON.parse(trimmed);
      const code = payload.code;
      if (!code) {
        throw new Error('Missing "code" field');
      }

      const codeHash = hashCode(code);
      const key = `${CODE_PREFIX}:${codeHash}`;
      const record = {
        series: payload.series || null,
        createdAt: new Date().toISOString(),
      };
      const result = await redis.set(key, JSON.stringify(record), { nx: true });
      if (result === 'OK') inserted += 1;
      else skipped += 1;
    } catch (error) {
      errored += 1;
      console.error('[import-codes] Failed to process line:', error);
    }
  }

  const durationMs = Date.now() - startedAt;
  console.log('[import-codes] Finished');
  console.table({ processed, inserted, skipped, errored, seconds: (durationMs / 1000).toFixed(2) });
}

importCodes().catch((error) => {
  console.error('[import-codes] Unexpected failure:', error);
  process.exit(1);
});
