"use client";

import * as React from "react";
import { useConfigStore } from "@/store/configStore";
import { DualModeEditor } from "@/components/editor/DualModeEditor";
import { ProfileConfigSheet } from "@/components/profiles/ProfileConfigSheet";
import { ProfileAssignmentBoard } from "@/components/profiles/ProfileAssignmentBoard";
import { TemplateGallery } from "@/components/profiles/TemplateGallery";
import type { ConfigTemplate } from "@/lib/config-templates";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Play, Bot, Layers, ChevronLeft, Sparkles } from "lucide-react";

export function ProfilesClient() {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingProfileKey, setEditingProfileKey] = React.useState<string | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = React.useState(false);
  const [selectedProfileKey, setSelectedProfileKey] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const configProfiles = useConfigStore((state) => state.configProfiles);
  const activeProfileId = useConfigStore((state) => state.activeProfileId);
  const deleteProfile = useConfigStore((state) => state.deleteProfile);
  const setActiveProfile = useConfigStore((state) => state.setActiveProfile);
  const setLastSavedSnapshot = useConfigStore((state) => state.setLastSavedSnapshot);
  const exportToJson = useConfigStore((state) => state.exportToJson);
  const agents = useConfigStore((state) => state.agents);
  const providers = useConfigStore((state) => state.providers);
  const backgroundTask = useConfigStore((state) => state.backgroundTask);
  const runtimeFallback = useConfigStore((state) => state.runtimeFallback);

  const handleCreate = () => {
    setEditingProfileKey(null);
    setSheetOpen(true);
  };

  const handleEdit = (key: string) => {
    setEditingProfileKey(key);
    setSheetOpen(true);
  };

  const handleDelete = (key: string) => {
    setDeleteTarget(key);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteProfile(deleteTarget);
      setLastSavedSnapshot();
      if (selectedProfileKey === deleteTarget) {
        setSelectedProfileKey(null);
      }
      toast.success(`Profile "${deleteTarget}" deleted`);
      setDeleteTarget(null);
    }
  };

  const handleSetActive = (key: string) => {
    setActiveProfile(key);
    setLastSavedSnapshot();
    toast.success(`Profile "${key}" set as active`);
  };

  const jsonValue = React.useMemo(() => {
    try {
      return JSON.parse(exportToJson());
    } catch {
      return { agents: {}, categories: {}, providers: {} };
    }
  }, [agents, providers, configProfiles, backgroundTask, runtimeFallback, exportToJson]);

  const profileEntries = Object.entries(configProfiles);
  const selectedProfile = selectedProfileKey ? configProfiles[selectedProfileKey] : null;

  return (
    <>
      <DualModeEditor jsonValue={jsonValue} title="Config Profiles">
        <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
          <div className="mx-auto w-full max-w-6xl px-6 py-8">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {selectedProfileKey && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedProfileKey(null)}
                    title="Back to profile list"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {selectedProfile ? selectedProfile.name : "Config Profiles"}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {selectedProfile
                      ? "Manage agent and category assignments for this profile"
                      : "Manage configuration profiles for agent and category assignments"}
                  </p>
                </div>
              </div>
              {!selectedProfileKey && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" onClick={() => setTemplateDialogOpen(true)} className="gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    From Template
                  </Button>
                  <Button onClick={handleCreate} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Create Profile
                  </Button>
                </div>
              )}
            </div>

            {selectedProfileKey ? (
              /* ─── Profile Detail View ─── */
              <ProfileAssignmentBoard profileKey={selectedProfileKey} />
            ) : (
              /* ─── Profile Cards Grid ─── */
              profileEntries.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">
                    No config profiles yet. Create one to group agents and categories.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profileEntries.map(([key, profile]) => (
                    <Card
                      key={key}
                      className="transition-shadow hover:shadow-md cursor-pointer"
                      onClick={() => setSelectedProfileKey(key)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{profile.name}</CardTitle>
                            {activeProfileId === key && (
                              <span
                                className="h-2 w-2 rounded-full bg-green-500"
                                title="Active profile"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              variant={profile.enabled ? "default" : "secondary"}
                              className={`text-xs ${
                                profile.enabled
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              }`}
                            >
                              {profile.enabled ? "Active" : "Disabled"}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Agent Count */}
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground">
                            {profile.agents.length} agent{profile.agents.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Category Count */}
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground">
                            {profile.categories.length} categor{profile.categories.length !== 1 ? "ies" : "y"}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                          {activeProfileId !== key && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleSetActive(key)}
                              title="Set as active"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(key)}
                            title="Edit profile"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(key)}
                            title="Delete profile"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </DualModeEditor>

      <ProfileConfigSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSheetOpen(false);
            setEditingProfileKey(null);
          }
        }}
        profileKey={editingProfileKey}
      />
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Select a template to pre-populate your configuration with agents, categories, and profiles.
            </DialogDescription>
          </DialogHeader>
          <TemplateGallery
            onSelect={(template: ConfigTemplate) => {
              const store = useConfigStore.getState();
              store.setAgents({ ...store.agents, ...template.agents });
              store.setCategories({ ...store.categories, ...template.categories });
              Object.entries(template.configProfiles).forEach(([, profile]) => {
                store.createProfile(profile);
              });
              store.setLastSavedSnapshot();
              setTemplateDialogOpen(false);
              toast.success(`Template "${template.name}" applied`);
            }}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete profile "{deleteTarget}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
