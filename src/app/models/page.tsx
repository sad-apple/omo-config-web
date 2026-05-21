"use client";

import { useState, useCallback } from "react";
import { Cpu } from "lucide-react";

import { useConfigStore } from "@/store/configStore";
import type { Model } from "@/types";
import { ModelDetail } from "@/components/models/ModelDetail";
import { ModelList } from "@/components/models/ModelList";
import { DualModeEditor } from "@/components/editor/DualModeEditor";
import { Skeleton } from "@/components/ui/skeleton";

export default function ModelsPage() {
  const providers = useConfigStore((state) => state.providers);
  const setProviders = useConfigStore((state) => state.setProviders);
  const updateModel = useConfigStore((state) => state.updateModel);
  
  const [selectedModel, setSelectedModel] = useState<{
    model: Model;
    providerKey: string;
    modelKey: string;
  } | null>(null);

  const handleSelectModel = (model: Model, providerKey: string, modelKey: string) => {
    setSelectedModel({ model, providerKey, modelKey });
  };

  const handleUpdateModel = (updates: Partial<Model>) => {
    if (!selectedModel) return;
    updateModel(selectedModel.providerKey, selectedModel.modelKey, updates);
  };

  const handleJsonChange = useCallback((value: object) => {
    const data = value as Record<string, unknown>;
    setProviders((data.providers ?? {}) as Record<string, import("@/types").Provider>);
  }, [setProviders]);

  if (Object.keys(providers).length === 0) {
    return (
      <DualModeEditor
        jsonValue={{ providers }}
        title="Model Layer"
        onJsonChange={handleJsonChange}
      >
        <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
              <Cpu className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-foreground">
                No models available
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add providers with models to see them listed here, or import a configuration file.
              </p>
            </div>
          </div>
        </div>
      </DualModeEditor>
    );
  }

  return (
    <DualModeEditor
      jsonValue={{ providers }}
      title="Model Layer"
      onJsonChange={handleJsonChange}
    >
      <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
        <div className="border-b bg-white dark:bg-black">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">
                View and manage model parameters across all configured providers.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <ModelList
              providers={providers}
              selectedModel={selectedModel?.model ?? null}
              onSelectModel={handleSelectModel}
            />
            <ModelDetail 
              model={selectedModel?.model ?? null} 
              isEditing={false}
              onUpdateModel={handleUpdateModel}
            />
          </div>
        </div>
      </div>
    </DualModeEditor>
  );
}
