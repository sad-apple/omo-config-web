import { AgentCard, type Agent } from "./AgentCard";

const MOCK_AGENTS: Agent[] = [
  {
    name: "sisyphus",
    model: "qwen3.6-plus",
    provider: "alibaba-coding-plan-cn",
    thinking: {
      enabled: true,
      budget: "32K",
    },
    fallbacks: [
      { provider: "zhipuai-coding-plan", model: "glm-5-turbo" },
    ],
    variant: "default",
  },
  {
    name: "oracle",
    model: "glm-5-turbo",
    provider: "zhipuai-coding-plan",
    thinking: {
      enabled: true,
      budget: "16K",
    },
  },
  {
    name: "librarian",
    model: "MiniMax-M2.5",
    provider: "alibaba-coding-plan-cn",
  },
  {
    name: "explore",
    model: "MiniMax-M2.5",
    provider: "alibaba-coding-plan-cn",
    fallbacks: [
      { provider: "zhipuai-coding-plan", model: "glm-5-turbo" },
    ],
  },
];

export function AgentList() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {MOCK_AGENTS.map((agent) => (
        <AgentCard key={agent.name} agent={agent} />
      ))}
    </div>
  );
}
