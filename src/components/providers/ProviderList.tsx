"use client";

import { Server } from "lucide-react";

import { ProviderCard } from "./ProviderCard";
import type { Provider } from "@/types";

interface ProviderListProps {
  providers: Record<string, Provider>;
}

export function ProviderList({ providers }: ProviderListProps) {
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
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(providers).map(([key, provider]) => (
        <ProviderCard key={key} provider={provider} />
      ))}
    </div>
  );
}
