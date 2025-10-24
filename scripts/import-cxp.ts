import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';

import { getRedis } from '@/lib/redis';
import { redisKeys } from '@/lib/repoRedis';
import { hashClaimCode } from '@/lib/crypto';
import type { Character } from '@/lib/repo';
import { loreBySeries } from '@/data/characterLore';

type CliOptions = {
  file: string;
  setName: string;
};

type LongRow = {
  label: string;
  code: string;
  color?: string;
  model?: string;
};

type StoredCharacter = Character & { createdAt: string; order: number };
type StoredUnit = {
  id: string;
  characterId: string;
  codeHash: string;
  secureSalt: string;
  status: 'available' | 'claimed' | 'blocked';
  claimedBy: string | null;
  claimedAt: string | null;
  createdAt: string;
};

type ImportSummary = {
  setId: string;
  charactersCreated: number;
  charactersTotal: number;
  unitsCreated: number;
  unitsSkipped: number;
  uniqueCodes: number;
  labelBreakdown: Array<{ label: string; totalCodes: number; created: number; skipped: number }>;
};

const redis = getRedis();
const DEFAULT_ART_REFS = { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' };

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    file: 'data/cxp.csv',
    setName: 'CXP Wave 1',
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if ((arg === '--file' || arg === '-f') && args[i + 1]) {
      options.file = args[i + 1];
      i += 1;
    } else if ((arg === '--set' || arg === '--set-name') && args[i + 1]) {
      options.setName = args[i + 1];
      i += 1;
    }
  }

  return options;
}

export function toLongRows(csv: string): LongRow[] {
  const records = parse(csv, {
    skip_empty_lines: true,
    trim: true,
    columns: (header: string[]) => header.map((h) => h.trim()),
  }) as Record<string, string>[];

  if (!records.length) return [];

  const headers = Object.keys(records[0] ?? {});
  const lowerHeaders = headers.map((h) => h.toLowerCase());
  const codeIdx = lowerHeaders.indexOf('code');
  const labelIdx = lowerHeaders.indexOf('label');
  const colorIdx = lowerHeaders.indexOf('color');
  const modelIdx = lowerHeaders.indexOf('model');

  const rows: LongRow[] = [];

  if (codeIdx >= 0) {
    const codeKey = headers[codeIdx];
    const labelKey = labelIdx >= 0 ? headers[labelIdx] : headers[codeIdx];
    const colorKey = colorIdx >= 0 ? headers[colorIdx] : null;
    const modelKey = modelIdx >= 0 ? headers[modelIdx] : null;

    for (const record of records) {
      const rawCode = String(record[codeKey] ?? '').trim();
      if (!rawCode) continue;
      const label = String(record[labelKey] ?? '').trim() || 'Unknown';
      rows.push({
        label,
        code: rawCode,
        color: colorKey ? String(record[colorKey] ?? '').trim() || undefined : undefined,
        model: modelKey ? String(record[modelKey] ?? '').trim() || undefined : undefined,
      });
    }
  } else {
    for (const record of records) {
      for (const header of headers) {
        const rawCode = String(record[header] ?? '').trim();
        if (!rawCode) continue;
        rows.push({ label: header, code: rawCode });
      }
    }
  }

  return rows;
}

async function readExistingCharacters(): Promise<StoredCharacter[]> {
  const raw = await redis.hvals(redisKeys.characters);
  return (raw || [])
    .map((entry: unknown) => {
      if (entry == null) return null;
      if (typeof entry === 'string') {
        try {
          return JSON.parse(entry) as StoredCharacter;
        } catch {
          return null;
        }
      }
      if (typeof entry === 'object') return entry as StoredCharacter;
      return null;
    })
    .filter((value: StoredCharacter | null): value is StoredCharacter => Boolean(value));
}

