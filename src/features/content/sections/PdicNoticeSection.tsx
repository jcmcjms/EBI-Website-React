import type { SectionPayload } from "../section-registry";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PdicNoticeSection({ section }: { section: SectionPayload }) {
  const notice = section.fields.notice?.value ?? "";
  const linkUrl = section.fields.link_url?.value ?? "#";
  const linkLabel = section.fields.link_label?.value ?? "Learn more";

  return (
    <section className="py-8 bg-primary/5">
      <div className="container mx-auto px-6">
        <Alert className="max-w-3xl mx-auto">
          <AlertTitle className="text-primary font-semibold">
            PDIC Insured
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">{notice}</p>
            <a
              href={linkUrl}
              className="text-primary font-medium hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {linkLabel} →
            </a>
          </AlertDescription>
        </Alert>
      </div>
    </section>
  );
}
