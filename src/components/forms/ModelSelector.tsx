"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { Provider } from "@/types";
import { parseModelRef, formatModelRef, getAvailableModels } from "@/lib/model-ref";
import { getProviderColor } from "@/lib/provider-colors";

interface ModelSelectorProps {
  value: string;
  onChange: (modelRef: string) => void;
  providers: Record<string, Provider>;
  placeholder?: string;
  className?: string;
}

export function ModelSelector({
  value,
  onChange,
  providers,
  placeholder = "Select model...",
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const parsed = value ? parseModelRef(value) : null;
  const displayValue = parsed ? `${parsed.provider}/${parsed.model}` : "";

  const modelOptions = React.useMemo(() => {
    return getAvailableModels(providers);
  }, [providers]);

  // Group by provider
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, typeof modelOptions> = {};
    for (const option of modelOptions) {
      if (!groups[option.providerName]) {
        groups[option.providerName] = [];
      }
      groups[option.providerName].push(option);
    }
    return groups;
  }, [modelOptions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {displayValue ? (
            <div className="flex items-center gap-2">
              {parsed && (
                <Badge
                  variant="secondary"
                  className={cn("text-xs", getProviderColor(parsed.provider))}
                >
                  {parsed.provider}
                </Badge>
              )}
              <span className="font-mono text-sm">{parsed?.model}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search models..." />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            {Object.entries(groupedOptions).map(([providerName, models]) => (
              <CommandGroup key={providerName} heading={providerName}>
                {models.map(({ providerName: pName, modelKey, model }) => {
                  const modelRef = formatModelRef(pName, modelKey);
                  return (
                    <CommandItem
                      key={modelRef}
                      value={modelRef}
                      onSelect={() => {
                        onChange(modelRef);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === modelRef ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-mono text-sm">{modelKey}</span>
                      {model.contextWindow && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {(model.contextWindow / 1000).toFixed(0)}K
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
