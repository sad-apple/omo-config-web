"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Braces, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from "@/lib/debounce";

interface MonacoJsonEditorProps {
  value: string;
  onChange?: (value: string) => void;
  onApply?: (value: string) => void;
  className?: string;
  height?: string | number;
  readOnly?: boolean;
}

export function MonacoJsonEditor({
  value,
  onChange,
  onApply,
  className,
  height = "600px",
  readOnly = false,
}: MonacoJsonEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasJsonError, setHasJsonError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounced onChange that validates JSON before calling the callback
  const debouncedOnChange = useRef(
    debounce((val: string) => {
      if (!onChange) return;
      try {
        JSON.parse(val);
        setHasJsonError(false);
        setErrorMessage(null);
        onChange(val);
      } catch (e) {
        setHasJsonError(true);
        setErrorMessage((e as Error).message);
      }
    }, 300)
  ).current;

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  const handleEditorDidMount = (editor: Parameters<OnMount>[0]) => {
    editorRef.current = editor;
  };

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction("editor.action.formatDocument")?.run();
    }
  };

  const handleCopy = async () => {
    const currentContent = editorRef.current?.getValue() ?? value;
    await navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditorChange = useCallback(
    (val: string | undefined) => {
      const content = val ?? "";
      debouncedOnChange(content);
    },
    [debouncedOnChange]
  );

  return (
    <div className={cn("flex flex-col rounded-lg border bg-card", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Braces className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">JSON Editor</span>
          {hasJsonError && (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="h-3 w-3" />
              {errorMessage ? "Invalid JSON" : "Syntax error"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            className="h-7 text-xs"
          >
            Format
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs"
          >
            {copied ? (
              <Check className="mr-1 h-3 w-3" />
            ) : (
              <Copy className="mr-1 h-3 w-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          {onApply && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const content = editorRef.current?.getValue() ?? value;
                onApply(content);
              }}
              className="h-7 text-xs"
            >
              Apply Changes
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div
        className={cn(
          "overflow-hidden rounded-b-lg",
          hasJsonError && "ring-2 ring-red-500/50"
        )}
      >
        <Editor
          height={height}
          defaultLanguage="json"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            formatOnPaste: true,
            formatOnType: true,
            readOnly,
            padding: { top: 8, bottom: 8 },
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
          }}
        />
      </div>
    </div>
  );
}
