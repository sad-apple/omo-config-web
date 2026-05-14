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
import type { Model } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface ModelCardProps {
  model: Model;
  isSelected?: boolean;
  onClick?: () => void;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return tokens.toString();
}

export function ModelCard({ model, isSelected, onClick }: ModelCardProps) {
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
            <CardTitle className="text-base font-semibold">{model.name}</CardTitle>
            <CardDescription>{model.description}</CardDescription>
          </div>
          {model.thinking.enabled ? (
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
          <ParamItem
            icon={<Cpu className="h-3.5 w-3.5" />}
            label="Context"
            value={formatTokens(model.contextWindow)}
          />
          <ParamItem
            icon={<Thermometer className="h-3.5 w-3.5" />}
            label="Temp"
            value={model.temperature.toFixed(1)}
          />
          <ParamItem
            icon={<Hash className="h-3.5 w-3.5" />}
            label="Max Tokens"
            value={formatTokens(model.maxTokens)}
          />
          <ParamItem
            icon={<Hash className="h-3.5 w-3.5" />}
            label="Top P"
            value={model.topP.toFixed(2)}
          />
        </div>
        {model.thinking.enabled && model.thinking.budget && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Brain className="h-3 w-3" />
            <span>
              Thinking budget: <strong>{formatTokens(model.thinking.budget)}</strong> tokens
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
