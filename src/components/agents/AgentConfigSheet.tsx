"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Agent, Provider } from "@/types";
import { AgentConfigForm } from "@/components/forms/AgentConfigForm";

interface AgentConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
  agentKey: string;
  providers: Record<string, Provider>;
  onSave: (agentKey: string, agent: Agent) => void;
}

export function AgentConfigSheet({
  open,
  onOpenChange,
  agent,
  agentKey,
  providers,
  onSave,
}: AgentConfigSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:w-[540px]">
        <SheetHeader className="px-1">
          <SheetTitle className="capitalize">{agentKey} Configuration</SheetTitle>
          <SheetDescription>
            Configure the model, fallbacks, thinking mode, and other settings for this agent.
          </SheetDescription>
        </SheetHeader>
        <div className="h-[calc(100vh-8rem)] overflow-auto px-1 py-4">
          <AgentConfigForm
            agent={agent}
            agentKey={agentKey}
            providers={providers}
            onSave={(key, updatedAgent) => {
              onSave(key, updatedAgent);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
