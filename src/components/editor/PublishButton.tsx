"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublish } from "@/hooks/usePublish";
import { useIsDirty } from "@/store/configStore";
import { ConflictDialog } from "./ConflictDialog";

interface PublishButtonProps {
  className?: string;
}

export function PublishButton({ className }: PublishButtonProps) {
  const isDirty = useIsDirty();
  const { publish, isPublishing, conflictDialog, handleOverwrite, handleReload, handleMerge } = usePublish();

  return (
    <>
      <Button
        size="sm"
        onClick={() => publish(false)}
        disabled={!isDirty || isPublishing}
        className={className}
      >
        <Upload className="h-3.5 w-3.5" />
        {isPublishing ? "Publishing..." : "Publish to Disk"}
      </Button>

      <ConflictDialog
        open={!!conflictDialog}
        onOpenChange={(open) => {
          if (!open) {
            // Dialog closed without action - handled by individual buttons
          }
        }}
        onOverwrite={handleOverwrite}
        onReload={handleReload}
        onMerge={handleMerge}
      />
    </>
  );
}
