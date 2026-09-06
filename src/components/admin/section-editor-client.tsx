"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SectionEditor } from "@/src/components/admin/section-editor";
import { saveSectionDraft } from "@/src/lib/actions/admin";
import type {
  SectionKey,
  SectionPayloadMap,
  ResolvedSection,
} from "@/src/lib/content/types";

interface SectionEditorClientProps {
  pageId: string;
  section: ResolvedSection;
}

export function SectionEditorClient({ pageId, section }: SectionEditorClientProps) {
  const router = useRouter();

  async function handleSave(next: SectionPayloadMap[SectionKey]) {
    const result = await saveSectionDraft(pageId, section.key, next);
    if (result.success) {
      toast.success("Draft saved");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to save draft");
    }
  }

  return (
    <SectionEditor
      sectionKey={section.key}
      defaultValue={section.data}
      onSave={handleSave}
    />
  );
}
