import { HeroSection } from "./sections/HeroSection";
import { QuickActionsSection } from "./sections/QuickActionsSection";
import { ProductsSection } from "./sections/ProductsSection";
import { PdicNoticeSection } from "./sections/PdicNoticeSection";
import { NewsSection } from "./sections/NewsSection";

type SectionKey = "hero" | "quick-actions" | "products" | "pdic-notice" | "news";

export const sectionRegistry: Record<SectionKey, React.ComponentType<{ section: SectionPayload }>> = {
  hero: HeroSection,
  "quick-actions": QuickActionsSection,
  products: ProductsSection,
  "pdic-notice": PdicNoticeSection,
  news: NewsSection,
};

export type SectionPayload = {
  sectionKey: SectionKey;
  fields: Record<string, { fieldType: string; value: string | null }>;
};
