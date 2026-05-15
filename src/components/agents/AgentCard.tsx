import type { Agent } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Brain, Cpu, Layers, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseModelRef } from "@/lib/model-ref";

const PROVIDER_COLORS: Record<string, string> = {
  "alibaba-coding-plan-cn": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "zhipuai-coding-plan": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  openai: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  anthropic: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  google: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  ollama: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

function getProviderLabel(provider: string): string {
  const labels: Record<string, string> = {
    "alibaba-coding-plan-cn": "Alibaba",
    "zhipuai-coding-plan": "ZhipuAI",
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    ollama: "Ollama",
  };
  return labels[provider] ?? provider;
}

interface AgentCardProps {
  agentKey: string;
  agent: Agent;
  onEdit?: () => void;
  isDirty?: boolean;
}

export function AgentCard({ agentKey, agent, onEdit, isDirty }: AgentCardProps) {
  const parsed = parseModelRef(agent.model);
  const provider = parsed?.provider || "unknown";

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg capitalize">{agentKey}</CardTitle>
            {isDirty && (
              <span className="h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {agent.variant && (
              <Badge variant="secondary" className="text-xs">
                {agent.variant}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`text-xs ${getProviderColor(provider)}`}
            >
              {getProviderLabel(provider)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Assigned Model */}
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-mono text-muted-foreground">
            {agent.model}
          </span>
        </div>

        {/* Thinking Mode */}
        {agent.thinking?.type === "enabled" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-sm text-amber-600 dark:text-amber-400">
                    Thinking
                    {agent.thinking.budgetTokens && ` · ${agent.thinking.budgetTokens}`}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Extended thinking mode enabled</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Fallback Models */}
        {agent.fallback_models && agent.fallback_models.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {agent.fallback_models.length} fallback{agent.fallback_models.length > 1 ? "s" : ""}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">Fallback models:</p>
                  {agent.fallback_models.map((fb, i) => (
                    <p key={i} className="font-mono text-xs">
                      {typeof fb === "string" ? fb : fb.model}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
