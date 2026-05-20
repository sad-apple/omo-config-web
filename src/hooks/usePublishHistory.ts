"use client";

import { useEffect, useCallback } from "react";
import { useConfigStore } from "@/store/configStore";
import type { PublishSnapshot } from "@/types";

const STORAGE_KEY = "omo-publish-history";

/**
 * Hook that syncs publish history to/from localStorage.
 * Loads from localStorage on mount (only if store is empty).
 * Persists to localStorage whenever publishHistory changes.
 */
export function usePublishHistory() {
  const publishHistory = useConfigStore((s) => s.publishHistory);
  const addPublishSnapshot = useConfigStore((s) => s.addPublishSnapshot);
  const clearPublishHistory = useConfigStore((s) => s.clearPublishHistory);

  // Load from localStorage on mount (only if store is empty)
  useEffect(() => {
    if (publishHistory.length === 0) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as PublishSnapshot[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Restore each snapshot individually to avoid overwriting
            for (const snapshot of parsed) {
              addPublishSnapshot(snapshot);
            }
          }
        }
      } catch {
        // Ignore parse errors
        console.error("[publishHistory] Failed to parse stored history:");
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage whenever publishHistory changes
  useEffect(() => {
    if (publishHistory.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(publishHistory));
      } catch {
        // Ignore storage errors
        console.error("[publishHistory] Failed to persist history to localStorage:");
      }
    }
  }, [publishHistory]);
  const clearHistory = useCallback(() => {
    clearPublishHistory();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
      console.error("[publishHistory] Failed to clear history from localStorage:");
    }
  }, [clearPublishHistory]);
  return {
    publishHistory,
    addPublishSnapshot,
    clearPublishHistory: clearHistory,
  };
}
