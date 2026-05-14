// Provider types

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
    thinking?: { type: 'enabled' | 'disabled'; budgetTokens: number };
  };
  variants?: Record<string, { options: Record<string, unknown> }>;
}

// Agent types

export interface Agent {
  name: string;
  model: string;
  fallback_models?: string[];
  thinking?: { type: 'enabled' | 'disabled'; budgetTokens: number };
  compaction?: { model: string };
  ultrawork?: { model: string };
  variant?: string;
  allow_non_gpt_model?: boolean;
  description?: string;
}

// Category types

export interface Category {
  name: string;
  model: string;
  thinking?: { type: 'enabled' | 'disabled'; budgetTokens: number };
  variant?: string;
  description?: string;
}

// Config types

export interface ConfigProfile {
  name: string;
  enabled: boolean;
  agents: string[];
  categories: string[];
}

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
  background_task?: BackgroundTaskConfig;
  runtime_fallback?: RuntimeFallbackConfig;
  tmux?: TmuxConfig;
  team_mode?: TeamModeConfig;
}
