import type { Model, Provider } from '@/types';

/**
 * Parse a model reference string like "provider/modelName" into its components
 * @param ref The model reference string (e.g., "alibaba-coding-plan-cn/qwen3.6-plus")
 * @returns Object with provider and model, or null if invalid format
 */
export function parseModelRef(ref: string): { provider: string; model: string } | null {
  const firstSlash = ref.indexOf('/');
  if (firstSlash === -1) {
    return null;
  }
  
  const provider = ref.slice(0, firstSlash);
  const model = ref.slice(firstSlash + 1);
  
  if (!provider || !model) {
    return null;
  }
  
  return { provider, model };
}

/**
 * Format provider and model name into a model reference string
 * @param provider The provider name
 * @param model The model name
 * @returns Formatted model reference (e.g., "alibaba-coding-plan-cn/qwen3.6-plus")
 */
export function formatModelRef(provider: string, model: string): string {
  return `${provider}/${model}`;
}

/**
 * Resolve a model reference to the actual Model object
 * @param ref The model reference string
 * @param providers Record of providers
 * @returns The Model object, or null if not found
 */
export function resolveModelRef(
  ref: string,
  providers: Record<string, Provider>
): Model | null {
  const parsed = parseModelRef(ref);
  if (!parsed) {
    return null;
  }
  
  const provider = providers[parsed.provider];
  if (!provider) {
    return null;
  }
  
  return provider.models[parsed.model] ?? null;
}

/**
 * Get a flattened list of all available models across all providers
 * @param providers Record of providers
 * @returns Array of objects with provider name, model key, and model data
 */
export function getAvailableModels(
  providers: Record<string, Provider>
): Array<{ providerName: string; modelKey: string; model: Model }> {
  const models: Array<{ providerName: string; modelKey: string; model: Model }> = [];
  
  for (const [providerName, provider] of Object.entries(providers)) {
    for (const [modelKey, model] of Object.entries(provider.models)) {
      models.push({ providerName, modelKey, model });
    }
  }
  
  return models;
}

/**
 * Check if a model reference exists in the providers
 * @param ref The model reference string
 * @param providers Record of providers
 * @returns True if the model exists, false otherwise
 */
export function isModelRefValid(
  ref: string,
  providers: Record<string, Provider>
): boolean {
  return resolveModelRef(ref, providers) !== null;
}
