"use client";

import { DualModeEditor } from "@/components/editor/DualModeEditor";
import { useCallback, useState } from "react";
import { useConfigStore } from "@/store/configStore";

import { ProviderList } from "@/components/providers/ProviderList";
import { ProviderConfigSheet } from "@/components/providers/ProviderConfigSheet";
import type { Provider } from "@/types";

interface ProvidersClientProps {
  providers: Record<string, Provider>;
}

export function ProvidersClient({ providers }: ProvidersClientProps) {
  const setProviders = useConfigStore((s) => s.setProviders);
  const addProvider = useConfigStore((s) => s.addProvider);
  const updateProvider = useConfigStore((s) => s.updateProvider);
  const deleteProvider = useConfigStore((s) => s.deleteProvider);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const editingProvider = editingKey ? providers[editingKey] ?? null : null;

  const handleJsonChange = useCallback((value: object) => {
    const data = value as Record<string, unknown>;
    setProviders((data.providers ?? {}) as Record<string, import("@/types").Provider>);
  }, [setProviders]);

  const handleAddProvider = useCallback(() => {
    setEditingKey(null);
    setSheetOpen(true);
  }, []);

  const handleEditProvider = useCallback((providerKey: string) => {
    setEditingKey(providerKey);
    setSheetOpen(true);
  }, []);

  const handleSaveProvider = useCallback((key: string, provider: Provider) => {
    if (editingKey) {
      // Editing existing provider
      if (key !== editingKey) {
        // Key changed: delete old, add new
        deleteProvider(editingKey);
      }
      updateProvider(key, provider);
    } else {
      // Adding new provider
      addProvider(key, provider);
    }
  }, [editingKey, addProvider, updateProvider, deleteProvider]);

  const handleDeleteProvider = useCallback((key: string) => {
    deleteProvider(key);
  }, [deleteProvider]);

  return (
    <DualModeEditor
      jsonValue={{ providers }}
      title="Providers"
      onJsonChange={handleJsonChange}
    >
      <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-2">
            <p className="text-sm text-muted-foreground">
              Manage AI model providers configured in opencode.json
            </p>
          </div>
          <ProviderList
            providers={providers}
            onAddProvider={handleAddProvider}
            onEditProvider={handleEditProvider}
          />
        </div>
      </div>

      <ProviderConfigSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        providerKey={editingKey ?? ""}
        provider={editingProvider}
        onSave={handleSaveProvider}
        onDelete={editingKey ? handleDeleteProvider : undefined}
      />
    </DualModeEditor>
  );
}
