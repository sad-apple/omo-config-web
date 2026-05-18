# Phase 4: Publish Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to publish their config changes to disk (`opencode.json` + `oh-my-openagent.jsonc`), view publish history, and rollback to previous versions — with JSONC comment preservation.

**Architecture:** Add Next.js API routes for file I/O (read/write config files from `~/.config/opencode/`). **Important:** This app does NOT use `output: 'export'` (static export) — API routes require a Node.js server runtime. Add a `jsonc-parser`-based writer that preserves comments in `.jsonc` files. Store publish history as snapshots in localStorage. The DiffPreview (already built) shows what will change before publishing. Rollback restores a snapshot and re-publishes.

**Tech Stack:** Next.js 16 API Routes (requires server runtime, NOT static export), `jsonc-parser` (for JSONC read/write with comment preservation), Zustand (store extensions), localStorage (publish history), shadcn/ui (publish dialog, history list).

---

## File Structure

### New Files
```
src/app/api/config/route.ts              # GET: read config files from disk
src/app/api/config/publish/route.ts      # POST: write config files to disk
src/lib/jsonc-writer.ts                  # JSONC-aware merge writer (preserves comments)
src/lib/config-paths.ts                  # Config file path resolution (~/.config/opencode/*)
src/lib/config-splitter.ts               # Split OmoConfig into opencode.json + oh-my-openagent.jsonc shapes
src/lib/config-merger.ts                 # Merge disk config back into OmoConfig store shape
src/hooks/usePublish.ts                  # Publish flow hook (diff → confirm → write → history)
src/hooks/usePublishHistory.ts           # Publish history management (localStorage snapshots)
src/components/editor/PublishDialog.tsx  # Publish confirmation dialog with diff summary
src/components/editor/PublishHistory.tsx # Publish history list with rollback buttons
src/components/editor/PublishButton.tsx  # Publish button for DualModeEditor header
```

### Modified Files
```
src/store/configStore.ts                 # Add publishHistory state, publish/rollback actions
src/components/editor/DualModeEditor.tsx # Add PublishButton to header
src/components/editor/ImportExportButtons.tsx # Add "Load from Disk" button
src/types/index.ts                       # Add PublishSnapshot type
src/lib/configReader.ts                  # Replace mock with API route call
package.json                             # Add jsonc-parser dependency
```

---

## Task 1: Add `jsonc-parser` dependency and config path utilities

**Files:**
- Modify: `package.json`
- Create: `src/lib/config-paths.ts`

- [ ] **Step 1: Install jsonc-parser**

```bash
pnpm add jsonc-parser
```

- [ ] **Step 2: Create config-paths.ts**

```typescript
// src/lib/config-paths.ts
import path from "path";
import os from "os";

/**
 * Resolve config file paths following OMO conventions.
 * All paths are relative to ~/.config/opencode/
 */
export function getConfigDir(): string {
  return path.join(os.homedir(), ".config", "opencode");
}

export function getOpencodeJsonPath(): string {
  return path.join(getConfigDir(), "opencode.json");
}

export function getOmoJsoncPath(): string {
  return path.join(getConfigDir(), "oh-my-openagent.jsonc");
}
```

- [ ] **Step 3: Verify build passes**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds (or only Google Fonts network error, no TS errors)

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/config-paths.ts
git commit -m "feat: add jsonc-parser dependency and config path utilities"
```

---

## Task 2: Create config splitter and merger

**Files:**
- Create: `src/lib/config-splitter.ts`
- Create: `src/lib/config-merger.ts`

These modules handle the bidirectional mapping between the single OmoConfig store shape and the two separate config files on disk.

**opencode.json** contains: `providers` (with models), and general opencode settings.
**oh-my-openagent.jsonc** contains: `agents`, `categories`, `configProfiles`, `background_task`, `runtime_fallback`, `tmux`, `team_mode`.

- [ ] **Step 1: Create config-splitter.ts**

```typescript
// src/lib/config-splitter.ts
import type { OmoConfig, Provider, Agent, Category, ConfigProfile, BackgroundTaskConfig, RuntimeFallbackConfig } from "@/types";

