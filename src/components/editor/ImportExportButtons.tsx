'use client';

import { useState, useRef } from 'react';
import { Download, Upload, FileJson, X, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useConfigExport } from '@/hooks/useConfigExport';
import { useConfigImport } from '@/hooks/useConfigImport';
import { useConfigStore } from '@/store/configStore';
import { mergeConfig } from '@/lib/config-merger';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ImportExportButtons() {
  const [open, setOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { handleExport } = useConfigExport();
  const {
    isImporting,
    handleFileSelect,
    handleFileInput,
    handleDrop,
    handleDragOver,
  } = useConfigImport();
  const importFromJson = useConfigStore((state) => state.importFromJson);
  const [isLoadingDisk, setIsLoadingDisk] = useState(false);

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleDrop(e);
    setOpen(false);
  };

  const handleDragOverZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setIsDragOver(false);
    }
  };
  const handleLoadFromDisk = async () => {
    setIsLoadingDisk(true);
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const merged = mergeConfig(data.opencode, data.omo);
      const json = JSON.stringify(merged, null, 2);
      importFromJson(json);
      toast.success('Configuration loaded from disk', {
        description: `Loaded ${Object.keys(data.opencode?.providers ?? {}).length} providers, ${Object.keys(data.omo?.agents ?? {}).length} agents`,
      });
    } catch (error) {
      toast.error('Failed to load from disk', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoadingDisk(false);
    }
  };


  return (
    <div className="flex items-center gap-2">
      {/* Load from Disk Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleLoadFromDisk}
        disabled={isLoadingDisk}
      >
        <FolderOpen className="h-4 w-4" />
        {isLoadingDisk ? 'Loading...' : 'Load from Disk'}
      </Button>

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4" />
            Import JSON
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Configuration</DialogTitle>
            <DialogDescription>
              Upload a JSON file to import your OMO configuration.
            </DialogDescription>
          </DialogHeader>

          {/* Drop Zone */}
          <div
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50',
            )}
            onDrop={handleDropZone}
            onDragOver={handleDragOverZone}
            onDragLeave={handleDragLeave}
            onClick={handleButtonClick}
          >
            <FileJson
              className={cn(
                'mb-4 h-10 w-10',
                isDragOver ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            <p className="mb-2 text-sm font-medium">
              {isDragOver ? 'Drop file here' : 'Drag & drop a JSON file'}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse • Max 5MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                handleFileInput(e);
                setOpen(false);
              }}
              disabled={isImporting}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Button */}
      <Button variant="outline" size="sm" onClick={handleExport}>
        <Download className="h-4 w-4" />
        Export JSON
      </Button>
    </div>
  );
}
