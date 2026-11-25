'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WeightUnit } from '@coaching/shared';
import { PLATE_SET_STORAGE_KEY, allPlates, parsePlateSet, serializePlateSet } from './calculators-model';

function read(): string | null {
  try {
    return window.localStorage.getItem(PLATE_SET_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * The plates the athlete has in their gym for `unit`, saved in this browser.
 * Starts with every plate (server render), then loads the saved set after mount.
 */
export function usePlateSet(unit: WeightUnit): {
  plates: readonly number[];
  toggle: (plate: number) => void;
} {
  const [plates, setPlates] = useState<readonly number[]>(() => allPlates(unit));

  useEffect(() => {
    setPlates(parsePlateSet(read(), unit));
    function onStorage(e: StorageEvent) {
      if (e.key === PLATE_SET_STORAGE_KEY) setPlates(parsePlateSet(e.newValue, unit));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [unit]);

  const toggle = useCallback(
    (plate: number) => {
      setPlates((prev) => {
        const on = prev.includes(plate);
        // Keep at least one plate so the loader always has something to work with.
        if (on && prev.length === 1) return prev;
        const next = allPlates(unit).filter((p) => (p === plate ? !on : prev.includes(p)));
        try {
          window.localStorage.setItem(PLATE_SET_STORAGE_KEY, serializePlateSet(read(), unit, next));
        } catch {
          // Storage blocked: the choice still applies for this visit.
        }
        return next;
      });
    },
    [unit],
  );

  return { plates, toggle };
}
