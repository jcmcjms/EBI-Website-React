import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/db/prisma";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Separator } from "@/src/components/ui/separator";
import { Textarea } from "@/src/components/ui/textarea";
import { Input } from "@/src/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components/ui/tabs";
import { MediaPicker } from "@/src/components/admin/media-picker";
import { ArticleEditorClient } from "./article-editor-client";

export const metadata: Metadata = {
  title: "Article Editor",
};

type ArticleParams = Promise<{ articleId: string }>;

export default async function ArticleEditorPage({
  params,
}: {
  params: ArticleParams;
}) {
  const { articleId } = await params;

  const article = await prisma.newsArticle.findUnique({
    where: { id: articleId },
    include: { author: true, cover: true },
  });

  if (!article) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold text-brand-heading">
            {article.title}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              /news/{article.slug}
            </span>
            <Separator orientation="vertical" className="h-4" />
            <Badge
              variant={article.status === "PUBLISHED" ? "default" : "secondary"}
            >
              {article.status}
            </Badge>
          </div>
        </div>
        <ArticleEditorClient
          article={{
            id: article.id,
            slug: article.slug,
            title: article.title,
            excerpt: article.excerpt,
            body: article.body,
            coverId: article.coverId,
            status: article.status as "DRAFT" | "PUBLISHED",
            publishedAt: article.publishedAt?.toISOString() ?? null,
            createdAt: article.createdAt.toISOString(),
            updatedAt: article.updatedAt.toISOString(),
            authorId: article.authorId,
            cover: article.cover,
          }}
        />
      </div>

      {/* Editor Tabs */}
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Edit Fields */}
            <div className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-6">
              <ContentForm article={article} />
            </div>

            {/* Right: Preview */}
            <div className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-6">
              <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-brand-accent">
                Preview
              </h3>
              <div className="space-y-3">
                {article.cover && (
                  <img
                    src={`/api/media/${article.cover.id}/webp`}
                    alt={article.cover.altText ?? article.title}
                    className="w-full rounded-md object-cover"
                  />
                )}
                <h2 className="font-heading text-xl font-semibold text-brand-heading">
                  {article.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {article.excerpt}
                </p>
                <pre className="whitespace-pre-wrap break-all rounded bg-black/5 p-4 text-xs font-mono text-brand-body">
                  {article.body}
                </pre>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsForm article={article} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Content form — handles title, excerpt, body, and cover
function ContentForm({
  article,
}: {
  article: Awaited<ReturnType<typeof prisma.newsArticle.findUnique>> & {
    cover: { id: string; altText: string | null } | null;
  };
}) {
  return (
    <form
      id="content-form"
      action={async (formData) => {
        "use server";
        const { updateNewsArticle } = await import("@/src/lib/actions/admin");
        const title = formData.get("title") as string;
        const excerpt = formData.get("excerpt") as string;
        const body = formData.get("body") as string;
        const coverId = (formData.get("coverId") as string) || null;
        const result = await updateNewsArticle(article.id, {
          title,
          excerpt,
          body,
          coverId,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        // Revalidate happens in the action
      }}
      className="space-y-4"
    >
      <input type="hidden" name="coverId" id="coverId" value={article.coverId ?? ""} />

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="title"
          name="title"
          defaultValue={article.title}
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="excerpt" className="text-sm font-medium">
          Excerpt
        </label>
        <Textarea
          id="excerpt"
          name="excerpt"
          defaultValue={article.excerpt}
          required
          maxLength={500}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="body" className="text-sm font-medium">
          Body (Markdown)
        </label>
        <Textarea
          id="body"
          name="body"
          defaultValue={article.body}
          required
          rows={20}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Cover Image</label>
        <MediaPicker
          value={article.coverId}
          onChange={(id) => {
            const input = document.getElementById("coverId") as HTMLInputElement;
            if (input) input.value = id;
          }}
        />
      </div>

      <Button type="submit" form="content-form">
        Save Content
      </Button>
    </form>
  );
}

// Settings form — handles slug and meta description
function SettingsForm({
  article,
}: {
  article: Awaited<ReturnType<typeof prisma.newsArticle.findUnique>> & {
    cover: { id: string; altText: string | null } | null;
  };
}) {
  return (
    <form
      id="settings-form"
      action={async (formData) => {
        "use server";
        const { updateNewsArticle } = await import("@/src/lib/actions/admin");
        const result = await updateNewsArticle(article.id, {
          slug: formData.get("slug") as string,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
      }}
      className="max-w-xl space-y-4 rounded-lg border border-brand-border bg-brand-surface p-6"
    >
      <div className="space-y-2">
        <label htmlFor="slug" className="text-sm font-medium">
          Slug
        </label>
        <Input
          id="slug"
          name="slug"
          defaultValue={article.slug}
          required
          pattern="[a-z0-9-]+"
          title="Lowercase alphanumeric with hyphens"
        />
        <p className="text-xs text-muted-foreground">
          Lowercase alphanumeric with hyphens (e.g., &quot;my-news-article&quot;)
        </p>
      </div>

      <Button type="submit" form="settings-form">
        Save Settings
      </Button>
    </form>
  );
}
