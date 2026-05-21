"use client";

import { useState } from "react";
import { Brain, Cpu, Hash, Thermometer, ToggleLeft, ToggleRight, Pencil, Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  // CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ModelParamsForm } from "@/components/forms/ModelParamsForm";
import type { Model } from "@/types";

interface ModelDetailProps {
  model: Model | null;
  isEditing?: boolean;
  onUpdateModel?: (updates: Partial<Model>) => void;
}

function formatTokens(tokens?: number): string {
  return tokens ? tokens.toLocaleString() : "N/A";
}

export function ModelDetail({ model, isEditing = false, onUpdateModel }: ModelDetailProps) {
  const [editMode, setEditMode] = useState(isEditing);
  const [localOptions, setLocalOptions] = useState(model?.options);

  // Sync local options when model changes
  if (model && JSON.stringify(localOptions) !== JSON.stringify(model.options)) {
    setLocalOptions(model.options);
  }

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

  const thinkingEnabled = model.options?.thinking?.type === "enabled";
  const thinkingBudget = model.options?.thinking?.budgetTokens;

  const handleSave = () => {
    if (onUpdateModel && localOptions) {
      onUpdateModel({ options: localOptions });
    }
    setEditMode(false);
  };

  const handleCancel = () => {
    setLocalOptions(model.options);
    setEditMode(false);
  };

  const handleOptionsChange = (newOptions: Model["options"]) => {
    setLocalOptions(newOptions);
    if (onUpdateModel) {
      onUpdateModel({ options: newOptions });
    }
  };

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl">{model.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {thinkingEnabled ? (
              <Badge variant="default" className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700">
                <Brain className="h-3 w-3" />
                Thinking Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">Standard Mode</Badge>
            )}
            {onUpdateModel && (
              <>
                {editMode ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="default" onClick={handleSave}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {editMode ? (
          <ModelParamsForm
            values={localOptions ?? model.options}
            onChange={handleOptionsChange}
            modelName={model.name}
          />
        ) : (<>
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
                value={`${formatTokens(model.options?.maxTokens)} tokens`}
              />
              <DetailItem
                icon={<Thermometer className="h-4 w-4" />}
                label="Temperature"
                value={(model.options?.temperature ?? 0.7).toFixed(2)}
              />
              <DetailItem
                icon={<Hash className="h-4 w-4" />}
                label="Top P"
                value={(model.options?.topP ?? 0.9).toFixed(2)}
              />
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                {thinkingEnabled ? (
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
                    {thinkingEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                {thinkingEnabled && thinkingBudget && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-medium">
                      {formatTokens(thinkingBudget)} tokens
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
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
