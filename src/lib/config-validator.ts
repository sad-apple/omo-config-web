/**
 * Config validation utility for OMO Config Web.
 * Pure TypeScript — no Zod, no store imports, client+server compatible.
 */

// ─── Public Types ───────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function addError(errors: ValidationError[], field: string, message: string): void {
  errors.push({ field, message });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    console.error("[validator] isValidUrl received invalid URL string:", str);
    return false;
  }
}

/**
 * Parse a model reference string like "provider/modelName".
 * Returns { provider, model } or null if invalid format.
 */
function parseModelRef(ref: string): { provider: string; model: string } | null {
  const firstSlash = ref.indexOf("/");
  if (firstSlash === -1) return null;
  const provider = ref.slice(0, firstSlash);
  const model = ref.slice(firstSlash + 1);
  if (!provider || !model) return null;
  return { provider, model };
}

// ─── Validation Rules ───────────────────────────────────────────────────────

function validateProviders(
  providers: Record<string, unknown>,
  errors: ValidationError[]
): void {
  for (const [key, raw] of Object.entries(providers)) {
    const field = `providers.${key}`;

    if (!isRecord(raw)) {
      addError(errors, field, "Provider must be an object");
      continue;
    }

    // name
    if (!isString(raw.name) || raw.name.trim() === "") {
      addError(errors, `${field}.name`, "Provider name must not be empty");
    }

    // npm
    if (!isString(raw.npm) || raw.npm.trim() === "") {
      addError(errors, `${field}.npm`, "npm package name must not be empty");
    }

    // options.baseURL — valid URL if present
    if (raw.options !== undefined) {
      if (isRecord(raw.options)) {
        if (raw.options.baseURL !== undefined) {
          if (!isString(raw.options.baseURL) || !isValidUrl(raw.options.baseURL)) {
            addError(errors, `${field}.options.baseURL`, "baseURL must be a valid URL");
          }
        }
      }
    }

    // models
    if (raw.models !== undefined) {
      if (!isRecord(raw.models)) {
        addError(errors, `${field}.models`, "models must be an object");
      } else {
        validateModels(raw.models, field, errors);
      }
    }
  }
}

function validateModels(
  models: Record<string, unknown>,
  providerField: string,
  errors: ValidationError[]
): void {
  for (const [modelKey, raw] of Object.entries(models)) {
    const field = `${providerField}.models.${modelKey}`;

    if (!isRecord(raw)) {
      addError(errors, field, "Model must be an object");
      continue;
    }

    // name
    if (!isString(raw.name) || raw.name.trim() === "") {
      addError(errors, `${field}.name`, "Model name must not be empty");
    }

    // contextWindow > 0 if set
    if (raw.contextWindow !== undefined) {
      if (!isNumber(raw.contextWindow) || raw.contextWindow <= 0) {
        addError(errors, `${field}.contextWindow`, "contextWindow must be a positive number");
      }
    }

    // options
    if (raw.options !== undefined && isRecord(raw.options)) {
      // temperature 0-2
      if (raw.options.temperature !== undefined) {
        if (
          !isNumber(raw.options.temperature) ||
          raw.options.temperature < 0 ||
          raw.options.temperature > 2
        ) {
          addError(errors, `${field}.options.temperature`, "temperature must be between 0 and 2");
        }
      }

      // maxTokens > 0 if set
      if (raw.options.maxTokens !== undefined) {
        if (!isNumber(raw.options.maxTokens) || raw.options.maxTokens <= 0) {
          addError(errors, `${field}.options.maxTokens`, "maxTokens must be a positive number");
        }
      }
    }
  }
}

