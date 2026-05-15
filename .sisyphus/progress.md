# OMO Config Web — Development Progress

> Last updated: 2026-05-15 | Phase 2 Complete, Phase 3 In Progress
> Build: ✅ Passes | 5 static pages generated

---

## Overview

OMO Config Web is a Next.js 16 App Router + React 19 + shadcn/ui web app that visually configures Oh-My-OpenAgent multi-agent orchestration. It replaces manual JSON editing of `opencode.json` and `oh-my-openagent.jsonc`.

**Repository**: `omo-config-web` in `oh-my-openagent` org  
**Stack**: Next.js 16.2.6, React 19, TypeScript (strict), Tailwind CSS 4, Zustand 5, shadcn/ui "new-york", Monaco Editor  
**Build**: `pnpm build` (typecheck + production build in one). Static export (`output: 'export'`).  
**Routes**: `/` (dashboard), `/agents`, `/models`, `/providers` | `/profiles` (Phase 3)

**Delegated Team Session**: `b1f41b45-5d9f-4b87-bd85-ca5d2ef2010f` (hyperplan-omo-config-phase2) — 4 members, completed

---

## Phase 1 (MVP) — Complete

Read-only display of all OMO config entities.

- 6 pages with sidebar navigation
- Zustand store with mock data (`configStore.ts`)
- Dual-mode editor: visual ← → raw JSON (Monaco Editor)
- Import/Export JSON files
- Provider → Model → Agent hierarchy display
- shadcn/ui "new-york" style, Tailwind CSS v4, Lucide icons, Sonner toasts

---

## Phase 2 (Editable Forms) — Complete

### Architecture Decisions (Hyperplan Consensus)

| Decision | Details |
|----------|---------|
| Type system | `src/types/index.ts` is the single canonical source. No duplicate types. |
| Store | Zustand with isDirty tracking, lastSavedSnapshot, discardChanges. NO undo/redo. NO persist middleware. |
| Persistence | Manual save button. `beforeunload` → localStorage crash-recovery. Draft restore dialog on reload. |
| Validation | zod + react-hook-form for form fields. Full AJV deferred to Phase 4. |
| Model selector | Flat grouped combobox (shadcn Command + Popover). Provider color badges. Searchable. |
| Fallback models | Array of ModelSelector string refs + add/remove/up/down. Object overrides deferred to Phase 3. |
| Forms | Custom shadcn/ui primitives. NOT @rjsf. Local react-hook-form state → commit to store on Save. |
| Store as SOT | Store is source of truth. Monaco displays store state until "Apply" overwrites it. |

### Files Changed (17 files, +1482 / -396 lines)

#### Created (9 files)
```
src/components/forms/ModelSelector.tsx         # 141 lines — Grouped combobox with provider badge colors
src/components/forms/ThinkingConfigForm.tsx    # 106 lines — Switch + budget tokens input
src/components/forms/VariantSelector.tsx       #  69 lines — Select dropdown with No Override
src/components/forms/ModelParamsForm.tsx       # 205 lines — Temperature/MaxTokens/TopP sliders + reset
src/components/forms/FallbackModelsEditor.tsx  # 137 lines — ModelSelector array + add/remove/up/down
src/components/forms/AgentConfigForm.tsx       # 234 lines — Composite form with zod validation + advanced collapsible
src/components/agents/AgentConfigSheet.tsx     #  55 lines — Sheet wrapper for AgentConfigForm
src/lib/model-ref.ts                           #  87 lines — parseModelRef, formatModelRef, resolveModelRef, getAvailableModels
src/hooks/useDraftRestore.ts                   #  63 lines — localStorage draft save/restore AlertDialog
```

