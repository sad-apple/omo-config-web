# AGENTS.md — OMO Config Web

## Project

Web UI for configuring [Oh-My-OpenAgent (OMO)](https://github.com/code-yeongyu/oh-my-openagent) multi-agent orchestration. Visually manages providers, models, agents, and categories — replaces manual JSON editing of `opencode.json` and `oh-my-openagent.jsonc`.

## Commands

| Task | Command |
|------|---------|
| Dev server | `pnpm dev` |
| Production build | `pnpm build` |
| Lint | `pnpm lint` |
| Start prod | `pnpm start` |

Order: `pnpm build` (typecheck + build in one). No separate test suite yet.

## Stack

- **Next.js 16.2.6** App Router, static export
- **React 19**, TypeScript strict mode, `@/*` → `./src/*`
- **Tailwind CSS v4** (via `@tailwindcss/postcss`)
- **shadcn/ui** "new-york" style, RSC-enabled
- **Zustand 5** for state (`src/store/configStore.ts`)
- **Monaco Editor** for raw JSON editing mode
- **Lucide** icons, **Sonner** for toasts

## Architecture

```
src/
├── app/                  # Next.js App Router pages
│   ├── page.tsx          # Dashboard (MUST be "use client" — uses zustand)
│   ├── layout.tsx        # Root layout: SidebarProvider + Header + Toaster
│   ├── providers/page.tsx
│   ├── models/page.tsx
│   ├── agents/page.tsx
│   └── configs/          # placeholder
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── layout/           # Sidebar, Header
│   ├── providers/        # ProviderList, ProviderCard, ProvidersClient
│   ├── models/           # ModelList, ModelCard, ModelDetail
│   ├── agents/           # AgentList, AgentCard, AgentsClient
│   └── editor/           # DualModeEditor, MonacoJsonEditor, ImportExportButtons
├── hooks/                # useConfigExport, useConfigImport
├── lib/                  # configReader.ts (mock data), utils.ts (cn)
├── store/                # configStore.ts (Zustand)
└── types/                # index.ts (Provider, Model, Agent, Category, etc.)
```

## Critical Gotchas

### Zustand + SSR
Any component using `useConfigStore` must be a client component (`"use client"`). The root `app/page.tsx` is a client component for this reason. Server components (e.g. `app/providers/page.tsx`) must delegate store usage to `*Client.tsx` sub-components.

### Config Data Source
`src/lib/configReader.ts` currently returns **mock data**. The TODO is to replace with actual file reading:
- `~/.config/opencode/opencode.json` → providers + models
- `~/.config/opencode/oh-my-openagent.jsonc` → agents + categories
- Use `jsonc-parser` for `.jsonc` files (standard `JSON.parse` fails on comments)
- Use `child_process.exec('opencode providers list')` for dynamic provider discovery

### pnpm Workspace
`pnpm-workspace.yaml` declares `onlyBuiltDependencies: [sharp, unrs-resolver]`. Do not remove — build will fail without it.

## Future Phases (from PRD)

- **Phase 2**: Editable forms (model params, agent model selector, fallback models)
- **Phase 3**: Config profiles with drag-drop (dnd-kit) for agent/category assignment
- **Phase 4**: Publish management — diff preview, write to config files, rollback history
- **Phase 5**: Provider health checks, config templates, themes

See `docs/TECHNICAL_DESIGN.md` and `docs/PRODUCT_REQUIREMENTS.md` for full specs.

## Conventions

- shadcn/ui components: add via `pnpm dlx shadcn@latest add <component>`
- All new pages go under `src/app/<route>/page.tsx`
- Client components that use zustand or browser APIs need `"use client"` directive
- Tailwind uses CSS variables for theming (see `src/app/globals.css`)
