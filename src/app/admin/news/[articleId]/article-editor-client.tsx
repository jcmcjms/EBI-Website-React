"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import {
  publishNewsArticle,
  deleteNewsArticle,
  type NewsArticleDTO,
} from "@/src/lib/actions/admin";

interface ArticleEditorClientProps {
  article: NewsArticleDTO & {
    cover: { id: string; altText: string | null } | null;
  };
}

export function ArticleEditorClient({ article }: ArticleEditorClientProps) {
  const router = useRouter();
  const [publishing, setPublishing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function handlePublish() {
    setPublishing(true);
    try {
      const result = await publishNewsArticle(article.id);
      if (result.success) {
        toast.success("Article published successfully");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to publish article");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this article? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      const result = await deleteNewsArticle(article.id);
      if (result.success) {
        toast.success("Article deleted successfully");
        router.push("/admin/news");
      } else {
        toast.error(result.error ?? "Failed to delete article");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {article.status === "PUBLISHED" ? (
        <Button variant="secondary" disabled>
          Published
        </Button>
      ) : (
        <Button onClick={handlePublish} disabled={publishing}>
          {publishing ? "Publishing…" : "Publish"}
        </Button>
      )}
      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? "Deleting…" : "Delete"}
      </Button>
    </div>
  );
}
