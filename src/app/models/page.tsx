"use client";

import { useState } from "react";

import type { Model } from "@/lib/mock-data";
import { mockProviders } from "@/lib/mock-data";
import { ModelDetail } from "@/components/models/ModelDetail";
import { ModelList } from "@/components/models/ModelList";
import { DualModeEditor } from "@/components/editor/DualModeEditor";

export default function ModelsPage() {
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  return (
    <DualModeEditor
      jsonValue={{ providers: mockProviders }}
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
              providers={mockProviders}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
            />
            <ModelDetail model={selectedModel} />
          </div>
        </div>
      </div>
    </DualModeEditor>
  );
}
