import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface NotFoundMessageProps {
  title?: string;
  description?: string;
  type?: "category" | "tag" | "search" | "video" | "page";
}

export function NotFoundMessage({
  title,
  description,
  type = "page",
}: NotFoundMessageProps) {
  const defaultMessages = {
    category: {
      title: "Category not found",
      description:
        "The category you're looking for doesn't exist or has been removed.",
    },
    tag: {
      title: "Tag not found",
      description:
        "The tag you're looking for doesn't exist or has been removed.",
    },
    search: {
      title: "Search page not found",
      description: "The search page could not be found or has been removed.",
    },
    video: {
      title: "Video not found",
      description:
        "The video you're looking for doesn't exist or has been removed.",
    },
    page: {
      title: "Page not found",
      description:
        "The page you're looking for doesn't exist or has been removed.",
    },
  };

  const defaultMessage = defaultMessages[type];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title || defaultMessage.title}</AlertTitle>
        <AlertDescription>
          {description || defaultMessage.description}
        </AlertDescription>
      </Alert>
    </div>
  );
}
