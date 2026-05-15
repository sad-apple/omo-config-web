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
import { Layers, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Provider color map (matches DraggableAgentList) ─────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  "alibaba-coding-plan-cn":
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "zhipuai-coding-plan":
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  openai: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  anthropic:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  google: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  ollama: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

function getProviderColor(provider: string): string {
  return (
    PROVIDER_COLORS[provider] ??
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
  );
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

// ─── Props ───────────────────────────────────────────────────────────────────

interface DraggableCategoryListProps {
  assignedCategoryKeys: string[];
  onReorder: (newOrder: string[]) => void;
  onRemove: (categoryKey: string) => void;
}

// ─── Sortable Category Item ──────────────────────────────────────────────────

interface SortableCategoryItemProps {
  categoryKey: string;
  categoryName: string;
  model: string;
  variant?: string;
  description?: string;
  onRemove: (categoryKey: string) => void;
}

function SortableCategoryItem({
  categoryKey,
  categoryName,
  model,
  variant,
  description,
  onRemove,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categoryKey });

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

      {/* Category icon */}
      <Layers className="h-4 w-4 flex-shrink-0 text-muted-foreground" />

      {/* Category info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium capitalize">
            {categoryName}
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
        {description && (
          <p className="truncate text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(categoryKey)}
        aria-label={`Remove ${categoryName}`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DraggableCategoryList({
  assignedCategoryKeys,
  onReorder,
  onRemove,
}: DraggableCategoryListProps) {
  const categories = useConfigStore((state) => state.categories);

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

    const oldIndex = assignedCategoryKeys.indexOf(active.id as string);
    const newIndex = assignedCategoryKeys.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(assignedCategoryKeys, oldIndex, newIndex);
    onReorder(newOrder);
  };

  // Empty state
  if (assignedCategoryKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-10 text-center">
        <Layers className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No categories assigned. Add categories from the pool.
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
        items={assignedCategoryKeys}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {assignedCategoryKeys.map((key) => {
            const category = categories[key];
            if (!category) return null;
            return (
              <SortableCategoryItem
                key={key}
                categoryKey={key}
                categoryName={category.name}
                model={category.model}
                variant={category.variant}
                description={category.description}
                onRemove={onRemove}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
