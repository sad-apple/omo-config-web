export interface Model {
  id: string;
  name: string;
  contextWindow?: string;
}

export interface Provider {
  id: string;
  name: string;
  npmPackage: string;
  models: Model[];
}

/**
 * Read providers from opencode.json.
 * TODO: Replace mock with actual file reader.
 */
export async function readProviders(): Promise<Provider[]> {
  return MOCK_PROVIDERS;
}

const MOCK_PROVIDERS: Provider[] = [
  {
    id: "openai",
    name: "OpenAI",
    npmPackage: "@openai/sdk",
    models: [
      { id: "gpt-4o", name: "GPT-4o", contextWindow: "128K" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: "128K" },
      { id: "o3", name: "o3", contextWindow: "200K" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    npmPackage: "@anthropic-ai/sdk",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindow: "200K" },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", contextWindow: "200K" },
    ],
  },
  {
    id: "google",
    name: "Google",
    npmPackage: "@google/genai",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: "1M" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: "1M" },
    ],
  },
  {
    id: "ollama",
    name: "Ollama",
    npmPackage: "ollama",
    models: [
      { id: "llama3", name: "Llama 3", contextWindow: "8K" },
      { id: "mistral", name: "Mistral", contextWindow: "32K" },
      { id: "deepseek-coder", name: "DeepSeek Coder", contextWindow: "16K" },
    ],
  },
];
