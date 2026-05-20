"use client";

import { useState, useCallback, useRef } from "react";
import { useConfigStore } from "@/store/configStore";
import { splitConfig } from "@/lib/config-splitter";
import { toast } from "sonner";
import type { PublishSnapshot } from "@/types";

interface ConflictData {
  serverEtags: { opencode: string | null; omo: string | null };
}

/**
 * Hook for publishing configuration to disk.
 * Returns { publish, isPublishing, conflictDialog, handleConflictResolution }.
 */
export function usePublish() {
  const [isPublishing, setIsPublishing] = useState(false);
  const [conflictDialog, setConflictDialog] = useState<ConflictData | null>(null);
  const pendingPublishRef = useRef<{ config: Record<string, unknown>; json: string } | null>(null);
  const exportToJson = useConfigStore((s) => s.exportToJson);
  const addPublishSnapshot = useConfigStore((s) => s.addPublishSnapshot);
  const setLastSavedSnapshot = useConfigStore((s) => s.setLastSavedSnapshot);
  const etagsRef = useRef<{ opencode: string | null; omo: string | null }>({ opencode: null, omo: null });

  /** Update etags from API response */
  const updateEtags = useCallback((newEtags: { opencode: string | null; omo: string | null }) => {
    etagsRef.current = newEtags;
  }, []);

  const publish = useCallback(async (force = false) => {
    if (isPublishing) return;

    setIsPublishing(true);

    try {
      // Export current config as JSON
      const json = exportToJson();
      const config = JSON.parse(json);

      // POST to API route with etags
      const response = await fetch("/api/config/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, etags: etagsRef.current, force }),
      });

      if (response.status === 409) {
        const conflictData = await response.json();
        setConflictDialog(conflictData);
        pendingPublishRef.current = { config, json };
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Publish failed");
      }

      // Update etags after successful publish
      if (result.etags) {
        updateEtags(result.etags);
      }

      // Create publish snapshot
      const snapshot: PublishSnapshot = {
        id: `pub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: result.timestamp,
        snapshot: json,
        summary: `Published ${result.filesWritten.join(", ")}`,
        filesWritten: result.filesWritten,
      };

      addPublishSnapshot(snapshot);
      setLastSavedSnapshot();

      toast.success("Configuration published to disk", {
        description: `Files written: ${result.filesWritten.join(", ")}`,
      });
    } catch (error) {
      toast.error("Publish failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsPublishing(false);
    }
  }, [isPublishing, exportToJson, addPublishSnapshot, setLastSavedSnapshot, updateEtags]);

  /** Force overwrite after conflict */
  const handleOverwrite = useCallback(async () => {
    setConflictDialog(null);
    if (pendingPublishRef.current) {
      await publish(true);
      pendingPublishRef.current = null;
    }
  }, [publish]);

  /** Reload config from server */
  const handleReload = useCallback(() => {
    setConflictDialog(null);
    pendingPublishRef.current = null;
    window.location.reload();
  }, []);

  /** Open merge mode (switch to JSON editor) */
  const handleMerge = useCallback(() => {
    setConflictDialog(null);
    // Signal to DualModeEditor to show diff/merge view
    window.dispatchEvent(new CustomEvent("config:conflict-merge", {
      detail: pendingPublishRef.current?.config,
    }));
    pendingPublishRef.current = null;
  }, []);

  return { publish, isPublishing, conflictDialog, handleOverwrite, handleReload, handleMerge, updateEtags };
}
