"use client";

import { useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Braces } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div className={cn("flex flex-col rounded-lg border bg-card", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Braces className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">JSON Editor</span>
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
      <div className="overflow-hidden rounded-b-lg">
        <Editor
          height={height}
          defaultLanguage="json"
          value={value}
          onChange={(val) => onChange?.(val ?? "")}
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
