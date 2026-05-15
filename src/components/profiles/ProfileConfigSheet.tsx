"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useConfigStore } from "@/store/configStore";
import type { ConfigProfile } from "@/types";

interface ProfileConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileKey: string | null;
}

export function ProfileConfigSheet({
  open,
  onOpenChange,
  profileKey,
}: ProfileConfigSheetProps) {
  const configProfiles = useConfigStore((state) => state.configProfiles);
  const createProfile = useConfigStore((state) => state.createProfile);
  const updateProfile = useConfigStore((state) => state.updateProfile);

  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);

  const isEditing = profileKey !== null;

  useEffect(() => {
    if (open && profileKey && configProfiles[profileKey]) {
      const profile = configProfiles[profileKey];
      setName(profile.name);
      setEnabled(profile.enabled);
    } else if (open && !profileKey) {
      setName("");
      setEnabled(true);
    }
  }, [open, profileKey, configProfiles]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // Check for duplicate name (only when creating, or when renaming to a different key)
    if (!isEditing || (isEditing && trimmedName !== profileKey)) {
      if (configProfiles[trimmedName]) {
        alert(`A profile named "${trimmedName}" already exists.`);
        return;
      }
    }

    if (isEditing && profileKey) {
      updateProfile(profileKey, {
        name: trimmedName,
        enabled,
      });
    } else {
      const newProfile: ConfigProfile = {
        name: trimmedName,
        enabled,
        agents: [],
        categories: [],
      };
      createProfile(newProfile);
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader className="px-1">
          <SheetTitle>
            {isEditing ? `Edit Profile: ${profileKey}` : "Create Profile"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Modify the profile settings below."
              : "Create a new config profile to group agents and categories."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-1 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-name">Profile Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Profile"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="profile-enabled">Enabled</Label>
            <Switch
              id="profile-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
