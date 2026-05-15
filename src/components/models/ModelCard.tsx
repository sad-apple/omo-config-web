"use client";

import { Brain, Cpu, Hash, Thermometer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Model } from "@/types";
import { cn } from "@/lib/utils";

interface ModelCardProps {
  model: Model;
  modelName?: string;
  providerName?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return tokens.toString();
}

export function ModelCard({ model, modelName, providerName, isSelected, onClick }: ModelCardProps) {
  const thinkingEnabled = model.options?.thinking?.type === "enabled";
  const thinkingBudget = model.options?.thinking?.budgetTokens;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary shadow-md",
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base font-semibold">
              {modelName ?? model.name}
              {providerName && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({providerName})
                </span>
              )}
            </CardTitle>
          </div>
          {thinkingEnabled ? (
            <Badge variant="default" className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700">
              <Brain className="h-3 w-3" />
              Thinking
            </Badge>
          ) : (
            <Badge variant="secondary">Standard</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {model.contextWindow != null && (
            <ParamItem
              icon={<Cpu className="h-3.5 w-3.5" />}
              label="Context"
              value={formatTokens(model.contextWindow)}
            />
          )}
          {model.options?.temperature != null && (
            <ParamItem
              icon={<Thermometer className="h-3.5 w-3.5" />}
              label="Temp"
              value={model.options.temperature.toFixed(1)}
            />
          )}
          {model.options?.maxTokens != null && (
            <ParamItem
              icon={<Hash className="h-3.5 w-3.5" />}
              label="Max Tokens"
              value={formatTokens(model.options.maxTokens)}
            />
          )}
          {model.options?.topP != null && (
            <ParamItem
              icon={<Hash className="h-3.5 w-3.5" />}
              label="Top P"
              value={model.options.topP.toFixed(2)}
            />
          )}
        </div>
        {thinkingEnabled && thinkingBudget != null && thinkingBudget > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Brain className="h-3 w-3" />
            <span>
              Thinking budget: <strong>{formatTokens(thinkingBudget)}</strong> tokens
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ParamItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
