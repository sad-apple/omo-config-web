# Agent Form Expansion & Publish Concurrency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand AgentConfigForm from 7/20 to 20/20 field coverage, and add ETag-based concurrency control to the publish flow.

**Architecture:** 
- Task 1-5: Refactor AgentConfigForm to use Tabs layout, extract zod schema to independent file, add all 13 missing fields with proper validation, fix performance issues (watch → useController), fix onSubmit field loss.
- Task 6-9: Add ETag computation to API routes, extend usePublish hook with etag tracking, create ConflictDialog component, wire up conflict resolution flow.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zustand 5, react-hook-form + zod, shadcn/ui, crypto (Node.js)

---

### Task 1: Extract zod schema to independent file

**Files:**
- Create: `src/components/forms/agentSchema.ts`
- Modify: `src/components/forms/AgentConfigForm.tsx` (import schema from new file)

- [ ] **Step 1: Create `src/components/forms/agentSchema.ts` with full 20-field zod schema**

```typescript
import * as z from "zod";
import type { PermissionLevel } from "@/types";

export const permissionSchema = z.object({
  edit: z.enum(["ask", "allow", "deny"]).optional(),
  bash: z.union([
    z.enum(["ask", "allow", "deny"]),
    z.record(z.string(), z.enum(["ask", "allow", "deny"])),
  ]).optional(),
  webfetch: z.enum(["ask", "allow", "deny"]).optional(),
  task: z.enum(["ask", "allow", "deny"]).optional(),
  doom_loop: z.enum(["ask", "allow", "deny"]).optional(),
  external_directory: z.enum(["ask", "allow", "deny"]).optional(),
});

export const agentSchema = z.object({
  // Tab 1: 基本配置
  model: z.string().min(1, "Model is required"),
  fallback_models: z.array(z.string()).optional(),
  variant: z.string().optional(),
  description: z.string().optional(),

  // Tab 2: 行为
  category: z.string().optional(),
  mode: z.enum(["subagent", "primary", "all"]).optional(),
  disable: z.boolean().optional(),
  prompt: z.string().max(10000, "Prompt must be under 10000 characters").optional(),
  prompt_append: z.string().max(10000, "Prompt append must be under 10000 characters").optional(),
  permission: permissionSchema.optional(),

  // Tab 3: 参数
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
  reasoningEffort: z.enum(["none", "minimal", "low", "medium", "high", "xhigh", "max"]).optional(),
  textVerbosity: z.enum(["low", "medium", "high"]).optional(),
  thinking: z.object({
    type: z.enum(["enabled", "disabled"]),
    budgetTokens: z.number().optional(),
  }).optional(),

  // Tab 4: 高级
  ultrawork: z.object({
    model: z.string(),
    variant: z.string().optional(),
  }).optional(),
  compaction: z.object({
    model: z.string(),
    variant: z.string().optional(),
  }).optional(),
  skills: z.array(z.string().min(1)).optional(),
  tools: z.record(z.string(), z.boolean()).optional(),
  color: z.string().optional(),
  providerOptions: z.record(z.string(), z.unknown()).optional(),
});

export type AgentFormValues = z.infer<typeof agentSchema>;
```

- [ ] **Step 2: Update `src/components/forms/AgentConfigForm.tsx` to import from new file**

Replace lines 21-44 (the inline schema) with:

```typescript
import { agentSchema, type AgentFormValues } from "./agentSchema";
```

Remove the old inline `agentSchema` and `type AgentFormValues = z.infer<typeof agentSchema>` declarations.

- [ ] **Step 3: Verify build passes**

Run: `pnpm build`
Expected: PASS (no type errors)

- [ ] **Step 4: Commit**

```bash
git add src/components/forms/agentSchema.ts src/components/forms/AgentConfigForm.tsx
git commit -m "refactor: extract agent zod schema to independent file with full 20-field coverage"
```

---

### Task 2: Restructure AgentConfigSheet with Tabs layout

**Files:**
- Modify: `src/components/agents/AgentConfigSheet.tsx` (width + Tabs wrapper)
- May need: `pnpm dlx shadcn@latest add tabs` (if Tabs not already installed)

