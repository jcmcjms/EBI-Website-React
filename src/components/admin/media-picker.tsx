"use client";

import { useState, useTransition, useCallback } from "react";
import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { getMediaUrl, type MediaVariantFormat } from "@/src/lib/media/media-url";
import { UploadSimpleIcon, CheckIcon } from "@phosphor-icons/react";

/** Inline type matching the API response shape — avoids importing server-only types */
type MediaVariant = {
  format: string;
  storageKey: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
};

type MediaAssetRecord = {
  id: string;
  storageKey: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  altText: string;
  uploadedById: string;
  uploadedAt: Date;
  variants: MediaVariant[];
};

interface MediaPickerProps {
  value: string | null;
  onChange: (id: string) => void;
}

export function MediaPicker({ value, onChange }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/media/list");
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets ?? []);
      } else {
        setAssets([]);
      }
    } catch {
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next && assets.length === 0) {
        fetchAssets();
      }
      setOpen(next);
    },
    [assets.length, fetchAssets],
  );

  const handleSelect = useCallback(
    (id: string) => {
      startTransition(() => {
        onChange(id);
        setOpen(false);
      });
    },
    [onChange],
  );

  const selectedAsset = assets.find((a) => a.id === value) ?? null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <div className="flex flex-col gap-1.5">
        <Button
          variant="outline"
          onClick={() => handleOpenChange(true)}
          disabled={isPending}
        >
          {selectedAsset ? (
            <>
              <img
                src={getMediaUrl(
                  selectedAsset.variants[0]?.storageKey ??
                    selectedAsset.storageKey,
                  "webp",
                )}
                alt={selectedAsset.altText}
                className="mr-2 size-5 rounded-none object-cover"
              />
              Change Image
            </>
          ) : (
            <>
              <UploadSimpleIcon className="mr-2 size-4" />
              Select Image
            </>
          )}
        </Button>
        {selectedAsset && (
          <p className="text-xs text-muted-foreground truncate">
            {selectedAsset.altText}
          </p>
        )}
      </div>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-4 py-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-none bg-muted"
              />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-brand-heading">
              No media available
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload images in the Media Library first.
            </p>
          </div>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-3 gap-4 overflow-y-auto pr-1">
            {assets.map((asset) => {
              const variant =
                asset.variants.find((v) => v.format === "webp") ??
                asset.variants[0];
              const url = variant
                ? getMediaUrl(
                    variant.storageKey,
                    variant.format as MediaVariantFormat,
                  )
                : getMediaUrl(asset.storageKey, "original");
              const isSelected = asset.id === value;

              return (
                <button
                  key={asset.id}
                  onClick={() => handleSelect(asset.id)}
                  className={`
                    group relative aspect-square overflow-hidden rounded-none border-2 transition-colors
                    ${
                      isSelected
                        ? "border-ring"
                        : "border-border hover:border-ring"
                    }
                  `}
                >
                  <img
                    src={url}
                    alt={asset.altText}
                    className="size-full object-cover"
                  />
                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <CheckIcon className="size-8 text-white" weight="bold" />
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-xs text-white">
                      {asset.altText}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end border-t pt-4">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
