import { Suspense } from "react";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/db/prisma";
import { getOptionalSession } from "@/src/lib/auth/guards";
import { getMediaUrl, type MediaAssetRecord } from "@/src/lib/media/service";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { toast } from "sonner";
import { UploadZone } from "./upload-zone";
import { MediaGrid } from "./media-grid";

export const metadata: Metadata = { title: "Media Library" };

// Re-fetch media list after mutations
async function refetchMedia(): Promise<MediaAssetRecord[]> {
  const rows = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      variants: true,
      uploadedBy: { select: { id: true, email: true, name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    storageKey: row.storageKey,
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    sizeBytes: row.sizeBytes,
    altText: row.altText,
    uploadedById: row.uploadedById,
    uploadedAt: row.createdAt,
    variants: row.variants.map((v) => ({
      format: v.format.toLowerCase() as "webp" | "avif" | "jpeg",
      storageKey: v.storageKey,
      width: v.width,
      height: v.height,
      sizeBytes: v.sizeBytes,
      mimeType:
        v.format === "WEBP"
          ? "image/webp"
          : v.format === "AVIF"
            ? "image/avif"
            : "image/jpeg",
    })),
  }));
}

export default async function MediaLibraryPage() {
  const session = await getOptionalSession();

  const assets = await refetchMedia();

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-heading">
          Media Library
        </h1>
        <p className="mt-1 text-sm text-brand-body">
          Upload and manage images for your site content.
        </p>
      </div>

      {/* Upload zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload New Image</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadZone userId={session?.id ?? "dev-user"} />
        </CardContent>
      </Card>

      {/* Media grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            Existing Media
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({assets.length} {assets.length === 1 ? "file" : "files"})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square animate-pulse rounded-none bg-muted"
                  />
                ))}
              </div>
            }
          >
            <MediaGrid assets={assets} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