function validateAgents(
  agents: Record<string, unknown>,
  providerKeys: Set<string>,
  modelKeys: Set<string>,
  errors: ValidationError[]
): void {
  for (const [key, raw] of Object.entries(agents)) {
    const field = `agents.${key}`;

    if (!isRecord(raw)) {
      addError(errors, field, "Agent must be an object");
      continue;
    }

    // name
    if (!isString(raw.name) || raw.name.trim() === "") {
      addError(errors, `${field}.name`, "Agent name must not be empty");
    }

    // model — must be valid provider/model ref
    if (isString(raw.model)) {
      const parsed = parseModelRef(raw.model);
      if (!parsed) {
        addError(errors, `${field}.model`, `Invalid model reference format: "${raw.model}" (expected "provider/modelName")`);
      } else if (!providerKeys.has(parsed.provider)) {
        addError(errors, `${field}.model`, `Provider "${parsed.provider}" does not exist`);
      } else if (!modelKeys.has(raw.model)) {
        addError(errors, `${field}.model`, `Model "${raw.model}" does not exist in provider "${parsed.provider}"`);
      }
    }

    // fallback_models — each must reference existing models
    if (raw.fallback_models !== undefined) {
      if (!Array.isArray(raw.fallback_models)) {
        addError(errors, `${field}.fallback_models`, "fallback_models must be an array");
      } else {
        for (let i = 0; i < raw.fallback_models.length; i++) {
          const entry = raw.fallback_models[i];
          // ModelRef can be string or FallbackModelEntry
          const ref = isString(entry) ? entry : isRecord(entry) && isString(entry.model) ? entry.model : null;
          if (ref === null) {
            addError(errors, `${field}.fallback_models[${i}]`, "fallback_models entry must be a string or object with a model field");
            continue;
          }
          const parsed = parseModelRef(ref);
          if (!parsed) {
            addError(errors, `${field}.fallback_models[${i}]`, `Invalid model reference format: "${ref}"`);
          } else if (!providerKeys.has(parsed.provider)) {
            addError(errors, `${field}.fallback_models[${i}]`, `Provider "${parsed.provider}" does not exist`);
          } else if (!modelKeys.has(ref)) {
            addError(errors, `${field}.fallback_models[${i}]`, `Model "${ref}" does not exist`);
          }
        }
      }
    }
  }
}

function validateCategories(
  categories: Record<string, unknown>,
  providerKeys: Set<string>,
  modelKeys: Set<string>,
  errors: ValidationError[]
): void {
  for (const [key, raw] of Object.entries(categories)) {
    const field = `categories.${key}`;

    if (!isRecord(raw)) {
      addError(errors, field, "Category must be an object");
      continue;
    }

    // name
    if (!isString(raw.name) || raw.name.trim() === "") {
      addError(errors, `${field}.name`, "Category name must not be empty");
    }

    // model — must be valid provider/model ref
    if (isString(raw.model)) {
      const parsed = parseModelRef(raw.model);
      if (!parsed) {
        addError(errors, `${field}.model`, `Invalid model reference format: "${raw.model}"`);
      } else if (!providerKeys.has(parsed.provider)) {
        addError(errors, `${field}.model`, `Provider "${parsed.provider}" does not exist`);
      } else if (!modelKeys.has(raw.model)) {
        addError(errors, `${field}.model`, `Model "${raw.model}" does not exist`);
      }
    }
  }
}