/**
 * The shape of opencode.json on disk.
 * Contains providers (with their models) and general opencode settings.
 */
export interface OpencodeJsonFile {
  providers?: Record<string, Provider>;
  // opencode.json may contain other fields we don't manage (e.g., custom_instructions)
  // We preserve them via JSONC merge, not here.
}

/**
 * The shape of oh-my-openagent.jsonc on disk.
 * Contains agents, categories, profiles, and runtime config.
 */
export interface OmoJsoncFile {
  agents?: Record<string, Agent>;
  categories?: Record<string, Category>;
  configProfiles?: Record<string, ConfigProfile>;
  background_task?: BackgroundTaskConfig;
  runtime_fallback?: RuntimeFallbackConfig;
  tmux?: { enabled: boolean; layout: string; main_pane_size: number };
  team_mode?: { enabled: boolean; max_parallel_members: number; max_members: number };
}

/**
 * Split the unified OmoConfig into two file shapes for writing to disk.
 * Returns separate objects for opencode.json and oh-my-openagent.jsonc.
 */
export function splitConfig(config: OmoConfig & { providers?: Record<string, Provider>; configProfiles?: Record<string, ConfigProfile> }): {
  opencodeJson: OpencodeJsonFile;
  omoJsonc: OmoJsoncFile;
} {
  const { agents, categories, providers, configProfiles, background_task, runtime_fallback, tmux, team_mode } = config;

  return {
    opencodeJson: {
      providers: providers ?? {},
    },
    omoJsonc: {
      agents: agents ?? {},
      categories: categories ?? {},
      configProfiles: configProfiles ?? {},
      background_task,
      runtime_fallback,
      tmux,
      team_mode,
    },
  };
```

- [ ] **Step 2: Create config-merger.ts**

```typescript
// src/lib/config-merger.ts
import type { OmoConfig, Provider, ConfigProfile, BackgroundTaskConfig, RuntimeFallbackConfig } from "@/types";
import type { OpencodeJsonFile, OmoJsoncFile } from "./config-splitter";

/**
 * Merge the two config file shapes back into the unified OmoConfig store shape.
 * This is used when reading from disk.
 */
export function mergeConfig(
  opencodeJson: OpencodeJsonFile,
  omoJsonc: OmoJsoncFile
): OmoConfig & { providers?: Record<string, Provider>; configProfiles?: Record<string, ConfigProfile> } {
  return {
    providers: opencodeJson.providers ?? {},
    agents: omoJsonc.agents ?? {},
    categories: omoJsonc.categories ?? {},
    configProfiles: omoJsonc.configProfiles ?? {},
    background_task: omoJsonc.background_task,
    runtime_fallback: omoJsonc.runtime_fallback,
    tmux: omoJsonc.tmux,
    team_mode: omoJsonc.team_mode,
  };
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/config-splitter.ts src/lib/config-merger.ts
git commit -m "feat: add config splitter and merger for dual-file mapping"
```

---

## Task 3: Create JSONC-aware writer

**Files:**
- Create: `src/lib/jsonc-writer.ts`

This is the critical module that preserves comments when writing `.jsonc` files. It uses `jsonc-parser`'s `modify()` API to apply edits to the original text rather than re-serializing from scratch.

- [ ] **Step 1: Create jsonc-writer.ts**

```typescript
// src/lib/jsonc-writer.ts
import * as jsonc from "jsonc-parser";

/**
 * Merge new data into an existing JSON/JSONC file while preserving
 * comments and formatting.
 *
 * For .jsonc files: uses jsonc-parser modify() to apply edits in-place.
 * For .json files: falls back to JSON.stringify with formatting.
 *
 * @param originalText - The original file content (may contain comments)
 * @param newData - The new data to merge (replaces top-level keys)
 * @param isJsonc - Whether the file is JSONC (true) or plain JSON (false)
 * @returns The modified file content with comments preserved
 */
export function mergeJsonc(
  originalText: string,
  newData: Record<string, unknown>,
  isJsonc: boolean
): string {
  if (!isJsonc) {
    // For plain JSON, just pretty-print the merged result
    try {
      const original = JSON.parse(originalText) as Record<string, unknown>;
      const merged = { ...original, ...newData };
      return JSON.stringify(merged, null, 2) + "\n";
    } catch {
      // If original is invalid JSON, just write the new data
      return JSON.stringify(newData, null, 2) + "\n";
    }
  }

  // For JSONC files, use jsonc-parser modify() to preserve comments.
  // CRITICAL: Apply edits SEQUENTIALLY (not batched) to avoid offset corruption.
  // Each modify() call returns edits relative to the current text state,
  // so we must apply them one at a time.
  let currentText = originalText;

  // If the file is empty or doesn't parse, start fresh
  const errors: jsonc.ParseError[] = [];
  const root = jsonc.parseTree(currentText, errors);
  if (!root || errors.length > 0) {
    // File is empty or unparseable — write fresh JSONC
    return JSON.stringify(newData, null, 2) + "\n";
  }

  // Apply edits sequentially — each modify+apply cycle updates the text,
  // so the next modify() operates on the updated text with correct offsets.
  for (const [key, value] of Object.entries(newData)) {
    const edits = jsonc.modify(currentText, [key], value, {
      formattingOptions: {
        tabSize: 2,
        insertSpaces: true,
        eol: "\n",
      },
    });
    currentText = jsonc.applyEdits(currentText, edits);
  }

  return currentText;
}

/**
 * Write data to a JSON/JSONC file, creating it if it doesn't exist.
 * For new files, just pretty-prints the data.
 *
 * @param newData - The data to write
 * @param isJsonc - Whether the file is JSONC
 * @returns The file content
 */
export function writeNewConfig(
  newData: Record<string, unknown>,
  isJsonc: boolean
): string {
  // Even for new JSONC files, we start with plain JSON.
  // Comments can be added by the user later.
  return JSON.stringify(newData, null, 2) + "\n";
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/jsonc-writer.ts
git commit -m "feat: add JSONC-aware writer with comment preservation"
```

---

## Task 4: Add PublishSnapshot type and store extensions

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/configStore.ts`

- [ ] **Step 1: Add PublishSnapshot type to types/index.ts**

Append to the end of `src/types/index.ts`:

```typescript
// === Publish History ===

export interface PublishSnapshot {
  id: string;
  timestamp: number;
  /** The full config JSON at time of publish */
  snapshot: string;
  /** Summary of what changed (human-readable) */
  summary: string;
  /** Which files were written */
  filesWritten: string[];
}
```

- [ ] **Step 2: Extend configStore.ts with publish history state and actions**

Add to the `ConfigState` interface:

```typescript
  // Publish history
  publishHistory: PublishSnapshot[];
  addPublishSnapshot: (snapshot: PublishSnapshot) => void;
  clearPublishHistory: () => void;
```

Add to `initialState`:

```typescript
  publishHistory: [],
```

Add implementations:

```typescript
  addPublishSnapshot: (snapshot) =>
    set((state) => ({
      publishHistory: [snapshot, ...state.publishHistory].slice(0, 50), // Keep last 50
    })),

  clearPublishHistory: () => set({ publishHistory: [] }),
```

Add selector:

```typescript
export const usePublishHistory = () => useConfigStore((state) => state.publishHistory);
```

Update `importFromJson` to also load publish history from localStorage (handled in Task 7).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/store/configStore.ts
git commit -m "feat: add PublishSnapshot type and publish history to store"
```

---

## Task 5: Create API routes for config file I/O

**Files:**
- Create: `src/app/api/config/route.ts`
- Create: `src/app/api/config/publish/route.ts`

These are Next.js API routes that run server-side to read/write config files from `~/.config/opencode/`.

- [ ] **Step 1: Create the config read route**

```typescript
// src/app/api/config/route.ts
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import * as jsonc from "jsonc-parser";

function getConfigDir(): string {
  return path.join(os.homedir(), ".config", "opencode");
}

async function readConfigFile(filePath: string): Promise<{ content: string; exists: boolean }> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { content, exists: true };
  } catch {
    return { content: "", exists: false };
  }
}

export async function GET() {
  try {
    const configDir = getConfigDir();
    const opencodePath = path.join(configDir, "opencode.json");
    const omoPath = path.join(configDir, "oh-my-openagent.jsonc");

    const [opencodeResult, omoResult] = await Promise.all([
      readConfigFile(opencodePath),
      readConfigFile(omoPath),
    ]);

    // Parse the files
    let opencodeData: Record<string, unknown> = {};
    let omoData: Record<string, unknown> = {};

    if (opencodeResult.exists) {
      const errors: jsonc.ParseError[] = [];
      const parsed = jsonc.parse(opencodeResult.content, errors, { allowTrailingComma: true });
      if (parsed && typeof parsed === "object") {
        opencodeData = parsed as Record<string, unknown>;
      }
    }

    if (omoResult.exists) {
      const errors: jsonc.ParseError[] = [];
      const parsed = jsonc.parse(omoResult.content, errors, { allowTrailingComma: true });
      if (parsed && typeof parsed === "object") {
        omoData = parsed as Record<string, unknown>;
      }
    }

    return NextResponse.json({
      opencode: opencodeData,
      omo: omoData,
      opencodeExists: opencodeResult.exists,
      omoExists: omoResult.exists,
      opencodeRaw: opencodeResult.content,
      omoRaw: omoResult.content,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read config files", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create the config publish (write) route**

```typescript
// src/app/api/config/publish/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import * as jsonc from "jsonc-parser";

function getConfigDir(): string {
  return path.join(os.homedir(), ".config", "opencode");
}

async function readConfigFile(filePath: string): Promise<{ content: string; exists: boolean }> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { content, exists: true };
  } catch {
    return { content: "", exists: false };
  }
}

// Import the shared JSONC writer from lib (created in Task 3)
// This avoids duplicating the mergeJsonc logic.
import { mergeJsonc } from "@/lib/jsonc-writer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      opencodeData?: Record<string, unknown>;
      omoData?: Record<string, unknown>;
    };

    const configDir = getConfigDir();

    // Ensure config directory exists
    await fs.mkdir(configDir, { recursive: true });

    const filesWritten: string[] = [];

    // Write opencode.json
    if (body.opencodeData) {
      const opencodePath = path.join(configDir, "opencode.json");
      const existing = await readConfigFile(opencodePath);
      const content = existing.exists
        ? mergeJsonc(existing.content, body.opencodeData, false)
        : JSON.stringify(body.opencodeData, null, 2) + "\n";
      await fs.writeFile(opencodePath, content, "utf-8");
      filesWritten.push("opencode.json");
    }

    // Write oh-my-openagent.jsonc
    if (body.omoData) {
      const omoPath = path.join(configDir, "oh-my-openagent.jsonc");
      const existing = await readConfigFile(omoPath);
      const content = existing.exists
        ? mergeJsonc(existing.content, body.omoData, true)
        : JSON.stringify(body.omoData, null, 2) + "\n";
      await fs.writeFile(omoPath, content, "utf-8");
      filesWritten.push("oh-my-openagent.jsonc");
    }

    return NextResponse.json({
      success: true,
      filesWritten,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to write config files", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/config/route.ts src/app/api/config/publish/route.ts
git commit -m "feat: add API routes for config file read/write with JSONC preservation"
```

---

## Task 6: Create usePublish and usePublishHistory hooks

**Files:**
- Create: `src/hooks/usePublish.ts`
- Create: `src/hooks/usePublishHistory.ts`

- [ ] **Step 1: Create usePublishHistory.ts**

```typescript
// src/hooks/usePublishHistory.ts
"use client";

import { useEffect } from "react";
import type { PublishSnapshot } from "@/types";
import { useConfigStore } from "@/store/configStore";

const HISTORY_KEY = "omo-publish-history";

/**
 * Hook that syncs publish history to/from localStorage
 * and provides history management functions.
 */
export function usePublishHistory() {
  const publishHistory = useConfigStore((s) => s.publishHistory);
  const addPublishSnapshot = useConfigStore((s) => s.addPublishSnapshot);
  const clearPublishHistory = useConfigStore((s) => s.clearPublishHistory);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PublishSnapshot[];
        // Hydrate store — but only if store is empty (first load)
        if (publishHistory.length === 0 && parsed.length > 0) {
          for (const snapshot of parsed.reverse()) {
            addPublishSnapshot(snapshot);
          }
        }
      }
    } catch {
      // Invalid history data, ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(publishHistory));
    } catch {
      // localStorage full or unavailable, ignore
    }
  }, [publishHistory]);

  return {
    publishHistory,
    addPublishSnapshot,
    clearPublishHistory,
  };
}
```

- [ ] **Step 2: Create usePublish.ts**

```typescript
// src/hooks/usePublish.ts
"use client";

import { useState, useCallback } from "react";
import { useConfigStore } from "@/store/configStore";
import { splitConfig } from "@/lib/config-splitter";
import type { PublishSnapshot } from "@/types";
import { toast } from "sonner";

interface PublishResult {
  success: boolean;
  filesWritten: string[];
  error?: string;
}

/**
 * Hook for publishing config changes to disk.
 * Handles the full flow: split config → call API → record history → update store.
 */
export function usePublish() {
  const [isPublishing, setIsPublishing] = useState(false);
  const exportToJson = useConfigStore((s) => s.exportToJson);
  const setLastSavedSnapshot = useConfigStore((s) => s.setLastSavedSnapshot);
  const addPublishSnapshot = useConfigStore((s) => s.addPublishSnapshot);

  const publish = useCallback(async (): Promise<PublishResult> => {
    setIsPublishing(true);

    try {
      // 1. Get current config from store
      const configJson = exportToJson();
      const config = JSON.parse(configJson);

      // 2. Split into two file shapes
      const { opencodeJson, omoJsonc } = splitConfig(config);

      // 3. Call the publish API
      const response = await fetch("/api/config/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opencodeData: opencodeJson,
          omoData: omoJsonc,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Publish failed");
      }

      const result = await response.json() as { success: boolean; filesWritten: string[]; timestamp: number };

      // 4. Record publish snapshot in history
      const snapshot: PublishSnapshot = {
        id: `publish-${Date.now()}`,
        timestamp: result.timestamp,
        snapshot: configJson,
        summary: `Published to ${result.filesWritten.join(", ")}`,
        filesWritten: result.filesWritten,
      };
      addPublishSnapshot(snapshot);

      // 5. Mark current state as saved
      setLastSavedSnapshot();

      toast.success("Configuration published", {
        description: `Written to ${result.filesWritten.join(", ")}`,
      });

      return { success: true, filesWritten: result.filesWritten };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Publish failed", { description: message });
      return { success: false, filesWritten: [], error: message };
    } finally {
      setIsPublishing(false);
    }
  }, [exportToJson, setLastSavedSnapshot, addPublishSnapshot]);

  return { publish, isPublishing };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePublish.ts src/hooks/usePublishHistory.ts
git commit -m "feat: add usePublish and usePublishHistory hooks"
```

---

## Task 7: Create PublishDialog, PublishHistory, and PublishButton components

**Files:**
- Create: `src/components/editor/PublishDialog.tsx`
- Create: `src/components/editor/PublishHistory.tsx`
- Create: `src/components/editor/PublishButton.tsx`

- [ ] **Step 1: Create PublishButton.tsx**

```typescript
// src/components/editor/PublishButton.tsx
"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublish } from "@/hooks/usePublish";
import { useIsDirty } from "@/store/configStore";

interface PublishButtonProps {
  onPublishSuccess?: () => void;
}

export function PublishButton({ onPublishSuccess }: PublishButtonProps) {
  const { publish, isPublishing } = usePublish();
  const isDirty = useIsDirty();

  const handlePublish = async () => {
    const result = await publish();
    if (result.success && onPublishSuccess) {
      onPublishSuccess();
    }
  };

  return (
    <Button
      size="sm"
      onClick={handlePublish}
      disabled={isPublishing || !isDirty}
      className="gap-1.5"
    >
      <Upload className="h-3.5 w-3.5" />
      {isPublishing ? "Publishing..." : "Publish"}
    </Button>
  );
}
```

- [ ] **Step 2: Create PublishDialog.tsx**

A confirmation dialog that shows the diff summary before publishing.

```typescript
// src/components/editor/PublishDialog.tsx
"use client";

import { useState } from "react";
import { Upload, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePublish } from "@/hooks/usePublish";
import { useConfigStore } from "@/store/configStore";
import { DiffPreview } from "./DiffPreview";

interface PublishDialogProps {
  children?: React.ReactNode;
}

export function PublishDialog({ children }: PublishDialogProps) {
  const [open, setOpen] = useState(false);
  const { publish, isPublishing } = usePublish();
  const isDirty = useConfigStore((s) => s.isDirty);

  const handlePublish = async () => {
    const result = await publish();
    if (result.success) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm" disabled={!isDirty} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Publish
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Publish Configuration
          </DialogTitle>
          <DialogDescription>
            Review the changes below before publishing to disk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              This will overwrite your local config files at{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900">
                ~/.config/opencode/
              </code>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">opencode.json</Badge>
            <Badge variant="outline">oh-my-openagent.jsonc</Badge>
          </div>

          <DiffPreview
            trigger={
              <Button variant="outline" size="sm" className="gap-1.5">
                View Changes
              </Button>
            }
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPublishing}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            {isPublishing ? "Publishing..." : "Publish to Disk"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create PublishHistory.tsx**

```typescript
// src/components/editor/PublishHistory.tsx
"use client";

import { useState } from "react";
import { History, RotateCcw, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfigStore } from "@/store/configStore";
import { usePublish } from "@/hooks/usePublish";
import type { PublishSnapshot } from "@/types";

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

function SnapshotItem({
  snapshot,
  onRollback,
}: {
  snapshot: PublishSnapshot;
  onRollback: (snapshot: PublishSnapshot) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm font-medium hover:text-foreground"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            {formatTimestamp(snapshot.timestamp)}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {snapshot.filesWritten.map((f) => (
            <Badge key={f} variant="secondary" className="text-xs">
              {f}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRollback(snapshot)}
            className="gap-1 text-xs"
          >
            <RotateCcw className="h-3 w-3" />
            Rollback
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{snapshot.summary}</p>
      {expanded && (
        <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs">
          {JSON.stringify(JSON.parse(snapshot.snapshot), null, 2)}
        </pre>
      )}
    </div>
  );
}

export function PublishHistory() {
  const publishHistory = useConfigStore((s) => s.publishHistory);
  const clearPublishHistory = useConfigStore((s) => s.clearPublishHistory);
  const importFromJson = useConfigStore((s) => s.importFromJson);
  const { publish } = usePublish();

  const handleRollback = async (snapshot: PublishSnapshot) => {
    // 1. Restore the snapshot to the store
    importFromJson(snapshot.snapshot);

    // 2. Re-publish to disk
    await publish();
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <History className="h-3.5 w-3.5" />
          History
          {publishHistory.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
              {publishHistory.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Publish History
          </SheetTitle>
          <SheetDescription>
            View previous publishes and rollback to a previous version.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {publishHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
              <History className="h-8 w-8" />
              <p>No publish history yet</p>
              <p className="text-xs">Publish your config to see history here.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearPublishHistory}
                  className="gap-1 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear History
                </Button>
              </div>
              {publishHistory.map((snapshot) => (
                <SnapshotItem
                  key={snapshot.id}
                  snapshot={snapshot}
                  onRollback={handleRollback}
                />
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/PublishButton.tsx src/components/editor/PublishDialog.tsx src/components/editor/PublishHistory.tsx
git commit -m "feat: add PublishDialog, PublishHistory, and PublishButton components"
```

---

## Task 8: Wire publish UI into DualModeEditor and add "Load from Disk"

**Files:**
- Modify: `src/components/editor/DualModeEditor.tsx`
- Modify: `src/components/editor/ImportExportButtons.tsx`
- Modify: `src/lib/configReader.ts`

- [ ] **Step 1: Update DualModeEditor.tsx to include PublishDialog and PublishHistory**

Add imports for `PublishDialog` and `PublishHistory` at the top of `DualModeEditor.tsx`, and add them to the header button area (next to the existing Save and Diff buttons).

In the header `<div className="flex items-center gap-2">` section, add the PublishDialog and PublishHistory buttons alongside the existing Diff and Save buttons. The PublishDialog replaces the simple Save button for disk writes, while the Save button remains for in-memory snapshot saves.

- [ ] **Step 2: Add "Load from Disk" button to ImportExportButtons.tsx**

Add a button that calls `GET /api/config` to load config from disk and import it into the store. This replaces the mock data flow with real file reading.

- [ ] **Step 3: Update configReader.ts to use the API route**

Replace the mock `readProviders()` function with an API call to `GET /api/config` that reads both config files and returns the merged result.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/DualModeEditor.tsx src/components/editor/ImportExportButtons.tsx src/lib/configReader.ts
git commit -m "feat: wire publish UI into editor and add Load from Disk"
```

---

## Task 9: Update the dashboard page to load config on startup

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add config loading on app startup**

Update the dashboard page to call the config API on mount and populate the store with real config data (falling back to mock data if the API is unavailable).

- [ ] **Step 2: Verify the full flow works**

Start the dev server and test:
1. App loads with mock data (no config files on disk yet)
2. Click "Load from Disk" — should show empty or real config
3. Make changes, click "Publish" — should write to disk
4. Click "History" — should show the publish record
5. Click "Rollback" — should restore previous state and re-publish

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: load config from disk on app startup with mock fallback"
```

---

## Task 10: Update AGENTS.md and progress.md

**Files:**
- Modify: `AGENTS.md`
- Modify: `.sisyphus/progress.md`

- [ ] **Step 1: Update AGENTS.md Phase 4 status**

Change Phase 4 from `🔲 TODO` to `✅ Complete` and add a summary of what was built.

- [ ] **Step 2: Update progress.md with Phase 4 details**

Add a Phase 4 section documenting:
- New files created
- Modified files
- New dependencies (jsonc-parser)
- New API routes
- Architecture decisions (JSONC preservation, localStorage history, API routes for file I/O)
- Build status

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md .sisyphus/progress.md
git commit -m "docs: update AGENTS.md and progress.md for Phase 4 completion"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** Each Phase 4 feature (write-to-disk, publish history, rollback, JSONC preservation) has a task
- [ ] **Placeholder scan:** No TBD, TODO, or "implement later" in any step
- [ ] **Type consistency:** PublishSnapshot type used consistently across store, hooks, and components
- [ ] **API route safety:** File paths are constructed from `os.homedir()`, not user input
- [ ] **Error handling:** All API calls have try/catch with user-facing toast messages
- [ ] **JSONC preservation:** jsonc-parser modify() used for .jsonc files, JSON.stringify for .json files
- [ ] **History limits:** Publish history capped at 50 entries, persisted to localStorage
