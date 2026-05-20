"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOverwrite: () => void;
  onReload: () => void;
  onMerge: () => void;
}

export function ConflictDialog({
  open,
  onOpenChange,
  onOverwrite,
  onReload,
  onMerge,
}: ConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Configuration Conflict Detected
          </DialogTitle>
          <DialogDescription>
            The configuration files have been modified by another source since you started editing.
            Your changes may overwrite theirs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Choose how to resolve this conflict:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-medium">Overwrite:</span>
              <span className="text-muted-foreground">Force write your changes (will overwrite other modifications)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium">Reload:</span>
              <span className="text-muted-foreground">Discard your changes and load the latest version</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium">Merge:</span>
              <span className="text-muted-foreground">Open a diff editor to manually merge changes</span>
            </li>
          </ul>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onReload}>
            Reload
          </Button>
          <Button variant="secondary" onClick={onMerge}>
            Merge
          </Button>
          <Button variant="destructive" onClick={onOverwrite}>
            Overwrite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
