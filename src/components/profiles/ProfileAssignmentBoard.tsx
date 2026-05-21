"use client";

import * as React from "react";
import { useConfigStore } from "@/store/configStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DraggableAgentList } from "@/components/profiles/DraggableAgentList";
import { DraggableCategoryList } from "@/components/profiles/DraggableCategoryList";
import { BackgroundTaskConfigForm } from "@/components/forms/BackgroundTaskConfigForm";
import { RuntimeFallbackConfigForm } from "@/components/forms/RuntimeFallbackConfigForm";
import { Bot, Layers, Plus, UserPlus } from "lucide-react";

interface ProfileAssignmentBoardProps {
  profileKey: string;
}

export function ProfileAssignmentBoard({ profileKey }: ProfileAssignmentBoardProps) {
  const profile = useConfigStore((state) => state.configProfiles[profileKey]);
  const agents = useConfigStore((state) => state.agents);
  const categories = useConfigStore((state) => state.categories);
  const backgroundTask = useConfigStore((state) => state.backgroundTask);
  const runtimeFallback = useConfigStore((state) => state.runtimeFallback);

  const addAgentToProfile = useConfigStore((state) => state.addAgentToProfile);
  const removeAgentFromProfile = useConfigStore((state) => state.removeAgentFromProfile);
  const addCategoryToProfile = useConfigStore((state) => state.addCategoryToProfile);
  const removeCategoryFromProfile = useConfigStore((state) => state.removeCategoryFromProfile);
  const updateProfile = useConfigStore((state) => state.updateProfile);
  const setBackgroundTask = useConfigStore((state) => state.setBackgroundTask);
  const setRuntimeFallback = useConfigStore((state) => state.setRuntimeFallback);

  // Compute unassigned agents and categories
  const assignedAgentKeys = React.useMemo(() => profile?.agents ?? [], [profile?.agents]);
  const assignedCategoryKeys = React.useMemo(() => profile?.categories ?? [], [profile?.categories]);

  const unassignedAgents = React.useMemo(() => {
    return Object.keys(agents).filter((key) => !assignedAgentKeys.includes(key));
  }, [agents, assignedAgentKeys]);

  const unassignedCategories = React.useMemo(() => {
    return Object.keys(categories).filter((key) => !assignedCategoryKeys.includes(key));
  }, [categories, assignedCategoryKeys]);

  // Handlers for reordering
  const handleAgentReorder = React.useCallback(
    (newOrder: string[]) => {
      updateProfile(profileKey, { agents: newOrder });
    },
    [profileKey, updateProfile]
  );

  const handleCategoryReorder = React.useCallback(
    (newOrder: string[]) => {
      updateProfile(profileKey, { categories: newOrder });
    },
    [profileKey, updateProfile]
  );

  // Handlers for removing
  const handleAgentRemove = React.useCallback(
    (agentKey: string) => {
      removeAgentFromProfile(profileKey, agentKey);
    },
    [profileKey, removeAgentFromProfile]
  );

  const handleCategoryRemove = React.useCallback(
    (categoryKey: string) => {
      removeCategoryFromProfile(profileKey, categoryKey);
    },
    [profileKey, removeCategoryFromProfile]
  );

  // Handlers for adding
  const handleAddAgent = React.useCallback(
    (agentKey: string) => {
      addAgentToProfile(profileKey, agentKey);
    },
    [profileKey, addAgentToProfile]
  );

  const handleAddCategory = React.useCallback(
    (categoryKey: string) => {
      addCategoryToProfile(profileKey, categoryKey);
    },
    [profileKey, addCategoryToProfile]
  );

  // If profile doesn't exist, show placeholder
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-16 text-center">
        <UserPlus className="mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Select a profile to manage assignments
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ─── Left Column: Available Pool ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Available Pool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Agents Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Agents
              </h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                {unassignedAgents.length}
              </Badge>
            </div>
            {unassignedAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">
                All assigned
              </p>
            ) : (
              <div className="space-y-1.5">
                {unassignedAgents.map((agentKey) => {
                  const agent = agents[agentKey];
                  return (
                    <div
                      key={agentKey}
                      className="flex items-center justify-between rounded-md border border-border/50 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/60"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate">
                          {agent?.name ?? agentKey}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleAddAgent(agentKey)}
                        title={`Add ${agent?.name ?? agentKey}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Categories Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Categories
              </h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                {unassignedCategories.length}
              </Badge>
            </div>
            {unassignedCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">
                All assigned
              </p>
            ) : (
              <div className="space-y-1.5">
                {unassignedCategories.map((categoryKey) => {
                  const category = categories[categoryKey];
                  return (
                    <div
                      key={categoryKey}
                      className="flex items-center justify-between rounded-md border border-border/50 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/60"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate">
                          {category?.name ?? categoryKey}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleAddCategory(categoryKey)}
                        title={`Add ${category?.name ?? categoryKey}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Center Column: Profile Assignments ──────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Profile Assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Assigned Agents */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Assigned Agents
              </h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                {assignedAgentKeys.length}
              </Badge>
            </div>
            <DraggableAgentList
              assignedAgentKeys={assignedAgentKeys}
              onReorder={handleAgentReorder}
              onRemove={handleAgentRemove}
            />
          </div>

          <Separator />

          {/* Assigned Categories */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Assigned Categories
              </h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                {assignedCategoryKeys.length}
              </Badge>
            </div>
            <DraggableCategoryList
              assignedCategoryKeys={assignedCategoryKeys}
              onReorder={handleCategoryReorder}
              onRemove={handleCategoryRemove}
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Right Column: Runtime Config ────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Runtime Config
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <BackgroundTaskConfigForm
            value={backgroundTask}
            onChange={setBackgroundTask}
          />

          <Separator />

          <RuntimeFallbackConfigForm
            value={runtimeFallback}
            onChange={setRuntimeFallback}
          />
        </CardContent>
      </Card>
    </div>
  );
}
