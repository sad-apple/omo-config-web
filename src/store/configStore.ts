import { create } from 'zustand';
import type { Provider, Agent, Category, ConfigProfile, OmoConfig, Model } from '@/types';

interface ConfigState {
  // State
  providers: Record<string, Provider>;
  agents: Record<string, Agent>;
  categories: Record<string, Category>;
  configProfile: ConfigProfile | null;
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
  setConfigProfile: (profile: ConfigProfile) => void;
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
  configProfile: null,
  rawJson: null,
  isDirty: false,
  lastSavedSnapshot: '',
};

function createSnapshot(state: ConfigState): string {
  return JSON.stringify({
    agents: state.agents,
    categories: state.categories,
    providers: state.providers,
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

  setConfigProfile: (profile) => set({ configProfile: profile }),

  importFromJson: (json) => {
    const parsed = JSON.parse(json) as OmoConfig;
    const providers = (parsed as unknown as { providers?: Record<string, Provider> }).providers ?? {};
    
    const newState = {
      agents: parsed.agents ?? {},
      categories: parsed.categories ?? {},
      providers,
      rawJson: json,
      isDirty: false,
      lastSavedSnapshot: JSON.stringify({
        agents: parsed.agents ?? {},
        categories: parsed.categories ?? {},
        providers,
      }, null, 2),
    };
    
    set(newState);
    return parsed;
  },

  exportToJson: () => {
    const { agents, categories, providers } = get();
    const config: OmoConfig & { providers?: Record<string, Provider> } = { 
      agents, 
      categories,
      providers,
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
        isDirty: false,
      });
    } catch {
      // If snapshot is invalid, just reset to empty state
      set({
        agents: {},
        categories: {},
        providers: {},
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
