/**
 * Test stub for the `server-only` package.
 *
 * In Next.js, `import "server-only"` is a runtime guard that throws if
 * the file is imported into a `"use client"` component. Vitest doesn't
 * have that guard, but the real `server-only` package DOES throw when
 * imported outside a Next.js context — so we replace it with this
 * no-op alias via the Vite resolve.alias config in vitest.config.mts.
 *
 * Keep this file empty (other than the comment) — its sole purpose is
 * to satisfy the import without running any code.
 */
export {};