// ─── Provider color map ────────────────────────────────────────────────────────

export const PROVIDER_COLORS: Record<string, string> = {
  "alibaba-coding-plan-cn": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "zhipuai-coding-plan": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  openai: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  anthropic: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  google: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  ollama: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export const PROVIDER_LABELS: Record<string, string> = {
  "alibaba-coding-plan-cn": "Alibaba",
  "zhipuai-coding-plan": "ZhipuAI",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  ollama: "Ollama",
};

const DEFAULT_COLOR = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

export function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider] ?? DEFAULT_COLOR;
}

export function getProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}
