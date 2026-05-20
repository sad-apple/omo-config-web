"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonacoJsonEditor } from "./MonacoJsonEditor";
import { Eye, Code, Save, AlertCircle, FileDiff, Keyboard } from "lucide-react";
import { toast } from "sonner";
import { useConfigStore, useIsDirty } from "@/store/configStore";
import { useDraftRestore } from "@/hooks/useDraftRestore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DiffPreview } from "./DiffPreview";
import { PublishDialog } from "./PublishDialog";
import { PublishHistory } from "./PublishHistory";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { debounce } from "@/lib/debounce";

interface DualModeEditorProps {
  children: React.ReactNode;
  jsonValue: object;
  onJsonChange?: (value: object) => void;
  title?: string;
}

export function DualModeEditor({
  children,
  jsonValue,
  onJsonChange,
  title,
}: DualModeEditorProps) {
  const isDirty = useIsDirty();
  const setLastSavedSnapshot = useConfigStore((state) => state.setLastSavedSnapshot);
  const exportToJson = useConfigStore((state) => state.exportToJson);
  const importFromJson = useConfigStore((state) => state.importFromJson);
  const { showRestoreDialog, draftData, restoreDraft, discardDraft, saveDraft } = useDraftRestore();

  const [mode, setMode] = useState<"visual" | "json">("visual");
  const [jsonString, setJsonString] = useState(() =>
    JSON.stringify(jsonValue, null, 2)
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasJsonError, setHasJsonError] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);

  // Ref to track the latest jsonString for the debounced sync
  const jsonStringRef = useRef(jsonString);
  jsonStringRef.current = jsonString;

  // Debounced sync from JSON editor to store (300ms)
  const debouncedSyncToStore = useRef(
    debounce((val: string) => {
      try {
        const parsed = JSON.parse(val);
        onJsonChange?.(parsed);
        setHasJsonError(false);
      } catch {
        setHasJsonError(true);
        toast.error("Invalid JSON — changes not synced to store");
      }
    }, 300)
  ).current;

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSyncToStore.cancel();
    };
  }, [debouncedSyncToStore]);
  // Handle beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty || hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, hasUnsavedChanges]);

  // Auto-save draft to localStorage when dirty
  useEffect(() => {
    if (isDirty) {
      const json = exportToJson();
      saveDraft(json);
    }
  }, [isDirty, exportToJson, saveDraft]);

  // Sync when jsonValue prop changes externally (visual → JSON)
  const prevJsonValueRef = useRef(jsonValue);
  useEffect(() => {
    if (jsonValue !== prevJsonValueRef.current) {
      setJsonString(JSON.stringify(jsonValue, null, 2));
      setHasUnsavedChanges(false);
      prevJsonValueRef.current = jsonValue;
    }
  }, [jsonValue]);

  // Monaco → Store sync (debounced)
  const handleJsonChange = useCallback((value: string) => {
      setJsonString(value);
      setHasUnsavedChanges(true);
      debouncedSyncToStore(value);
    },
    [debouncedSyncToStore]
  );

  // Handle Apply button (explicit confirmation fallback)
  const handleApplyChanges = useCallback(
    (value: string) => {
      try {
        const parsed = JSON.parse(value);
        onJsonChange?.(parsed);
        setHasUnsavedChanges(false);
        setHasJsonError(false);
        toast.success("Changes applied successfully");
      } catch (e) {
        setHasJsonError(true);
        toast.error("Invalid JSON: " + (e as Error).message);
      }
    },
    [onJsonChange]
  );

  const handleSave = useCallback(() => {
    setLastSavedSnapshot();
    setHasUnsavedChanges(false);
    toast.success("Configuration saved");
  }, [setLastSavedSnapshot]);

  // Keyboard shortcuts
  const { showShortcutsDialog, setShowShortcutsDialog } = useKeyboardShortcuts({
    onToggleDiff: () => setDiffOpen((prev) => !prev),
    onImport: () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const json = ev.target?.result as string;
            if (json) {
              try {
                importFromJson(json);
                toast.success("Configuration imported");
              } catch {
                toast.error("Invalid JSON file");
              }
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    },
  });

  // Handle tab switching with sync
  const handleModeChange = useCallback(
    (newMode: string) => {
      const target = newMode as "visual" | "json";

      if (target === "json") {
        // Switching to JSON: refresh Monaco content from store
        const currentJson = exportToJson();
        setJsonString(currentJson);
        setHasUnsavedChanges(false);
      } else if (target === "visual") {
        // Switching to Visual: apply any pending Monaco changes first
        debouncedSyncToStore.cancel();
        try {
          const parsed = JSON.parse(jsonStringRef.current);
          onJsonChange?.(parsed);
          setHasJsonError(false);
        } catch {
          // If JSON is invalid, don't sync — just switch
          setHasJsonError(true);
          toast.error("Invalid JSON — visual mode shows last valid state");
        }
      }

      setMode(target);
    },
    [exportToJson, onJsonChange, debouncedSyncToStore]
  );

  // Listen for toggle-editor-mode custom event (from keyboard shortcuts)
  useEffect(() => {
    const handler = () => {
      const newMode = mode === "visual" ? "json" : "visual";
      handleModeChange(newMode);
    };
    window.addEventListener("toggle-editor-mode", handler);
    return () => window.removeEventListener("toggle-editor-mode", handler);
  }, [mode, handleModeChange]);


  return (
    <Tabs
      value={mode}
      onValueChange={handleModeChange}
      className="flex flex-1 flex-col"
    >
      {/* Mode Toggle Header */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3 dark:bg-black">
        <div className="flex flex-col gap-1">
          {title && (
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
          )}
          <div className="flex items-center gap-2">
            <TabsList className="h-8">
              <TabsTrigger value="visual" className="h-6 gap-1.5 px-2.5 text-xs">
                <Eye className="h-3.5 w-3.5" />
                Visual
              </TabsTrigger>
              <TabsTrigger value="json" className="h-6 gap-1.5 px-2.5 text-xs">
                <Code className="h-3.5 w-3.5" />
                JSON
              </TabsTrigger>
            </TabsList>
            {(hasUnsavedChanges || isDirty) && (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3 w-3" />
                Unsaved changes
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => setShowShortcutsDialog(true)}
          >
            <Keyboard className="h-3.5 w-3.5" />
          </Button>
          <PublishHistory />
          {(hasUnsavedChanges || isDirty) && (
            <>
              <DiffPreview
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <FileDiff className="h-3.5 w-3.5" />
                    Diff
                  </Button>
                }
              />
              <Button
                size="sm"
                onClick={handleSave}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
              <PublishDialog />
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TabsContent
          value="visual"
          className="mt-0 flex flex-1 flex-col data-[state=inactive]:hidden"
        >
          {children}
        </TabsContent>
        <TabsContent
          value="json"
          className="mt-0 flex flex-1 flex-col overflow-auto p-4 data-[state=inactive]:hidden"
        >
          <MonacoJsonEditor
            value={jsonString}
            onChange={handleJsonChange}
            onApply={handleApplyChanges}
            className="flex-1"
            height="calc(100vh - 200px)"
          />
        </TabsContent>
      </div>

      {/* Draft Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={(open) => !open && discardDraft()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore unsaved changes?</DialogTitle>
            <DialogDescription>
              A draft from {draftData ? new Date(draftData.timestamp).toLocaleString() : ""} was found. Would you like to restore it?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={discardDraft}>
              Discard
            </Button>
            <Button onClick={restoreDraft}>
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={showShortcutsDialog}
        onOpenChange={setShowShortcutsDialog}
      />
    </Tabs>
  );
}
