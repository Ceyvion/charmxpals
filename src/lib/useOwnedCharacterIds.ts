"use client";

import { useEffect, useState } from 'react';

type OwnedCharacterIdsResponse = {
  success?: boolean;
  ids?: unknown;
};

function normalizeIds(ids: string[]): string[] {
  return ids.filter((value) => typeof value === 'string' && value.length > 0);
}

function idsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

export function useOwnedCharacterIds(initialIds: string[] = []) {
  const initialIdsKey = normalizeIds(initialIds).join('\u0000');
  const [ownedIds, setOwnedIds] = useState<string[]>(() => (initialIdsKey ? initialIdsKey.split('\u0000') : []));

  useEffect(() => {
    const nextIds = initialIdsKey ? initialIdsKey.split('\u0000') : [];
    setOwnedIds((current) => (idsEqual(current, nextIds) ? current : nextIds));
  }, [initialIdsKey]);

  useEffect(() => {
    if (initialIdsKey) return;

    let cancelled = false;

    const loadOwnedIds = async () => {
      try {
        const response = await fetch('/api/me/owned-character-ids', {
          cache: 'no-store',
        });
        if (!response.ok) return;

        const payload = (await response.json()) as OwnedCharacterIdsResponse;
        if (!payload.success || !Array.isArray(payload.ids) || cancelled) return;

        const ids = payload.ids.filter((value): value is string => typeof value === 'string' && value.length > 0);
        setOwnedIds(ids);
      } catch {
        // no-op
      }
    };

    void loadOwnedIds();

    return () => {
      cancelled = true;
    };
  }, [initialIdsKey]);

  return ownedIds;
}
