import type { Provider } from "@/types";
import { mergeConfig } from "@/lib/config-merger";
import type { OpencodeJsonFile, OmoJsoncFile } from "@/lib/config-splitter";
import { getCurrentPresetFilePath, getPresetOmoJsoncPath, getPresetOpencodeJsonPath } from "@/lib/config-paths";
import fs from "fs/promises";
import * as jsonc from "jsonc-parser";

/**
 * Read providers from opencode.json via API route.
 * Falls back to MOCK_PROVIDERS if the API call fails.
 */
export async function readProviders(): Promise<Record<string, Provider>> {
  try {
    // Read current preset from .current file
    let preset = "default";
    try {
      const currentPresetPath = getCurrentPresetFilePath();
      const content = await fs.readFile(currentPresetPath, "utf-8");
      preset = content.trim() || "default";
    } catch {
      // .current file doesn't exist, use default
    }

    const [opencodeRaw, omoRaw] = await Promise.all([
      fs.readFile(getPresetOpencodeJsonPath(preset), "utf-8"),
      fs.readFile(getPresetOmoJsoncPath(preset), "utf-8"),
    ]);

    const opencode = JSON.parse(opencodeRaw) as OpencodeJsonFile;
    const omo = jsonc.parse(omoRaw) as OmoJsoncFile;
    const merged = mergeConfig(opencode, omo);
    return merged.providers ?? MOCK_PROVIDERS;
  } catch (error) {
    const code = getErrorCode(error);
    if (code === "ENOENT") {
      return MOCK_PROVIDERS;
    }
    throw error;
  }
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const { code } = error as { code?: unknown };
  return typeof code === "string" ? code : undefined;
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
