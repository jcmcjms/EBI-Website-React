import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuth } from "@/features/auth/auth-guard";
import { Sidebar } from "@/features/admin/components/Sidebar";

export const Route = createFileRoute("/_admin")({
  beforeLoad: requireAuth,
  component: () => (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 p-4 lg:p-8 lg:ml-0">
        <Outlet />
      </div>
    </div>
  ),
});
