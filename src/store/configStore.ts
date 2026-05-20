import { create } from 'zustand';
import type { Provider, Agent, Category, ConfigProfile, OmoConfig, Model, BackgroundTaskConfig, RuntimeFallbackConfig, PublishSnapshot, TmuxConfig, TeamModeConfig, Preset, PresetListResponse } from '@/types';

interface ConfigState {
  // State
  providers: Record<string, Provider>;
  agents: Record<string, Agent>;
  categories: Record<string, Category>;
  configProfiles: Record<string, ConfigProfile>;
  activeProfileId: string | null;
  configProfile: ConfigProfile | null;
  backgroundTask: BackgroundTaskConfig | null;
  runtimeFallback: RuntimeFallbackConfig | null;
  tmux: TmuxConfig | null;
  teamMode: TeamModeConfig | null;
  rawJson: string | null;
  isDirty: boolean;
  lastSavedSnapshot: string;
  publishHistory: PublishSnapshot[];

  // Actions
  setProviders: (providers: Record<string, Provider>) => void;
  setAgents: (agents: Record<string, Agent>) => void;
  setCategories: (categories: Record<string, Category>) => void;
  updateAgent: (key: string, agent: Agent) => void;
  updateCategory: (key: string, category: Category) => void;
  updateModel: (providerKey: string, modelKey: string, updates: Partial<Model>) => void;
  updateProvider: (providerKey: string, updates: Partial<Provider>) => void;
  // Profile actions
  createProfile: (profile: ConfigProfile) => void;
  updateProfile: (key: string, profile: Partial<ConfigProfile>) => void;
  deleteProfile: (key: string) => void;
  renameProfile: (oldKey: string, newName: string) => void;
  setActiveProfile: (key: string | null) => void;
  addAgentToProfile: (profileKey: string, agentKey: string) => void;
  removeAgentFromProfile: (profileKey: string, agentKey: string) => void;
  addCategoryToProfile: (profileKey: string, categoryKey: string) => void;
  removeCategoryFromProfile: (profileKey: string, categoryKey: string) => void;
  setConfigProfile: (profile: ConfigProfile) => void;
  // Runtime config actions
  setBackgroundTask: (config: BackgroundTaskConfig | null) => void;
  setRuntimeFallback: (config: RuntimeFallbackConfig | null) => void;
  importFromJson: (json: string) => OmoConfig;
  exportToJson: () => string;
  setLastSavedSnapshot: () => void;
  discardChanges: () => void;
  getIsDirty: () => boolean;
  // Publish history actions
  addPublishSnapshot: (snapshot: PublishSnapshot) => void;
  clearPublishHistory: () => void;
  // Preset state
  presets: Preset[];
  currentPreset: string | null;
  isLoadingPresets: boolean;

  // Preset actions
  loadPresets: () => Promise<void>;
  setCurrentPreset: (name: string | null) => void;
  createPreset: (name: string, copyFrom?: string) => Promise<void>;
  deletePreset: (name: string) => Promise<void>;
  activatePreset: (name: string) => Promise<void>;

}

const initialState = {
  providers: {},
  agents: {},
  categories: {},
  configProfiles: {},
  activeProfileId: null,
  configProfile: null,
  backgroundTask: null,
  runtimeFallback: null,
  tmux: null,
  teamMode: null,
  rawJson: null,
  isDirty: false,
  lastSavedSnapshot: '',
  publishHistory: [],
  presets: [],
  currentPreset: null,
  isLoadingPresets: false,
};

