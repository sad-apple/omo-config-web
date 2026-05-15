"use client";

import { useState, useEffect } from "react";
import { ShieldAlert } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RuntimeFallbackConfig } from "@/types";

interface RuntimeFallbackConfigFormProps {
  value: RuntimeFallbackConfig | null;
  onChange: (config: RuntimeFallbackConfig | null) => void;
}

const DEFAULT_CONFIG: RuntimeFallbackConfig = {
  enabled: true,
  retry_on_errors: [429, 500, 503],
  max_fallback_attempts: 3,
  cooldown_seconds: 30,
  timeout_seconds: 60,
  notify_on_fallback: true,
};

export function RuntimeFallbackConfigForm({
  value,
  onChange,
}: RuntimeFallbackConfigFormProps) {
  const [enabled, setEnabled] = useState(value !== null);
  const [retryOnErrors, setRetryOnErrors] = useState(
    value?.retry_on_errors?.join(", ") ?? DEFAULT_CONFIG.retry_on_errors.join(", ")
  );
  const [maxFallbackAttempts, setMaxFallbackAttempts] = useState(
    value?.max_fallback_attempts ?? DEFAULT_CONFIG.max_fallback_attempts
  );
  const [cooldownSeconds, setCooldownSeconds] = useState(
    value?.cooldown_seconds ?? DEFAULT_CONFIG.cooldown_seconds
  );
  const [timeoutSeconds, setTimeoutSeconds] = useState(
    value?.timeout_seconds ?? DEFAULT_CONFIG.timeout_seconds
  );
  const [notifyOnFallback, setNotifyOnFallback] = useState(
    value?.notify_on_fallback ?? DEFAULT_CONFIG.notify_on_fallback
  );

  useEffect(() => {
    if (value !== null) {
      setEnabled(true);
      setRetryOnErrors((value.retry_on_errors ?? []).join(", "));
      setMaxFallbackAttempts(value.max_fallback_attempts);
      setCooldownSeconds(value.cooldown_seconds);
      setTimeoutSeconds(value.timeout_seconds);
      setNotifyOnFallback(value.notify_on_fallback);
    } else {
      setEnabled(false);
    }
  }, [value]);

  const emitChange = (overrides: Partial<RuntimeFallbackConfig>) => {
    const config: RuntimeFallbackConfig = {
      enabled: true,
      retry_on_errors: parseRetryErrors(retryOnErrors),
      max_fallback_attempts: maxFallbackAttempts,
      cooldown_seconds: cooldownSeconds,
      timeout_seconds: timeoutSeconds,
      notify_on_fallback: notifyOnFallback,
      ...overrides,
    };
    onChange(config);
  };

  const parseRetryErrors = (raw: string): number[] => {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map(Number)
      .filter((n) => !isNaN(n));
  };

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    if (checked) {
      emitChange({ enabled: true });
    } else {
      onChange(null);
    }
  };

  const handleRetryErrorsChange = (raw: string) => {
    setRetryOnErrors(raw);
    if (enabled) {
      emitChange({ retry_on_errors: parseRetryErrors(raw) });
    }
  };

  const handleMaxFallbackAttemptsChange = (newVal: number) => {
    const clamped = Math.min(10, Math.max(1, newVal));
    setMaxFallbackAttempts(clamped);
    if (enabled) {
      emitChange({ max_fallback_attempts: clamped });
    }
  };

  const handleCooldownChange = (newVal: number) => {
    const clamped = Math.min(3600, Math.max(0, newVal));
    setCooldownSeconds(clamped);
    if (enabled) {
      emitChange({ cooldown_seconds: clamped });
    }
  };

  const handleTimeoutChange = (newVal: number) => {
    const clamped = Math.min(300, Math.max(1, newVal));
    setTimeoutSeconds(clamped);
    if (enabled) {
      emitChange({ timeout_seconds: clamped });
    }
  };

  const handleNotifyChange = (checked: boolean) => {
    setNotifyOnFallback(checked);
    if (enabled) {
      emitChange({ notify_on_fallback: checked });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <div className="space-y-0.5">
            <Label className="text-base">Runtime Fallback</Label>
            <p className="text-sm text-muted-foreground">
              Configure automatic fallback behavior when model calls fail
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={handleEnabledChange} />
      </div>

      {enabled && (
        <div className="space-y-4">
          {/* Retry on errors */}
          <div className="space-y-2">
            <Label htmlFor="retry-on-errors">Retry on Errors</Label>
            <Input
              id="retry-on-errors"
              type="text"
              value={retryOnErrors}
              onChange={(e) => handleRetryErrorsChange(e.target.value)}
              placeholder="429, 500, 503"
            />
            <p className="text-sm text-muted-foreground">
              HTTP error codes that trigger fallback (comma-separated, e.g. 429, 500, 503)
            </p>
          </div>

          {/* Max fallback attempts */}
          <div className="space-y-2">
            <Label htmlFor="max-fallback-attempts">Max Fallback Attempts</Label>
            <div className="flex items-center gap-4">
              <Input
                id="max-fallback-attempts"
                type="number"
                min={1}
                max={10}
                step={1}
                value={maxFallbackAttempts}
                onChange={(e) =>
                  handleMaxFallbackAttemptsChange(Number(e.target.value))
                }
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                (min: 1, max: 10)
              </span>
            </div>
          </div>

          {/* Cooldown seconds */}
          <div className="space-y-2">
            <Label htmlFor="cooldown-seconds">Cooldown Seconds</Label>
            <div className="flex items-center gap-4">
              <Input
                id="cooldown-seconds"
                type="number"
                min={0}
                max={3600}
                step={1}
                value={cooldownSeconds}
                onChange={(e) => handleCooldownChange(Number(e.target.value))}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                (min: 0, max: 3600)
              </span>
            </div>
          </div>

          {/* Timeout seconds */}
          <div className="space-y-2">
            <Label htmlFor="timeout-seconds">Timeout Seconds</Label>
            <div className="flex items-center gap-4">
              <Input
                id="timeout-seconds"
                type="number"
                min={1}
                max={300}
                step={1}
                value={timeoutSeconds}
                onChange={(e) => handleTimeoutChange(Number(e.target.value))}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                (min: 1, max: 300)
              </span>
            </div>
          </div>

          {/* Notify on fallback */}
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Notify on Fallback</Label>
              <p className="text-sm text-muted-foreground">
                Send a notification when a fallback is triggered
              </p>
            </div>
            <Switch
              checked={notifyOnFallback}
              onCheckedChange={handleNotifyChange}
            />
          </div>
        </div>
      )}

      {!enabled && (
        <p className="text-sm text-muted-foreground">
          Runtime fallback is disabled
        </p>
      )}
    </div>
  );
}