#### Modified (8 files)
```
src/types/index.ts              # +82 lines — Added ThinkingConfig, Variant, PermissionConfig, FallbackModelEntry, ModelRef, expanded Agent/Model/Provider
src/store/configStore.ts        # +126 lines — isDirty, lastSavedSnapshot, updateModel, updateProvider, discardChanges, getIsDirty, shallow equality selectors
src/lib/mock-data.ts            # REWRITE — Removed 3 local interfaces, converted to Record<string, T>, added mockAgents
src/lib/configReader.ts         # REWRITE — Import from @/types, Record<string, Provider> format
src/components/agents/AgentCard.tsx    # REWRITE — Canonical @/types.Agent, Pencil edit button, dirty dot, parseModelRef
src/components/agents/AgentList.tsx    # REWRITE — Record<string, Agent> prop, onEditAgent callback, empty state
src/components/agents/AgentsClient.tsx # REWRITE — useConfigStore integration, AgentConfigSheet wiring, memoized jsonValue
src/app/models/page.tsx         # REWRITE — Store-wired, ModelList passes Record directly
src/components/models/ModelDetail.tsx  # +194 lines — Edit mode toggle, ModelParamsForm, model.options.* path
src/components/models/ModelList.tsx    # REWRITE — Record<string, Provider> prop, 3-arg onSelectModel
src/components/editor/DualModeEditor.tsx # +76 lines — Save button, dirty indicator, beforeunload, draft restore integration
src/components/models/ModelCard.tsx     # Updated imports + field access for canonical types
src/components/providers/ProviderCard.tsx, ProviderList.tsx, ProvidersClient.tsx — Fixed type references
```

#### New Dependencies
```json
{
  "react-hook-form": "^7.75.0",
  "@hookform/resolvers": "^5.2.2",
  "zod": "^3.24.0",
  "cmdk": "^1.1.1"  // via shadcn command component
}
```

#### New shadcn/ui Components (8)
`input`, `label`, `select`, `slider`, `popover`, `command`, `form`, `alert`
(added via `pnpm dlx shadcn@latest add` + manual creation where CLI failed)

### Delegation Summary

| Team Member | Tasks |
|-------------|-------|
| **unspecified-low** | T0.2 (npm deps), T0.3 (shadcn/ui), T3.4 (DualModeEditor save + draft restore) |
| **unspecified-high** | T3.1 (mock-data.ts unification to @/types) |
| **artistry** | T1.2 (ThinkingConfigForm), T1.3 (VariantSelector), T1.4 (ModelParamsForm), T3.3 (models page wiring + ModelDetail edit mode) |
| **ultrabrain** | T0.1 (types expansion), T3.2 (configReader.ts unification) |

### Manual QA Notes

- `pnpm build` produces 5 static pages: `/`, `/_not-found`, `/agents`, `/models`, `/providers`
- AgentCard shows edit pencil → opens AgentConfigSheet → Save calls updateAgent + setLastSavedSnapshot
- ModelDetail toggles between read-only grid and ModelParamsForm edit mode
- DualModeEditor shows Save button when `isDirty` flag is set
- Dirty indicator (amber dot) appears on cards when store has unsaved changes
- localStorage draft restore prompts user on reload with detectable stale state

---

## Phase 2.5 — Git History Cleanup

Phase 2 changes committed as 10 atomic commits on `main`:

```
0135f93 chore: add Phase 2 dependencies
d9673f8 feat: enhance editor with save, dirty tracking, and draft restore
5c03781 feat: update provider components to use canonical types
4e7015f feat: wire model components to store with edit mode
7436607 feat: wire agent components to store with edit sheet
a34e24f feat: add form components for agent and model editing
f3cc4d8 feat: add shadcn/ui components for Phase 2 forms
3dade78 feat: enhance Zustand store with mutations and dirty tracking
a5c73ec feat: add model reference utilities and unify data layer to @/types
70ea08d feat: expand type definitions for Phase 2 editable forms
```

---

## Phase 3 (Config Profiles) — Complete

### Store Changes
- Added `configProfiles: Record<string, ConfigProfile>` to store state
- Added `activeProfileId: string | null` for tracking active profile
- Added `backgroundTask: BackgroundTaskConfig | null` and `runtimeFallback: RuntimeFallbackConfig | null`
- New actions: `createProfile`, `updateProfile`, `deleteProfile`, `setActiveProfile`
- New actions: `addAgentToProfile`, `removeAgentFromProfile`, `addCategoryToProfile`, `removeCategoryFromProfile`
- New actions: `setBackgroundTask`, `setRuntimeFallback`
- Updated `importFromJson`/`exportToJson`/`discardChanges` to handle new state fields
- Updated `createSnapshot` to include new fields
- New selectors: `useConfigProfiles`, `useActiveProfileId`, `useBackgroundTask`, `useRuntimeFallback`

