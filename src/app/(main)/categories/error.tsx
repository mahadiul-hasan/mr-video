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
      title="Error loading categories"
      description="Failed to load categories. Please try again."
    />
  );
}
