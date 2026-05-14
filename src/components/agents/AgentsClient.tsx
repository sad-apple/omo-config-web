"use client";

import { DualModeEditor } from "@/components/editor/DualModeEditor";
import { AgentList } from "@/components/agents/AgentList";

export function AgentsClient() {
  return (
    <DualModeEditor
      jsonValue={{ agents: [] }}
      title="Agents"
    >
      <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
        <div className="mx-auto w-full max-w-6xl px-6 py-8">
          <div className="mb-2">
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              OMO built-in agents and their assigned models.
            </p>
          </div>
          <AgentList />
        </div>
      </div>
    </DualModeEditor>
  );
}