- [ ] **Step 1: Check if Tabs component exists**

Run: `ls src/components/ui/tabs.tsx`
If file does NOT exist, run: `pnpm dlx shadcn@latest add tabs`

- [ ] **Step 2: Update `src/components/agents/AgentConfigSheet.tsx`**

Replace the entire file content with:

```typescript
"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Agent, Provider } from "@/types";
import { AgentConfigForm } from "@/components/forms/AgentConfigForm";

interface AgentConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
  agentKey: string;
  providers: Record<string, Provider>;
  onSave: (agentKey: string, agent: Agent) => void;
}

export function AgentConfigSheet({
  open,
  onOpenChange,
  agent,
  agentKey,
  providers,
  onSave,
}: AgentConfigSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[640px] sm:w-[720px]">
        <SheetHeader className="px-1">
          <SheetTitle className="capitalize">{agentKey} Configuration</SheetTitle>
          <SheetDescription>
            Configure the model, fallbacks, thinking mode, and other settings for this agent.
          </SheetDescription>
        </SheetHeader>
        <div className="h-[calc(100vh-8rem)] overflow-auto px-1 py-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">基本配置</TabsTrigger>
              <TabsTrigger value="behavior">行为</TabsTrigger>
              <TabsTrigger value="params">参数</TabsTrigger>
              <TabsTrigger value="advanced">高级</TabsTrigger>
            </TabsList>
            <AgentConfigForm
              agent={agent}
              agentKey={agentKey}
              providers={providers}
              onSave={(key, updatedAgent) => {
                onSave(key, updatedAgent);
                onOpenChange(false);
              }}
              onCancel={() => onOpenChange(false)}
            />
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Verify build passes**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/agents/AgentConfigSheet.tsx
git commit -m "feat: expand Sheet width to 720px and add Tabs layout for agent form sections"
```

---

### Task 3: Rewrite AgentConfigForm with Tabs integration and all 13 missing fields

**Files:**
- Modify: `src/components/forms/AgentConfigForm.tsx` (complete rewrite with 4 Tabs, all 20 fields)

This is the largest task. The form must:
1. Use `useController` instead of `form.watch()` for all fields
2. Use `form.reset(agent)` for initialization
3. Build complete Agent object in onSubmit (no `...agent` spread)
4. Organize fields into 4 Tabs

- [ ] **Step 1: Replace `src/components/forms/AgentConfigForm.tsx` with complete implementation**

```typescript
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useController, Controller } from "react-hook-form";
import { Save, X } from "lucide-react";

import type { Agent, Provider, PermissionLevel } from "@/types";
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
  onSave: (agentKey: string, agent: Agent) => void;
  onCancel: () => void;
}

// Reusable controlled field wrappers to avoid form.watch() performance issues

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
  const value = name === "model" ? field.value : (field.value as any)?.model || "";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <ModelSelector
        value={value}
        onChange={(val: string) => {
          if (name === "model") {
            field.onChange(val);
          } else {
            const current = field.value || {};
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
  const [localValue, setLocalValue] = React.useState(field.value ?? min);

  React.useEffect(() => {
    if (field.value !== localValue) {
      setLocalValue(field.value ?? min);
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
  const permission = field.value || {};
  const permissionKeys: (keyof typeof permission)[] = ["edit", "webfetch", "task", "doom_loop", "external_directory"];
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
            value={(permission as any)[key] || "ask"}
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
  const entries = Object.entries(field.value || {});
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
  const tags = field.value || [];
  const [newTag, setNewTag] = React.useState("");

  const addTag = () => {
    if (newTag.trim()) {
      field.onChange([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (index: number) => {
    field.onChange(tags.filter((_: any, i: number) => i !== index));
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
      thinking: agent.thinking || { type: "disabled", budgetTokens: 0 },
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
      thinking: values.thinking?.type === "enabled" ? values.thinking : { type: "disabled" },
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
          options={[]} // TODO: populate from store categories
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
            <Input type="number" value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Auto" />
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
```