function validateProfiles(
  profiles: Record<string, unknown>,
  agentKeys: Set<string>,
  categoryKeys: Set<string>,
  errors: ValidationError[]
): void {
  for (const [key, raw] of Object.entries(profiles)) {
    const field = `profiles.${key}`;

    if (!isRecord(raw)) {
      addError(errors, field, "Profile must be an object");
      continue;
    }

    // name
    if (!isString(raw.name) || raw.name.trim() === "") {
      addError(errors, `${field}.name`, "Profile name must not be empty");
    }

    // agents — each must reference existing agent keys
    if (raw.agents !== undefined) {
      if (!Array.isArray(raw.agents)) {
        addError(errors, `${field}.agents`, "agents must be an array");
      } else {
        for (let i = 0; i < raw.agents.length; i++) {
          const agentRef = raw.agents[i];
          if (!isString(agentRef)) {
            addError(errors, `${field}.agents[${i}]`, "Agent reference must be a string");
          } else if (!agentKeys.has(agentRef)) {
            addError(errors, `${field}.agents[${i}]`, `Agent "${agentRef}" does not exist`);
          }
        }
      }
    }

    // categories — each must reference existing category keys
    if (raw.categories !== undefined) {
      if (!Array.isArray(raw.categories)) {
        addError(errors, `${field}.categories`, "categories must be an array");
      } else {
        for (let i = 0; i < raw.categories.length; i++) {
          const catRef = raw.categories[i];
          if (!isString(catRef)) {
            addError(errors, `${field}.categories[${i}]`, "Category reference must be a string");
          } else if (!categoryKeys.has(catRef)) {
            addError(errors, `${field}.categories[${i}]`, `Category "${catRef}" does not exist`);
          }
        }
      }
    }
  }
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Validate a full OMO config object.
 * Returns a ValidationResult with all errors collected (never bails early).
 *
 * Expected shape:
 * {
 *   providers: Record<string, Provider>,
 *   agents: Record<string, Agent>,
 *   categories: Record<string, Category>,
 *   configProfiles?: Record<string, ConfigProfile>
 * }
 */
export function validateConfig(config: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // ── Top-level checks ──────────────────────────────────────────────────
  if (config === null || config === undefined) {
    addError(errors, "config", "Config must not be null or undefined");
    return { valid: false, errors };
  }

  if (!isRecord(config)) {
    addError(errors, "config", "Config must be an object");
    return { valid: false, errors };
  }

  // ── Providers ─────────────────────────────────────────────────────────
  const providers = config.providers;
  if (providers === undefined) {
    addError(errors, "providers", "providers field is required");
  } else if (!isRecord(providers)) {
    addError(errors, "providers", "providers must be an object");
  } else {
    validateProviders(providers, errors);
  }

  // ── Build lookup sets for cross-referencing ────────────────────────────
  const providerKeys = new Set<string>();
  const modelKeys = new Set<string>();

  if (isRecord(providers)) {
    for (const [providerKey, providerRaw] of Object.entries(providers)) {
      providerKeys.add(providerKey);
      if (isRecord(providerRaw) && isRecord(providerRaw.models)) {
        for (const modelKey of Object.keys(providerRaw.models)) {
          modelKeys.add(`${providerKey}/${modelKey}`);
        }
      }
    }
  }

  // ── Agents ────────────────────────────────────────────────────────────
  const agents = config.agents;
  if (agents === undefined) {
    addError(errors, "agents", "agents field is required");
  } else if (!isRecord(agents)) {
    addError(errors, "agents", "agents must be an object");
  } else {
    validateAgents(agents, providerKeys, modelKeys, errors);
  }

  // ── Categories ────────────────────────────────────────────────────────
  const categories = config.categories;
  if (categories === undefined) {
    addError(errors, "categories", "categories field is required");
  } else if (!isRecord(categories)) {
    addError(errors, "categories", "categories must be an object");
  } else {
    validateCategories(categories, providerKeys, modelKeys, errors);
  }

  // ── Profiles (optional) ───────────────────────────────────────────────
  const agentKeys = new Set<string>();
  if (isRecord(agents)) {
    for (const agentKey of Object.keys(agents)) {
      agentKeys.add(agentKey);
    }
  }

  const categoryKeys = new Set<string>();
  if (isRecord(categories)) {
    for (const catKey of Object.keys(categories)) {
      categoryKeys.add(catKey);
    }
  }

  const profiles = config.configProfiles;
  if (profiles !== undefined) {
    if (!isRecord(profiles)) {
      addError(errors, "configProfiles", "configProfiles must be an object");
    } else {
      validateProfiles(profiles, agentKeys, categoryKeys, errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
