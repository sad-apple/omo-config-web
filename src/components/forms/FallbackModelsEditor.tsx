"use client";

import * as React from "react";
import { Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import type { Provider } from "@/types";
import { Button } from "@/components/ui/button";
import { ModelSelector } from "./ModelSelector";

interface FallbackModelsEditorProps {
  value: string[];
  onChange: (fallbacks: string[]) => void;
  providers: Record<string, Provider>;
  maxItems?: number;
}

export function FallbackModelsEditor({
  value,
  onChange,
  providers,
  maxItems = 5,
}: FallbackModelsEditorProps) {
  const addFallback = () => {
    if (value.length >= maxItems) return;
    onChange([...value, ""]);
  };

  const removeFallback = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateFallback = (index: number, modelRef: string) => {
    const updated = [...value];
    updated[index] = modelRef;
    onChange(updated);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...value];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
  };

  const moveDown = (index: number) => {
    if (index === value.length - 1) return;
    const updated = [...value];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
  };

  if (value.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          No fallback models configured. Click + to add one.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addFallback}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add fallback model
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {value.length} fallback model{value.length !== 1 ? "s" : ""}
        </p>
        {value.length < maxItems && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFallback}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        )}
      </div>
      {value.map((modelRef, index) => (
        <div key={index} className="flex items-start gap-2">
          <div className="flex flex-col gap-1 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => moveUp(index)}
              disabled={index === 0}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => moveDown(index)}
              disabled={index === value.length - 1}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex-1">
            <ModelSelector
              value={modelRef}
              onChange={(ref: string) => updateFallback(index, ref)}
              providers={providers}
              placeholder="Select fallback model..."
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => removeFallback(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
