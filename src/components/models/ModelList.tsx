"use client";

import { Separator } from "@/components/ui/separator";
import type { Model, Provider } from "@/types";
import { ModelCard } from "./ModelCard";

interface ModelListProps {
  providers: Record<string, Provider>;
  selectedModel: Model | null;
  onSelectModel: (model: Model, providerKey: string, modelKey: string) => void;
}

export function ModelList({ providers, selectedModel, onSelectModel }: ModelListProps) {
  const providerEntries = Object.entries(providers);

  if (providerEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">No models found</p>
        <p className="text-sm text-muted-foreground">
          Configure a provider to see available models.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {providerEntries.map(([providerKey, provider], index) => (
        <section key={providerKey}>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-semibold">{provider.name}</h2>
            <span className="text-xs text-muted-foreground">
              {Object.keys(provider.models).length} model{Object.keys(provider.models).length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {Object.entries(provider.models).map(([modelKey, model]) => (
              <ModelCard
                key={modelKey}
                model={model}
                modelName={modelKey}
                providerName={provider.name}
                isSelected={selectedModel?.name === model.name}
                onClick={() => onSelectModel(model, providerKey, modelKey)}
              />
            ))}
          </div>
          {index < providerEntries.length - 1 && <Separator className="my-6" />}
        </section>
      ))}
    </div>
  );
}
