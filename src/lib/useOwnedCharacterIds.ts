"use client";

import { useEffect, useState } from 'react';

type OwnedCharacterIdsResponse = {
  success?: boolean;
  ids?: unknown;
};

export function useOwnedCharacterIds(initialIds: string[] = []) {
  const [ownedIds, setOwnedIds] = useState<string[]>(initialIds);

  useEffect(() => {
    setOwnedIds(initialIds);
  }, [initialIds]);

  useEffect(() => {
    if (initialIds.length > 0) return;

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
  }, [initialIds]);

  return ownedIds;
}
