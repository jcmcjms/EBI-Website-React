import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPHDate } from "@/lib/utils";

export function NewsSection() {
  const news = useQuery({
    queryKey: ["public-news"],
    queryFn: async () => {
      const res = await api.GET("/api/news", { params: { query: { pageSize: 3 } } });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!news.data) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-semibold mb-8">News & Advisories</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {news.data.items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {item.heroImageUrl && (
                <img src={item.heroImageUrl} alt={item.title} className="w-full h-48 object-cover" />
              )}
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                {item.publishedAt && (
                  <p className="text-sm text-muted-foreground">{formatPHDate(item.publishedAt)}</p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm">{item.summary}</p>
                <Link to={`/news/${item.slug}`} className="mt-4 text-sm font-medium text-primary hover:underline">
                  Read more →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
