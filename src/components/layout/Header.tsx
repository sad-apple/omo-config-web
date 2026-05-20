"use client";

import { ImportExportButtons } from "@/components/editor/ImportExportButtons";
import { PresetSelector } from "@/components/editor/PresetSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* Spacer for mobile hamburger */}
      <div className="h-9 w-9 lg:hidden" />

      <div className="flex flex-1 items-center gap-2">
        <h1 className="text-sm font-medium text-muted-foreground lg:text-base">
          OMO Configuration Manager
        </h1>
      </div>

      <PresetSelector />

      <ThemeToggle />
      <ImportExportButtons />
    </header>
  );
}