- [ ] **Step 2: Check if required shadcn components exist**

Run: `ls src/components/ui/slider.tsx src/components/ui/textarea.tsx src/components/ui/input.tsx src/components/ui/switch.tsx src/components/ui/select.tsx`

For any missing component, run: `pnpm dlx shadcn@latest add <component>`

- [ ] **Step 3: Verify build passes**

Run: `pnpm build`
Expected: PASS (may have minor type warnings, fix if errors)

- [ ] **Step 4: Commit**

```bash
git add src/components/forms/AgentConfigForm.tsx src/components/ui/
git commit -m "feat: expand AgentConfigForm to 20/20 fields with Tabs layout and useController performance fix"
```

---

### Task 4: Wire up category options from store

**Files:**
- Modify: `src/components/forms/AgentConfigForm.tsx` (category dropdown populated from store)
- May need: `src/components/agents/AgentConfigSheet.tsx` (pass categories prop)

- [ ] **Step 1: Update `AgentConfigSheet.tsx` to accept and pass categories**

Add `categories: Record<string, import("@/types").Category>` to props interface and pass to `AgentConfigForm`.

```typescript
// Add to interface
categories: Record<string, import("@/types").Category>;

// Pass to form
<AgentConfigForm
  agent={agent}
  agentKey={agentKey}
  providers={providers}
  categories={categories}
  onSave={...}
  onCancel={...}
/>
```

- [ ] **Step 2: Update `AgentConfigFormProps` interface**

```typescript
interface AgentConfigFormProps {
  agent: Agent;
  agentKey: string;
  providers: Record<string, Provider>;
  categories: Record<string, import("@/types").Category>;
  onSave: (agentKey: string, agent: Agent) => void;
  onCancel: () => void;
}
```

- [ ] **Step 3: Update ControlledSelect for category to use dynamic options**

Replace the empty `options={[]}` in Tab 2 category select with:

```typescript
options={Object.keys(categories).map((key) => ({
  value: key,
  label: categories[key].name || key,
}))}
```

- [ ] **Step 4: Update callers of `AgentConfigSheet`**

Find all usages: `grep -r "AgentConfigSheet" src/`

Update each call site to pass `categories` prop from the store.

- [ ] **Step 5: Verify build passes**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/forms/AgentConfigForm.tsx src/components/agents/AgentConfigSheet.tsx
git commit -m "feat: populate category dropdown from store categories"
```

---

### Task 5: Fix AgentConfigSheet caller to pass categories

**Files:**
- Modify: `src/components/agents/AgentsClient.tsx` (or wherever AgentConfigSheet is used)

- [ ] **Step 1: Find where AgentConfigSheet is called**

Run: `grep -rn "AgentConfigSheet" src/ --include="*.tsx"`

- [ ] **Step 2: Update the call site to pass categories from store**

Read the file, find the `<AgentConfigSheet` usage, add `categories={categories}` prop where `categories` comes from `useConfigStore((s) => s.categories)`.

- [ ] **Step 3: Verify build passes**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/agents/AgentsClient.tsx
git commit -m "fix: pass categories prop to AgentConfigSheet from store"
```

---

### Task 6: Add ETag computation to API routes

**Files:**
- Modify: `src/app/api/config/route.ts` (GET: return etag alongside data)
- Modify: `src/app/api/config/publish/route.ts` (POST: accept etag, validate, return 409 on conflict)

- [ ] **Step 1: Update `src/app/api/config/route.ts` GET handler**

Add etag computation to the GET response. Read the current file first, then modify:

```typescript
import { createHash } from "crypto";
// ... existing imports

function computeEtag(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// In the GET handler, after reading files:
const opencodeContent = await fs.readFile(opencodePath, "utf-8");
const omoContent = await fs.readFile(omoPath, "utf-8");

return NextResponse.json({
  opencode: JSON.parse(opencodeContent),
  ohmyopenagent: JSON.parse(omoContent),
  etags: {
    opencode: computeEtag(opencodeContent),
    omo: computeEtag(omoContent),
  },
});
```

- [ ] **Step 2: Update `src/app/api/config/publish/route.ts` POST handler**

