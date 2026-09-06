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
import { RoleUpdateCell } from "./_components/role-update-cell";

export const metadata: Metadata = {
  title: "Users",
};

export default async function AdminUsersPage() {
  const session = await getOptionalSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/admin");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-heading">
          User Management
        </h1>
        <p className="text-sm text-brand-body">
          Manage user roles and permissions
        </p>
      </div>

      {/* Users Table */}
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-brand-border bg-brand-surface py-12 text-center">
          <p className="text-sm text-brand-body">No users found.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-brand-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-brand-surface/50">
                  <TableCell className="font-medium text-brand-heading">
                    {user.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === "ADMIN"
                          ? "destructive"
                          : user.role === "PUBLISHER"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(user.createdAt, { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(user.createdAt, { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <RoleUpdateCell
                      userId={user.id}
                      currentRole={user.role}
                      currentUserId={session.id}
                    />
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
