"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import type { Role } from "@/src/lib/auth/guards";
import { updateUserRole } from "@/src/lib/actions/admin";

interface RoleUpdateCellProps {
  userId: string;
  currentRole: string;
  currentUserId: string;
}

export function RoleUpdateCell({
  userId,
  currentRole,
  currentUserId,
}: RoleUpdateCellProps) {
  const [selectedRole, setSelectedRole] = useState<Role>(currentRole as Role);
  const [isPending, startTransition] = useTransition();
  const isOwnAccount = userId === currentUserId;

  const roles: Role[] = ["EDITOR", "PUBLISHER", "ADMIN"];

  const handleRoleChange = (newRole: Role) => {
    if (newRole === currentRole) return;

    if (!confirm(`Change role to ${newRole}?`)) {
      // Reset select to current value
      setSelectedRole(currentRole as Role);
      return;
    }

    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);

      if (result.success) {
        setSelectedRole(newRole);
        toast.success(`Role updated to ${newRole}`);
      } else {
        setSelectedRole(currentRole as Role);
        toast.error(result.error ?? "Failed to update role");
      }
    });
  };

  if (isOwnAccount) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex">
            <Select
              value={selectedRole}
              onValueChange={handleRoleChange}
              disabled
            >
              <SelectTrigger className="h-7 w-fit min-w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          You cannot change your own role
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Select
      value={selectedRole}
      onValueChange={handleRoleChange}
      disabled={isPending}
    >
      <SelectTrigger className="h-7 w-fit min-w-[100px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role} value={role} disabled={role === currentRole}>
            {role}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