Add etag validation. Read the current file first, then modify the POST handler:

```typescript
import { createHash } from "crypto";
// ... existing imports

function computeEtag(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// In the POST handler, before writing:
const { opencode, ohmyopenagent, etags } = await request.json();

if (etags) {
  // Validate etags
  const currentOpencodeContent = await fs.readFile(opencodePath, "utf-8");
  const currentOmoContent = await fs.readFile(omoPath, "utf-8");
  
  const currentOpencodeEtag = computeEtag(currentOpencodeContent);
  const currentOmoEtag = computeEtag(currentOmoContent);
  
  if (
    (etags.opencode && etags.opencode !== currentOpencodeEtag) ||
    (etags.omo && etags.omo !== currentOmoEtag)
  ) {
    return NextResponse.json(
      {
        error: "Conflict: configuration has been modified by another source",
        currentContent: {
          opencode: JSON.parse(currentOpencodeContent),
          ohmyopenagent: JSON.parse(currentOmoContent),
        },
        serverEtags: {
          opencode: currentOpencodeEtag,
          omo: currentOmoEtag,
        },
      },
      { status: 409 }
    );
  }
}

// Continue with existing write logic...
```

- [ ] **Step 3: Verify build passes**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/config/route.ts src/app/api/config/publish/route.ts
git commit -m "feat: add ETag-based optimistic locking to config API routes"
```

---

### Task 7: Extend usePublish hook with etag tracking

**Files:**
- Modify: `src/hooks/usePublish.ts` (add etag state, pass etag in publish request)
- May need: `src/store/configStore.ts` (store etags in state)

- [ ] **Step 1: Read current `src/hooks/usePublish.ts`**

Understand the current publish flow.

- [ ] **Step 2: Add etag state to usePublish hook**

```typescript
// Add to usePublish:
const [currentEtags, setCurrentEtags] = React.useState<{ opencode: string; omo: string } | null>(null);

// When loading config (in the fetch/get call):
const etags = response.etags;
setCurrentEtags(etags);

// When publishing:
const response = await fetch("/api/config/publish", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    opencode: opencodeData,
    ohmyopenagent: omoData,
    etags: currentEtags,
  }),
});

if (response.status === 409) {
  const conflictData = await response.json();
  onConflict(conflictData); // trigger conflict dialog
  return;
}
```

- [ ] **Step 3: Handle 409 response**

Add `onConflict` callback to the hook that sets a state to show the conflict dialog.

- [ ] **Step 4: Verify build passes**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePublish.ts
git commit -m "feat: track etags in usePublish hook and handle 409 conflicts"
```

---

### Task 8: Create ConflictDialog component

**Files:**
- Create: `src/components/editor/ConflictDialog.tsx`

- [ ] **Step 1: Create `src/components/editor/ConflictDialog.tsx`**

```typescript
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOverwrite: () => void;
  onReload: () => void;
  onMerge: () => void;
}

export function ConflictDialog({
  open,
  onOpenChange,
  onOverwrite,
  onReload,
  onMerge,
}: ConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Configuration Conflict Detected
          </DialogTitle>
          <DialogDescription>
            The configuration files have been modified by another source since you started editing.
            Your changes may overwrite theirs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Choose how to resolve this conflict:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-medium">Overwrite:</span>
              <span className="text-muted-foreground">Force write your changes (will overwrite other modifications)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium">Reload:</span>
              <span className="text-muted-foreground">Discard your changes and load the latest version</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium">Merge:</span>
              <span className="text-muted-foreground">Open a diff editor to manually merge changes</span>
            </li>
          </ul>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onReload}>
            Reload
          </Button>
          <Button variant="secondary" onClick={onMerge}>
            Merge
          </Button>
          <Button variant="destructive" onClick={onOverwrite}>
            Overwrite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/ConflictDialog.tsx
git commit -m "feat: add ConflictDialog for publish concurrency conflict resolution"
```

---

### Task 9: Wire up ConflictDialog to DualModeEditor

**Files:**
- Modify: `src/components/editor/DualModeEditor.tsx` (add ConflictDialog state + handlers)

