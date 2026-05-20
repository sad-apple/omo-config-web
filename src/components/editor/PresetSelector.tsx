"use client";

import { useState } from "react";
import { usePresets, useCurrentPreset, useIsLoadingPresets, useConfigStore } from "@/store/configStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, Plus, Trash2, Power, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CreatePresetDialog } from "./CreatePresetDialog";

interface PresetSelectorProps {
  className?: string;
}

export function PresetSelector({ className }: PresetSelectorProps) {
  const presets = usePresets();
  const currentPreset = useCurrentPreset();
  const isLoading = useIsLoadingPresets();
  const setCurrentPreset = useConfigStore((s) => s.setCurrentPreset);
  const deletePreset = useConfigStore((s) => s.deletePreset);
  const activatePreset = useConfigStore((s) => s.activatePreset);
  const isDirty = useConfigStore((s) => s.isDirty);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const handleSelectPreset = (name: string) => {
    if (isDirty) {
      toast.error("Cannot switch preset", {
        description: "You have unsaved changes. Please publish or discard before switching.",
      });
      return;
    }
    setCurrentPreset(name);
    setDropdownOpen(false);
    toast.success(`Switched to preset "${name}"`);
  };

  const handleDeletePreset = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (name === currentPreset) return;

    try {
      await deletePreset(name);
      toast.success(`Preset "${name}" deleted`);
    } catch {
      toast.error(`Failed to delete preset "${name}"`);
    }
  };

  const handleActivate = async () => {
    if (!currentPreset) {
      toast.error("No preset selected to activate");
      return;
    }

    if (isDirty) {
      toast.error("Cannot activate preset", {
        description: "You have unsaved changes. Please publish or discard before activating.",
      });
      return;
    }

    setIsActivating(true);
    try {
      await activatePreset(currentPreset);
      toast.success(`Preset "${currentPreset}" activated`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      if (message === "UNSAVED_CHANGES") {
        toast.error("Cannot activate preset", {
          description: "You have unsaved changes. Please publish or discard before activating.",
        });
      } else {
        toast.error(`Failed to activate preset "${currentPreset}"`);
      }
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <div className="flex h-8 w-40 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading presets...
        </div>
      </div>
    );
  }

  const displayName = currentPreset ?? "No preset selected";

  return (
    <>
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-40 justify-between gap-2"
            >
              <span className="truncate">{displayName}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuLabel>Presets</DropdownMenuLabel>
            {presets.length === 0 ? (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                No presets found
              </DropdownMenuItem>
            ) : (
              presets.map((preset) => (
                <DropdownMenuItem
                  key={preset.name}
                  className="group relative pr-8"
                  onSelect={() => handleSelectPreset(preset.name)}
                >
                  <span className="truncate">{preset.name}</span>
                  {preset.name === currentPreset && (
                    <Check className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  )}
                  {preset.name !== currentPreset && (
                    <button
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      onClick={(e) => handleDeletePreset(preset.name, e)}
                      title={`Delete preset "${preset.name}"`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              New Preset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={handleActivate}
          disabled={!currentPreset || isActivating}
          title="Activate current preset (copy to ~/.config/opencode/)"
        >
          {isActivating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Power className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Activate</span>
        </Button>
      </div>

      <CreatePresetDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
}
