import { useState, useCallback } from 'react';
import { useConfigStore } from '@/store/configStore';
import { toast } from 'sonner';
import type { OmoConfig } from '@/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface UseConfigImportReturn {
  isImporting: boolean;
  handleFileSelect: (file: File) => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  resetInput: () => void;
}

/**
 * Hook for importing configuration from a JSON file.
 * Supports file picker, drag-drop, and validates JSON structure.
 */
export function useConfigImport(): UseConfigImportReturn {
  const [isImporting, setIsImporting] = useState(false);
  const importFromJson = useConfigStore((state) => state.importFromJson);
  const agents = useConfigStore((state) => state.agents);
  const categories = useConfigStore((state) => state.categories);

  const processFile = useCallback(
    (file: File) => {
      // Validate file type
      if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        toast.error('Invalid file type', {
          description: 'Please select a JSON file.',
        });
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error('File too large', {
          description: 'Maximum file size is 5MB.',
        });
        return;
      }

      setIsImporting(true);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          if (!json) {
            toast.error('Empty file', {
              description: 'The selected file is empty.',
            });
            setIsImporting(false);
            return;
          }

          // Validate JSON structure
          const parsed = JSON.parse(json) as Partial<OmoConfig>;

          // Basic structure validation
          if (typeof parsed !== 'object' || parsed === null) {
            toast.error('Invalid JSON structure', {
              description: 'The file must contain a valid OMO configuration object.',
            });
            setIsImporting(false);
            return;
          }

          // Check if there's existing config and warn about replacement
          const hasExistingConfig =
            Object.keys(agents).length > 0 || Object.keys(categories).length > 0;

          if (hasExistingConfig) {
            toast.warning('Existing config detected', {
              description:
                'Importing will replace your current agents and categories. Continue?',
              action: {
                label: 'Import',
                onClick: () => {
                  importFromJson(json);
                  toast.success('Config imported', {
                    description: `Loaded ${Object.keys(parsed.agents ?? {}).length} agents and ${Object.keys(parsed.categories ?? {}).length} categories.`,
                  });
                  setIsImporting(false);
                },
              },
              cancel: {
                label: 'Cancel',
                onClick: () => {
                  setIsImporting(false);
                },
              },
            });
          } else {
            importFromJson(json);
            toast.success('Config imported', {
              description: `Loaded ${Object.keys(parsed.agents ?? {}).length} agents and ${Object.keys(parsed.categories ?? {}).length} categories.`,
            });
            setIsImporting(false);
          }
        } catch (error) {
          toast.error('Invalid JSON', {
            description:
              error instanceof Error ? error.message : 'Failed to parse JSON file.',
          });
          setIsImporting(false);
        }
      };

      reader.onerror = () => {
        toast.error('Read error', {
          description: 'Failed to read the selected file.',
        });
        setIsImporting(false);
      };

      reader.readAsText(file);
    },
    [importFromJson, agents, categories],
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      processFile(file);
    },
    [processFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const resetInput = useCallback(() => {
    setIsImporting(false);
  }, []);

  return {
    isImporting,
    handleFileSelect,
    handleFileInput,
    handleDrop,
    handleDragOver,
    resetInput,
  };
}
