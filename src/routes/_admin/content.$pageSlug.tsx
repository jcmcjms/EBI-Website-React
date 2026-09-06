import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldEditor } from "@/features/admin/components/FieldEditor";

export const Route = createFileRoute("/_admin/content/$pageSlug")({
  loaderDeps: ({ params }) => ({ slug: params.pageSlug }),
  component: ContentEditor,
});

function ContentEditor() {
  const { slug } = Route.useLoaderDeps();
  const queryClient = useQueryClient();

  const page = useQuery({
    queryKey: ["admin-page", slug],
    queryFn: async () => {
      const res = await api.GET("/api/content/admin/page/{slug}", {
        params: { path: { slug } },
      });
      if (res.error) throw new Error("Page not found");
      return res.data;
    },
    // For now, return mock data since backend isn't running
    initialData: {
      id: "1",
      slug,
      title: slug === "home" ? "Home Page" : slug.charAt(0).toUpperCase() + slug.slice(1),
      sections: [
        {
          id: "section-1",
          sectionKey: "hero",
          fields: [
            {
              id: "field-1",
              fieldKey: "headline",
              fieldType: "text",
              label: "Headline",
              draftValue: "Welcome to Enterprise Bank",
            },
            {
              id: "field-2",
              fieldKey: "subheadline",
              fieldType: "textarea",
              label: "Subheadline",
              draftValue: "Your trusted partner for all your financial needs.",
            },
            {
              id: "field-3",
              fieldKey: "background_image",
              fieldType: "image",
              label: "Background Image",
              draftValue: null,
            },
          ],
        },
      ],
    },
  });

  const saveField = useMutation({
    mutationFn: async (args: { fieldId: string; draftValue: string | null }) => {
      const res = await api.PUT("/api/content/admin/field/{fieldId}", {
        params: { path: { fieldId: args.fieldId } },
        body: { draftValue: args.draftValue },
      });
      if (res.error) throw new Error("Save failed");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-page", slug] });
      toast.success("Draft saved");
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (!page.data) return;
      const res = await api.POST("/api/content/admin/page/{pageId}/publish", {
        params: { path: { pageId: page.data.id } },
      });
      if (res.error) throw new Error("Publish failed");
    },
    onSuccess: () => toast.success("Published — changes live"),
    onError: () => toast.error("Publish failed"),
  });

  if (page.isLoading) return <div>Loading...</div>;
  if (!page.data) return <div>Not found</div>;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit: {page.data.title}</h1>
          <p className="text-sm text-muted-foreground">Slug: {slug}</p>
        </div>
        <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
          {publish.isPending ? "Publishing..." : "Publish changes"}
        </Button>
      </header>

      {page.data.sections.map((section) => (
        <section key={section.id} className="border rounded-lg p-6 space-y-4">
          <h2 className="font-medium capitalize">{section.sectionKey.replace("-", " ")}</h2>
          <div className="grid gap-4">
            {section.fields.map((field) => (
              <FieldEditor
                key={field.id}
                field={field}
                onSave={(draftValue) => saveField.mutate({ fieldId: field.id, draftValue })}
                saving={saveField.isPending}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
