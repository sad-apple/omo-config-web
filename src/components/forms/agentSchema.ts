import * as z from "zod";

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
