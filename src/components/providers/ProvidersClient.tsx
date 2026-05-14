"use client";

import { DualModeEditor } from "@/components/editor/DualModeEditor";
import { ProviderList } from "@/components/providers/ProviderList";
import type { Provider } from "@/lib/configReader";

interface ProvidersClientProps {
  providers: Provider[];
}

export function ProvidersClient({ providers }: ProvidersClientProps) {
  return (
    <DualModeEditor
      jsonValue={{ providers }}
      title="Providers"
    >
      <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-2">
            <p className="text-sm text-muted-foreground">
              Manage AI model providers configured in opencode.json
            </p>
          </div>
          <ProviderList providers={providers} />
        </div>
      </div>
    </DualModeEditor>
  );
}
