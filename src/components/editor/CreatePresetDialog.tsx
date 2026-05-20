"use client";

import { useState } from "react";
import { useConfigStore, usePresets } from "@/store/configStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";

interface CreatePresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_NAME_REGEX = /^[a-zA-Z0-9_-]{1,50}$/;

export function CreatePresetDialog({ open, onOpenChange }: CreatePresetDialogProps) {
  const [name, setName] = useState("");
  const [copyFrom, setCopyFrom] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);

  const presets = usePresets();
  const createPreset = useConfigStore((s) => s.createPreset);

  const isValidName = PRESET_NAME_REGEX.test(name);
  const isNameEmpty = name.length === 0;
  const isCreateDisabled = isNameEmpty || !isValidName || isCreating;

  const handleCreate = async () => {
    if (isCreateDisabled) return;

    setIsCreating(true);
    try {
      await createPreset(name, copyFrom);
      toast.success(`Preset "${name}" created successfully`);
      setName("");
      setCopyFrom(undefined);
      onOpenChange(false);
    } catch {
      toast.error(`Failed to create preset "${name}"`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
      setCopyFrom(undefined);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Create New Preset
          </DialogTitle>
          <DialogDescription>
            Create a new preset configuration. Optionally copy from an existing preset.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Preset name</label>
            <Input
              placeholder="e.g. daily, production, testing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCreating}
              className={name && !isValidName ? "border-destructive" : ""}
            />
            {name && !isValidName && (
              <p className="text-xs text-destructive">
                Only letters, numbers, hyphens, and underscores allowed (max 50 characters).
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Copy from existing (optional)</label>
            <Select
              value={copyFrom}
              onValueChange={setCopyFrom}
              disabled={isCreating || presets.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a preset to copy from" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreateDisabled}>
            {isCreating ? "Creating..." : "Create Preset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
