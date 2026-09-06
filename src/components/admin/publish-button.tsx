"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { publishPage } from "@/src/lib/actions/admin";

interface PublishButtonProps {
  pageId: string;
  currentStatus: "DRAFT" | "PUBLISHED";
}

export function PublishButton({ pageId, currentStatus }: PublishButtonProps) {
  const [pending, setPending] = React.useState(false);

  async function handlePublish() {
    setPending(true);
    try {
      const result = await publishPage(pageId);
      if (result.success) {
        toast.success("Page published successfully");
        // Force a full page reload to reflect the new status and section data
        window.location.reload();
      } else {
        toast.error(result.error ?? "Failed to publish page");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setPending(false);
    }
  }

  if (currentStatus === "PUBLISHED") {
    return (
      <Button variant="secondary" disabled>
        Published
      </Button>
    );
  }

  return (
    <Button onClick={handlePublish} disabled={pending}>
      {pending ? "Publishing…" : "Publish"}
    </Button>
  );
}