### New Dependencies
- `@dnd-kit/core@6.3.1`
- `@dnd-kit/sortable@10.0.0`
- `@dnd-kit/utilities@3.2.2`

### New Components (8 files)
```
src/app/profiles/page.tsx                           # 5 lines — Server component wrapper
src/components/profiles/ProfilesClient.tsx           # 226 lines — Profile list + detail view
src/components/profiles/ProfileConfigSheet.tsx       # 120 lines — Profile create/edit Sheet
src/components/profiles/ProfileAssignmentBoard.tsx   # 280 lines — 3-column assignment board
src/components/profiles/DraggableAgentList.tsx        # 233 lines — Sortable agent list with @dnd-kit
src/components/profiles/DraggableCategoryList.tsx     # 243 lines — Sortable category list with @dnd-kit
src/components/forms/BackgroundTaskConfigForm.tsx     # 292 lines — Background task config form
src/components/forms/RuntimeFallbackConfigForm.tsx    # 245 lines — Runtime fallback config form
```

### Modified Files
```
src/store/configStore.ts                            # +171 lines — Profile/runtime actions + selectors
src/components/layout/Sidebar.tsx                    # Added /profiles route with Layers icon
```

### Architecture Review Findings (Addressed)
- Fixed: Misleading "Drag here" copy → "Add from the pool" (no cross-list DnD)
- Fixed: Unused imports removed (FolderPlus, cn, React)
- Fixed: jsonValue useMemo missing dependencies (added configProfiles, backgroundTask, runtimeFallback)
- Fixed: RuntimeFallbackConfigForm null safety on retry_on_errors
- Fixed: ProfileConfigSheet duplicate name validation

### Architecture Review Findings (Deferred to Phase 4)
- Medium: Global runtime config placement in profile detail (design decision)
- Medium: DraggableAgentList/CategoryList read store directly (could pass as props)
- Low: Provider color/label helpers duplicated from AgentCard (extract shared utility)
- Low: Accessibility improvements (keyboard nav, aria-labels)
- Info: KeyValueEditor uses index keys (stable IDs would be better)

### Build Status
- `pnpm build` passes — 6 static pages: /, /_not-found, /agents, /models, /profiles, /providers

## Future Phases

### Phase 3: Config Profiles
- Config profile create/clone (new UI)
- Drag-drop Agent assignment to profiles (dnd-kit)
- Category drag-drop assignment
- background_task / runtime_fallback parameter forms
- Profile enable/disable UI

### Phase 4: Publish Management
- Diff preview (Monaco diff mode) before publishing
- Write config to `~/.config/opencode/opencode.json` + `oh-my-openagent.jsonc`
- Publish history tracking
- Rollback support
- JSONC comment preservation via jsonc-parser modify() API

### Phase 5: Enhancements
- Provider health checks (ping API to validate keys)
- Config profile templates
- Dark/light theme toggle
- Keyboard shortcuts
- Monaco ↔ Visual bidirectional sync (deferred from Phase 2)

---

## Key Architecture Reference

### Store Shape (src/store/configStore.ts, 326 lines)
```typescript
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

  // Mutations
  setProviders, setAgents, setCategories,
  updateAgent, updateCategory, updateModel, updateProvider,
  createProfile, updateProfile, deleteProfile, setActiveProfile,
  addAgentToProfile, removeAgentFromProfile,
  addCategoryToProfile, removeCategoryFromProfile,
  setBackgroundTask, setRuntimeFallback,
  setConfigProfile, importFromJson, exportToJson,
  setLastSavedSnapshot, discardChanges, getIsDirty

  // Selectors
  useIsDirty, useProviders, useAgents, useCategories,
  useConfigProfiles, useActiveProfileId,
  useBackgroundTask, useRuntimeFallback
}
```

### Key Types (src/types/index.ts, 153 lines)
```
ThinkingConfig, Variant, PermissionConfig, PermissionLevel, 
FallbackModelEntry, ModelRef, Provider, Model, Agent, Category,
ConfigProfile, BackgroundTaskConfig, RuntimeFallbackConfig, 
TmuxConfig, TeamModeConfig, OmoConfig
```

