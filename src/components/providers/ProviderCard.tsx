"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Package } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
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
import type { Provider } from "@/lib/configReader";

interface ProviderCardProps {
  provider: Provider;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <CardTitle className="text-lg">{provider.name}</CardTitle>
            <Badge variant="secondary" className="w-fit font-mono text-xs">
              <Package className="mr-1 h-3 w-3" />
              {provider.npmPackage}
            </Badge>
          </div>
          <Badge variant="outline" className="shrink-0">
            {provider.models.length} model{provider.models.length !== 1 ? "s" : ""}
          </Badge>
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
              {provider.models.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{model.name}</span>
                  <div className="flex items-center gap-3">
                    {model.contextWindow && (
                      <Badge variant="secondary" className="text-xs">
                        {model.contextWindow}
                      </Badge>
                    )}
                    <code className="text-xs text-muted-foreground">
                      {model.id}
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
