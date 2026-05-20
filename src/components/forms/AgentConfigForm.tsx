"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useController, Controller } from "react-hook-form";
import { Save, X } from "lucide-react";

import type { Agent, Category, Provider, PermissionLevel } from "@/types";
import { cn } from "@/lib/utils";
import { parseModelRef } from "@/lib/model-ref";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TabsContent } from "@/components/ui/tabs";
import { ModelSelector } from "./ModelSelector";
import { ThinkingConfigForm } from "./ThinkingConfigForm";
import { VariantSelector } from "./VariantSelector";
import { FallbackModelsEditor } from "./FallbackModelsEditor";
import { agentSchema, type AgentFormValues } from "./agentSchema";

interface AgentConfigFormProps {
  agent: Agent;
  agentKey: string;
  providers: Record<string, Provider>;
  categories: Record<string, Category>;
  onSave: (agentKey: string, agent: Agent) => void;
  onCancel: () => void;
}

// Controlled wrappers to avoid form.watch() performance issues

function ControlledModelSelector({
  control,
  name,
  providers,
  label,
  placeholder,
}: {
  control: any;
  name: "model" | "ultrawork" | "compaction";
  providers: Record<string, Provider>;
  label: string;
  placeholder?: string;
}) {
  const { field, fieldState } = useController({ control, name });
  const value = name === "model" ? (field.value as string) : (field.value as any)?.model || "";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <ModelSelector
        value={value}
        onChange={(val: string) => {
          if (name === "model") {
            field.onChange(val);
          } else {
            const current = (field.value as any) || {};
            field.onChange({ ...current, model: val });
          }
        }}
        providers={providers}
        placeholder={placeholder}
      />
      {fieldState.error && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
}

function ControlledSelect({
  control,
  name,
  label,
  options,
}: {
  control: any;
  name: keyof AgentFormValues;
  label: string;
  options: { value: string; label: string }[];
}) {
  const { field } = useController({ control, name });
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select value={field.value as string} onValueChange={field.onChange}>
        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ControlledSlider({
  control,
  name,
  label,
  min,
  max,
  step = 0.1,
}: {
  control: any;
  name: keyof AgentFormValues;
  label: string;
  min: number;
  max: number;
  step?: number;
}) {
  const { field } = useController({ control, name });
  const [localValue, setLocalValue] = React.useState((field.value as number) ?? min);

  React.useEffect(() => {
    if (field.value !== localValue) {
      setLocalValue((field.value as number) ?? min);
    }
  }, [field.value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm text-muted-foreground">{localValue}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[localValue]}
        onValueChange={(v) => setLocalValue(v[0])}
        onValueCommit={(v) => field.onChange(v[0])}
      />
    </div>
  );
}

function PermissionEditor({ control }: { control: any }) {
  const { field } = useController({ control, name: "permission" });
  const permission = (field.value as Record<string, PermissionLevel>) || {};
  const permissionKeys = ["edit", "webfetch", "task", "doom_loop", "external_directory"] as const;
  const labels: Record<string, string> = {
    edit: "Edit",
    webfetch: "Web Fetch",
    task: "Task",
    doom_loop: "Doom Loop",
    external_directory: "External Directory",
  };
  const options = [
    { value: "ask", label: "Ask" },
    { value: "allow", label: "Allow" },
    { value: "deny", label: "Deny" },
  ];

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Permissions</label>
      {permissionKeys.map((key) => (
        <div key={key} className="flex items-center justify-between">
          <span className="text-sm">{labels[key]}</span>
          <Select
            value={permission[key] || "ask"}
            onValueChange={(v) => {
              field.onChange({ ...permission, [key]: v as PermissionLevel });
            }}
          >
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

function KeyValueEditor({
  control,
  name,
  label,
}: {
  control: any;
  name: "tools";
  label: string;
}) {
  const { field } = useController({ control, name });
  const entries = Object.entries((field.value as Record<string, boolean>) || {});
  const [newKey, setNewKey] = React.useState("");

  const addEntry = () => {
    if (newKey.trim()) {
      field.onChange({ ...(field.value || {}), [newKey.trim()]: true });
      setNewKey("");
    }
  };

  const removeEntry = (key: string) => {
    const updated = { ...(field.value || {}) };
    delete updated[key];
    field.onChange(updated);
  };

  const toggleEntry = (key: string) => {
    field.onChange({ ...(field.value || {}), [key]: !(field.value as any)?.[key] });
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="space-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="flex-1 text-sm font-mono">{key}</span>
            <Switch checked={value as boolean} onCheckedChange={() => toggleEntry(key)} />
            <Button variant="ghost" size="sm" onClick={() => removeEntry(key)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Tool name..."
          onKeyDown={(e) => e.key === "Enter" && addEntry()}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addEntry}>
          Add
        </Button>
      </div>
    </div>
  );
}

function TagEditor({
  control,
  name,
  label,
}: {
  control: any;
  name: "skills";
  label: string;
}) {
  const { field } = useController({ control, name });
  const tags = (field.value as string[]) || [];
  const [newTag, setNewTag] = React.useState("");

  const addTag = () => {
    if (newTag.trim()) {
      field.onChange([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (index: number) => {
    field.onChange(tags.filter((_: string, i: number) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag: string, i: number) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
            {tag}
            <button type="button" onClick={() => removeTag(i)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add skill..."
          onKeyDown={(e) => e.key === "Enter" && addTag()}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addTag}>
          Add
        </Button>
      </div>
    </div>
  );
}

export function AgentConfigForm({
  agent,
  agentKey,
  providers,
  categories,
  onSave,
  onCancel,
}: AgentConfigFormProps) {
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
      thinking: agent.thinking || { type: "disabled" as const, budgetTokens: 0 },
      variant: agent.variant,
      ultrawork: agent.ultrawork,
      compaction: agent.compaction,
      description: agent.description,
      category: agent.category,
      mode: agent.mode,
      disable: agent.disable || false,
      prompt: agent.prompt,
      prompt_append: agent.prompt_append,
      permission: agent.permission,
      temperature: agent.temperature,
      top_p: agent.top_p,
      maxTokens: agent.maxTokens,
      reasoningEffort: agent.reasoningEffort,
      textVerbosity: agent.textVerbosity,
      skills: agent.skills || [],
      tools: agent.tools,
      color: agent.color,
      providerOptions: agent.providerOptions,
    },
  });

  const onSubmit = (values: AgentFormValues) => {
    const updatedAgent: Agent = {
      name: agent.name,
      model: values.model,
      fallback_models: values.fallback_models?.map((ref) => {
        const parsed = parseModelRef(ref);
        return parsed ? `${parsed.provider}/${parsed.model}` : ref;
      }),
      thinking: values.thinking?.type === "enabled" ? values.thinking : { type: "disabled" as const },
      variant: values.variant,
      category: values.category,
      mode: values.mode,
      disable: values.disable,
      prompt: values.prompt,
      prompt_append: values.prompt_append,
      permission: values.permission,
      temperature: values.temperature,
      top_p: values.top_p,
      maxTokens: values.maxTokens,
      reasoningEffort: values.reasoningEffort,
      textVerbosity: values.textVerbosity,
      skills: values.skills,
      tools: values.tools,
      color: values.color,
      providerOptions: values.providerOptions,
      ultrawork: values.ultrawork,
      compaction: values.compaction,
      description: values.description,
    };
    onSave(agentKey, updatedAgent);
  };

  const { control } = form;

  const categoryOptions = React.useMemo(() =>
    Object.keys(categories).map((key) => ({
      value: key,
      label: categories[key].name || key,
    })), [categories]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Tab 1: 基本配置 */}
      <TabsContent value="basic" className="space-y-4 mt-4">
        <ControlledModelSelector control={control} name="model" providers={providers} label="Primary Model" placeholder="Select primary model..." />
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Fallback Models</label>
          <Controller control={control} name="fallback_models" render={({ field }) => (
            <FallbackModelsEditor value={field.value || []} onChange={field.onChange} providers={providers} />
          )} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Thinking Mode</label>
          <Controller control={control} name="thinking" render={({ field }) => (
            <ThinkingConfigForm value={field.value} onChange={field.onChange} />
          )} />
        </div>

        <ControlledSelect
          control={control}
          name="variant"
          label="Variant"
          options={[
            { value: "none", label: "None" },
            { value: "minimal", label: "Minimal" },
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "xhigh", label: "XHigh" },
            { value: "max", label: "Max" },
          ]}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Controller control={control} name="description" render={({ field }) => (
            <Textarea value={field.value || ""} onChange={field.onChange} placeholder="Agent description..." />
          )} />
        </div>
      </TabsContent>

      {/* Tab 2: 行为 */}
      <TabsContent value="behavior" className="space-y-4 mt-4">
        <ControlledSelect
          control={control}
          name="category"
          label="Category"
          options={categoryOptions.length > 0 ? categoryOptions : [{ value: "", label: "No categories defined" }]}
        />

        <ControlledSelect
          control={control}
          name="mode"
          label="Mode"
          options={[
            { value: "subagent", label: "Subagent" },
            { value: "primary", label: "Primary" },
            { value: "all", label: "All" },
          ]}
        />

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Disable Agent</label>
          <Controller control={control} name="disable" render={({ field }) => (
            <Switch checked={field.value || false} onCheckedChange={field.onChange} />
          )} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">System Prompt</label>
          <Controller control={control} name="prompt" render={({ field }) => (
            <Textarea value={field.value || ""} onChange={field.onChange} placeholder="System prompt..." className="min-h-[120px]" />
          )} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Append Prompt</label>
          <Controller control={control} name="prompt_append" render={({ field }) => (
            <Textarea value={field.value || ""} onChange={field.onChange} placeholder="Appended prompt..." className="min-h-[80px]" />
          )} />
        </div>

        <PermissionEditor control={control} />
      </TabsContent>

      {/* Tab 3: 参数 */}
      <TabsContent value="params" className="space-y-4 mt-4">
        <ControlledSlider control={control} name="temperature" label="Temperature" min={0} max={2} />
        <ControlledSlider control={control} name="top_p" label="Top P" min={0} max={1} />

        <div className="space-y-2">
          <label className="text-sm font-medium">Max Tokens</label>
          <Controller control={control} name="maxTokens" render={({ field }) => (
            <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Auto" />
          )} />
        </div>

        <ControlledSelect
          control={control}
          name="reasoningEffort"
          label="Reasoning Effort"
          options={[
            { value: "none", label: "None" },
            { value: "minimal", label: "Minimal" },
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "xhigh", label: "XHigh" },
            { value: "max", label: "Max" },
          ]}
        />

        <ControlledSelect
          control={control}
          name="textVerbosity"
          label="Text Verbosity"
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
        />
      </TabsContent>

      {/* Tab 4: 高级 */}
      <TabsContent value="advanced" className="space-y-4 mt-4">
        <ControlledModelSelector control={control} name="ultrawork" providers={providers} label="Ultrawork Model" placeholder="Select ultrawork model..." />
        <ControlledModelSelector control={control} name="compaction" providers={providers} label="Compaction Model" placeholder="Select compaction model..." />

        <TagEditor control={control} name="skills" label="Skills" />
        <KeyValueEditor control={control} name="tools" label="Tools" />

        <div className="space-y-2">
          <label className="text-sm font-medium">Color</label>
          <Controller control={control} name="color" render={({ field }) => (
            <div className="flex items-center gap-2">
              <input type="color" value={field.value || "#000000"} onChange={(e) => field.onChange(e.target.value)} className="h-8 w-8 rounded border" />
              <Input value={field.value || ""} onChange={(e) => field.onChange(e.target.value)} placeholder="#000000" className="flex-1" />
            </div>
          )} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Provider Options (JSON)</label>
          <Controller control={control} name="providerOptions" render={({ field }) => (
            <Textarea
              value={field.value ? JSON.stringify(field.value, null, 2) : ""}
              onChange={(e) => {
                try {
                  field.onChange(JSON.parse(e.target.value));
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              placeholder='{"key": "value"}'
              className="min-h-[100px] font-mono text-xs"
            />
          )} />
        </div>
      </TabsContent>

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
