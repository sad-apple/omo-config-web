"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface VariantSelectorProps {
  value?: string;
  onChange: (variant: string | undefined) => void;
}

const VARIANTS = [
  { value: undefined, label: "No Override" },
  { value: "max", label: "Max" },
  { value: "xhigh", label: "XHigh" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function VariantSelector({ value, onChange }: VariantSelectorProps) {
  const handleValueChange = (newValue: string) => {
    if (newValue === "no-override") {
      onChange(undefined);
    } else {
      onChange(newValue);
    }
  };

  const displayValue = value ? capitalizeFirst(value) : "No Override";

  return (
    <div className="space-y-2">
      <Label htmlFor="variant-select">Variant</Label>
      <Select
        value={value ?? "no-override"}
        onValueChange={handleValueChange}
      >
        <SelectTrigger id="variant-select" className="w-[180px]">
          <SelectValue placeholder="Select variant">
            {displayValue}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {VARIANTS.map((variant) => (
            <SelectItem
              key={variant.value ?? "no-override"}
              value={variant.value ?? "no-override"}
            >
              {variant.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Select a model variant for enhanced capabilities. Leave as &quot;No Override&quot; to use defaults.
      </p>
    </div>
  );
}
