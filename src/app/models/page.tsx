"use client";

import { useState } from "react";

import { useConfigStore } from "@/store/configStore";
import type { Model } from "@/types";
import { ModelDetail } from "@/components/models/ModelDetail";
import { ModelList } from "@/components/models/ModelList";
import { DualModeEditor } from "@/components/editor/DualModeEditor";

export default function ModelsPage() {
  const providers = useConfigStore((state) => state.providers);
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

  return (
    <DualModeEditor
      jsonValue={{ providers }}
      title="Model Layer"
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
