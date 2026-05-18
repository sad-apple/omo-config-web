import type {
  Agent,
  Category,
  ConfigProfile,
  BackgroundTaskConfig,
  RuntimeFallbackConfig,
} from "@/types";

export interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  agents: Record<string, Agent>;
  categories: Record<string, Category>;
  configProfiles: Record<string, ConfigProfile>;
  backgroundTask?: BackgroundTaskConfig;
  runtimeFallback?: RuntimeFallbackConfig;
}

export const configTemplates: ConfigTemplate[] = [
  {
    id: "coding",
    name: "Coding",
    description:
      "Optimized for software development with coding agents and reasoning models. Includes a primary coder, code reviewer, and exploration agent.",
    icon: "Code2",
    agents: {
      coder: {
        name: "coder",
        model: "anthropic/claude-sonnet-4-20250514",
        fallback_models: ["openai/gpt-4o"],
        thinking: { type: "enabled", budgetTokens: 32_000 },
        variant: "high",
        description: "Primary coding agent for implementation tasks.",
        mode: "primary",
        ultrawork: {
          model: "anthropic/claude-sonnet-4-20250514",
          variant: "max",
        },
        compaction: {
          model: "openai/gpt-4o-mini",
        },
      },
      reviewer: {
        name: "reviewer",
        model: "anthropic/claude-sonnet-4-20250514",
        thinking: { type: "enabled", budgetTokens: 16_000 },
        description: "Code review and quality analysis agent.",
        mode: "subagent",
      },
      explorer: {
        name: "explorer",
        model: "openai/gpt-4o-mini",
        fallback_models: ["anthropic/claude-sonnet-4-20250514"],
        description: "Codebase exploration and search agent.",
        mode: "subagent",
      },
    },
    categories: {
      coding: {
        name: "coding",
        model: "anthropic/claude-sonnet-4-20250514",
        thinking: { type: "enabled", budgetTokens: 32_000 },
        variant: "high",
        description: "Software development tasks.",
      },
    },
    configProfiles: {
      "Coding Setup": {
        name: "Coding Setup",
        enabled: true,
        agents: ["coder", "reviewer", "explorer"],
        categories: ["coding"],
      },
    },
    backgroundTask: {
      defaultConcurrency: 4,
      staleTimeoutMs: 300_000,
      providerConcurrency: { anthropic: 3, openai: 2 },
    },
    runtimeFallback: {
      enabled: true,
      retry_on_errors: [429, 500, 503],
      max_fallback_attempts: 3,
      cooldown_seconds: 30,
      timeout_seconds: 120,
      notify_on_fallback: true,
    },
  },
  {
    id: "writing",
    name: "Writing",
    description:
      "Optimized for content creation with writing agents and creative models. Includes a writer, editor, and research agent.",
    icon: "PenTool",
    agents: {
      writer: {
        name: "writer",
        model: "openai/gpt-4o",
        fallback_models: ["anthropic/claude-sonnet-4-20250514"],
        temperature: 0.8,
        description: "Primary writing agent for content creation.",
        mode: "primary",
      },
      editor: {
        name: "editor",
        model: "anthropic/claude-sonnet-4-20250514",
        thinking: { type: "enabled", budgetTokens: 16_000 },
        description: "Editing and proofreading agent.",
        mode: "subagent",
      },
      researcher: {
        name: "researcher",
        model: "openai/gpt-4o-mini",
        description: "Research and fact-checking agent.",
        mode: "subagent",
      },
    },
    categories: {
      writing: {
        name: "writing",
        model: "openai/gpt-4o",
        description: "Content creation and writing tasks.",
      },
    },
    configProfiles: {
      "Writing Setup": {
        name: "Writing Setup",
        enabled: true,
        agents: ["writer", "editor", "researcher"],
        categories: ["writing"],
      },
    },
    backgroundTask: {
      defaultConcurrency: 2,
      staleTimeoutMs: 600_000,
    },
    runtimeFallback: {
      enabled: true,
      retry_on_errors: [429, 500],
      max_fallback_attempts: 2,
      cooldown_seconds: 60,
      timeout_seconds: 180,
      notify_on_fallback: false,
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description:
      "Bare minimum configuration with one agent and one model. Perfect for getting started quickly.",
    icon: "Minus",
    agents: {
      assistant: {
        name: "assistant",
        model: "openai/gpt-4o-mini",
        description: "General-purpose assistant.",
        mode: "primary",
      },
    },
    categories: {
      general: {
        name: "general",
        model: "openai/gpt-4o-mini",
        description: "General-purpose tasks.",
      },
    },
    configProfiles: {
      "Minimal Setup": {
        name: "Minimal Setup",
        enabled: true,
        agents: ["assistant"],
        categories: ["general"],
      },
    },
  },
  {
    id: "fullstack",
    name: "Full Stack",
    description:
      "Comprehensive setup with multiple specialized agents for full-stack development, including frontend, backend, DevOps, and testing.",
    icon: "Layers",
    agents: {
      "fullstack-coder": {
        name: "fullstack-coder",
        model: "anthropic/claude-sonnet-4-20250514",
        fallback_models: ["openai/gpt-4o"],
        thinking: { type: "enabled", budgetTokens: 32_000 },
        variant: "high",
        description: "Primary full-stack coding agent.",
        mode: "primary",
        ultrawork: {
          model: "anthropic/claude-sonnet-4-20250514",
          variant: "max",
        },
        compaction: {
          model: "openai/gpt-4o-mini",
        },
      },
      "frontend-dev": {
        name: "frontend-dev",
        model: "openai/gpt-4o",
        thinking: { type: "enabled", budgetTokens: 16_000 },
        description: "Frontend development specialist.",
        mode: "subagent",
      },
      "backend-dev": {
        name: "backend-dev",
        model: "anthropic/claude-sonnet-4-20250514",
        thinking: { type: "enabled", budgetTokens: 16_000 },
        description: "Backend development specialist.",
        mode: "subagent",
      },
      "devops-agent": {
        name: "devops-agent",
        model: "openai/gpt-4o-mini",
        description: "DevOps and infrastructure agent.",
        mode: "subagent",
      },
      "test-agent": {
        name: "test-agent",
        model: "openai/gpt-4o-mini",
        description: "Testing and QA agent.",
        mode: "subagent",
      },
      reviewer: {
        name: "reviewer",
        model: "anthropic/claude-sonnet-4-20250514",
        thinking: { type: "enabled", budgetTokens: 16_000 },
        description: "Code review agent.",
        mode: "subagent",
      },
      explorer: {
        name: "explorer",
        model: "openai/gpt-4o-mini",
        fallback_models: ["anthropic/claude-sonnet-4-20250514"],
        description: "Codebase exploration agent.",
        mode: "subagent",
      },
    },
    categories: {
      frontend: {
        name: "frontend",
        model: "openai/gpt-4o",
        thinking: { type: "enabled", budgetTokens: 16_000 },
        description: "Frontend development tasks.",
      },
      backend: {
        name: "backend",
        model: "anthropic/claude-sonnet-4-20250514",
        thinking: { type: "enabled", budgetTokens: 16_000 },
        description: "Backend development tasks.",
      },
      devops: {
        name: "devops",
        model: "openai/gpt-4o-mini",
        description: "DevOps and infrastructure tasks.",
      },
      testing: {
        name: "testing",
        model: "openai/gpt-4o-mini",
        description: "Testing and QA tasks.",
      },
    },
    configProfiles: {
      "Full Stack Setup": {
        name: "Full Stack Setup",
        enabled: true,
        agents: [
          "fullstack-coder",
          "frontend-dev",
          "backend-dev",
          "devops-agent",
          "test-agent",
          "reviewer",
          "explorer",
        ],
        categories: ["frontend", "backend", "devops", "testing"],
      },
    },
    backgroundTask: {
      defaultConcurrency: 6,
      staleTimeoutMs: 300_000,
      providerConcurrency: { anthropic: 4, openai: 3 },
      modelConcurrency: {
        "anthropic/claude-sonnet-4-20250514": 3,
        "openai/gpt-4o": 2,
      },
    },
    runtimeFallback: {
      enabled: true,
      retry_on_errors: [429, 500, 503],
      max_fallback_attempts: 4,
      cooldown_seconds: 20,
      timeout_seconds: 120,
      notify_on_fallback: true,
    },
  },
];
