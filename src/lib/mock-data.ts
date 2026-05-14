export interface ThinkingConfig {
  enabled: boolean;
  budget?: number; // thinking token budget
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  contextWindow: number; // max context length in tokens
  temperature: number;
  maxTokens: number;
  topP: number;
  thinking: ThinkingConfig;
  description?: string;
}

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  models: Model[];
}

export const mockProviders: Provider[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-xxx",
    models: [
      {
        id: "gpt-4o",
        name: "gpt-4o",
        provider: "OpenAI",
        contextWindow: 128_000,
        temperature: 0.7,
        maxTokens: 16_384,
        topP: 1.0,
        thinking: { enabled: false },
        description: "OpenAI's flagship multimodal model with fast, high-quality responses.",
      },
      {
        id: "gpt-4o-mini",
        name: "gpt-4o-mini",
        provider: "OpenAI",
        contextWindow: 128_000,
        temperature: 0.7,
        maxTokens: 16_384,
        topP: 1.0,
        thinking: { enabled: false },
        description: "A smaller, faster, and more cost-effective version of gpt-4o.",
      },
      {
        id: "o3",
        name: "o3",
        provider: "OpenAI",
        contextWindow: 200_000,
        temperature: 1.0,
        maxTokens: 100_000,
        topP: 1.0,
        thinking: { enabled: true, budget: 80_000 },
        description: "OpenAI's reasoning model with advanced thinking capabilities.",
      },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKey: "sk-ant-xxx",
    models: [
      {
        id: "claude-sonnet-4-20250514",
        name: "claude-sonnet-4-20250514",
        provider: "Anthropic",
        contextWindow: 200_000,
        temperature: 0.7,
        maxTokens: 8_192,
        topP: 0.7,
        thinking: { enabled: true, budget: 32_000 },
        description: "Anthropic's mid-tier model balancing intelligence and speed.",
      },
      {
        id: "claude-opus-4-20250514",
        name: "claude-opus-4-20250514",
        provider: "Anthropic",
        contextWindow: 200_000,
        temperature: 0.7,
        maxTokens: 8_192,
        topP: 0.7,
        thinking: { enabled: true, budget: 64_000 },
        description: "Anthropic's most intelligent model for complex tasks.",
      },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiKey: "sk-xxx",
    models: [
      {
        id: "deepseek-chat",
        name: "deepseek-chat",
        provider: "DeepSeek",
        contextWindow: 64_000,
        temperature: 0.7,
        maxTokens: 8_192,
        topP: 0.95,
        thinking: { enabled: false },
        description: "DeepSeek's general-purpose chat model.",
      },
      {
        id: "deepseek-reasoner",
        name: "deepseek-reasoner",
        provider: "DeepSeek",
        contextWindow: 64_000,
        temperature: 1.0,
        maxTokens: 8_192,
        topP: 0.95,
        thinking: { enabled: true, budget: 32_000 },
        description: "DeepSeek's reasoning model with chain-of-thought capabilities.",
      },
    ],
  },
];
