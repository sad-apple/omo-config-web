"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Agent, Category, Provider } from "@/types";
import { AgentConfigForm } from "@/components/forms/AgentConfigForm";

interface AgentConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
  agentKey: string;
  providers: Record<string, Provider>;
  categories: Record<string, Category>;
  onSave: (agentKey: string, agent: Agent) => void;
}

export function AgentConfigSheet({
  open,
  onOpenChange,
  agent,
  agentKey,
  providers,
  categories,
  onSave,
}: AgentConfigSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[640px] sm:w-[720px]">
        <SheetHeader className="px-1">
          <SheetTitle className="capitalize">{agentKey} Configuration</SheetTitle>
          <SheetDescription>
            Configure the model, fallbacks, thinking mode, and other settings for this agent.
          </SheetDescription>
        </SheetHeader>
        <div className="h-[calc(100vh-8rem)] overflow-auto px-1 py-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">基本配置</TabsTrigger>
              <TabsTrigger value="behavior">行为</TabsTrigger>
              <TabsTrigger value="params">参数</TabsTrigger>
              <TabsTrigger value="advanced">高级</TabsTrigger>
            </TabsList>
            <AgentConfigForm
              agent={agent}
              agentKey={agentKey}
              providers={providers}
              categories={categories}
              onSave={(key, updatedAgent) => {
                onSave(key, updatedAgent);
                onOpenChange(false);
              }}
              onCancel={() => onOpenChange(false)}
            />
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
