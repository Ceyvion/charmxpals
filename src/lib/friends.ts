import { cache } from 'react';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

import { getRepo, type Character } from '@/lib/repo';
import type { CrewFriend, CrewInvite } from '@/app/friends/types';

type WaveRow = {
  label: string;
  code: string;
  email: string;
};

const fallbackAccents = ['#F472B6', '#6366F1', '#22D3EE', '#FB923C', '#FBBF24', '#A855F7', '#F43F5E'];
const inviteStatuses = ['Awaiting sync', 'Ready to join', 'Crew invite sent', 'Beta wave prep'];

const loadWaveRows = cache(async (): Promise<WaveRow[]> => {
  const filePath = path.join(process.cwd(), 'data/beta_wave1_codes.csv');
  try {
    const csv = await fs.readFile(filePath, 'utf8');
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as WaveRow[];
    return records.filter((row) => row.email && row.code);
  } catch (error) {
    console.warn('[friends] Failed to parse beta wave codes:', error);
    return [];
  }
});

function determineEnergy(stats: Record<string, number> | null | undefined): CrewFriend['energy'] {
  if (!stats) return 'Medium';
  const values = Object.values(stats).filter((value) => typeof value === 'number');
  if (!values.length) return 'Medium';
  const average = values.reduce((acc, value) => acc + value, 0) / values.length;
  if (average >= 88) return 'High';
  if (average >= 72) return 'Medium';
  return 'Low';
}

function timeAgo(input: Date | null | undefined): string | null {
  if (!input) return null;
  const diff = Date.now() - input.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))}m ago`;
  if (diff < day) return `${Math.max(1, Math.round(diff / hour))}h ago`;
  if (diff < 14 * day) return `${Math.max(1, Math.round(diff / day))}d ago`;
  const months = Math.round(diff / (30 * day));
  if (months < 1) return `${Math.max(2, Math.round(diff / day))}d ago`;
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(diff / (365 * day));
  return `${years}y ago`;
}

function buildStatus(character: Character, ownedAt: Date | null): string {
  const timing = timeAgo(ownedAt);
  const routine = character.danceStyle || character.title || 'Crew rehearsal';
  const locale = character.realm || character.codeSeries || 'Arena';
  const parts = [routine];
  if (locale) parts.push(`in ${locale}`);
  if (timing) parts.push(`• ${timing}`);
  return parts.join(' ');
}

function toFriendProfile(character: Character, index: number, ownedAt: Date | null): CrewFriend {
  const accent = character.color || fallbackAccents[index % fallbackAccents.length];
  return {
    id: `${character.id}:${index}`,
    name: character.name || `Pal ${index + 1}`,
    dancerTitle: character.title || character.codeSeries || 'Crew Mate',
    status: buildStatus(character, ownedAt),
    energy: determineEnergy(character.stats || null),
    vibe: character.vibe || character.tagline || character.realm || 'Freestyle Tempest',
    accent,
  };
}

export async function loadCrewProfiles(userId: string): Promise<CrewFriend[]> {
  const repo = await getRepo();
  const ownerships = await repo.listOwnershipsByUser(userId);
  if (!ownerships.length) return [];

  const sorted = [...ownerships].sort((a, b) => {
    const getTime = (date: Date | null) => (date ? date.getTime() : 0);
    return getTime(b.createdAt ?? null) - getTime(a.createdAt ?? null);
  });

  const characters: Array<{ character: Character; ownedAt: Date | null }> = [];
  for (const ownership of sorted) {
    const character = await repo.getCharacterById(ownership.characterId);
    if (!character) continue;
    characters.push({ character, ownedAt: ownership.createdAt ?? null });
  }

  return characters.slice(0, 16).map(({ character, ownedAt }, idx) => toFriendProfile(character, idx, ownedAt));
}

export async function loadPendingInvites(userEmail: string | null): Promise<CrewInvite[]> {
  const rows = await loadWaveRows();
  if (!rows.length) return [];

  const filtered = rows.filter((row) => !userEmail || row.email.toLowerCase() !== userEmail.toLowerCase());
  return filtered.slice(0, 4).map((row, idx) => ({
    id: row.code,
    handle: `@${row.email.split('@')[0]}`,
    sentAt: `${row.label} • ${inviteStatuses[idx % inviteStatuses.length]}`,
  }));
}
