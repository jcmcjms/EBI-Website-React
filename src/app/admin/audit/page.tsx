import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/src/lib/db/prisma";
import { getOptionalSession } from "@/src/lib/auth/guards";
import { Badge } from "@/src/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { AuditFilterBar } from "./_components/audit-filter-bar";

export const metadata: Metadata = {
  title: "Audit Log",
};

const ENTITY_TYPES = [
  "Page",
  "Section",
  "MediaAsset",
  "NewsArticle",
  "User",
] as const;

type EntityType = (typeof ENTITY_TYPES)[number];

const ACTION_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline" | "ghost"> = {
  DRAFT_SAVE: "outline",
  PAGE_PUBLISH: "default",
  MEDIA_UPDATE: "outline",
  MEDIA_UPLOAD: "outline",
  NEWS_CREATE: "secondary",
  NEWS_UPDATE: "outline",
  NEWS_PUBLISH: "default",
  USER_ROLE_CHANGE: "destructive",
};

function getActionBadgeVariant(action: string) {
  return ACTION_BADGE_VARIANT[action] ?? "secondary";
}

function formatChanges({
  before,
  after,
}: {
  before: unknown | null;
  after: unknown | null;
}): string {
  if (!before && !after) return "—";

  const beforeStr = before != null ? JSON.stringify(before) : "∅";
  const afterStr = after != null ? JSON.stringify(after) : "∅";

  if (beforeStr === afterStr) return "No change";

  return `${beforeStr} → ${afterStr}`;
}

interface AdminAuditPageProps {
  searchParams: Promise<{ entityType?: string }>;
}

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  const session = await getOptionalSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/admin");
  }

  const { entityType } = await searchParams;
  const filterEntityType =
    entityType && ENTITY_TYPES.includes(entityType as EntityType)
      ? (entityType as EntityType)
      : null;

  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { at: "desc" },
    where: filterEntityType
      ? { entityType: filterEntityType }
      : undefined,
    include: { user: { select: { email: true } } },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-heading">
          Audit Log
        </h1>
        <p className="text-sm text-brand-body">
          Track all content changes and admin actions
        </p>
      </div>

      {/* Filter Bar */}
      <AuditFilterBar activeEntityType={filterEntityType} />

      {/* Audit Log Table */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-brand-border bg-brand-surface py-12 text-center">
          <p className="text-sm text-brand-body">No audit entries found.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-brand-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <AuditLogRow key={log.id} log={log} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function AuditLogRow({
  log,
}: {
  log: {
    id: string;
    at: Date;
    action: string;
    entityType: string;
    entityId: string;
    before: string | null;
    after: string | null;
    user: { email: string } | null;
  };
}) {
  const changesStr = formatChanges({
    before: log.before ? JSON.parse(log.before) : null,
    after: log.after ? JSON.parse(log.after) : null,
  });

  return (
    <TableRow className="hover:bg-brand-surface/50">
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(log.at, { addSuffix: true })}
      </TableCell>
      <TableCell className="font-medium text-brand-heading">
        {log.user?.email ?? "Unknown"}
      </TableCell>
      <TableCell>
        <Badge variant={getActionBadgeVariant(log.action)}>
          {log.action}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {log.entityType}
      </TableCell>
      <TableCell className="text-muted-foreground font-mono text-xs">
        {log.entityId.length > 20
          ? `${log.entityId.slice(0, 20)}…`
          : log.entityId}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs max-w-xs">
        {changesStr.length > 60 ? (
          <details className="group cursor-pointer">
            <summary className="list-none">
              <span className="underline decoration-dotted underline-offset-2 group-open:hidden">
                {changesStr.slice(0, 60)}…
              </span>
              <span className="hidden group-open:inline">
                {changesStr}
              </span>
            </summary>
          </details>
        ) : (
          changesStr
        )}
      </TableCell>
    </TableRow>
  );
}
