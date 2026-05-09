"use client";

import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorMessageProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}

export function ErrorMessage({
  error,
  reset,
  title = "Something went wrong",
  description = "Failed to load content. Please try again.",
}: ErrorMessageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>{error.message || description}</p>
          <Button onClick={reset} variant="outline" size="sm">
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
