"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Package, Pencil } from "lucide-react";

import {
  Card,
  CardContent,
  // CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Provider } from "@/types";

interface ProviderCardProps {
  providerKey: string;
  provider: Provider;
  onEdit?: (providerKey: string) => void;
}

export function ProviderCard({ providerKey, provider, onEdit }: ProviderCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <CardTitle className="text-lg">{provider.name}</CardTitle>
            <Badge variant="secondary" className="w-fit font-mono text-xs">
              <Package className="mr-1 h-3 w-3" />
              {provider.npm}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="shrink-0">
              {Object.keys(provider.models).length} model{Object.keys(provider.models).length !== 1 ? "s" : ""}
            </Badge>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(providerKey);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between px-0">
              <span className="text-sm text-muted-foreground">
                {isOpen ? "Hide" : "Show"} models
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 space-y-2">
              {Object.entries(provider.models).map(([key, model]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{model.name}</span>
                  <div className="flex items-center gap-3">
                    {model.contextWindow && (
                      <Badge variant="secondary" className="text-xs">
                        {model.contextWindow.toLocaleString()}
                      </Badge>
                    )}
                    <code className="text-xs text-muted-foreground">
                      {key}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
