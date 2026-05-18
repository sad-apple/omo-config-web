"use client";

import { useState, useCallback } from "react";
import { useConfigStore } from "@/store/configStore";
import { splitConfig } from "@/lib/config-splitter";
import { toast } from "sonner";
import type { PublishSnapshot } from "@/types";

/**
 * Hook for publishing configuration to disk.
 * Returns { publish, isPublishing }.
 */
export function usePublish() {
  const [isPublishing, setIsPublishing] = useState(false);
  const exportToJson = useConfigStore((s) => s.exportToJson);
  const addPublishSnapshot = useConfigStore((s) => s.addPublishSnapshot);
  const setLastSavedSnapshot = useConfigStore((s) => s.setLastSavedSnapshot);

  const publish = useCallback(async () => {
    if (isPublishing) return;

    setIsPublishing(true);

    try {
      // Export current config as JSON
      const json = exportToJson();
      const config = JSON.parse(json);

      // Split into opencode.json and oh-my-openagent.jsonc
      const { opencodeJson, omoJsonc } = splitConfig(config);

      // POST to API route
      const response = await fetch("/api/config/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Publish failed");
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
  }, [isPublishing, exportToJson, addPublishSnapshot, setLastSavedSnapshot]);

  return { publish, isPublishing };
}
