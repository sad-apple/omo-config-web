"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useConfigStore } from "@/store/configStore";
import { parseModelRef } from "@/lib/model-ref";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { getProviderColor, getProviderLabel } from "@/lib/provider-colors";

// ─── Props ───────────────────────────────────────────────────────────────────

interface DraggableAgentListProps {
  assignedAgentKeys: string[];
  onReorder: (newOrder: string[]) => void;
  onRemove: (agentKey: string) => void;
}

// ─── Sortable Agent Item ─────────────────────────────────────────────────────

interface SortableAgentItemProps {
  agentKey: string;
  agentName: string;
  model: string;
  variant?: string;
  onRemove: (agentKey: string) => void;
}

function SortableAgentItem({
  agentKey,
  agentName,
  model,
  variant,
  onRemove,
}: SortableAgentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: agentKey });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const parsed = parseModelRef(model);
  const provider = parsed?.provider ?? "unknown";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-shadow",
        "hover:shadow-sm",
        isDragging && "shadow-lg opacity-90 ring-2 ring-primary/20"
      )}
    >
      {/* Drag handle */}
      <button
        className="flex-shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Agent icon */}
      <Bot className="h-4 w-4 flex-shrink-0 text-muted-foreground" />

      {/* Agent info */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium capitalize">
          {agentName}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "flex-shrink-0 text-xs",
            getProviderColor(provider)
          )}
        >
          {getProviderLabel(provider)}
        </Badge>
        {variant && (
          <Badge variant="secondary" className="flex-shrink-0 text-xs">
            {variant}
          </Badge>
        )}
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(agentKey)}
        aria-label={`Remove ${agentName}`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DraggableAgentList({
  assignedAgentKeys,
  onReorder,
  onRemove,
}: DraggableAgentListProps) {
  const agents = useConfigStore((state) => state.agents);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = assignedAgentKeys.indexOf(active.id as string);
    const newIndex = assignedAgentKeys.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(assignedAgentKeys, oldIndex, newIndex);
    onReorder(newOrder);
  };

  // Empty state
  if (assignedAgentKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-10 text-center">
        <Bot className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No agents assigned. Add agents from the pool.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={assignedAgentKeys}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {assignedAgentKeys.map((key) => {
            const agent = agents[key];
            if (!agent) return null;
            return (
              <SortableAgentItem
                key={key}
                agentKey={key}
                agentName={agent.name}
                model={agent.model}
                variant={agent.variant}
                onRemove={onRemove}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
