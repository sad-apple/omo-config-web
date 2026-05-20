"use client";

import { useState } from "react";
import { Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { usePublish } from "@/hooks/usePublish";
import { useIsDirty, useCurrentPreset } from "@/store/configStore";
import { DiffPreview } from "./DiffPreview";
import { validateConfig } from "@/lib/config-validator";
import { useConfigStore } from "@/store/configStore";

interface PublishDialogProps {
  className?: string;
}

export function PublishDialog({ className }: PublishDialogProps) {
  const [open, setOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ field: string; message: string }[]>([]);
  const isDirty = useIsDirty();
  const { publish, isPublishing } = usePublish();
  const currentPreset = useCurrentPreset();
  const configBase = currentPreset
    ? `~/.config/omo-config-web/${currentPreset}`
    : "~/.config/opencode";
  const exportToJson = useConfigStore((s) => s.exportToJson);

  const handlePublish = async () => {
    const json = exportToJson();
    const config = JSON.parse(json);
    const validation = validateConfig(config);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);
    await publish(false, currentPreset || undefined);
    setOpen(false);
  };

  if (!isDirty) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={className}
      >
        <Upload className="h-3.5 w-3.5" />
        Publish
      </Button>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Publish Configuration to Disk
          </DialogTitle>
          <DialogDescription>
            This will write your configuration to the following files:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                This will overwrite existing files
              </p>
              <p className="text-amber-600/80 dark:text-amber-400/80 mt-1">
                Existing comments in JSONC files will be preserved where possible.
              </p>
            </div>
          </div>

          {/* Files to write */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Files to be written:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {configBase}/opencode.json
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {configBase}/oh-my-openagent.jsonc
              </Badge>
            </div>
          </div>

          {/* Diff preview */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Change preview:</p>
            <DiffPreview
              trigger={
                <Button variant="outline" size="sm" className="gap-1.5">
                  View Diff
                </Button>
              }
            />
          </div>
        </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">Validation errors:</p>
              <div className="rounded-md bg-destructive/10 p-3 space-y-1">
                {validationErrors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">
                    <span className="font-mono">{err.field}</span>: {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPublishing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing}
            className="gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            {isPublishing ? "Publishing..." : "Publish to Disk"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
