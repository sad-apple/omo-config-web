"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Trash2 } from "lucide-react";
import type { Provider } from "@/types";

interface ProviderConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerKey: string;
  provider: Provider | null; // null = adding new
  onSave: (key: string, provider: Provider) => void;
  onDelete?: (key: string) => void;
}

export function ProviderConfigSheet({
  open,
  onOpenChange,
  providerKey: initialKey,
  provider,
  onSave,
  onDelete,
}: ProviderConfigSheetProps) {
  const isEditing = provider !== null;

  const [key, setKey] = React.useState(initialKey);
  const [name, setName] = React.useState(provider?.name ?? "");
  const [npm, setNpm] = React.useState(provider?.npm ?? "");
  const [baseURL, setBaseURL] = React.useState(provider?.options?.baseURL ?? "");
  const [apiKey, setApiKey] = React.useState(provider?.options?.apiKey ?? "");

  // Reset form when sheet opens or provider changes
  React.useEffect(() => {
    if (open) {
      setKey(initialKey);
      setName(provider?.name ?? "");
      setNpm(provider?.npm ?? "");
      setBaseURL(provider?.options?.baseURL ?? "");
      setApiKey(provider?.options?.apiKey ?? "");
    }
  }, [open, initialKey, provider]);

  const handleSave = () => {
    const trimmedKey = key.trim();
    if (!trimmedKey || !name.trim() || !npm.trim()) return;

    const updatedProvider: Provider = {
      name: name.trim(),
      npm: npm.trim(),
      options: {
        ...(baseURL.trim() && { baseURL: baseURL.trim() }),
        ...(apiKey.trim() && { apiKey: apiKey.trim() }),
      },
      models: provider?.models ?? {},
    };

    onSave(trimmedKey, updatedProvider);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (onDelete && initialKey) {
      onDelete(initialKey);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:w-[540px]">
        <SheetHeader className="px-1">
          <SheetTitle>{isEditing ? "Edit Provider" : "Add Provider"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Modify provider configuration and API settings."
              : "Add a new AI provider to your configuration."}
          </SheetDescription>
        </SheetHeader>

        <div className="h-[calc(100vh-8rem)] overflow-auto px-1 py-4">
          <div className="space-y-6">
            {/* Provider Key */}
            <div className="space-y-2">
              <Label htmlFor="provider-key">Provider Key</Label>
              <Input
                id="provider-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. openai, anthropic, siliconflow"
                disabled={isEditing}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier used in config files. Cannot be changed after creation.
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="provider-name">Display Name</Label>
              <Input
                id="provider-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. OpenAI, Anthropic"
              />
            </div>

            {/* NPM Package */}
            <div className="space-y-2">
              <Label htmlFor="provider-npm">NPM Package</Label>
              <Input
                id="provider-npm"
                value={npm}
                onChange={(e) => setNpm(e.target.value)}
                placeholder="e.g. @ai-sdk/openai"
              />
              <p className="text-xs text-muted-foreground">
                The AI SDK provider package name.
              </p>
            </div>

            {/* Base URL */}
            <div className="space-y-2">
              <Label htmlFor="provider-baseurl">Base URL (optional)</Label>
              <Input
                id="provider-baseurl"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
              <p className="text-xs text-muted-foreground">
                Custom API endpoint. Leave empty for default.
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="provider-apikey">API Key (optional)</Label>
              <Input
                id="provider-apikey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <p className="text-xs text-muted-foreground">
                Stored in config file. Use environment variables for production.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              {isEditing && onDelete ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!key.trim() || !name.trim() || !npm.trim()}
                >
                  <Save className="mr-1 h-4 w-4" />
                  {isEditing ? "Save Changes" : "Add Provider"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
