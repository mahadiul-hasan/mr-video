"use client";

import { ErrorMessage } from "@/components/site/error-message";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorMessage
      error={error}
      reset={reset}
      title="Error loading tags"
      description="Failed to load tags. Please try again."
    />
  );
}
