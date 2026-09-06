import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/db/prisma";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";

export const metadata: Metadata = {
  title: "New Article",
};

export default async function NewArticlePage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-heading">
          New Article
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a new news article.
        </p>
      </div>

      <form
        action={async (formData) => {
          "use server";
          const { createNewsArticle } = await import("@/src/lib/actions/admin");

          const title = formData.get("title") as string;
          const slug = formData.get("slug") as string;

          if (!title || !slug) {
            return;
          }

          const result = await createNewsArticle({
            title,
            slug,
            excerpt: "",
            body: "",
          });

          if (result.success) {
            redirect(`/admin/news/${result.data.id}`);
          } else {
            throw new Error(result.error);
          }
        }}
        className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            placeholder="Article title"
            required
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            placeholder="article-slug"
            required
            pattern="[a-z0-9-]+"
            title="Lowercase alphanumeric with hyphens"
          />
          <p className="text-xs text-muted-foreground">
            Lowercase alphanumeric with hyphens (e.g., &quot;my-news-article&quot;)
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Create Article</Button>
          <Button type="button" variant="secondary" asChild>
            <a href="/admin/news">Cancel</a>
          </Button>
        </div>
      </form>
    </div>
  );
}
