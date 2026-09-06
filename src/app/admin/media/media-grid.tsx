"use client";

import { useState, useTransition, useCallback } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { TrashIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { deleteMediaAsset, updateMediaAltText } from "@/src/lib/actions/admin";
import { getMediaUrl } from "@/src/lib/media/media-url";

// Inline type matching the /api/admin/media/list response shape
interface MediaAssetRecord {
  id: string;
  storageKey: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  altText: string;
  uploadedById: string;
  uploadedAt: Date;
  variants: Array<{
    format: string;
    storageKey: string;
    width: number | null;
    height: number | null;
    sizeBytes: number;
    mimeType: string;
  }>;
}

interface MediaGridProps {
  assets: MediaAssetRecord[];
}

export function MediaGrid({ assets }: MediaGridProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = assets.find((a) => a.id === selectedId) ?? null;

  return (
    <>
      {assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-12 rounded-none bg-muted" />
          <p className="mt-4 text-sm font-medium text-brand-heading">
            No media yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload your first image using the zone above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {assets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => setSelectedId(asset.id)}
              className="group relative flex flex-col overflow-hidden rounded-none border border-border bg-card text-left transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* Thumbnail */}
              <div className="relative aspect-square bg-muted">
                <img
                  src={getMediaUrl(asset.storageKey, "webp")}
                  alt={asset.altText}
                  className="size-full object-cover"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <PencilSimpleIcon className="size-5 text-white" />
                </div>
              </div>

              {/* Info */}
              <div className="flex flex-col gap-0.5 border-t border-border px-2 py-1.5">
                <p className="truncate text-xs font-medium text-brand-heading">
                  {asset.altText}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(asset.uploadedAt, "MMM d, yyyy")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      {selected && (
        <DetailDialog asset={selected} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Detail dialog (inline component)
// ---------------------------------------------------------------------------

interface DetailDialogProps {
  asset: MediaAssetRecord;
  onClose: () => void;
}

function DetailDialog({ asset, onClose }: DetailDialogProps) {
  const [altText, setAltText] = useState(asset.altText);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSaveAlt = useCallback(() => {
    if (altText.trim() === asset.altText) {
      setIsEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await updateMediaAltText(asset.id, altText.trim());
      if (!result.success) {
        toast.error(result.error ?? "Failed to update alt text");
        return;
      }
      toast.success("Alt text updated");
      setIsEditing(false);
      // Update local state
      asset.altText = altText.trim();
    });
  }, [altText, asset]);

  const handleDelete = useCallback(() => {
    if (!window.confirm(`Delete "${asset.altText}"? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteMediaAsset(asset.id);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete");
        return;
      }
      toast.success("Media deleted");
      onClose();
      window.location.reload();
    });
  }, [asset, onClose]);

  // Best variant for display
  const displayVariant =
    asset.variants.find((v) => v.format === "webp") ?? asset.variants[0];
  const displayUrl = displayVariant
    ? getMediaUrl(
        displayVariant.storageKey,
        displayVariant.format as "webp" | "avif",
      )
    : getMediaUrl(asset.storageKey, "original");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Media Details</DialogTitle>
          <DialogDescription>
            Update alt text or delete this asset.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Full image preview */}
          <div className="relative aspect-video w-full overflow-hidden rounded-none bg-muted">
            <img
              src={displayUrl}
              alt={asset.altText}
              className="size-full object-contain"
            />
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-brand-body">Dimensions</span>
              <p>
                {asset.width} × {asset.height}px
              </p>
            </div>
            <div>
              <span className="font-medium text-brand-body">Size</span>
              <p>{(asset.sizeBytes / 1024).toFixed(1)} KB</p>
            </div>
            <div>
              <span className="font-medium text-brand-body">Format</span>
              <p>{asset.mimeType}</p>
            </div>
            <div>
              <span className="font-medium text-brand-body">Uploaded</span>
              <p>{format(asset.uploadedAt, "MMM d, yyyy 'at' HH:mm")}</p>
            </div>
          </div>

          {/* Alt text editor */}
          <div className="space-y-1.5">
            <label
              htmlFor="alt-text"
              className="text-xs font-medium text-brand-body"
            >
              Alt Text
            </label>
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  id="alt-text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="flex-1"
                  disabled={isPending}
                />
                <Button
                  size="sm"
                  onClick={handleSaveAlt}
                  disabled={isPending || !altText.trim()}
                >
                  {isPending ? "Saving…" : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAltText(asset.altText);
                    setIsEditing(false);
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-none border border-border px-2.5 py-1">
                <p className="flex-1 text-xs text-brand-body">{asset.altText}</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-ring underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Delete */}
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              <TrashIcon className="mr-1.5 size-4" />
              {isPending ? "Deleting…" : "Delete Media"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
