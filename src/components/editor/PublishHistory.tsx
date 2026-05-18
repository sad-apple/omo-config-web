"use client";

import { useState } from "react";
import {
  History,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePublishHistory } from "@/hooks/usePublishHistory";
import { useConfigStore } from "@/store/configStore";
import { toast } from "sonner";
import type { PublishSnapshot } from "@/types";

interface PublishHistoryProps {
  className?: string;
}

export function PublishHistory({ className }: PublishHistoryProps) {
  const [open, setOpen] = useState(false);
  const { publishHistory, clearPublishHistory } = usePublishHistory();
  const importFromJson = useConfigStore((s) => s.importFromJson);
  const setLastSavedSnapshot = useConfigStore((s) => s.setLastSavedSnapshot);

  const handleRollback = async (snapshot: PublishSnapshot) => {
    try {
      // Restore the snapshot to the store
      importFromJson(snapshot.snapshot);
      setLastSavedSnapshot();

      // Re-publish to disk
      const config = JSON.parse(snapshot.snapshot);
      const response = await fetch("/api/config/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error("Failed to re-publish");
      }

      toast.success("Configuration rolled back", {
        description: `Restored from ${new Date(snapshot.timestamp).toLocaleString()}`,
      });
    } catch (error) {
      toast.error("Rollback failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <History className="h-3.5 w-3.5" />
          History
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Publish History
          </SheetTitle>
          <SheetDescription>
            {publishHistory.length === 0
              ? "No publish history yet"
              : `${publishHistory.length} publish${publishHistory.length === 1 ? "" : "es"} recorded`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {publishHistory.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
              No publish history yet. Publish your configuration to see it here.
            </div>
          ) : (
            <>
              {/* Clear History Button */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearPublishHistory}
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear History
                </Button>
              </div>

              {/* History List */}
              <div className="space-y-3">
                {publishHistory.map((snapshot) => (
                  <PublishHistoryItem
                    key={snapshot.id}
                    snapshot={snapshot}
                    onRollback={handleRollback}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface PublishHistoryItemProps {
  snapshot: PublishSnapshot;
  onRollback: (snapshot: PublishSnapshot) => void;
}

function PublishHistoryItem({ snapshot, onRollback }: PublishHistoryItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm font-medium hover:underline"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              {new Date(snapshot.timestamp).toLocaleString()}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {snapshot.summary}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {snapshot.filesWritten.map((file) => (
              <Badge key={file} variant="outline" className="text-[10px] font-mono">
                {file}
              </Badge>
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRollback(snapshot)}
          className="shrink-0 gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Rollback
        </Button>
      </div>

      {expanded && (
        <>
          <Separator className="my-3" />
          <div className="max-h-[30vh] overflow-auto rounded-md bg-muted/30 p-2">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
              {snapshot.snapshot}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
