"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublish } from "@/hooks/usePublish";
import { useIsDirty } from "@/store/configStore";

interface PublishButtonProps {
  className?: string;
}

export function PublishButton({ className }: PublishButtonProps) {
  const isDirty = useIsDirty();
  const { publish, isPublishing } = usePublish();

  return (
    <Button
      size="sm"
      onClick={publish}
      disabled={!isDirty || isPublishing}
      className={className}
    >
      <Upload className="h-3.5 w-3.5" />
      {isPublishing ? "Publishing..." : "Publish to Disk"}
    </Button>
  );
}
