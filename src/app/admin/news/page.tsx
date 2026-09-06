import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/src/lib/db/prisma";
import { format } from "date-fns";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { PlusCircleIcon } from "@phosphor-icons/react";

export const metadata: Metadata = {
  title: "News & Articles",
};

export default async function NewsListPage() {
  const articles = await prisma.newsArticle.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      author: { select: { id: true, name: true, email: true } },
      cover: true,
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-brand-heading">
            News & Articles
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage news articles and press releases.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/news/new">
            <PlusCircleIcon className="mr-2 size-4" />
            New Article
          </Link>
        </Button>
      </div>

      {/* Articles Table */}
      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-brand-border bg-brand-surface py-12 text-center">
          <p className="text-sm text-brand-body">No articles yet.</p>
          <Button variant="link" asChild className="mt-2">
            <Link href="/admin/news/new">Create your first article</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-brand-border bg-brand-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cover</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="font-medium">{article.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        article.status === "PUBLISHED" ? "default" : "secondary"
                      }
                    >
                      {article.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {article.cover ? (
                      <img
                        src={`/api/media/${article.cover.id}/webp`}
                        alt={article.cover.altText ?? article.title}
                        className="size-10 rounded-md object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {article.author.name ?? article.author.email}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {article.publishedAt
                      ? format(article.publishedAt, "MMM d, yyyy")
                      : "Not published"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/news/${article.id}`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
