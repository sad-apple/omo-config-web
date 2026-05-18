import type { Provider, Agent, Category, ConfigProfile, OmoConfig, BackgroundTaskConfig, RuntimeFallbackConfig, TmuxConfig, TeamModeConfig } from "@/types";

export interface OpencodeJsonFile {
  providers?: Record<string, Provider>;
}

export interface OmoJsoncFile {
  agents?: Record<string, Agent>;
  categories?: Record<string, Category>;
  configProfiles?: Record<string, ConfigProfile>;
  background_task?: BackgroundTaskConfig;
  runtime_fallback?: RuntimeFallbackConfig;
  tmux?: TmuxConfig;
  team_mode?: TeamModeConfig;
}

export interface SplitConfigResult {
  opencodeJson: OpencodeJsonFile;
  omoJsonc: OmoJsoncFile;
}

export function splitConfig(
  config: OmoConfig & { providers?: Record<string, Provider>; configProfiles?: Record<string, ConfigProfile> }
): SplitConfigResult {
  const opencodeJson: OpencodeJsonFile = {};
  const omoJsonc: OmoJsoncFile = {};

  // Extract providers for opencode.json
  if (config.providers) {
    opencodeJson.providers = config.providers;
  }

  // Extract agents for omoJsonc
  if (config.agents) {
    omoJsonc.agents = config.agents;
  }

  // Extract categories for omoJsonc
  if (config.categories) {
    omoJsonc.categories = config.categories;
  }

  // Extract configProfiles for omoJsonc
  if (config.configProfiles) {
    omoJsonc.configProfiles = config.configProfiles;
  }

  // Extract background_task for omoJsonc
  if (config.background_task) {
    omoJsonc.background_task = config.background_task;
  }

  // Extract runtime_fallback for omoJsonc
  if (config.runtime_fallback) {
    omoJsonc.runtime_fallback = config.runtime_fallback;
  }

  // Extract tmux for omoJsonc
  if (config.tmux) {
    omoJsonc.tmux = config.tmux;
  }

  // Extract team_mode for omoJsonc
  if (config.team_mode) {
    omoJsonc.team_mode = config.team_mode;
  }

  return { opencodeJson, omoJsonc };
}