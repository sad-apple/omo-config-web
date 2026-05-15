"use client";

import { useState, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonacoJsonEditor } from "./MonacoJsonEditor";
import { Eye, Code, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useConfigStore, useIsDirty } from "@/store/configStore";
import { useDraftRestore } from "@/hooks/useDraftRestore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const { showRestoreDialog, draftData, restoreDraft, discardDraft, saveDraft } = useDraftRestore();

  const [mode, setMode] = useState<"visual" | "json">("visual");
  const [jsonString, setJsonString] = useState(() =>
    JSON.stringify(jsonValue, null, 2)
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  // Sync when jsonValue prop changes externally
  const prevJsonValueRef = useState(jsonValue)[0];
  if (jsonValue !== prevJsonValueRef) {
    setJsonString(JSON.stringify(jsonValue, null, 2));
    setHasUnsavedChanges(false);
  }

  const handleJsonChange = useCallback((value: string) => {
    setJsonString(value);
    setHasUnsavedChanges(true);
  }, []);

  const handleApplyChanges = useCallback(
    (value: string) => {
      try {
        const parsed = JSON.parse(value);
        onJsonChange?.(parsed);
        setHasUnsavedChanges(false);
        toast.success("Changes applied successfully");
      } catch (e) {
        toast.error("Invalid JSON: " + (e as Error).message);
      }
    },
    [onJsonChange]
  );

  const handleSave = useCallback(() => {
    setLastSavedSnapshot();
    toast.success("Configuration saved");
  }, [setLastSavedSnapshot]);

  return (
    <Tabs
      value={mode}
      onValueChange={(v) => setMode(v as "visual" | "json")}
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
          {(hasUnsavedChanges || isDirty) && (
            <Button
              size="sm"
              onClick={handleSave}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
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
    </Tabs>
  );
}
