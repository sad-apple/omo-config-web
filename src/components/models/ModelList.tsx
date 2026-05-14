"use client";

import { Separator } from "@/components/ui/separator";
import type { Model, Provider } from "@/lib/mock-data";
import { ModelCard } from "./ModelCard";

interface ModelListProps {
  providers: Provider[];
  selectedModel: Model | null;
  onSelectModel: (model: Model) => void;
}

export function ModelList({ providers, selectedModel, onSelectModel }: ModelListProps) {
  if (providers.length === 0) {
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
      {providers.map((provider, index) => (
        <section key={provider.id}>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-semibold">{provider.name}</h2>
            <span className="text-xs text-muted-foreground">
              {provider.models.length} model{provider.models.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {provider.models.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                isSelected={selectedModel?.id === model.id}
                onClick={() => onSelectModel(model)}
              />
            ))}
          </div>
          {index < providers.length - 1 && <Separator className="my-6" />}
        </section>
      ))}
    </div>
  );
}
