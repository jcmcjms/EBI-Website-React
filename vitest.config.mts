import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest config — unit tests for pure modules (schemas, media pipeline).
 *
 * Path alias `@/src/*` mirrors the Next.js `tsconfig.json` setup so test
 * imports match production imports. The Node environment is used because
 * we never need a browser to validate zod schemas.
 *
 * The `server-only` stub tells vitest NOT to throw when a test imports
 * a server-only file (it would otherwise blow up because the
 * `server-only` package is a runtime guard against client imports).
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "dist", "e2e"],
    setupFiles: ["./__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@/src": path.resolve(__dirname, "./src"),
      // Stub out `server-only` for tests — it's a runtime guard, not a
      // real module. Without this alias, vitest throws when the
      // service files try to import it.
      "server-only": path.resolve(__dirname, "./__tests__/server-only-stub.ts"),
    },
  },
});