import type { Agent } from "@/types";
import { AgentCard } from "./AgentCard";

interface AgentListProps {
  agents: Record<string, Agent>;
  onEditAgent?: (agentKey: string) => void;
}

export function AgentList({ agents, onEditAgent }: AgentListProps) {
  const agentEntries = Object.entries(agents);

  if (agentEntries.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No agents configured. Import a configuration to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {agentEntries.map(([key, agent]) => (
        <AgentCard
          key={key}
          agentKey={key}
          agent={agent}
          onEdit={onEditAgent ? () => onEditAgent(key) : undefined}
        />
      ))}
    </div>
  );
}
