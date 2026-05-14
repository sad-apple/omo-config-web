"use client";

import { Brain, Cpu, Hash, Thermometer, ToggleLeft, ToggleRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Model } from "@/lib/mock-data";

interface ModelDetailProps {
  model: Model | null;
}

function formatTokens(tokens: number): string {
  return tokens.toLocaleString();
}

export function ModelDetail({ model }: ModelDetailProps) {
  if (!model) {
    return (
      <Card className="sticky top-6">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">Select a model</p>
          <p className="text-sm text-muted-foreground">
            Click on a model card to view its detailed parameters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl">{model.name}</CardTitle>
            <CardDescription className="mt-1">{model.description}</CardDescription>
          </div>
          {model.thinking.enabled ? (
            <Badge variant="default" className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700">
              <Brain className="h-3 w-3" />
              Thinking Enabled
            </Badge>
          ) : (
            <Badge variant="secondary">Standard Mode</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Provider:</span>
          <span className="font-medium text-foreground">{model.provider}</span>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <DetailItem
            icon={<Cpu className="h-4 w-4" />}
            label="Context Window"
            value={`${formatTokens(model.contextWindow)} tokens`}
          />
          <DetailItem
            icon={<Hash className="h-4 w-4" />}
            label="Max Tokens"
            value={`${formatTokens(model.maxTokens)} tokens`}
          />
          <DetailItem
            icon={<Thermometer className="h-4 w-4" />}
            label="Temperature"
            value={model.temperature.toFixed(2)}
          />
          <DetailItem
            icon={<Hash className="h-4 w-4" />}
            label="Top P"
            value={model.topP.toFixed(2)}
          />
        </div>

        <Separator />

        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
            {model.thinking.enabled ? (
              <ToggleRight className="h-4 w-4 text-violet-600" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            )}
            Thinking Mode
          </h4>
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">
                {model.thinking.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            {model.thinking.enabled && model.thinking.budget && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-medium">
                  {formatTokens(model.thinking.budget)} tokens
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-base font-semibold">{value}</span>
    </div>
  );
}
