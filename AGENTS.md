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

- **Next.js 16.2.6** App Router, static export (`output: 'export'` in next.config.ts is implied)
- **React 19.2.4**, TypeScript strict mode, `@/*` → `./src/*`
- **Tailwind CSS v4** (via `@tailwindcss/postcss`)
- **shadcn/ui** "new-york" style, RSC-enabled
- **Zustand 5** for state (`src/store/configStore.ts`)
- **@dnd-kit** (core + sortable + utilities) for drag-drop in profiles
- **react-hook-form + zod** for form validation in agent/model editing
- **Monaco Editor** for raw JSON editing mode
- **Lucide** icons, **Sonner** for toasts

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard ("use client" — uses zustand)
│   ├── layout.tsx          # Root layout: SidebarProvider + Header + Toaster
│   ├── providers/page.tsx  # Server component → ProvidersClient
│   ├── models/page.tsx     # Server component → ModelList
│   ├── agents/page.tsx     # Server component → AgentsClient
│   └── profiles/page.tsx   # Server component → ProfilesClient
├── components/
│   ├── ui/                 # shadcn/ui primitives (DO NOT hand-edit)
│   ├── layout/             # Sidebar, Header
│   ├── providers/          # ProviderList, ProviderCard, ProvidersClient
│   ├── models/             # ModelList, ModelCard, ModelDetail
│   ├── agents/             # AgentList, AgentCard, AgentConfigSheet, AgentsClient
│   ├── profiles/           # ProfilesClient, ProfileConfigSheet, ProfileAssignmentBoard,
│   │                       # DraggableAgentList, DraggableCategoryList
│   ├── forms/              # AgentConfigForm, ModelParamsForm, ModelSelector,
│   │                       # ThinkingConfigForm, VariantSelector, FallbackModelsEditor,
│   │                       # BackgroundTaskConfigForm, RuntimeFallbackConfigForm
│   └── editor/             # DualModeEditor, MonacoJsonEditor, ImportExportButtons
├── hooks/                  # useConfigExport, useConfigImport, useDraftRestore
├── lib/                    # configReader.ts (mock data), model-ref.ts, utils.ts (cn)
├── store/                  # configStore.ts (Zustand — single store, all state)
└── types/                  # index.ts (canonical types — single source of truth)
```

### Page Pattern

Every page follows this pattern:
- **Server component** at `src/app/<route>/page.tsx` — just renders the client component
- **Client component** at `src/components/<route>/<Route>Client.tsx` — uses zustand, wraps content in `DualModeEditor`
- Server components that need store access MUST delegate to `*Client.tsx` sub-components

### Component Patterns

- **Form components** (in `src/components/forms/`) are **controlled** — they take `value`/`onChange` props, never access the store directly
- **Page components** (in `src/components/<route>/`) wire forms to the store
- **Card components** display entity data with edit buttons that open Sheet dialogs
- **Draggable lists** use `@dnd-kit/sortable` with `DndContext` + `SortableContext` + `useSortable`

## Critical Gotchas

### Zustand + SSR
Any component using `useConfigStore` must be a client component (`"use client"`). The root `app/page.tsx` is a client component for this reason. Server components (e.g. `app/providers/page.tsx`) must delegate store usage to `*Client.tsx` sub-components.

### Types Are Canonical
`src/types/index.ts` is the **single source of truth** for all type definitions. No duplicate interfaces anywhere. When adding new types, add them there and import from `@/types`.

### Store Is Source of Truth
`src/store/configStore.ts` is the single Zustand store. All mutations go through store actions. Monaco editor displays store state until "Apply" overwrites it. Key patterns:
- `isDirty` + `lastSavedSnapshot` for dirty tracking (NO undo/redo)
- `setLastSavedSnapshot()` marks current state as saved
- `discardChanges()` reverts to last snapshot
- `importFromJson()` / `exportToJson()` for JSON round-trip
- Profile keys use `name` field (not UUID) — duplicate names silently overwrite

### Config Data Source
`src/lib/configReader.ts` currently returns **mock data**. The TODO is to replace with actual file reading:
- `~/.config/opencode/opencode.json` → providers + models
- `~/.config/opencode/oh-my-openagent.jsonc` → agents + categories
- Use `jsonc-parser` for `.jsonc` files (standard `JSON.parse` fails on comments)
- Use `child_process.exec('opencode providers list')` for dynamic provider discovery

### pnpm Workspace
`pnpm-workspace.yaml` declares `onlyBuiltDependencies: [sharp, unrs-resolver]`. Do not remove — build will fail without it.

### Provider Color Map
Provider badge colors are defined in `AgentCard.tsx` and duplicated in `DraggableAgentList.tsx` / `DraggableCategoryList.tsx`. If adding new providers, update all three. (TODO: extract to shared utility.)

## Conventions

- shadcn/ui components: add via `pnpm dlx shadcn@latest add <component>`
- All new pages go under `src/app/<route>/page.tsx`
- Client components that use zustand or browser APIs need `"use client"` directive
- Tailwind uses CSS variables for theming (see `src/app/globals.css`)
- Form components use simple `useState` + `useEffect` sync (NOT react-hook-form for standalone forms; react-hook-form is only used in `AgentConfigForm`)
- Store selectors: use individual `useConfigStore((s) => s.field)` — never destructure the whole store
- Entity keys: `Record<string, T>` keyed by entity name (e.g. `agents["coder"]`)

## Phase Status

- **Phase 1** (MVP): ✅ Complete — Read-only display, sidebar, dual-mode editor
- **Phase 2** (Editable Forms): ✅ Complete — Agent/model/provider editing, dirty tracking, draft restore
- **Phase 3** (Config Profiles): ✅ Complete — Profile CRUD, drag-drop assignment, runtime config forms
- **Phase 4** (Publish Management): ✅ Complete — Diff preview, write to config files, publish history, rollback, JSONC preservation
- **Phase 5** (Enhancements): 🔲 TODO — Health checks, templates, themes, keyboard shortcuts
