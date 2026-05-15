import { create } from 'zustand';
import type { Provider, Agent, Category, ConfigProfile, OmoConfig, Model, BackgroundTaskConfig, RuntimeFallbackConfig } from '@/types';

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
  rawJson: string | null;
  isDirty: boolean;
  lastSavedSnapshot: string;

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
  rawJson: null,
  isDirty: false,
  lastSavedSnapshot: '',
};

function createSnapshot(state: ConfigState): string {
  return JSON.stringify({
    agents: state.agents,
    categories: state.categories,
    providers: state.providers,
    configProfiles: state.configProfiles,
    backgroundTask: state.backgroundTask,
    runtimeFallback: state.runtimeFallback,
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
    const parsed = JSON.parse(json) as OmoConfig & { providers?: Record<string, Provider>; configProfiles?: Record<string, ConfigProfile>; background_task?: BackgroundTaskConfig; runtime_fallback?: RuntimeFallbackConfig };
    const providers = parsed.providers ?? {};
    const configProfiles = parsed.configProfiles ?? {};
    const backgroundTask = parsed.background_task ?? null;
    const runtimeFallback = parsed.runtime_fallback ?? null;

    const newState = {
      agents: parsed.agents ?? {},
      categories: parsed.categories ?? {},
      providers,
      configProfiles,
      backgroundTask,
      runtimeFallback,
      rawJson: json,
      isDirty: false,
      lastSavedSnapshot: JSON.stringify({
        agents: parsed.agents ?? {},
        categories: parsed.categories ?? {},
        providers,
        configProfiles,
        backgroundTask,
        runtimeFallback,
      }, null, 2),
    };

    set(newState);
    return parsed;
  },

  exportToJson: () => {
    const { agents, categories, providers, configProfiles, backgroundTask, runtimeFallback } = get();
    const config: OmoConfig & { providers?: Record<string, Provider>; configProfiles?: Record<string, ConfigProfile> } = {
      agents,
      categories,
      providers,
      configProfiles,
      ...(backgroundTask ? { background_task: backgroundTask } : {}),
      ...(runtimeFallback ? { runtime_fallback: runtimeFallback } : {}),
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
        isDirty: false,
      });
    } catch {
      // If snapshot is invalid, just reset to empty state
      set({
        agents: {},
        categories: {},
        providers: {},
        configProfiles: {},
        backgroundTask: null,
        runtimeFallback: null,
        isDirty: false,
      });
    }
  },

  getIsDirty: () => get().isDirty,
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
