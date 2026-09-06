import "dotenv/config";
import { PrismaClient, UserRole, PageStatus, NewsStatus } from "@prisma/client";
import { hash } from "bcryptjs";

/**
 * Seed script for the EBI Website dev database.
 *
 * Run with:
 *   npx prisma db seed
 *
 * Or directly:
 *   npx tsx prisma/seed.ts
 *
 * What it creates:
 *   - 1 ADMIN, 1 PUBLISHER, 1 EDITOR user (with bcrypt password hashes).
 *   - 5 Pages: home, about-us, personal-banking, business-banking, loans.
 *     The `home` page carries 5 sections (hero, quickLinks, productGrid,
 *     whyUs, newsList) seeded with realistic draft + published JSON.
 *   - 3 NewsArticles: 1 PUBLISHED, 2 DRAFT.
 *   - 2 placeholder MediaAssets (no actual files on disk; the seed runs
 *     before any uploads exist). Real images are produced by the upload
 *     pipeline (TASK-04+).
 *
 * Idempotency: the seed is destructive on re-run (it deletes existing
 * rows first). Use `npm run db:reset` to wipe + seed from scratch.
 */

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@ebi.local";
const PUBLISHER_EMAIL = "publisher@ebi.local";
const EDITOR_EMAIL = "editor@ebi.local";
const DEFAULT_PASSWORD = "admin123!";

