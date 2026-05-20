import type { Provider, Model } from "@/types";
import { mergeConfig } from "@/lib/config-merger";
import type { OpencodeJsonFile, OmoJsoncFile } from "@/lib/config-splitter";

/**
 * Read providers from opencode.json via API route.
 * Falls back to MOCK_PROVIDERS if the API call fails.
 */
export async function readProviders(): Promise<Record<string, Provider>> {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const merged = mergeConfig(data.opencode as OpencodeJsonFile, data.omo as OmoJsoncFile);
    return merged.providers ?? MOCK_PROVIDERS;
  } catch (error) {
    // Fall back to mock data if API call fails
    console.error("[configReader] Failed to read providers from API, using mock data:", error);
    return MOCK_PROVIDERS;
  }
}

const MOCK_PROVIDERS: Record<string, Provider> = {
  openai: {
    name: "OpenAI",
    npm: "@openai/sdk",
    options: {},
    models: {
      "gpt-4o": {
        name: "GPT-4o",
        contextWindow: 128_000,
        options: {},
      },
      "gpt-4o-mini": {
        name: "GPT-4o Mini",
        contextWindow: 128_000,
        options: {},
      },
      o3: {
        name: "o3",
        contextWindow: 200_000,
        options: {},
      },
    },
  },
  anthropic: {
    name: "Anthropic",
    npm: "@anthropic-ai/sdk",
    options: {},
    models: {
      "claude-sonnet-4-20250514": {
        name: "Claude Sonnet 4",
        contextWindow: 200_000,
        options: {},
      },
      "claude-opus-4-20250514": {
        name: "Claude Opus 4",
        contextWindow: 200_000,
        options: {},
      },
    },
  },
  google: {
    name: "Google",
    npm: "@google/genai",
    options: {},
    models: {
      "gemini-2.5-pro": {
        name: "Gemini 2.5 Pro",
        contextWindow: 1_000_000,
        options: {},
      },
      "gemini-2.5-flash": {
        name: "Gemini 2.5 Flash",
        contextWindow: 1_000_000,
        options: {},
      },
    },
  },
  ollama: {
    name: "Ollama",
    npm: "ollama",
    options: {},
    models: {
      llama3: {
        name: "Llama 3",
        contextWindow: 8_000,
        options: {},
      },
      mistral: {
        name: "Mistral",
        contextWindow: 32_000,
        options: {},
      },
      "deepseek-coder": {
        name: "DeepSeek Coder",
        contextWindow: 16_000,
        options: {},
      },
    },
  },
};
