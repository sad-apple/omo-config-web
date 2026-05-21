"use client";

import { Brain } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ThinkingConfig } from "@/types";

interface ThinkingConfigFormProps {
  value: ThinkingConfig | undefined;
  onChange: (config: ThinkingConfig | undefined) => void;
}

const MIN_BUDGET = 1024;
const MAX_BUDGET = 200000;
const BUDGET_STEP = 1024;
const DEFAULT_BUDGET = 8192;

export function ThinkingConfigForm({ value, onChange }: ThinkingConfigFormProps) {
  const enabled = value?.type === "enabled";
  const budgetTokens = value?.budgetTokens ?? DEFAULT_BUDGET;

  const handleEnabledChange = (checked: boolean) => {
    if (checked) {
      onChange({ type: "enabled", budgetTokens });
    } else {
      onChange({ type: "disabled", budgetTokens: 0 });
    }
  };

  const handleBudgetChange = (newBudget: number) => {
    const clampedBudget = Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, newBudget));
    if (enabled) {
      onChange({ type: "enabled", budgetTokens: clampedBudget });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-violet-500" />
          <div className="space-y-0.5">
            <Label className="text-base">Thinking Mode</Label>
            <p className="text-sm text-muted-foreground">
              Enable extended reasoning with dedicated token budget
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={handleEnabledChange} />
      </div>

      {enabled && (
        <div className="space-y-2">
          <Label htmlFor="budget-tokens">Budget Tokens</Label>
          <div className="flex items-center gap-4">
            <Input
              id="budget-tokens"
              type="number"
              min={MIN_BUDGET}
              max={MAX_BUDGET}
              step={BUDGET_STEP}
              value={budgetTokens}
              onChange={(e) => handleBudgetChange(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">
              (min: {MIN_BUDGET.toLocaleString()}, max: {MAX_BUDGET.toLocaleString()})
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Tokens allocated for thinking. Higher = more reasoning but uses more
            of your context window.
          </p>
        </div>
      )}

      {!enabled && (
        <p className="text-sm text-muted-foreground">
          Extended thinking is disabled
        </p>
      )}
    </div>
  );
}
