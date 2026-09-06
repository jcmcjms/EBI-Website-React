import { createFileRoute, Link } from "@tanstack/react-router";
import { sectionRegistry, type SectionPayload } from "@/features/content/section-registry";

type PageData = {
  slug: string;
  title: string;
  sections: SectionPayload[];
};

export const Route = createFileRoute("/")({
  loader: async () => {
    // For now, return mock data since the backend isn't running
    // In production, this would call the internal API
    return {
      slug: "home",
      title: "Enterprise Bank Philippines",
      sections: [
        {
          sectionKey: "hero" as const,
          fields: {
            headline: { fieldType: "text", value: "Banking Made Simple" },
            subheadline: { fieldType: "textarea", value: "Your trusted partner for all your financial needs." },
            cta_label: { fieldType: "text", value: "Get Started" },
            cta_url: { fieldType: "text", value: "/products" },
            background_image: { fieldType: "image", value: null },
          },
        },
      ],
    } as PageData;
  },
  staleTime: 5 * 60 * 1000,
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title ?? "Enterprise Bank Philippines" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const page = Route.useLoaderData();

  return (
    <main>
      {page.sections.map((section, index) => {
        const Component = sectionRegistry[section.sectionKey];
        if (!Component) return null;
        return <Component key={`${section.sectionKey}-${index}`} section={section} />;
      })}
    </main>
  );
}
