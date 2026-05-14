"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonacoJsonEditor } from "./MonacoJsonEditor";
import { Eye, Code } from "lucide-react";
import { toast } from "sonner";

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
  const [mode, setMode] = useState<"visual" | "json">("visual");
  const [jsonString, setJsonString] = useState(() =>
    JSON.stringify(jsonValue, null, 2)
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
            {hasUnsavedChanges && mode === "json" && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Unsaved changes
              </span>
            )}
          </div>
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
    </Tabs>
  );
}
