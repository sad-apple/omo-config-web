import type { Provider, ConfigProfile, OmoConfig } from "@/types";
import type { OpencodeJsonFile, OmoJsoncFile } from "./config-splitter";

export type MergedConfig = OmoConfig;

export function mergeConfig(opencodeJson: OpencodeJsonFile, omoJsonc: OmoJsoncFile): MergedConfig {
  const config: MergedConfig = {
    agents: {},
    categories: {},
  };

  // Merge providers from opencode.json
  if (opencodeJson.providers) {
    config.providers = opencodeJson.providers;
  }

  // Merge agents from omoJsonc
  if (omoJsonc.agents) {
    config.agents = omoJsonc.agents;
  }

  // Merge categories from omoJsonc
  if (omoJsonc.categories) {
    config.categories = omoJsonc.categories;
  }

  // Merge configProfiles from omoJsonc
  if (omoJsonc.configProfiles) {
    config.configProfiles = omoJsonc.configProfiles;
  }

  // Merge background_task from omoJsonc
  if (omoJsonc.background_task) {
    config.background_task = omoJsonc.background_task;
  }

  // Merge runtime_fallback from omoJsonc
  if (omoJsonc.runtime_fallback) {
    config.runtime_fallback = omoJsonc.runtime_fallback;
  }

  // Merge tmux from omoJsonc
  if (omoJsonc.tmux) {
    config.tmux = omoJsonc.tmux;
  }

  // Merge team_mode from omoJsonc
  if (omoJsonc.team_mode) {
    config.team_mode = omoJsonc.team_mode;
  }

  return config;
}