"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { UploadSimpleIcon } from "@phosphor-icons/react";

interface UploadZoneProps {
  userId: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function UploadZone({ userId }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error(`"${file.name}" is not a supported image type.`);
          return;
        }
        if (file.size > MAX_SIZE_BYTES) {
          toast.error(
            `"${file.name}" exceeds the 10 MB size limit.`,
          );
          return;
        }
      }

      for (const file of fileArray) {
        startTransition(async () => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("altText", file.name.replace(/\.[^.]+$/, ""));
          formData.append("uploadedById", userId);

          try {
            const res = await fetch("/api/admin/media/upload", {
              method: "POST",
              body: formData,
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
              toast.error(
                `Upload failed for "${file.name}": ${data.message ?? data.error}`,
              );
              return;
            }

            toast.success(`"${file.name}" uploaded successfully.`);
            // Force a full page refresh to show the new asset
            window.location.reload();
          } catch {
            toast.error(`Network error while uploading "${file.name}".`);
          }
        });
      }
    },
    [userId],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(e.target.files);
        // Reset so the same file can be re-selected
        e.target.value = "";
      }
    },
    [uploadFiles],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          inputRef.current?.click();
        }
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-none border-2 border-dashed p-8 text-center transition-colors
        ${
          isDragging
            ? "border-ring bg-ring/5"
            : "border-border hover:border-ring hover:bg-muted/50"
        }
        ${isPending ? "pointer-events-none opacity-50" : ""}
      `}
    >
      <UploadSimpleIcon
        className={`size-10 ${isDragging ? "text-ring" : "text-muted-foreground"}`}
        weight={isDragging ? "fill" : "regular"}
      />

      <div>
        <p className="text-sm font-medium text-brand-heading">
          {isDragging ? "Drop to upload" : "Drag & drop images here"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          or{" "}
          <span className="text-ring underline">browse your files</span>
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Accepts JPEG, PNG, WebP — max 10 MB per file
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="sr-only"
        onChange={handleInputChange}
        disabled={isPending}
      />
    </div>
  );
}
