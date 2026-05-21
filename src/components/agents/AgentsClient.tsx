"use client";

import * as React from "react";
import { useCallback } from "react";
import { useConfigStore } from "@/store/configStore";
import { DualModeEditor } from "@/components/editor/DualModeEditor";
import { AgentList } from "@/components/agents/AgentList";
import { AgentConfigSheet } from "@/components/agents/AgentConfigSheet";
import { toast } from "sonner";

export function AgentsClient() {
  const [selectedAgentKey, setSelectedAgentKey] = React.useState<string | null>(null);
  const agents = useConfigStore((state) => state.agents);
  const providers = useConfigStore((state) => state.providers);
  const categories = useConfigStore((state) => state.categories);
  const updateAgent = useConfigStore((state) => state.updateAgent);
  const exportToJson = useConfigStore((state) => state.exportToJson);
  const importFromJson = useConfigStore((state) => state.importFromJson);

  const handleJsonChange = useCallback((value: object) => {
    importFromJson(JSON.stringify(value));
  }, [importFromJson]);

  const selectedAgent = selectedAgentKey ? agents[selectedAgentKey] : null;

  const handleSave = (agentKey: string, agent: typeof agents[string]) => {
    updateAgent(agentKey, agent);
    toast.success(`Agent "${agentKey}" saved`);
  };

  const jsonValue = React.useMemo(() => {
    try {
      return JSON.parse(exportToJson());
    } catch {
      return { agents: {}, categories: {}, providers: {} };
    }
  }, [exportToJson]);

  return (
    <>
      <DualModeEditor jsonValue={jsonValue} title="Agents" onJsonChange={handleJsonChange}>
        <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
          <div className="mx-auto w-full max-w-6xl px-6 py-8">
            <div className="mb-2">
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                OMO built-in agents and their assigned models. Click an agent to edit.
              </p>
            </div>
            <AgentList
              agents={agents}
              onEditAgent={setSelectedAgentKey}
            />
          </div>
        </div>
      </DualModeEditor>

      {selectedAgent && (
        <AgentConfigSheet
          open={!!selectedAgentKey}
          onOpenChange={(open) => {
            if (!open) setSelectedAgentKey(null);
          }}
          agent={selectedAgent}
          agentKey={selectedAgentKey!}
          providers={providers}
          categories={categories}
          onSave={handleSave}
        />
      )}
    </>
  );
}
