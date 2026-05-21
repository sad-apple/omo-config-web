"use client";

import { useState } from "react";
import { useConfigStore } from "@/store/configStore";

const DRAFT_KEY = "omo-config-draft";

interface DraftData {
  json: string;
  timestamp: number;
}

export function useDraftRestore() {
  const [draftState] = useState<DraftData | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DraftData;
        if (parsed.json && parsed.timestamp) {
          return parsed;
        }
      } catch {
        console.error("[draftRestore] Failed to parse draft, removing invalid entry");
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    return null;
  });
  const [showRestoreDialog, setShowRestoreDialog] = useState(draftState !== null);
  const [draftData] = useState<DraftData | null>(draftState);
  const importFromJson = useConfigStore((state) => state.importFromJson);

  const restoreDraft = () => {
    if (draftData?.json) {
      importFromJson(draftData.json);
      window.localStorage.removeItem(DRAFT_KEY);
      setShowRestoreDialog(false);
    }
  };

  const discardDraft = () => {
    window.localStorage.removeItem(DRAFT_KEY);
    setShowRestoreDialog(false);
  };

  const saveDraft = (json: string) => {
    const draft: DraftData = {
      json,
      timestamp: Date.now(),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  };

  return {
    showRestoreDialog,
    draftData,
    restoreDraft,
    discardDraft,
    saveDraft,
  };
}
