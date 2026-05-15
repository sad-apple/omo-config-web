"use client";

import { useEffect, useState } from "react";
import { useConfigStore } from "@/store/configStore";

const DRAFT_KEY = "omo-config-draft";

interface DraftData {
  json: string;
  timestamp: number;
}

export function useDraftRestore() {
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const importFromJson = useConfigStore((state) => state.importFromJson);

  useEffect(() => {
    // Check for draft in localStorage on mount
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DraftData;
        if (parsed.json && parsed.timestamp) {
          setDraftData(parsed);
          setShowRestoreDialog(true);
        }
      } catch {
        // Invalid draft data, clear it
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []);

  const restoreDraft = () => {
    if (draftData?.json) {
      importFromJson(draftData.json);
      localStorage.removeItem(DRAFT_KEY);
      setShowRestoreDialog(false);
    }
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowRestoreDialog(false);
  };

  const saveDraft = (json: string) => {
    const draft: DraftData = {
      json,
      timestamp: Date.now(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  };

  return {
    showRestoreDialog,
    draftData,
    restoreDraft,
    discardDraft,
    saveDraft,
  };
}
