import { create } from 'zustand';
import type { Provider, Agent, Category, ConfigProfile, OmoConfig } from '@/types';

interface ConfigState {
  // State
  providers: Record<string, Provider>;
  agents: Record<string, Agent>;
  categories: Record<string, Category>;
  configProfile: ConfigProfile | null;
  rawJson: string | null;

  // Actions
  setProviders: (providers: Record<string, Provider>) => void;
  setAgents: (agents: Record<string, Agent>) => void;
  setCategories: (categories: Record<string, Category>) => void;
  updateAgent: (key: string, agent: Agent) => void;
  updateCategory: (key: string, category: Category) => void;
  setConfigProfile: (profile: ConfigProfile) => void;
  importFromJson: (json: string) => OmoConfig;
  exportToJson: () => string;
}

const initialState = {
  providers: {},
  agents: {},
  categories: {},
  configProfile: null,
  rawJson: null,
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  ...initialState,

  setProviders: (providers) => set({ providers }),

  setAgents: (agents) => set({ agents }),

  setCategories: (categories) => set({ categories }),

  updateAgent: (key, agent) =>
    set((state) => ({
      agents: { ...state.agents, [key]: agent },
    })),

  updateCategory: (key, category) =>
    set((state) => ({
      categories: { ...state.categories, [key]: category },
    })),

  setConfigProfile: (profile) => set({ configProfile: profile }),

  importFromJson: (json) => {
    const parsed = JSON.parse(json) as OmoConfig;
    set({
      agents: parsed.agents ?? {},
      categories: parsed.categories ?? {},
      rawJson: json,
    });
    return parsed;
  },

  exportToJson: () => {
    const { agents, categories } = get();
    const config: OmoConfig = { agents, categories };
    const json = JSON.stringify(config, null, 2);
    set({ rawJson: json });
    return json;
  },
}));