function createSnapshot(state: ConfigState): string {
  return JSON.stringify({
    agents: state.agents,
    categories: state.categories,
    providers: state.providers,
    configProfiles: state.configProfiles,
    backgroundTask: state.backgroundTask,
    runtimeFallback: state.runtimeFallback,
    tmux: state.tmux,
    teamMode: state.teamMode,
  }, null, 2);
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  ...initialState,

  setProviders: (providers) => set({ providers, isDirty: true }),

  setAgents: (agents) => set({ agents, isDirty: true }),

  setCategories: (categories) => set({ categories, isDirty: true }),

  updateAgent: (key, agent) =>
    set((state) => ({
      agents: { ...state.agents, [key]: agent },
      isDirty: true,
    })),

  updateCategory: (key, category) =>
    set((state) => ({
      categories: { ...state.categories, [key]: category },
      isDirty: true,
    })),

  updateModel: (providerKey, modelKey, updates) =>
    set((state) => {
      const provider = state.providers[providerKey];
      if (!provider) return state;

      const model = provider.models[modelKey];
      if (!model) return state;

      return {
        providers: {
          ...state.providers,
          [providerKey]: {
            ...provider,
            models: {
              ...provider.models,
              [modelKey]: { ...model, ...updates },
            },
          },
        },
        isDirty: true,
      };
    }),

  updateProvider: (providerKey, updates) =>
    set((state) => {
      const provider = state.providers[providerKey];
      if (!provider) return state;

      return {
        providers: {
          ...state.providers,
          [providerKey]: { ...provider, ...updates },
        },
        isDirty: true,
      };
    }),

  // Profile actions
  createProfile: (profile) =>
    set((state) => ({
      configProfiles: { ...state.configProfiles, [profile.name]: profile },
      isDirty: true,
    })),

  updateProfile: (key, updates) =>
    set((state) => {
      const profile = state.configProfiles[key];
      if (!profile) return state;
      return {
        configProfiles: {
          ...state.configProfiles,
          [key]: { ...profile, ...updates },
        },
        isDirty: true,
      };
    }),

  deleteProfile: (key) =>
    set((state) => {
      const { [key]: _, ...rest } = state.configProfiles;
      return {
        configProfiles: rest,
        activeProfileId: state.activeProfileId === key ? null : state.activeProfileId,
        isDirty: true,
      };
    }),

  renameProfile: (oldKey, newName) =>
    set((state) => {
      const profile = state.configProfiles[oldKey];
      if (!profile) return state;
      if (oldKey === newName) return state;
      if (state.configProfiles[newName]) return state;
      const { [oldKey]: _, ...rest } = state.configProfiles;
      const updatedProfile = { ...profile, name: newName };
      return {
        configProfiles: { ...rest, [newName]: updatedProfile },
        activeProfileId: state.activeProfileId === oldKey ? newName : state.activeProfileId,
        isDirty: true,
      };
    }),

  setActiveProfile: (key) => set({ activeProfileId: key }),

  addAgentToProfile: (profileKey, agentKey) =>
    set((state) => {
      const profile = state.configProfiles[profileKey];
      if (!profile) return state;
      if (profile.agents.includes(agentKey)) return state;
      return {
        configProfiles: {
          ...state.configProfiles,
          [profileKey]: {
            ...profile,
            agents: [...profile.agents, agentKey],
          },
        },
        isDirty: true,
      };
    }),

  removeAgentFromProfile: (profileKey, agentKey) =>
    set((state) => {
      const profile = state.configProfiles[profileKey];
      if (!profile) return state;
      return {
        configProfiles: {
          ...state.configProfiles,
          [profileKey]: {
            ...profile,
            agents: profile.agents.filter((a) => a !== agentKey),
          },
        },
        isDirty: true,
      };
    }),

  addCategoryToProfile: (profileKey, categoryKey) =>
    set((state) => {
      const profile = state.configProfiles[profileKey];
      if (!profile) return state;
      if (profile.categories.includes(categoryKey)) return state;
      return {
        configProfiles: {
          ...state.configProfiles,
          [profileKey]: {
            ...profile,
            categories: [...profile.categories, categoryKey],
          },
        },
        isDirty: true,
      };
    }),

  removeCategoryFromProfile: (profileKey, categoryKey) =>
    set((state) => {
      const profile = state.configProfiles[profileKey];
      if (!profile) return state;
      return {
        configProfiles: {
          ...state.configProfiles,
          [profileKey]: {
            ...profile,
            categories: profile.categories.filter((c) => c !== categoryKey),
          },
        },
        isDirty: true,
      };
    }),

  setConfigProfile: (profile) => set({ configProfile: profile }),

  // Runtime config actions
  setBackgroundTask: (config) => set({ backgroundTask: config, isDirty: true }),
  setRuntimeFallback: (config) => set({ runtimeFallback: config, isDirty: true }),

  importFromJson: (json) => {
    const parsed = JSON.parse(json) as OmoConfig & { providers?: Record<string, Provider>; configProfiles?: Record<string, ConfigProfile>; background_task?: BackgroundTaskConfig; runtime_fallback?: RuntimeFallbackConfig; tmux?: TmuxConfig; team_mode?: TeamModeConfig };
    const providers = parsed.providers ?? {};
    const configProfiles = parsed.configProfiles ?? {};
    const backgroundTask = parsed.background_task ?? null;
    const runtimeFallback = parsed.runtime_fallback ?? null;
    const tmux = parsed.tmux ?? null;
    const teamMode = parsed.team_mode ?? null;

    const newState = {
      agents: parsed.agents ?? {},
      categories: parsed.categories ?? {},
      providers,
      configProfiles,
      backgroundTask,
      runtimeFallback,
      tmux,
      teamMode,
      rawJson: json,
      isDirty: false,
      lastSavedSnapshot: JSON.stringify({
        agents: parsed.agents ?? {},
        categories: parsed.categories ?? {},
        providers,
        configProfiles,
        backgroundTask,
        runtimeFallback,
        tmux,
        teamMode,
      }, null, 2),
    };

    set(newState);
    return parsed;
  },

  exportToJson: () => {
    const { agents, categories, providers, configProfiles, backgroundTask, runtimeFallback, tmux, teamMode } = get();
    const config: OmoConfig & { providers?: Record<string, Provider>; configProfiles?: Record<string, ConfigProfile> } = {
      agents,
      categories,
      providers,
      configProfiles,
      ...(backgroundTask ? { background_task: backgroundTask } : {}),
      ...(runtimeFallback ? { runtime_fallback: runtimeFallback } : {}),
      ...(tmux ? { tmux } : {}),
      ...(teamMode ? { team_mode: teamMode } : {}),
    };
    const json = JSON.stringify(config, null, 2);
    set({ rawJson: json });
    return json;
  },

  setLastSavedSnapshot: () => {
    const state = get();
    set({
      lastSavedSnapshot: createSnapshot(state),
      isDirty: false,
    });
  },

  discardChanges: () => {
    const { lastSavedSnapshot } = get();
    if (!lastSavedSnapshot) return;

    try {
      const parsed = JSON.parse(lastSavedSnapshot);
      set({
        agents: parsed.agents ?? {},
        categories: parsed.categories ?? {},
        providers: parsed.providers ?? {},
        configProfiles: parsed.configProfiles ?? {},
        backgroundTask: parsed.backgroundTask ?? null,
        runtimeFallback: parsed.runtimeFallback ?? null,
        tmux: parsed.tmux ?? null,
        teamMode: parsed.teamMode ?? null,
        isDirty: false,
      });
    } catch {
      // If snapshot is invalid, just reset to empty state
      console.error("[store] Failed to parse lastSavedSnapshot, resetting to empty state");
      set({
        agents: {},
        categories: {},
        providers: {},
        configProfiles: {},
        backgroundTask: null,
        runtimeFallback: null,
        tmux: null,
        teamMode: null,
        isDirty: false,
      });
    }
  },

  getIsDirty: () => get().isDirty,

  addPublishSnapshot: (snapshot) =>
    set((state) => ({
      publishHistory: [snapshot, ...state.publishHistory].slice(0, 50),
    })),

  clearPublishHistory: () => set({ publishHistory: [] }),

  // Preset actions
  loadPresets: async () => {
    set({ isLoadingPresets: true });
    try {
      const res = await fetch('/api/config/presets');
      if (!res.ok) throw new Error('Failed to load presets');
      const data: PresetListResponse = await res.json();
      set({ presets: data.presets, currentPreset: data.currentPreset, isLoadingPresets: false });
    } catch (error) {
      console.error("[store] Failed to load presets:", error);
      set({ isLoadingPresets: false });
    }
  },

  setCurrentPreset: (name) => set({ currentPreset: name }),

  createPreset: async (name, copyFrom) => {
    try {
      const res = await fetch('/api/config/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, copyFrom }),
      });
      if (!res.ok) throw new Error('Failed to create preset');
      await get().loadPresets();
    } catch (error) {
      throw error;
    }
  },

  deletePreset: async (name) => {
    try {
      const res = await fetch('/api/config/presets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to delete preset');
      await get().loadPresets();
    } catch (error) {
      throw error;
    }
  },

  activatePreset: async (name) => {
    const state = get();

    // Check for unsaved changes
    if (state.isDirty) {
      throw new Error('UNSAVED_CHANGES');
    }

    try {
      const res = await fetch('/api/config/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetName: name }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to activate preset' }));
        throw new Error(errorData.error || 'Failed to activate preset');
      }
      await res.json();

      // Reload config from the activated preset
      const configRes = await fetch(`/api/config?preset=${encodeURIComponent(name)}`);
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.config) {
          get().importFromJson(JSON.stringify(configData.config));
        }
      }

      set({ currentPreset: name });
    } catch (error) {
      throw error;
    }
  },

}));

// Convenience selectors
export const useIsDirty = () => useConfigStore((state) => state.isDirty);
export const useProviders = () => useConfigStore((state) => state.providers);
export const useAgents = () => useConfigStore((state) => state.agents);
export const useCategories = () => useConfigStore((state) => state.categories);
export const useConfigProfiles = () => useConfigStore((state) => state.configProfiles);
export const useActiveProfileId = () => useConfigStore((state) => state.activeProfileId);
export const useBackgroundTask = () => useConfigStore((state) => state.backgroundTask);
export const useRuntimeFallback = () => useConfigStore((state) => state.runtimeFallback);
export const usePublishHistory = () => useConfigStore((state) => state.publishHistory);
export const useTmux = () => useConfigStore((state) => state.tmux);
export const useTeamMode = () => useConfigStore((state) => state.teamMode);

export const usePresets = () => useConfigStore((s) => s.presets);
export const useCurrentPreset = () => useConfigStore((s) => s.currentPreset);
export const useIsLoadingPresets = () => useConfigStore((s) => s.isLoadingPresets);

