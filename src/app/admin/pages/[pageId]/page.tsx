import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/db/prisma";
import { Badge } from "@/src/components/ui/badge";
import { PublishButton } from "@/src/components/admin/publish-button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components/ui/tabs";
import { Separator } from "@/src/components/ui/separator";
import { SectionEditorClient } from "@/src/components/admin/section-editor-client";
import type {
  SectionKey,
  SectionPayloadMap,
  ResolvedSection,
} from "@/src/lib/content/types";

export const metadata: Metadata = {
  title: "Page Editor",
};

type PageParams = Promise<{ pageId: string }>;

export default async function PageEditorPage({
  params,
}: {
  params: PageParams;
}) {
  const { pageId } = await params;

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: { sections: { orderBy: { sort: "asc" } } },
  });

  if (!page) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold text-brand-heading">
            {page.seoTitle}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">/{page.slug}</span>
            <Separator orientation="vertical" className="h-4" />
            <Badge
              variant={page.status === "PUBLISHED" ? "default" : "secondary"}
            >
              {page.status}
            </Badge>
          </div>
        </div>
        <PublishButton pageId={page.id} currentStatus={page.status} />
      </div>

      {/* Sections Tabs */}
      {page.sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-brand-border bg-brand-surface py-12 text-center">
          <p className="text-sm text-brand-body">No sections on this page yet.</p>
        </div>
      ) : (
        <Tabs defaultValue={page.sections[0]?.id ?? ""} className="space-y-4">
          <TabsList className="flex flex-wrap gap-2">
            {page.sections.map((section) => (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="capitalize"
              >
                {section.key}
              </TabsTrigger>
            ))}
          </TabsList>

          {page.sections.map((section) => {
            const parsedDraft = JSON.parse(section.draft);
            const resolvedSection: ResolvedSection = {
              id: section.id,
              key: section.key as SectionKey,
              sort: section.sort,
              data: parsedDraft as SectionPayloadMap[SectionKey],
              updatedAt: section.updatedAt,
            };

            return (
              <TabsContent
                key={section.id}
                value={section.id}
                className="space-y-4"
              >
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Left: Section Editor */}
                  <div className="rounded-lg border border-brand-border bg-brand-surface p-6">
                    <h3 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-brand-accent">
                      Edit — {section.key}
                    </h3>
                    <SectionEditorClient
                      pageId={pageId}
                      section={resolvedSection}
                    />
                  </div>

                  {/* Right: Section Preview */}
                  <div className="rounded-lg border border-brand-border bg-brand-surface p-6">
                    <h3 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-brand-accent">
                      Preview — {section.key}
                    </h3>
                    <pre className="whitespace-pre-wrap break-all rounded bg-black/5 p-4 text-xs font-mono text-brand-body">
                      {JSON.stringify(
                        {
                          key: section.key,
                          data: parsedDraft,
                          updatedAt: section.updatedAt.toISOString(),
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
