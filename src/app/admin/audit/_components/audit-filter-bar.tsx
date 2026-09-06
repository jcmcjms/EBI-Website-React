"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

const ENTITY_TYPES = [
  "Page",
  "Section",
  "MediaAsset",
  "NewsArticle",
  "User",
] as const;

type EntityType = (typeof ENTITY_TYPES)[number];

interface AuditFilterBarProps {
  activeEntityType: EntityType | null;
}

export function AuditFilterBar({ activeEntityType }: AuditFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleEntityTypeChange = (value: string) => {
    startTransition(() => {
      if (value === "all") {
        router.push(pathname);
      } else {
        router.push(`${pathname}?entityType=${value}`);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-brand-body">Filter by entity:</span>
      <Select
        value={activeEntityType ?? "all"}
        onValueChange={handleEntityTypeChange}
        disabled={isPending}
      >
        <SelectTrigger className="h-8 w-40">
          <SelectValue placeholder="All entities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All entities</SelectItem>
          {ENTITY_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
