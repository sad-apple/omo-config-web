"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Minus, Pencil } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useConfigStore } from "@/store/configStore";

interface DiffPreviewProps {
  trigger: React.ReactNode;
}

type ChangeKind = "added" | "removed" | "modified";

type SectionKey =
  | "agents"
  | "categories"
  | "providers"
  | "configProfiles"
  | "backgroundTask"
  | "runtimeFallback";

interface ChangeItem {
  key: string;
  kind: ChangeKind;
}

interface SectionDiff {
  key: SectionKey;
  label: string;
  changes: ChangeItem[];
}

const SECTION_META: Record<SectionKey, { label: string; singular: string; plural: string }> = {
  agents: { label: "Agent", singular: "agent", plural: "agents" },
  categories: { label: "Category", singular: "category", plural: "categories" },
  providers: { label: "Provider", singular: "provider", plural: "providers" },
  configProfiles: { label: "Profile", singular: "profile", plural: "profiles" },
  backgroundTask: { label: "Background task", singular: "background task", plural: "background task" },
  runtimeFallback: { label: "Runtime fallback", singular: "runtime fallback", plural: "runtime fallback" },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(value: string): Record<string, unknown> | null {
  if (!value.trim()) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function countText(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function compareEntitySection(key: SectionKey, current: unknown, saved: unknown): SectionDiff {
  const currentValue = isPlainObject(current) ? current : {};
  const savedValue = isPlainObject(saved) ? saved : {};
  const keys = Array.from(new Set([...Object.keys(currentValue), ...Object.keys(savedValue)])).sort();

  const changes = keys.flatMap<ChangeItem>((itemKey) => {
    const inCurrent = Object.prototype.hasOwnProperty.call(currentValue, itemKey);
    const inSaved = Object.prototype.hasOwnProperty.call(savedValue, itemKey);

    if (inCurrent && !inSaved) return [{ key: itemKey, kind: "added" }];
    if (!inCurrent && inSaved) return [{ key: itemKey, kind: "removed" }];

    const currentItem = currentValue[itemKey];
    const savedItem = savedValue[itemKey];
    return JSON.stringify(currentItem) === JSON.stringify(savedItem)
      ? []
      : [{ key: itemKey, kind: "modified" }];
  });

  return {
    key,
    label: SECTION_META[key].label,
    changes,
  };
}

function compareSingleSection(key: SectionKey, current: unknown, saved: unknown): SectionDiff {
  const changes: ChangeItem[] = [];

  if (current == null && saved == null) {
    return { key, label: SECTION_META[key].label, changes };
  }

  if (current == null && saved != null) {
    changes.push({ key: SECTION_META[key].label, kind: "removed" });
  } else if (current != null && saved == null) {
    changes.push({ key: SECTION_META[key].label, kind: "added" });
  } else if (JSON.stringify(current) !== JSON.stringify(saved)) {
    changes.push({ key: SECTION_META[key].label, kind: "modified" });
  }

  return {
    key,
    label: SECTION_META[key].label,
    changes,
  };
}

function buildSummary(sections: SectionDiff[]) {
  const parts = sections.flatMap((section) => {
    const grouped = section.changes.reduce<Record<ChangeKind, number>>(
      (acc, change) => ({ ...acc, [change.kind]: acc[change.kind] + 1 }),
      { added: 0, removed: 0, modified: 0 }
    );

    const { singular, plural } = SECTION_META[section.key];
    const sectionParts: string[] = [];
    if (grouped.added) sectionParts.push(countText(grouped.added, `${singular} added`, `${plural} added`));
    if (grouped.removed) sectionParts.push(countText(grouped.removed, `${singular} removed`, `${plural} removed`));
    if (grouped.modified) sectionParts.push(countText(grouped.modified, `${singular} modified`, `${plural} modified`));

    return sectionParts;
  });

  return parts.length > 0 ? parts.join(", ") : "No differences found";
}

function splitLines(value: string) {
  return value.split("\n");
}

function DiffLine({
  kind,
  label,
  lineNumber,
  text,
}: {
  kind: "same" | ChangeKind;
  label: string;
  lineNumber: number | null;
  text: string;
}) {
  const colorClasses = {
    same: "text-muted-foreground",
    added: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    removed: "bg-red-500/10 text-red-700 dark:text-red-400",
    modified: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  };

  return (
    <div className={`flex items-start gap-3 rounded-md px-3 py-1.5 font-mono text-xs leading-5 ${colorClasses[kind]}`}>
      <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
        {lineNumber ?? ""}
      </span>
      <span className="w-14 shrink-0 uppercase tracking-wide text-muted-foreground">{label}</span>
      <code className="whitespace-pre-wrap break-all">{text || " "}</code>
    </div>
  );
}

export function DiffPreview({ trigger }: DiffPreviewProps) {
  const [open, setOpen] = useState(false);
  const exportToJson = useConfigStore((s) => s.exportToJson);
  const lastSavedSnapshot = useConfigStore((s) => s.lastSavedSnapshot);

  const diffState = useMemo(() => {
    if (!lastSavedSnapshot.trim()) {
      return {
        hasSavedState: false,
        summary: "No saved state to compare",
        sections: [] as SectionDiff[],
        lines: [] as Array<{ kind: "same" | ChangeKind; label: string; lineNumber: number | null; text: string }>,
      };
    }

    const current = parseJson(exportToJson());
    const saved = parseJson(lastSavedSnapshot);

    if (!current || !saved) {
      return {
        hasSavedState: true,
        summary: "Unable to parse configuration JSON",
        sections: [] as SectionDiff[],
        lines: [] as Array<{ kind: "same" | ChangeKind; label: string; lineNumber: number | null; text: string }>,
      };
    }

    const sections: SectionDiff[] = [
      compareEntitySection("agents", current.agents, saved.agents),
      compareEntitySection("categories", current.categories, saved.categories),
      compareEntitySection("providers", current.providers, saved.providers),
      compareEntitySection("configProfiles", current.configProfiles, saved.configProfiles),
      compareSingleSection("backgroundTask", current.backgroundTask, saved.backgroundTask),
      compareSingleSection("runtimeFallback", current.runtimeFallback, saved.runtimeFallback),
    ];

    const currentLines = splitLines(JSON.stringify(current, null, 2));
    const savedLines = splitLines(JSON.stringify(saved, null, 2));
    const lineItems: Array<{ kind: "same" | ChangeKind; label: string; lineNumber: number | null; text: string }> = [];
    const maxLines = Math.max(currentLines.length, savedLines.length);

    for (let index = 0; index < maxLines; index += 1) {
      const currentLine = currentLines[index];
      const savedLine = savedLines[index];
      const lineNumber = index + 1;

      if (currentLine === savedLine) {
        if (currentLine !== undefined) {
          lineItems.push({ kind: "same", label: "=", lineNumber, text: currentLine });
        }
        continue;
      }

      if (savedLine !== undefined) {
        lineItems.push({ kind: "removed", label: "-", lineNumber, text: savedLine });
      }
      if (currentLine !== undefined) {
        lineItems.push({ kind: "added", label: "+", lineNumber, text: currentLine });
      }
    }

    return {
      hasSavedState: true,
      summary: buildSummary(sections),
      sections,
      lines: lineItems,
    };
  }, [exportToJson, lastSavedSnapshot]);

  const activeChanges = diffState.sections.flatMap((section) => section.changes);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex items-center gap-2"
      >
        {trigger}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Diff Preview
            </SheetTitle>
            <SheetDescription>{diffState.summary}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 overflow-hidden">
            {!diffState.hasSavedState ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                No saved state to compare
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {activeChanges.length === 0 ? (
                    <Badge variant="outline">No changes</Badge>
                  ) : (
                    diffState.sections.map((section) =>
                      section.changes.length > 0 ? (
                        <Badge key={section.key} variant="outline">
                          {section.label}: {section.changes.length}
                        </Badge>
                      ) : null
                    )
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  {diffState.sections.map((section) => {
                    if (section.changes.length === 0) return null;

                    return (
                      <div key={section.key} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span>{section.label}</span>
                          <Badge variant="secondary">{section.changes.length}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {section.changes.map((change) => (
                            <Badge
                              key={`${section.key}-${change.key}-${change.kind}`}
                              variant="outline"
                              className={
                                change.kind === "added"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                  : change.kind === "removed"
                                    ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              }
                            >
                              {change.kind === "added" ? (
                                <ArrowUpRight className="mr-1 h-3 w-3" />
                              ) : change.kind === "removed" ? (
                                <ArrowDownRight className="mr-1 h-3 w-3" />
                              ) : (
                                <Minus className="mr-1 h-3 w-3" />
                              )}
                              {change.key}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="text-sm font-medium">Raw JSON diff</div>
                  <div className="max-h-[45vh] overflow-auto rounded-lg border bg-muted/30 p-2">
                    {diffState.lines.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No differences found</div>
                    ) : (
                      diffState.lines.map((line, index) => (
                        <DiffLine key={`${line.kind}-${line.lineNumber ?? "x"}-${index}`} {...line} />
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
