"use client";

import { useEffect } from "react";
import { useConfigStore } from "@/store/configStore";

export function ConfigInitializer() {
  const loadPresets = useConfigStore((s) => s.loadPresets);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  return null;
}
