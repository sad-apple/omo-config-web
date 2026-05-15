import type { Provider, Agent } from "@/types";

export const mockProviders: Record<string, Provider> = {
  openai: {
    name: "OpenAI",
    npm: "@openai/sdk",
    options: {
      baseURL: "https://api.openai.com/v1",
      apiKey: "sk-xxx",
    },
    models: {
      "gpt-4o": {
        name: "gpt-4o",
        contextWindow: 128_000,
        options: {
          temperature: 0.7,
          maxTokens: 16_384,
          topP: 1.0,
          thinking: { type: "disabled", budgetTokens: 0 },
        },
      },
      "gpt-4o-mini": {
        name: "gpt-4o-mini",
        contextWindow: 128_000,
        options: {
          temperature: 0.7,
          maxTokens: 16_384,
          topP: 1.0,
          thinking: { type: "disabled", budgetTokens: 0 },
        },
      },
      o3: {
        name: "o3",
        contextWindow: 200_000,
        options: {
          temperature: 1.0,
          maxTokens: 100_000,
          topP: 1.0,
          thinking: { type: "enabled", budgetTokens: 80_000 },
        },
      },
    },
  },
  anthropic: {
    name: "Anthropic",
    npm: "@anthropic-ai/sdk",
    options: {
      baseURL: "https://api.anthropic.com",
      apiKey: "sk-ant-xxx",
    },
    models: {
      "claude-sonnet-4-20250514": {
        name: "claude-sonnet-4-20250514",
        contextWindow: 200_000,
        options: {
          temperature: 0.7,
          maxTokens: 8_192,
          topP: 0.7,
          thinking: { type: "enabled", budgetTokens: 32_000 },
        },
      },
      "claude-opus-4-20250514": {
        name: "claude-opus-4-20250514",
        contextWindow: 200_000,
        options: {
          temperature: 0.7,
          maxTokens: 8_192,
          topP: 0.7,
          thinking: { type: "enabled", budgetTokens: 64_000 },
        },
      },
    },
  },
  deepseek: {
    name: "DeepSeek",
    npm: "deepseek",
    options: {
      baseURL: "https://api.deepseek.com",
      apiKey: "sk-xxx",
    },
    models: {
      "deepseek-chat": {
        name: "deepseek-chat",
        contextWindow: 64_000,
        options: {
          temperature: 0.7,
          maxTokens: 8_192,
          topP: 0.95,
          thinking: { type: "disabled", budgetTokens: 0 },
        },
      },
      "deepseek-reasoner": {
        name: "deepseek-reasoner",
        contextWindow: 64_000,
        options: {
          temperature: 1.0,
          maxTokens: 8_192,
          topP: 0.95,
          thinking: { type: "enabled", budgetTokens: 32_000 },
        },
      },
    },
  },
};

export const mockAgents: Record<string, Agent> = {
  sisyphus: {
    name: "sisyphus",
    model: "alibaba-coding-plan-cn/qwen3.6-plus",
    fallback_models: ["zhipuai-coding-plan/glm-5-turbo"],
    thinking: { type: "enabled", budgetTokens: 32_768 },
    variant: "high",
    ultrawork: {
      model: "alibaba-coding-plan-cn/qwen3.6-plus",
      variant: "max",
    },
    compaction: {
      model: "zhipuai-coding-plan/glm-5-turbo",
    },
    description: "The primary workhorse agent that drives long-running implementation tasks.",
  },
  oracle: {
    name: "oracle",
    model: "zhipuai-coding-plan/glm-5-turbo",
    thinking: { type: "enabled", budgetTokens: 16_384 },
    description: "Analysis and review agent focused on code quality and architecture.",
  },
  librarian: {
    name: "librarian",
    model: "alibaba-coding-plan-cn/MiniMax-M2.5",
    description: "Research agent specialized in information retrieval and documentation.",
  },
  explore: {
    name: "explore",
    model: "alibaba-coding-plan-cn/MiniMax-M2.5",
    fallback_models: ["zhipuai-coding-plan/glm-5-turbo"],
    description: "Exploration agent for codebase search and discovery.",
  },
};