async function main(): Promise<void> {
  console.log("[seed] resetting existing rows…");

  // Order matters: delete children before parents.
  await prisma.auditLog.deleteMany();
  await prisma.section.deleteMany();
  await prisma.page.deleteMany();
  await prisma.newsArticle.deleteMany();
  await prisma.mediaVariant.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.user.deleteMany();

  console.log("[seed] creating users…");

  const passwordHash = await hash(DEFAULT_PASSWORD, 10);

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: "Ada Admin",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const publisher = await prisma.user.create({
    data: {
      email: PUBLISHER_EMAIL,
      name: "Pat Publisher",
      passwordHash,
      role: UserRole.PUBLISHER,
    },
  });

  const editor = await prisma.user.create({
    data: {
      email: EDITOR_EMAIL,
      name: "Ed Editor",
      passwordHash,
      role: UserRole.EDITOR,
    },
  });

  console.log(
    `[seed] users created (admin=${admin.id}, publisher=${publisher.id}, editor=${editor.id})`,
  );

  console.log("[seed] creating placeholder MediaAssets…");

  const placeholderAsset1 = await prisma.mediaAsset.create({
    data: {
      storageKey: "seed/placeholder-1",
      mimeType: "image/png",
      width: 1200,
      height: 630,
      sizeBytes: 0,
      altText: "Placeholder hero image (replace before launch)",
      uploadedById: admin.id,
    },
  });

  const placeholderAsset2 = await prisma.mediaAsset.create({
    data: {
      storageKey: "seed/placeholder-2",
      mimeType: "image/png",
      width: 600,
      height: 400,
      sizeBytes: 0,
      altText: "Placeholder product image (replace before launch)",
      uploadedById: admin.id,
    },
  });

  console.log(
    `[seed] media assets created (${placeholderAsset1.id}, ${placeholderAsset2.id})`,
  );

  console.log("[seed] creating Pages…");

  const pageDefs = [
    { slug: "home", seoTitle: "Enterprise Bank Inc — Personal & Business Banking", metaDescription: "Enterprise Bank Inc offers personal banking, business banking, loans, and wealth management with a focus on community banking." },
    { slug: "about-us", seoTitle: "About Enterprise Bank Inc", metaDescription: "Learn about Enterprise Bank Inc's history, mission, and commitment to community banking." },
    { slug: "personal-banking", seoTitle: "Personal Banking — Checking, Savings, Loans", metaDescription: "Explore Enterprise Bank's personal banking products: checking, savings, CDs, mortgages, and personal loans." },
    { slug: "business-banking", seoTitle: "Business Banking — Checking, Loans, Treasury", metaDescription: "Business banking solutions for small businesses and commercial enterprises: checking, treasury, lending, and merchant services." },
    { slug: "loans", seoTitle: "Loans — Mortgages, Auto, Personal, Business", metaDescription: "Competitive rates on mortgages, auto loans, personal loans, and business loans from Enterprise Bank Inc." },
  ];

  const pages = await Promise.all(
    pageDefs.map((p) =>
      prisma.page.create({
        data: {
          slug: p.slug,
          seoTitle: p.seoTitle,
          metaDescription: p.metaDescription,
          status: p.slug === "home" ? PageStatus.PUBLISHED : PageStatus.DRAFT,
          authorId: admin.id,
          ogImageId: placeholderAsset1.id,
        },
      }),
    ),
  );

  const homePage = pages.find((p) => p.slug === "home")!;
  console.log(`[seed] home page created (${homePage.id})`);

  console.log("[seed] creating sections on home page…");

  const heroDraft = JSON.stringify({
    heading: "Banking built on relationships.",
    subheading:
      "Personal and business banking, lending, and wealth — from people who know your name.",
    ctaLabel: "Apply for a loan",
    ctaHref: "/loans",
    backgroundImageId: placeholderAsset1.id,
  });

  const quickLinksDraft = JSON.stringify({
    heading: "Quick access",
    links: [
      { label: "Open an account", href: "/personal-banking", icon: "UserPlus" },
      { label: "Apply for a loan", href: "/loans", icon: "Calculator" },
      { label: "Online banking", href: "/admin/login", icon: "SignIn" },
      { label: "Find a branch", href: "/contact", icon: "MapPin" },
    ],
  });

  const productGridDraft = JSON.stringify({
    heading: "Products for every stage",
    intro:
      "From your first checking account to your business expansion loans — EBI is with you.",
    products: [
      {
        title: "Personal Checking",
        description: "No-fee everyday banking with mobile deposit and early direct deposit.",
        href: "/personal-banking",
        ctaLabel: "Learn more",
        imageId: placeholderAsset2.id,
      },
      {
        title: "High-Yield Savings",
        description: "Competitive rates to help your savings grow faster.",
        href: "/personal-banking",
        ctaLabel: "Compare savings",
        imageId: placeholderAsset2.id,
      },
      {
        title: "Mortgage Loans",
        description: "Fixed-rate and adjustable-rate mortgages with local underwriting.",
        href: "/loans",
        ctaLabel: "Get a quote",
        imageId: placeholderAsset2.id,
      },
    ],
  });

  const whyUsDraft = JSON.stringify({
    heading: "Why bank with EBI",
    intro: "A community bank with the technology and reach of a national one.",
    reasons: [
      {
        title: "Local decision-making",
        body: "Loans are underwritten by people in your community, not algorithms.",
        icon: "Buildings",
      },
      {
        title: "No hidden fees",
        body: "Transparent pricing on every product — what you see is what you pay.",
        icon: "Receipt",
      },
      {
        title: "24/7 digital banking",
        body: "Deposit checks, pay bills, and transfer funds from anywhere.",
        icon: "DeviceMobile",
      },
    ],
  });

  const newsListDraft = JSON.stringify({
    heading: "Latest news",
    intro: "Announcements, community updates, and financial insights from EBI.",
    count: 3,
  });

  const sectionSeed = [
    { key: "hero", sort: 0, payload: heroDraft },
    { key: "quickLinks", sort: 1, payload: quickLinksDraft },
    { key: "productGrid", sort: 2, payload: productGridDraft },
    { key: "whyUs", sort: 3, payload: whyUsDraft },
    { key: "newsList", sort: 4, payload: newsListDraft },
  ];

  for (const s of sectionSeed) {
    await prisma.section.create({
      data: {
        pageId: homePage.id,
        key: s.key,
        sort: s.sort,
        draft: s.payload,
        published: s.payload, // home is PUBLISHED, so draft == published
        updatedById: admin.id,
      },
    });
  }

  console.log("[seed] sections created");

  console.log("[seed] creating news articles…");

  await prisma.newsArticle.create({
    data: {
      slug: "ebi-launches-mobile-app",
      title: "EBI launches redesigned mobile banking app",
      excerpt:
        "Our new mobile app includes biometric login, mobile deposit, and instant card controls.",
      body:
        "## A new mobile banking experience\n\nEnterprise Bank Inc is rolling out a redesigned mobile banking app for iOS and Android. The new app features:\n\n- **Biometric login** with Face ID and fingerprint\n- **Mobile deposit** for checks up to $10,000\n- **Instant card controls** to freeze or limit your debit card\n- **Real-time alerts** for transactions and balance changes\n\nThe app is available today from the App Store and Google Play.",
      coverId: placeholderAsset1.id,
      status: NewsStatus.PUBLISHED,
      publishedAt: new Date(),
      authorId: publisher.id,
    },
  });

  await prisma.newsArticle.create({
    data: {
      slug: "community-grant-2026",
      title: "EBI awards $250,000 in community grants",
      excerpt:
        "Twelve local nonprofits will receive grants from the EBI Community Foundation in 2026.",
      body:
        "## Supporting our community\n\nThe EBI Community Foundation has awarded $250,000 in grants to twelve local nonprofits focused on financial literacy, housing, and small business development.",
      coverId: placeholderAsset2.id,
      status: NewsStatus.DRAFT,
      authorId: editor.id,
    },
  });

  await prisma.newsArticle.create({
    data: {
      slug: "fraud-alert-sms",
      title: "Important: protect yourself from SMS phishing",
      excerpt:
        "EBI will never text you asking for your PIN or full account number. Here's how to spot a scam.",
      body:
        "## SMS phishing is on the rise\n\nFraudsters are sending texts that look like they're from EBI. **We will never ask for your PIN, full account number, or password via text.**\n\nIf you receive a suspicious text:\n\n1. Do not click any links\n2. Forward the text to 7726 (SPAM)\n3. Delete the message\n4. Call us at 1-800-EBI-BANK if you responded",
      status: NewsStatus.DRAFT,
      authorId: admin.id,
    },
  });

  console.log("[seed] news articles created");

  console.log("[seed] writing audit log entry…");

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SEED",
      entityType: "Database",
      entityId: "init",
      before: null,
      after: JSON.stringify({
        users: 3,
        pages: pages.length,
        sections: sectionSeed.length,
        news: 3,
        media: 2,
      }),
    },
  });

  console.log("[seed] done.");
  console.log("");
  console.log("Login credentials (DEV ONLY):");
  console.log(`  ADMIN      → ${ADMIN_EMAIL}      / ${DEFAULT_PASSWORD}`);
  console.log(`  PUBLISHER  → ${PUBLISHER_EMAIL}  / ${DEFAULT_PASSWORD}`);
  console.log(`  EDITOR     → ${EDITOR_EMAIL}     / ${DEFAULT_PASSWORD}`);
  console.log("");
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });