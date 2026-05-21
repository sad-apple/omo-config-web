"use client";

import { useEffect } from "react";
import { useConfigStore } from "@/store/configStore";
import { mergeConfig } from "@/lib/config-merger";

export function ConfigInitializer() {
  const loadPresets = useConfigStore((s) => s.loadPresets);
  const createPreset = useConfigStore((s) => s.createPreset);
  const importFromJson = useConfigStore((s) => s.importFromJson);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      await loadPresets();

      if (cancelled) return;

      // Load the current preset's config from disk
      try {
        const { currentPreset } = useConfigStore.getState();
        const preset = currentPreset || 'default';
        const res = await fetch(`/api/config?preset=${encodeURIComponent(preset)}`);
        if (res.ok) {
          const data = await res.json();
          const merged = mergeConfig(data.opencode, data.omo);
          importFromJson(JSON.stringify(merged));
        }
      } catch (error) {
        console.error('[ConfigInitializer] Failed to load config:', error);
      }

      const latestPresets = useConfigStore.getState().presets;
      if (latestPresets.length === 0) {
        await createPreset("default");
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [loadPresets, createPreset, importFromJson]);

  return null;
}