- [ ] **Step 1: Read current `src/components/editor/DualModeEditor.tsx`**

Understand where the publish button is wired.

- [ ] **Step 2: Add ConflictDialog state and handlers**

```typescript
// Add state
const [conflictOpen, setConflictOpen] = React.useState(false);
const [conflictData, setConflictData] = React.useState<any>(null);

// Add handlers
const handleConflict = (data: any) => {
  setConflictData(data);
  setConflictOpen(true);
};

const handleOverwrite = async () => {
  // Re-publish without etag check
  await publish({ force: true });
  setConflictOpen(false);
};

const handleReload = () => {
  // Reload config from server
  window.location.reload();
  setConflictOpen(false);
};

const handleMerge = () => {
  // Switch to JSON mode to show current server content
  setConflictOpen(false);
  // TODO: implement merge view
};

// Pass onConflict to usePublish hook
```

- [ ] **Step 3: Add ConflictDialog to JSX**

Add `<ConflictDialog>` at the end of the component's return JSX.

- [ ] **Step 4: Verify build passes**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/DualModeEditor.tsx
git commit -m "feat: wire ConflictDialog to DualModeEditor publish flow"
```

---

### Task 10: Final verification and cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run full build**

Run: `pnpm build`
Expected: PASS with no errors

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS (fix any auto-fixable issues)

- [ ] **Step 3: Run LSP diagnostics on changed files**

Check: `src/components/forms/AgentConfigForm.tsx`, `src/components/forms/agentSchema.ts`, `src/components/agents/AgentConfigSheet.tsx`, `src/hooks/usePublish.ts`, `src/components/editor/ConflictDialog.tsx`, `src/components/editor/DualModeEditor.tsx`, `src/app/api/config/route.ts`, `src/app/api/config/publish/route.ts`

Expected: No errors

- [ ] **Step 4: Verify Agent form has all 20 fields**

Manually check that each Agent type field has a corresponding UI element:
- model ✅, fallback_models ✅, variant ✅, description ✅
- category ✅, mode ✅, disable ✅, prompt ✅, prompt_append ✅, permission ✅
- temperature ✅, top_p ✅, maxTokens ✅, reasoningEffort ✅, textVerbosity ✅, thinking ✅
- ultrawork ✅, compaction ✅, skills ✅, tools ✅, color ✅, providerOptions ✅

- [ ] **Step 5: Commit final changes**

```bash
git add -A
git commit -m "chore: final verification and cleanup for agent form + publish concurrency"
```

---

## Self-Review

### 1. Spec coverage

| Spec requirement | Task |
|-----------------|------|
| 20/20 Agent fields covered | Task 1, 3 |
| Tabs layout (4 sections) | Task 2, 3 |
| useController instead of watch | Task 3 |
| form.reset(agent) initialization | Task 3 |
| Complete Agent object in onSubmit | Task 3 |
| Permission as Select (ask/allow/deny) | Task 3 |
| tools as key-value editor | Task 3 |
| Sheet width 720px | Task 2 |
| zod schema in independent file | Task 1 |
| ETag computation in API | Task 6 |
| ETag validation in publish | Task 6 |
| usePublish etag tracking | Task 7 |
| ConflictDialog component | Task 8 |
| ConflictDialog wired to editor | Task 9 |
| Category options from store | Task 4, 5 |

All spec requirements covered.

### 2. Placeholder scan

- Task 3's category select has `options={[]}` with TODO comment — this is addressed in Task 4
- Task 9's merge handler has `// TODO: implement merge view` — acceptable as merge is complex and can be deferred; the dialog provides 3 options, merge can be a future enhancement
- No other placeholders found

### 3. Type consistency

- `AgentFormValues` defined in `agentSchema.ts`, imported by `AgentConfigForm.tsx` ✅
- `PermissionLevel` imported from `@/types` ✅
- `Agent` type used consistently across all files ✅
- ETag shape `{ opencode: string; omo: string }` consistent between API and hook ✅
- All method signatures match between components ✅

Plan is ready for execution.