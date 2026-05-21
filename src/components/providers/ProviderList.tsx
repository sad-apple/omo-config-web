"use client";

import { Server, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import { ProviderCard } from "./ProviderCard";
import type { Provider } from "@/types";

interface ProviderListProps {
  providers: Record<string, Provider>;
  onAddProvider?: () => void;
  onEditProvider?: (providerKey: string) => void;
}

export function ProviderList({ providers, onAddProvider, onEditProvider }: ProviderListProps) {
  if (Object.keys(providers).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
        <Server className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold text-foreground">
          No providers configured
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Add providers to your opencode.json file to see them listed here.
        </p>
        {onAddProvider && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={onAddProvider}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Provider
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {Object.keys(providers).length} provider{Object.keys(providers).length !== 1 ? "s" : ""} configured
        </p>
        {onAddProvider && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddProvider}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Provider
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(providers).map(([key, provider]) => (
          <ProviderCard
            key={key}
            providerKey={key}
            provider={provider}
            onEdit={onEditProvider}
          />
        ))}
      </div>
    </div>
  );
}
