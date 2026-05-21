"use client";

import * as React from "react";
import { configTemplates, type ConfigTemplate } from "@/lib/config-templates";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  PenTool,
  Minus,
  Layers,
  Bot,
  Sparkles,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Code2,
  PenTool,
  Minus,
  Layers,
};

interface TemplateGalleryProps {
  onSelect: (template: ConfigTemplate) => void;
}

export function TemplateGallery({ onSelect }: TemplateGalleryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {configTemplates.map((template) => {
        const Icon = iconMap[template.icon] || Sparkles;
        const agentCount = Object.keys(template.agents).length;
        const categoryCount = Object.keys(template.categories).length;

        return (
          <Card
            key={template.id}
            className="transition-shadow hover:shadow-md cursor-pointer group"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {agentCount} agent{agentCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {categoryCount} categor{categoryCount !== 1 ? "ies" : "y"}
                </Badge>
                {template.backgroundTask && (
                  <Badge variant="outline" className="text-xs">
                    Background Tasks
                  </Badge>
                )}
                {template.runtimeFallback && (
                  <Badge variant="outline" className="text-xs">
                    Fallback
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                className="w-full gap-1.5"
                onClick={() => onSelect(template)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Use Template
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
