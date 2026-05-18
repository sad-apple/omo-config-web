"use client";

import { useEffect, useCallback, useState } from "react";
import { useConfigStore } from "@/store/configStore";
import { usePublish } from "./usePublish";
import { toast } from "sonner";

interface UseKeyboardShortcutsOptions {
  onToggleDiff?: () => void;
  onImport?: () => void;
}

export function useKeyboardShortcuts({ onToggleDiff, onImport }: UseKeyboardShortcutsOptions = {}) {
  const setLastSavedSnapshot = useConfigStore((state) => state.setLastSavedSnapshot);
  const { publish } = usePublish();
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);

  const handleSave = useCallback(() => {
    setLastSavedSnapshot();
    toast.success("Configuration saved");
  }, [setLastSavedSnapshot]);

  const handlePublish = useCallback(async () => {
    await publish();
  }, [publish]);

  const handleToggleDiff = useCallback(() => {
    onToggleDiff?.();
  }, [onToggleDiff]);

  const handleToggleMode = useCallback(() => {
    // This will be handled by the parent component via callback
    // We'll dispatch a custom event that DualModeEditor can listen to
    window.dispatchEvent(new CustomEvent("toggle-editor-mode"));
  }, []);

  const handleImport = useCallback(() => {
    onImport?.();
  }, [onImport]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Ctrl+S / Cmd+S: Save
      if (isMod && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
        return;
      }

      // Ctrl+Shift+P / Cmd+Shift+P: Publish to disk
      if (isMod && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePublish();
        return;
      }

      // Ctrl+Shift+D / Cmd+Shift+D: Toggle diff preview
      if (isMod && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleToggleDiff();
        return;
      }

      // Ctrl+E / Cmd+E: Toggle visual/JSON editor mode
      if (isMod && e.key === "e" && !e.shiftKey) {
        e.preventDefault();
        handleToggleMode();
        return;
      }

      // Ctrl+I / Cmd+I: Import JSON
      if (isMod && e.key === "i" && !e.shiftKey) {
        e.preventDefault();
        handleImport();
        return;
      }

      // ?: Show keyboard shortcut help dialog
      if (e.key === "?" || (e.shiftKey && e.key === "/") || (e.key === "F1")) {
        e.preventDefault();
        setShowShortcutsDialog(true);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handlePublish, handleToggleDiff, handleToggleMode, handleImport]);

  return {
    showShortcutsDialog,
    setShowShortcutsDialog,
  };
}