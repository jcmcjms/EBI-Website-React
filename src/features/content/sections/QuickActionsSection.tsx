import type { SectionPayload } from "../section-registry";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function QuickActionsSection({ section }: { section: SectionPayload }) {
  const actions = section.fields.actions?.value
    ? JSON.parse(section.fields.actions.value)
    : [];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {actions.map((action: { label: string; url: string; icon?: string }, index: number) => (
            <Button
              key={index}
              asChild
              variant="outline"
              className="h-24 text-lg font-medium"
            >
              <Link to={action.url}>{action.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