async function readExistingCodes(hashes: string[]): Promise<Set<string>> {
  if (!hashes.length) return new Set();
  const results = await Promise.all(hashes.map((hash) => redis.hget(redisKeys.unitByCodeHash, hash)));
  const existing = new Set<string>();
  hashes.forEach((hash, idx) => {
    if (results[idx]) existing.add(hash);
  });
  return existing;
}

function buildDescription(row: LongRow): string | null {
  const parts: string[] = [];
  if (row.color) parts.push(row.color);
  if (row.model) parts.push(row.model);
  return parts.length ? `${parts.join(' ')} variant` : null;
}

export async function runImport(rows: LongRow[], setName: string): Promise<ImportSummary> {
  if (!rows.length) {
    throw new Error('No codes provided for import');
  }

  const secret = process.env.CODE_HASH_SECRET;
  if (!secret) {
    throw new Error('CODE_HASH_SECRET missing; required for hashing claim codes.');
  }

  const normalizedSetName = setName.trim().toLowerCase();
  const existingSetEntry = normalizedSetName ? ((await redis.hget(redisKeys.characterSets, normalizedSetName)) as string | null) : null;
  let setId = uuid();
  if (existingSetEntry) {
    try {
      const parsed = JSON.parse(existingSetEntry) as { id?: string };
      if (parsed?.id) setId = parsed.id;
      else if (typeof existingSetEntry === 'string') setId = existingSetEntry;
    } catch {
      setId = existingSetEntry;
    }
  }

  const existingCharacters = await readExistingCharacters();
  const existingBySeries = new Map<string, StoredCharacter>();
  const existingByName = new Map<string, StoredCharacter>();
  existingCharacters.forEach((character) => {
    if (character.codeSeries) existingBySeries.set(character.codeSeries, character);
    if (character.name) existingByName.set(character.name, character);
  });

  const baseOrder = existingCharacters.reduce((max, current) => Math.max(max, current.order ?? 0), 0);
  const nowIso = new Date().toISOString();

  const labels = Array.from(new Set(rows.map((row) => row.label))).sort((a, b) => {
    const orderA = loreBySeries[a]?.order ?? 999;
    const orderB = loreBySeries[b]?.order ?? 999;
    if (orderA === orderB) return a.localeCompare(b);
    return orderA - orderB;
  });

  const characterRecords: Record<string, string> = {};
  const charactersForSeries = new Map<string, StoredCharacter>();
  const uniqueCharacterIds = new Set(existingCharacters.map((c) => c.id));
  let charactersCreated = 0;

  labels.forEach((label, idx) => {
    const lore = loreBySeries[label];
    if (!lore) {
      throw new Error(`No lore mapping found for series "${label}". Update src/data/characterLore.ts.`);
    }

    const existing = existingBySeries.get(label) ?? existingByName.get(label);
    const order = lore.order ?? existing?.order ?? baseOrder + idx + 1;
    const artRefs =
      (lore.artRefs && Object.keys(lore.artRefs).length > 0 && lore.artRefs) ||
      (existing?.artRefs && Object.keys(existing.artRefs ?? {}).length > 0 && existing.artRefs) ||
      DEFAULT_ART_REFS;

    const updated: StoredCharacter = {
      id: existing?.id ?? uuid(),
      setId,
      name: lore.name,
      description: lore.description,
      rarity: lore.rarity,
      stats: lore.stats,
      artRefs,
      codeSeries: lore.series,
      slug: lore.slug,
      realm: lore.realm,
      color: lore.color,
      title: lore.title,
      vibe: lore.vibe,
      danceStyle: lore.danceStyle,
      coreCharm: lore.coreCharm,
      personality: lore.personality,
      tagline: lore.tagline,
      order,
      createdAt: existing?.createdAt ?? nowIso,
    };

    if (!existing) {
      charactersCreated += 1;
    }

    uniqueCharacterIds.add(updated.id);
    characterRecords[updated.id] = JSON.stringify(updated);
    existingBySeries.set(label, updated);
    if (updated.codeSeries) existingBySeries.set(updated.codeSeries, updated);
    existingByName.set(updated.name, updated);
    charactersForSeries.set(label, updated);
    if (updated.codeSeries) charactersForSeries.set(updated.codeSeries, updated);
  });

  if (Object.keys(characterRecords).length) {
    await redis.hset(redisKeys.characters, characterRecords);
  }

  if (normalizedSetName) {
    await redis.hset(redisKeys.characterSets, { [normalizedSetName]: JSON.stringify({ id: setId, name: setName }) });
  }

  const codeMap = new Map<string, { label: string }>();

  for (const row of rows) {
    const label = row.label;
    if (!charactersForSeries.has(label)) {
      throw new Error(`No character found for label "${label}"`);
    }
    const codeHash = hashClaimCode(row.code, secret);
    if (!codeMap.has(codeHash)) {
      codeMap.set(codeHash, { label });
    }
  }

  const uniqueCodes = codeMap.size;
  const allHashes = Array.from(codeMap.keys());
  const existingHashes = await readExistingCodes(allHashes);

  const unitRecords: Record<string, string> = {};
  const createdHashes = new Set<string>();
  let unitsCreated = 0;
  for (const [codeHash, { label }] of Array.from(codeMap.entries())) {
    if (existingHashes.has(codeHash)) continue;
    const character = charactersForSeries.get(label);
    if (!character) continue;
    const unit: StoredUnit = {
      id: uuid(),
      characterId: character.id,
      codeHash,
      secureSalt: randomBytes(16).toString('hex'),
      status: 'available',
      claimedBy: null,
      claimedAt: null,
      createdAt: nowIso,
    };
    unitRecords[unit.id] = JSON.stringify(unit);
    await redis.hset(redisKeys.unitByCodeHash, { [codeHash]: unit.id });
    createdHashes.add(codeHash);
    unitsCreated += 1;
  }

  if (Object.keys(unitRecords).length) {
    await redis.hset(redisKeys.units, unitRecords);
  }

  const unitsSkipped = uniqueCodes - unitsCreated;

  const labelToHashes = new Map<string, Set<string>>();
  rows.forEach((row) => {
    if (!labelToHashes.has(row.label)) {
      labelToHashes.set(row.label, new Set());
    }
    const codeHash = hashClaimCode(row.code, secret);
    labelToHashes.get(row.label)!.add(codeHash);
  });

  const labelBreakdown = Array.from(labelToHashes.entries()).map(([label, hashes]) => {
    let created = 0;
    let skipped = 0;
    hashes.forEach((hash) => {
      if (createdHashes.has(hash)) created += 1;
      else skipped += 1;
    });
    return {
      label,
      totalCodes: hashes.size,
      created,
      skipped,
    };
  });

  return {
    setId,
    charactersCreated,
    charactersTotal: uniqueCharacterIds.size,
    unitsCreated,
    unitsSkipped,
    uniqueCodes,
    labelBreakdown,
  };
}

async function main() {
  try {
    const options = parseArgs();
    const resolvedPath = path.resolve(options.file);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`CSV file not found at ${resolvedPath}`);
    }
    const csv = fs.readFileSync(resolvedPath, 'utf8');
    const rows = toLongRows(csv);
    const summary = await runImport(rows, options.setName);

    console.log(`Imported set "${options.setName}" (${summary.setId})`);
    console.log(`Characters: ${summary.charactersTotal} total (${summary.charactersCreated} created in this run)`);
    console.log(`Codes: ${summary.uniqueCodes} unique -> ${summary.unitsCreated} inserted, ${summary.unitsSkipped} skipped as existing`);
    console.table(
      summary.labelBreakdown
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((entry) => ({
          Label: entry.label,
          Codes: entry.totalCodes,
          Created: entry.created,
          Skipped: entry.skipped,
        })),
    );
  } catch (error) {
    console.error('[import-cxp] Failed:', error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
