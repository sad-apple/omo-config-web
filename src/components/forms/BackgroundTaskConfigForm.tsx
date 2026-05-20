"use client";

import { useMemo } from "react";
import { Clock, Plus, X } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { BackgroundTaskConfig } from "@/types";

interface BackgroundTaskConfigFormProps {
  value: BackgroundTaskConfig | null;
  onChange: (config: BackgroundTaskConfig | null) => void;
}

const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 20;
const DEFAULT_CONCURRENCY = 3;

const MIN_STALE_TIMEOUT = 1000;
const MAX_STALE_TIMEOUT = 3600000;
const STALE_TIMEOUT_STEP = 1000;
const DEFAULT_STALE_TIMEOUT = 300000;

interface KeyValueRow {
  key: string;
  value: number;
}

function toKeyValueRows(record?: Record<string, number>): KeyValueRow[] {
  if (!record) return [];
  return Object.entries(record).map(([key, value]) => ({ key, value }));
}

function fromKeyValueRows(rows: KeyValueRow[]): Record<string, number> | undefined {
  const filtered = rows.filter((r) => r.key.trim() !== "");
  if (filtered.length === 0) return undefined;
  const result: Record<string, number> = {};
  for (const row of filtered) {
    result[row.key.trim()] = row.value;
  }
  return result;
}

function KeyValueEditor({
  label,
  rows,
  onChange,
}: {
  label: string;
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
}) {
  const handleKeyChange = (index: number, newKey: string) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], key: newKey };
    onChange(updated);
  };

  const handleValueChange = (index: number, newValue: number) => {
    const clamped = Math.min(MAX_CONCURRENCY, Math.max(MIN_CONCURRENCY, newValue));
    const updated = [...rows];
    updated[index] = { ...updated[index], value: clamped };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onChange([...rows, { key: "", value: DEFAULT_CONCURRENCY }]);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="Name"
              value={row.key}
              onChange={(e) => handleKeyChange(index, e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              min={MIN_CONCURRENCY}
              max={MAX_CONCURRENCY}
              value={row.value}
              onChange={(e) => handleValueChange(index, Number(e.target.value))}
              className="w-24"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(index)}
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}

export function BackgroundTaskConfigForm({
  value,
  onChange,
}: BackgroundTaskConfigFormProps) {
  const enabled = value !== null;
  const defaultConcurrency = value?.defaultConcurrency ?? DEFAULT_CONCURRENCY;
  const staleTimeoutMs = value?.staleTimeoutMs ?? DEFAULT_STALE_TIMEOUT;
  const providerConcurrency = useMemo(() => toKeyValueRows(value?.providerConcurrency), [value?.providerConcurrency]);
  const modelConcurrency = useMemo(() => toKeyValueRows(value?.modelConcurrency), [value?.modelConcurrency]);

  const emitChange = (
    overrides: Partial<BackgroundTaskConfig> = {}
  ) => {
    onChange({
      defaultConcurrency: overrides.defaultConcurrency ?? defaultConcurrency,
      staleTimeoutMs: overrides.staleTimeoutMs ?? staleTimeoutMs,
      providerConcurrency:
        overrides.providerConcurrency !== undefined
          ? overrides.providerConcurrency
          : fromKeyValueRows(providerConcurrency),
      modelConcurrency:
        overrides.modelConcurrency !== undefined
          ? overrides.modelConcurrency
          : fromKeyValueRows(modelConcurrency),
    });
  };

  const handleEnabledChange = (checked: boolean) => {
    if (checked) {
      emitChange();
    } else {
      onChange(null);
    }
  };

  const handleDefaultConcurrencyChange = (newValue: number) => {
    const clamped = Math.min(MAX_CONCURRENCY, Math.max(MIN_CONCURRENCY, newValue));
    if (enabled) {
      emitChange({ defaultConcurrency: clamped });
    }
  };

  const handleStaleTimeoutChange = (newValue: number) => {
    const clamped = Math.min(MAX_STALE_TIMEOUT, Math.max(MIN_STALE_TIMEOUT, newValue));
    if (enabled) {
      emitChange({ staleTimeoutMs: clamped });
    }
  };

  const handleProviderConcurrencyChange = (rows: KeyValueRow[]) => {
    if (enabled) {
      emitChange({ providerConcurrency: fromKeyValueRows(rows) });
    }
  };

  const handleModelConcurrencyChange = (rows: KeyValueRow[]) => {
    if (enabled) {
      emitChange({ modelConcurrency: fromKeyValueRows(rows) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-500" />
          <div className="space-y-0.5">
            <Label className="text-base">Background Task Concurrency</Label>
            <p className="text-sm text-muted-foreground">
              Configure concurrency limits and stale task timeouts
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={handleEnabledChange} />
      </div>

      {enabled && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-concurrency">Default Concurrency</Label>
            <div className="flex items-center gap-4">
              <Input
                id="default-concurrency"
                type="number"
                min={MIN_CONCURRENCY}
                max={MAX_CONCURRENCY}
                value={defaultConcurrency}
                onChange={(e) =>
                  handleDefaultConcurrencyChange(Number(e.target.value))
                }
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                (min: {MIN_CONCURRENCY}, max: {MAX_CONCURRENCY})
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Maximum number of background tasks running in parallel.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stale-timeout">Stale Timeout</Label>
            <div className="flex items-center gap-4">
              <Input
                id="stale-timeout"
                type="number"
                min={MIN_STALE_TIMEOUT}
                max={MAX_STALE_TIMEOUT}
                step={STALE_TIMEOUT_STEP}
                value={staleTimeoutMs}
                onChange={(e) =>
                  handleStaleTimeoutChange(Number(e.target.value))
                }
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                (min: {MIN_STALE_TIMEOUT.toLocaleString()}, max:{" "}
                {MAX_STALE_TIMEOUT.toLocaleString()})
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Timeout in milliseconds before a task is considered stale
            </p>
          </div>

          <KeyValueEditor
            label="Provider Concurrency"
            rows={providerConcurrency}
            onChange={handleProviderConcurrencyChange}
          />

          <KeyValueEditor
            label="Model Concurrency"
            rows={modelConcurrency}
            onChange={handleModelConcurrencyChange}
          />
        </div>
      )}

      {!enabled && (
        <p className="text-sm text-muted-foreground">
          Background task concurrency is disabled
        </p>
      )}
    </div>
  );
}
