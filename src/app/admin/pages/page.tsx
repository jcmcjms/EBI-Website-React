import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/src/lib/db/prisma";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";

export const metadata: Metadata = {
  title: "Pages",
};

export default async function AdminPagesPage() {
  const pages = await prisma.page.findMany({
    orderBy: { updatedAt: "desc" },
    include: { sections: { select: { id: true } } },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-brand-heading">
            Pages
          </h1>
          <p className="text-sm text-brand-body">
            Manage your site pages and content sections
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/pages/new">New Page</Link>
        </Button>
      </div>

      {/* Pages Table */}
      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-brand-border bg-brand-surface py-12 text-center">
          <p className="text-sm text-brand-body">No pages yet.</p>
          <Button asChild variant="link" className="mt-2">
            <Link href="/admin/pages/new">Create your first page</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-brand-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Sections</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id} className="hover:bg-brand-surface/50">
                  <TableCell className="font-medium text-brand-heading">
                    {page.seoTitle}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {page.slug}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={page.status === "PUBLISHED" ? "default" : "secondary"}
                    >
                      {page.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {page.sections.length}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(page.updatedAt, { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/pages/${page.id}`}>Edit</Link>
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
