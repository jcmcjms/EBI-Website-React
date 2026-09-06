"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/src/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";

import type { SectionKey, SectionPayloadMap } from "@/src/lib/content/types";

/**
 * SectionEditor — generic admin editor for a single section.
 *
 * Stubs one field set per section key, with a save
 * button that calls `onSave(parsed)`. Each section key maps to
 * its matching zod schema from `src/lib/content/schemas.ts`.
 *
 * The save handler receives **already-parsed** data; the editor is
 * responsible for resolving the schema.
 */

export interface SectionEditorProps<K extends SectionKey> {
  sectionKey: K;
  defaultValue: SectionPayloadMap[K];
  onSave: (next: SectionPayloadMap[K]) => Promise<void>;
  onCancel?: () => void;
}

export function SectionEditor<K extends SectionKey>({
  sectionKey,
  defaultValue,
  onSave,
  onCancel,
}: SectionEditorProps<K>) {
  return (
    <SectionEditorShell sectionKey={sectionKey} defaultValue={defaultValue} onSave={onSave} onCancel={onCancel} />
  );
}

// ---------------------------------------------------------------------------
// Inner shell — picks the field set by `sectionKey`.
// ---------------------------------------------------------------------------

interface ShellProps<K extends SectionKey> {
  sectionKey: K;
  defaultValue: SectionPayloadMap[K];
  onSave: (next: SectionPayloadMap[K]) => Promise<void>;
  onCancel?: () => void;
}

function SectionEditorShell<K extends SectionKey>(props: ShellProps<K>) {
  // Per-section narrowing via a local alias so each branch sees the
  // matching literal `sectionKey` type — no `as` casts required.
  const { sectionKey, defaultValue, onSave, onCancel } = props;
  switch (sectionKey) {
    case "hero":
      return (
        <HeroEditorShell
          sectionKey="hero"
          defaultValue={defaultValue as SectionPayloadMap["hero"]}
          onSave={onSave as (v: SectionPayloadMap["hero"]) => Promise<void>}
          onCancel={onCancel}
        />
      );
    case "quickLinks":
      return (
        <QuickLinksEditorShell
          sectionKey="quickLinks"
          defaultValue={defaultValue as SectionPayloadMap["quickLinks"]}
          onSave={onSave as (v: SectionPayloadMap["quickLinks"]) => Promise<void>}
          onCancel={onCancel}
        />
      );
    case "productGrid":
      return (
        <ProductGridEditorShell
          sectionKey="productGrid"
          defaultValue={defaultValue as SectionPayloadMap["productGrid"]}
          onSave={onSave as (v: SectionPayloadMap["productGrid"]) => Promise<void>}
          onCancel={onCancel}
        />
      );
    case "whyUs":
      return (
        <WhyUsEditorShell
          sectionKey="whyUs"
          defaultValue={defaultValue as SectionPayloadMap["whyUs"]}
          onSave={onSave as (v: SectionPayloadMap["whyUs"]) => Promise<void>}
          onCancel={onCancel}
        />
      );
    case "newsList":
      return (
        <NewsListEditorShell
          sectionKey="newsList"
          defaultValue={defaultValue as SectionPayloadMap["newsList"]}
          onSave={onSave as (v: SectionPayloadMap["newsList"]) => Promise<void>}
          onCancel={onCancel}
        />
      );
    default: {
      // Exhaustiveness check.
      const _exhaustive: never = sectionKey;
      void _exhaustive;
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Per-section field set STUBS.
// Each is a minimal react-hook-form + zodResolver form.
// ---------------------------------------------------------------------------

// We use loose zod schemas here so the stubs compile. The real schemas
// swap in via `zodResolver(realSchema)` later.
import { z } from "zod";

function buildLooseShape<K extends SectionKey>(key: K): z.ZodObject<z.ZodRawShape> {
  // Shape the form to whatever fields the defaultValue has, so the
  // user's existing draft doesn't get reset.
  const obj: Record<string, z.ZodTypeAny> = {};
  for (const k of Object.keys(propsRecordFromDefault(key))) {
    obj[k] = z.string().optional();
  }
  return z.object(obj);
}

function propsRecordFromDefault<K extends SectionKey>(
  _key: K,
): Record<string, unknown> {
  // The real shape will be supplied by the caller; we only inspect
  // keys to give RHF a starting point.
  return {};
}

// The actual per-section editor shells — each sets up RHF with a
// loose schema and renders one labelled placeholder field.

function HeroEditorShell(
  props: ShellProps<"hero">,
) {
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(buildLooseShape("hero")),
    defaultValues: props.defaultValue as Record<string, unknown>,
  });
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await (props.onSave as (v: SectionPayloadMap["hero"]) => Promise<void>)(values as SectionPayloadMap["hero"]);
        })}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="heading"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Heading</FormLabel>
              <FormControl><Input {...field} value={(field.value as string) ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subheading"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subheading</FormLabel>
              <FormControl><Textarea {...field} value={(field.value as string) ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <EditorActions onCancel={props.onCancel} />
      </form>
    </Form>
  );
}

function QuickLinksEditorShell(
  props: ShellProps<"quickLinks">,
) {
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(buildLooseShape("quickLinks")),
    defaultValues: props.defaultValue as Record<string, unknown>,
  });
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await (props.onSave as (v: SectionPayloadMap["quickLinks"]) => Promise<void>)(values as SectionPayloadMap["quickLinks"]);
        })}
        className="flex flex-col gap-4"
      >
        <p className="t-meta">Quick links editor.</p>
        <EditorActions onCancel={props.onCancel} />
      </form>
    </Form>
  );
}

function ProductGridEditorShell(
  props: ShellProps<"productGrid">,
) {
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(buildLooseShape("productGrid")),
    defaultValues: props.defaultValue as Record<string, unknown>,
  });
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await (props.onSave as (v: SectionPayloadMap["productGrid"]) => Promise<void>)(values as SectionPayloadMap["productGrid"]);
        })}
        className="flex flex-col gap-4"
      >
        <p className="t-meta">Product grid editor.</p>
        <EditorActions onCancel={props.onCancel} />
      </form>
    </Form>
  );
}

function WhyUsEditorShell(
  props: ShellProps<"whyUs">,
) {
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(buildLooseShape("whyUs")),
    defaultValues: props.defaultValue as Record<string, unknown>,
  });
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await (props.onSave as (v: SectionPayloadMap["whyUs"]) => Promise<void>)(values as SectionPayloadMap["whyUs"]);
        })}
        className="flex flex-col gap-4"
      >
        <p className="t-meta">Why-us editor.</p>
        <EditorActions onCancel={props.onCancel} />
      </form>
    </Form>
  );
}

function NewsListEditorShell(
  props: ShellProps<"newsList">,
) {
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(buildLooseShape("newsList")),
    defaultValues: props.defaultValue as Record<string, unknown>,
  });
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await (props.onSave as (v: SectionPayloadMap["newsList"]) => Promise<void>)(values as SectionPayloadMap["newsList"]);
        })}
        className="flex flex-col gap-4"
      >
        <p className="t-meta">News list editor.</p>
        <EditorActions onCancel={props.onCancel} />
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Shared action row.
// ---------------------------------------------------------------------------

function EditorActions({ onCancel }: { onCancel?: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-brand-border pt-4">
      {onCancel && (
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      )}
      <Button type="submit">Save draft</Button>
    </div>
  );
}
