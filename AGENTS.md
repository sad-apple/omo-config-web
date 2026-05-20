# AGENTS.md — OMO Config Web

## Project

Web UI for configuring [Oh-My-OpenAgent (OMO)](https://github.com/code-yeongyu/oh-my-openagent) multi-agent orchestration. Visually manages providers, models, agents, categories, and config profiles — replaces manual JSON editing of `opencode.json` and `oh-my-openagent.jsonc`.

## Commands

| Task | Command |
|------|---------|
| Dev server | `pnpm dev` |
| Production build | `pnpm build` |
| Lint | `pnpm lint` |
| Start prod | `pnpm start` |

**Build = typecheck + build in one.** No separate `tsc` step needed. No test suite yet.

## Stack

- **Next.js 16.2.6** App Router, Node.js server mode (API routes require server runtime, NO `output: 'export'`)
- **React 19.2.4**, TypeScript strict mode, `@/*` → `./src/*`
- **Tailwind CSS v4** (via `@tailwindcss/postcss`) — uses `@theme` block in `globals.css`, NOT `tailwind.config.ts`
- **shadcn/ui** "new-york" style, RSC-enabled — add components via `pnpm dlx shadcn@latest add <component>`
- **Zustand 5** for state (`src/store/configStore.ts`) — single store, all state
- **@dnd-kit** (core + sortable + utilities) for drag-drop in profiles
- **react-hook-form + zod** for form validation — ONLY used in `AgentConfigForm`; other forms use simple `useState` + `useEffect` sync
- **Monaco Editor** for raw JSON editing mode, bidirectional sync with visual mode (300ms debounce)
- **Lucide** icons, **Sonner** for toasts, **jsonc-parser** for JSONC read/write

## Architecture

```
src/
├── app/
│   ├── page.tsx            # Dashboard ("use client" — uses store directly)
│   ├── layout.tsx          # Root layout: ThemeProvider + SidebarProvider + Header + Toaster
│   ├── providers/page.tsx  # Server component → reads data, passes to ProvidersClient
│   ├── models/page.tsx     # "use client" — uses store directly (NOT server component)
│   ├── agents/page.tsx     # Server component → AgentsClient
│   ├── profiles/page.tsx   # Server component → ProfilesClient
│   └── api/
│       └── config/
│           ├── route.ts        # GET: read config files from disk
│           └── publish/route.ts # POST: write config files to disk (JSONC-aware)
├── components/
│   ├── ui/                 # shadcn/ui primitives (DO NOT hand-edit)
│   ├── layout/             # Sidebar, Header, ThemeProvider, ThemeToggle
│   ├── providers/          # ProviderList, ProviderCard, ProvidersClient
│   ├── models/             # ModelList, ModelCard, ModelDetail
│   ├── agents/             # AgentList, AgentCard, AgentConfigSheet, AgentsClient
│   ├── profiles/           # ProfilesClient, ProfileConfigSheet, ProfileAssignmentBoard,
│   │                       # DraggableAgentList, DraggableCategoryList, TemplateGallery
│   ├── forms/              # AgentConfigForm, ModelParamsForm, ModelSelector,
│   │                       # ThinkingConfigForm, VariantSelector, FallbackModelsEditor,
│   │                       # BackgroundTaskConfigForm, RuntimeFallbackConfigForm
│   └── editor/             # DualModeEditor, MonacoJsonEditor, ImportExportButtons,
│                           # PublishDialog, PublishHistory, PublishButton, DiffPreview,
│                           # KeyboardShortcutsDialog
├── hooks/                  # useConfigExport, useConfigImport, useDraftRestore,
│                           # useTheme, useKeyboardShortcuts, usePublish, usePublishHistory
├── lib/                    # configReader.ts (API + mock fallback), config-splitter.ts,
│                           # config-merger.ts, jsonc-writer.ts, config-paths.ts,
│                           # config-templates.ts, model-ref.ts, provider-colors.ts,
│                           # debounce.ts, utils.ts (cn)
├── store/                  # configStore.ts (Zustand — single store, all state)
└── types/                  # index.ts (canonical types — single source of truth)
```

### Page Pattern

Pages follow one of two patterns:
1. **Server component** at `src/app/<route>/page.tsx` → reads data, passes to `*Client.tsx` — used by providers, agents, profiles
2. **Client component** at `src/app/<route>/page.tsx` → uses store directly — used by dashboard and models

Server components that need store access MUST delegate to `*Client.tsx` sub-components.

### Component Patterns

- **Form components** (in `src/components/forms/`) are **controlled** — they take `value`/`onChange` props, never access the store directly
- **Page components** (in `src/components/<route>/`) wire forms to the store
- **Card components** display entity data with edit buttons that open Sheet dialogs
- **Draggable lists** use `@dnd-kit/sortable` with `DndContext` + `SortableContext` + `useSortable`
- **DualModeEditor** wraps every page — provides Visual/JSON tab switching with Monaco sync

## Critical Gotchas

### Zustand + SSR
Any component using `useConfigStore` must be a client component (`"use client"`). The root `app/page.tsx` is a client component for this reason. Server components (e.g. `app/providers/page.tsx`) must delegate store usage to `*Client.tsx` sub-components.

### Types Are Canonical
`src/types/index.ts` is the **single source of truth** for all type definitions. No duplicate interfaces anywhere. When adding new types, add them there and import from `@/types`.

### Store Is Source of Truth
`src/store/configStore.ts` is the single Zustand store. All mutations go through store actions. Key patterns:
- `isDirty` + `lastSavedSnapshot` for dirty tracking (NO undo/redo)
- `setLastSavedSnapshot()` marks current state as saved
- `discardChanges()` reverts to last snapshot
- `importFromJson()` / `exportToJson()` for JSON round-trip
- Monaco ↔ Visual sync: debounced (300ms) auto-sync from JSON editor to store; visual changes propagate to Monaco on tab switch
- Profile keys use `name` field (not UUID) — duplicate names silently overwrite
- **Known gap**: `tmux` and `team_mode` fields exist in types but are NOT in the store — they are lost on import→export round-trip
- **Dead state**: `configProfile` (singular), `rawJson`, and `activeProfileId` are stored but never meaningfully used

### Config Data Source
`src/lib/configReader.ts` uses API routes with mock fallback:
- **API mode** (production): `GET /api/config` reads from disk, `POST /api/config/publish` writes to disk
- **Mock mode** (fallback): returns hardcoded sample data from `mock-data.ts` when API is unavailable — **no visual indicator** that mock data is being shown
- Config files: `~/.config/opencode/opencode.json` (providers + models) + `~/.config/opencode/oh-my-openagent.jsonc` (agents + categories + profiles + runtime)
- JSONC write uses `jsonc-parser` with sequential `modify()` + `applyEdits()` to preserve comments and formatting
- Config splitter/merger (`config-splitter.ts` / `config-merger.ts`) maps between store shape and dual-file layout
- **Known gap**: `writeNewConfig()` in `jsonc-writer.ts` ignores the `isJsonc` parameter — always outputs plain JSON even for `.jsonc` files

### Preset Config System
The app supports multiple preset configurations stored in `~/.config/omo-config-web/`:
- Each preset is a subdirectory containing `opencode.json` + `oh-my-openagent.jsonc`
- On `omo-config-web start [name]`, the selected preset is copied to `~/.config/opencode/`
- Current preset tracked in `~/.config/omo-config-web/.current`
- The app itself always reads/writes `~/.config/opencode/` — preset management is external to the app

### pnpm Workspace
`pnpm-workspace.yaml` declares `onlyBuiltDependencies: [sharp, unrs-resolver]`. Do not remove — build will fail without it.

### Provider Color Map
Provider badge colors are centralized in `src/lib/provider-colors.ts` with `getProviderColor()` and `getProviderLabel()`. All components import from this single source. When adding new providers, add entries to `PROVIDER_COLORS` and `PROVIDER_LABELS` maps.

### Model Reference Format
Models are referenced as `"provider/modelName"` strings (e.g. `"openai/gpt-4o"`). Use `parseModelRef()` / `formatModelRef()` / `resolveModelRef()` from `src/lib/model-ref.ts` to handle these references. Never split on `/` manually — provider keys can contain hyphens.

### Sidebar Navigation
The sidebar in `src/components/layout/Sidebar.tsx` includes a `/configs` nav item that does NOT have a corresponding page route. This is a dead link — do not add it to new navigation without creating the route first.

### Tailwind v4 Setup
This project uses Tailwind CSS v4 with `@tailwindcss/postcss`. There is NO `tailwind.config.ts` — all theme customization is in `src/app/globals.css` using the `@theme` block with CSS custom properties. Theme variables follow the shadcn/ui zinc color scheme.

## Conventions

- shadcn/ui components: add via `pnpm dlx shadcn@latest add <component>`
- All new pages go under `src/app/<route>/page.tsx`
- Client components that use zustand or browser APIs need `"use client"` directive
- Tailwind uses CSS variables for theming (see `src/app/globals.css`)
- Form components use simple `useState` + `useEffect` sync (NOT react-hook-form for standalone forms; react-hook-form is only used in `AgentConfigForm`)
- Store selectors: use individual `useConfigStore((s) => s.field)` — never destructure the whole store
- Entity keys: `Record<string, T>` keyed by entity name (e.g. `agents["coder"]`)
- Route-level `error.tsx` files exist for `/providers`, `/models`, `/agents`, `/profiles` — catch errors per route
- Route-level `loading.tsx` files use Skeleton component — pages show loading skeletons while data loads
- The `eslint.config.mjs` uses the flat config format with `eslint-config-next` presets

## Known Issues (from Adversarial Review)

These are confirmed issues that should be fixed before adding new features:

- **Agent form covers only ~32% of fields** — 7 of 22 Agent type fields have UI; missing: skills, permissions, prompt, tools, disable, mode, color, etc.
- **No concurrency control on publish** — last-write-wins, no ETag/version check

## Language

Always reply in Chinese (中文). All communication with the user must be in Chinese.
