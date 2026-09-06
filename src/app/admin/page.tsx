import { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/src/lib/db/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
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
  title: "Dashboard",
};

export default async function AdminDashboardPage() {
  // Parallel data fetching — no waterfalls
  const [
    totalPages,
    totalMedia,
    totalNews,
    draftPages,
    recentActivity,
    publishedNews,
    draftNews,
  ] = await Promise.all([
    prisma.page.count(),
    prisma.mediaAsset.count(),
    prisma.newsArticle.count(),
    prisma.page.count({ where: { status: "DRAFT" } }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { at: "desc" },
      include: { user: true },
    }),
    prisma.newsArticle.count({ where: { status: "PUBLISHED" } }),
    prisma.newsArticle.count({ where: { status: "DRAFT" } }),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-heading">
          Dashboard
        </h1>
        <p className="text-sm text-brand-body">
          Overview of your EBI content
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-brand-body">
              Total Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-heading">
              {totalPages}
            </div>
            <p className="text-xs text-muted-foreground">
              {draftPages} {draftPages === 1 ? "draft" : "drafts"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-brand-body">
              Media Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-heading">
              {totalMedia}
            </div>
            <p className="text-xs text-muted-foreground">
              Images and files
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-brand-body">
              News Articles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-heading">
              {totalNews}
            </div>
            <p className="text-xs text-muted-foreground">
              {publishedNews} published, {draftNews} draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-brand-body">
              Draft Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-heading">
              {draftPages}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting publication
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout for Recent Activity and Quick Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity — spans 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest actions across your content
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.user?.email ?? "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.entityType}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(log.at, { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats for News */}
        <Card>
          <CardHeader>
            <CardTitle>News Overview</CardTitle>
            <CardDescription>
              Article publication status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-body">Published</span>
              <Badge variant="default">{publishedNews}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-body">Draft</span>
              <Badge variant="secondary">{draftNews}</Badge>
            </div>
            <div className="flex items-center justify-between border-t border-brand-border pt-4">
              <span className="text-sm font-medium text-brand-heading">
                Total
              </span>
              <span className="text-sm font-bold text-brand-heading">
                {totalNews}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
