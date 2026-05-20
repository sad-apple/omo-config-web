"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Save, X, ChevronDown, ChevronUp } from "lucide-react";

import type { Agent, Category, Provider } from "@/types";
import { cn } from "@/lib/utils";
import { parseModelRef } from "@/lib/model-ref";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ModelSelector } from "./ModelSelector";
import { ThinkingConfigForm } from "./ThinkingConfigForm";
import { VariantSelector } from "./VariantSelector";
import { FallbackModelsEditor } from "./FallbackModelsEditor";
import { ModelParamsForm } from "./ModelParamsForm";

import { agentSchema, type AgentFormValues } from "./agentSchema";


interface AgentConfigFormProps {
  agent: Agent;
  agentKey: string;
  providers: Record<string, Provider>;
  categories: Record<string, Category>;
  onSave: (agentKey: string, agent: Agent) => void;
  onCancel: () => void;
}

export function AgentConfigForm({
  agent,
  agentKey,
  providers,
  categories,
  onSave,
  onCancel,
}: AgentConfigFormProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Parse fallback_models from Agent to string[]
  const fallbackStrings = React.useMemo(() => {
    if (!agent.fallback_models) return [];
    return agent.fallback_models.map((fb) =>
      typeof fb === "string" ? fb : `${fb.model}`
    );
  }, [agent.fallback_models]);

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      model: agent.model || "",
      fallback_models: fallbackStrings,
      thinking: agent.thinking || { type: "disabled", budgetTokens: 0 },
      variant: agent.variant,
      ultrawork: agent.ultrawork,
      compaction: agent.compaction,
      description: agent.description,
    },
  });

  const onSubmit = (values: AgentFormValues) => {
    const updatedAgent: Agent = {
      ...agent,
      name: agent.name,
      model: values.model,
      fallback_models: values.fallback_models?.filter(Boolean),
      thinking:
        values.thinking?.type === "enabled"
          ? values.thinking
          : { type: "disabled" },
      variant: values.variant,
      ultrawork: values.ultrawork,
      compaction: values.compaction,
      description: values.description,
    };
    onSave(agentKey, updatedAgent);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Model Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Primary Model</label>
        <ModelSelector
          value={form.watch("model")}
          onChange={(val: string) => form.setValue("model", val)}
          providers={providers}
          placeholder="Select primary model..."
        />
        {form.formState.errors.model && (
          <p className="text-sm text-destructive">
            {form.formState.errors.model.message}
          </p>
        )}
      </div>

      <Separator />

      {/* Fallback Models */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Fallback Models</label>
        <FallbackModelsEditor
          value={form.watch("fallback_models") || []}
          onChange={(val) => form.setValue("fallback_models", val)}
          providers={providers}
        />
      </div>

      <Separator />

      {/* Thinking Mode */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Thinking Mode</label>
        <ThinkingConfigForm
          value={form.watch("thinking")}
          onChange={(val) => form.setValue("thinking", val)}
        />
      </div>

      <Separator />

      {/* Variant */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Variant</label>
        <VariantSelector
          value={form.watch("variant")}
          onChange={(val) => form.setValue("variant", val)}
        />
      </div>

      {/* Advanced Section */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            Advanced Settings
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {/* Ultrawork Model */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ultrawork Model</label>
            <ModelSelector
              value={form.watch("ultrawork")?.model || ""}
              onChange={(val: string) => {
                const parsed = parseModelRef(val);
                if (parsed) {
                  form.setValue("ultrawork", {
                    model: val,
                    variant: form.watch("ultrawork")?.variant,
                  });
                }
              }}
              providers={providers}
              placeholder="Select ultrawork model..."
            />
          </div>

          {/* Compaction Model */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Compaction Model</label>
            <ModelSelector
              value={form.watch("compaction")?.model || ""}
              onChange={(val: string) => {
                form.setValue("compaction", {
                  model: val,
                  variant: form.watch("compaction")?.variant,
                });
              }}
              providers={providers}
              placeholder="Select compaction model..."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              )}
              value={form.watch("description") || ""}
              onChange={(e) => form.setValue("description", e.target.value)}
              placeholder="Agent description..."
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </form>
  );
}