### Model Ref Utilities (src/lib/model-ref.ts, 87 lines)
```
parseModelRef(ref: string) → {provider, model} | null
formatModelRef(provider, model) → string
resolveModelRef(ref, providers) → Model | null
getAvailableModels(providers) → Array<{providerName, modelKey, model}>
isModelRefValid(ref, providers) → boolean

---

## Store API Reference

### State Fields

| Field | Type | Description |
|-------|------|-------------|
| `providers` | `Record<string, Provider>` | All configured providers keyed by name |
| `agents` | `Record<string, Agent>` | All agents (built-in + user overrides) keyed by name |
| `categories` | `Record<string, Category>` | All categories keyed by name |
| `configProfiles` | `Record<string, ConfigProfile>` | Config profiles keyed by name |
| `activeProfileId` | `string \| null` | Currently active profile key |
| `configProfile` | `ConfigProfile \| null` | Legacy single-profile field |
| `backgroundTask` | `BackgroundTaskConfig \| null` | Background task concurrency settings |
| `runtimeFallback` | `RuntimeFallbackConfig \| null` | Runtime fallback/retry settings |
| `rawJson` | `string \| null` | Last imported/exported raw JSON string |
| `isDirty` | `boolean` | Whether unsaved changes exist |
| `lastSavedSnapshot` | `string` | JSON snapshot of last saved state (for discard) |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `setProviders` | `(providers: Record<string, Provider>) => void` | Replace all providers |
| `setAgents` | `(agents: Record<string, Agent>) => void` | Replace all agents |
| `setCategories` | `(categories: Record<string, Category>) => void` | Replace all categories |
| `updateAgent` | `(key: string, agent: Agent) => void` | Replace a single agent |
| `updateCategory` | `(key: string, category: Category) => void` | Replace a single category |
| `updateModel` | `(providerKey: string, modelKey: string, updates: Partial<Model>) => void` | Partial update to a model |
| `updateProvider` | `(providerKey: string, updates: Partial<Provider>) => void` | Partial update to a provider |
| `createProfile` | `(profile: ConfigProfile) => void` | Create a new config profile |
| `updateProfile` | `(key: string, profile: Partial<ConfigProfile>) => void` | Partial update to a profile |
| `deleteProfile` | `(key: string) => void` | Delete a profile (clears activeProfileId if deleted) |
| `setActiveProfile` | `(key: string \| null) => void` | Set the active profile |
| `addAgentToProfile` | `(profileKey: string, agentKey: string) => void` | Add agent to profile (no-op if already present) |
| `removeAgentFromProfile` | `(profileKey: string, agentKey: string) => void` | Remove agent from profile |
| `addCategoryToProfile` | `(profileKey: string, categoryKey: string) => void` | Add category to profile (no-op if already present) |
| `removeCategoryFromProfile` | `(profileKey: string, categoryKey: string) => void` | Remove category from profile |
| `setBackgroundTask` | `(config: BackgroundTaskConfig \| null) => void` | Set background task config |
| `setRuntimeFallback` | `(config: RuntimeFallbackConfig \| null) => void` | Set runtime fallback config |
| `setConfigProfile` | `(profile: ConfigProfile) => void` | Set legacy single-profile field |
| `importFromJson` | `(json: string) => OmoConfig` | Parse JSON into store, returns parsed config |
| `exportToJson` | `() => string` | Serialize store to JSON string |
| `setLastSavedSnapshot` | `() => void` | Mark current state as saved (sets isDirty=false) |
| `discardChanges` | `() => void` | Revert to last saved snapshot |
| `getIsDirty` | `() => boolean` | Check if unsaved changes exist |

### Selectors

| Selector | Returns | Description |
|----------|---------|-------------|
| `useIsDirty` | `boolean` | Whether unsaved changes exist |
| `useProviders` | `Record<string, Provider>` | All providers |
| `useAgents` | `Record<string, Agent>` | All agents |
| `useCategories` | `Record<string, Category>` | All categories |
| `useConfigProfiles` | `Record<string, ConfigProfile>` | All config profiles |
| `useActiveProfileId` | `string \| null` | Active profile key |
| `useBackgroundTask` | `BackgroundTaskConfig \| null` | Background task config |
| `useRuntimeFallback` | `RuntimeFallbackConfig \| null` | Runtime fallback config |
