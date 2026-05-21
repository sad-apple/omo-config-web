"use client";

import { RotateCcw } from "lucide-react";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Model } from "@/types";

interface ModelParamsFormProps {
  values: Model["options"];
  onChange: (options: Model["options"]) => void;
  modelName?: string;
}

const DEFAULTS = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 0.9,
};

const PARAM_CONFIG = {
  temperature: {
    min: 0,
    max: 2,
    step: 0.1,
    default: DEFAULTS.temperature,
    format: (v: number) => v.toFixed(1),
  },
  maxTokens: {
    min: 256,
    max: 200000,
    step: 256,
    default: DEFAULTS.maxTokens,
    format: (v: number) => v.toLocaleString(),
  },
  topP: {
    min: 0,
    max: 1,
    step: 0.05,
    default: DEFAULTS.topP,
    format: (v: number) => v.toFixed(2),
  },
};

export function ModelParamsForm({
  values,
  onChange,
  modelName,
}: ModelParamsFormProps) {
  const temperature = values?.temperature ?? DEFAULTS.temperature;
  const maxTokens = values?.maxTokens ?? DEFAULTS.maxTokens;
  const topP = values?.topP ?? DEFAULTS.topP;

  const handleTemperatureChange = (newValue: number[]) => {
    onChange({ ...values, temperature: newValue[0] });
  };

  const handleMaxTokensChange = (newValue: number[]) => {
    onChange({ ...values, maxTokens: newValue[0] });
  };

  const handleTopPChange = (newValue: number[]) => {
    onChange({ ...values, topP: newValue[0] });
  };

  const handleReset = () => {
    onChange({
      temperature: DEFAULTS.temperature,
      maxTokens: DEFAULTS.maxTokens,
      topP: DEFAULTS.topP,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Model Parameters {modelName && `(${modelName})`}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to defaults
        </Button>
      </div>

      {/* Temperature */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="temperature-slider">Temperature</Label>
          <span className="font-mono text-sm">
            {PARAM_CONFIG.temperature.format(temperature)}
          </span>
        </div>
        <Slider
          id="temperature-slider"
          min={PARAM_CONFIG.temperature.min}
          max={PARAM_CONFIG.temperature.max}
          step={PARAM_CONFIG.temperature.step}
          value={[temperature]}
          onValueChange={handleTemperatureChange}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{PARAM_CONFIG.temperature.min}</span>
          <span>{PARAM_CONFIG.temperature.max}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Controls randomness. Higher = more creative, lower = more focused.
        </p>
      </div>

      {/* Max Tokens */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="max-tokens-slider">Max Tokens</Label>
          <span className="font-mono text-sm">
            {PARAM_CONFIG.maxTokens.format(maxTokens)}
          </span>
        </div>
        <Slider
          id="max-tokens-slider"
          min={PARAM_CONFIG.maxTokens.min}
          max={PARAM_CONFIG.maxTokens.max}
          step={PARAM_CONFIG.maxTokens.step}
          value={[maxTokens]}
          onValueChange={handleMaxTokensChange}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{PARAM_CONFIG.maxTokens.min.toLocaleString()}</span>
          <span>{PARAM_CONFIG.maxTokens.max.toLocaleString()}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Maximum number of tokens the model can generate.
        </p>
      </div>

      {/* Top P */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="top-p-slider">Top P</Label>
          <span className="font-mono text-sm">
            {PARAM_CONFIG.topP.format(topP)}
          </span>
        </div>
        <Slider
          id="top-p-slider"
          min={PARAM_CONFIG.topP.min}
          max={PARAM_CONFIG.topP.max}
          step={PARAM_CONFIG.topP.step}
          value={[topP]}
          onValueChange={handleTopPChange}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{PARAM_CONFIG.topP.min}</span>
          <span>{PARAM_CONFIG.topP.max}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Nucleus sampling. Lower = more focused on top tokens.
        </p>
      </div>
    </div>
  );
}
