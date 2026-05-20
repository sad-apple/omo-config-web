"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Copy } from "lucide-react";
import { toast } from "sonner";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  const copyError = () => {
    navigator.clipboard.writeText(error.message);
    toast.success("Error message copied to clipboard");
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. You can try reloading the page.
          </p>
          {error.message && (
            <div className="flex items-center gap-2 rounded-md bg-muted p-3">
              <code className="text-xs text-destructive flex-1 break-all">
                {error.message}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={copyError}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
