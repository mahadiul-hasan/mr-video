// components/admin/videos/video-uploader.tsx
"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, X, FileVideo } from "lucide-react";
import { cn } from "@/lib/utils";

type VideoUploaderProps = {
  onFileSelect: (file: File | null) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  disabled?: boolean;
  currentFile?: string;
};

export function VideoUploader({
  onFileSelect,
  acceptedTypes = ["video/mp4", "video/webm", "video/quicktime"],
  maxSize = 1024,
  disabled = false,
  currentFile,
}: VideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0].code === "file-too-large") {
          setError(`File too large. Max size is ${maxSize}MB`);
        } else if (rejection.errors[0].code === "file-invalid-type") {
          setError(`Invalid file type. Accepted: ${acceptedTypes.join(", ")}`);
        } else {
          setError(rejection.errors[0].message);
        }
        return;
      }

      const selectedFile = acceptedFiles[0];
      if (selectedFile) {
        setFile(selectedFile);
        onFileSelect(selectedFile);
      }
    },
    [acceptedTypes, maxSize, onFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxSize * 1024 * 1024,
    multiple: false,
    disabled,
  });

  const removeFile = () => {
    setFile(null);
    setError(null);
    onFileSelect(null);
  };

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex min-h-50 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          disabled && "cursor-not-allowed opacity-50",
          file &&
            "border-solid border-green-500 bg-green-50 dark:bg-green-950/20",
        )}
      >
        <input {...getInputProps()} />

        {file ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <FileVideo className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
              className="mt-2 rounded-full p-1 hover:bg-destructive/10"
            >
              <X className="h-4 w-4 text-destructive" />
            </button>
          </div>
        ) : currentFile && !file ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <FileVideo className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm font-medium">Current video saved</p>
            <p className="text-xs text-muted-foreground">
              Drop a new file to replace
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm font-medium">
              {isDragActive ? "Drop video here" : "Drag & drop video here"}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to select - MP4, WebM up to {maxSize}MB
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

