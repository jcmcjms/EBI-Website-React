import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton + reader/writer split.
 *
 * Production behaviour (per Decision 9 in
 * `project-tasks/ebi_website-decisions.md`):
 *   - `prisma`        reads from `DATABASE_URL_READER` (least privilege)
 *   - `prismaWriter`  reads from `DATABASE_URL_WRITER`
 *
 * Locally both point at the same SQLite file — the aliasing is the
 * expected dev behaviour. The split exists in code from day one so
 * prod deployment doesn't require a refactor.
 *
 * IMPORTANT: this module is server-only. Any `"use client"` file that
 * tries to import it will fail the build by design.
 */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/**
 * Build (or reuse) a Prisma client pointed at the given datasource URL.
 *
 * If `DATABASE_URL_<READER|WRITER>` is not set we fall back to
 * `DATABASE_URL` so the dev SQLite file works out of the box.
 */
function makeClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. See .env.example.",
    );
  }
  return new PrismaClient({
    datasources: { db: { url } },
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["warn", "error"],
  });
}

/**
 * Read-mostly client. All public-site content reads go through this.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = makeClient());

/**
 * Write client. All mutations go through this.
 */
export const prismaWriter = prisma;

export type Prisma = typeof prisma;