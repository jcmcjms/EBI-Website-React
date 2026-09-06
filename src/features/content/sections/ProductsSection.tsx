import type { SectionPayload } from "../section-registry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ProductsSection({ section }: { section: SectionPayload }) {
  const title = section.fields.title?.value ?? "Our Products";
  const products = section.fields.products?.value
    ? JSON.parse(section.fields.products.value)
    : [];

  return (
    <section className="py-16">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-semibold mb-8">{title}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {products.map((product: { id: string; name: string; description: string; badge?: string }, index: number) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                {product.badge && (
                  <Badge variant="secondary" className="mt-2 w-fit">
                    {product.badge}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
