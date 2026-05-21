// === Thinking ===

export type ThinkingType = "enabled" | "disabled";

export interface ThinkingConfig {
  type: ThinkingType;
  budgetTokens?: number;
}

// === Variant ===

export type Variant = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

// === Permission ===

export type PermissionLevel = "ask" | "allow" | "deny";

export interface PermissionConfig {
  edit?: PermissionLevel;
  bash?: PermissionLevel | Record<string, PermissionLevel>;
  webfetch?: PermissionLevel;
  task?: PermissionLevel;
  doom_loop?: PermissionLevel;
  external_directory?: PermissionLevel;
}

// === Model Reference (for fallback_models) ===

export interface FallbackModelEntry {
  model: string;
  variant?: string;
  reasoningEffort?: Variant;
  temperature?: number;
  top_p?: number;
  maxTokens?: number;
  thinking?: ThinkingConfig;
}

export type ModelRef = string | FallbackModelEntry;

// === Provider types ===

export interface Provider {
  name: string;
  npm: string;
  options: {
    baseURL?: string;
    apiKey?: string;
  };
  models: Record<string, Model>;
}

export interface Model {
  name: string;
  contextWindow?: number;
  options: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    thinking?: ThinkingConfig;
    reasoningEffort?: Variant;
    textVerbosity?: "low" | "medium" | "high";
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  variants?: Record<string, { options: Record<string, unknown> }>;
}

// === Agent types ===

export interface Agent {
  name: string;
  model: string;
  fallback_models?: ModelRef[];
  variant?: string;
  category?: string;
  skills?: string[];
  temperature?: number;
  top_p?: number;
  prompt?: string;
  prompt_append?: string;
  tools?: Record<string, boolean>;
  disable?: boolean;
  description?: string;
  mode?: "subagent" | "primary" | "all";
  color?: string;
  permission?: PermissionConfig;
  maxTokens?: number;
  thinking?: ThinkingConfig;
  reasoningEffort?: Variant;
  textVerbosity?: "low" | "medium" | "high";
  providerOptions?: Record<string, unknown>;
  ultrawork?: { model: string; variant?: string };
  compaction?: { model: string; variant?: string };
}

// === Category types ===

export interface Category {
  name: string;
  model: string;
  thinking?: ThinkingConfig;
  variant?: string;
  description?: string;
}

// === Config Profile ===

export interface ConfigProfile {
  name: string;
  enabled: boolean;
  agents: string[];
  categories: string[];
}

// === Runtime Config ===

export interface BackgroundTaskConfig {
  defaultConcurrency: number;
  staleTimeoutMs: number;
  providerConcurrency?: Record<string, number>;
  modelConcurrency?: Record<string, number>;
}

export interface RuntimeFallbackConfig {
  enabled: boolean;
  retry_on_errors: number[];
  max_fallback_attempts: number;
  cooldown_seconds: number;
  timeout_seconds: number;
  notify_on_fallback: boolean;
}

export interface TmuxConfig {
  enabled: boolean;
  layout: string;
  main_pane_size: number;
}

export interface TeamModeConfig {
  enabled: boolean;
  max_parallel_members: number;
  max_members: number;
}

export interface OmoConfig {
  agents: Record<string, Agent>;
  categories: Record<string, Category>;
  providers?: Record<string, Provider>;
  configProfiles?: Record<string, ConfigProfile>;
  background_task?: BackgroundTaskConfig;
  runtime_fallback?: RuntimeFallbackConfig;
  tmux?: TmuxConfig;
  team_mode?: TeamModeConfig;
}

// === Publish History ===

export interface PublishSnapshot {
  id: string;
  timestamp: number;
  /** The full config JSON at time of publish */
  snapshot: string;
  /** Summary of what changed (human-readable) */
  summary: string;
  /** Which files were written */
  filesWritten: string[];
}

// === Preset Config ===

export interface Preset {
  name: string;
  createdAt: number;
  modifiedAt: number;
  hasOpencodeConfig: boolean;
  hasOmoConfig: boolean;
}

export interface PresetListResponse {
  presets: Preset[];
  currentPreset: string | null;
}

export interface CreatePresetRequest {
  name: string;
  copyFrom?: string;
}

export interface ActivatePresetRequest {
  presetName: string;
}

export interface ActivatePresetResponse {
  success: boolean;
  presetName: string;
  filesCopied: string[];
  timestamp: number;
}
