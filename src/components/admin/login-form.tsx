"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "@phosphor-icons/react";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Button } from "@/src/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { completeLogin, startLogin, type LoginError } from "@/src/lib/auth/actions";
import type { LoginResult } from "@/src/lib/auth/actions";

// Type predicate so TypeScript can narrow the union after the error check
function isOk(r: LoginResult): r is Extract<LoginResult, { status: "ok" }> {
  return r.status === "ok";
}

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.").max(128),
});

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

const ERROR_COPY: Record<LoginError, string> = {
  "invalid-credentials": "Incorrect email or password.",
  "rate-limited": "Too many attempts. Wait 15 minutes and try again.",
  "mfa-invalid": "That code didn't match. Check your authenticator app.",
  "mfa-expired": "This login attempt expired. Start again.",
};

interface LoginFormProps {
  ssoEnabled: boolean;
  helpUrl: string;
}

export function LoginForm({ ssoEnabled, helpUrl }: LoginFormProps) {
  const router = useRouter();
  const [mfaTicket, setMfaTicket] = useState<string | null>(null);
  const [error, setError] = useState<LoginError | null>(null);

  const credentialsForm = useForm<z.infer<typeof credentialsSchema>>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });
  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  const busy =
    credentialsForm.formState.isSubmitting || codeForm.formState.isSubmitting;

  async function onCredentials(values: z.infer<typeof credentialsSchema>) {
    setError(null);
    const result = await startLogin(values);

    if (result.status === "mfa-required") {
      setMfaTicket(result.ticket);
      return;
    }
    if (result.status === "error") {
      setError(result.code);
      return;
    }

    if (!isOk(result)) return;
    router.push(result.redirect);
    router.refresh();
  }

  async function onCode(values: z.infer<typeof codeSchema>) {
    if (!mfaTicket) return;
    setError(null);
    const result = await completeLogin({ ticket: mfaTicket, code: values.code });

    if (result.status === "error") {
      if (result.code === "mfa-expired") setMfaTicket(null);
      setError(result.code);
      return;
    }

    if (!isOk(result)) return;
    router.push(result.redirect);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{ERROR_COPY[error]}</AlertDescription>
        </Alert>
      )}

      {mfaTicket === null ? (
        <Form {...credentialsForm}>
          <form
            onSubmit={credentialsForm.handleSubmit(onCredentials)}
            className="grid gap-5"
            noValidate
          >
            <FormField
              control={credentialsForm.control}
              name="email"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <FormControl>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      autoComplete="email"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={credentialsForm.control}
              name="password"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a
                      href={helpUrl}
                      className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <FormControl>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {credentialsForm.formState.isSubmitting ? "Signing in…" : "Login"}
            </Button>
            {ssoEnabled && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() => signIn("entra-id", { callbackUrl: "/admin" })}
              >
                Continue with Enterprise SSO
              </Button>
            )}
          </form>
        </Form>
      ) : (
        <Form {...codeForm}>
          <form
            onSubmit={codeForm.handleSubmit(onCode)}
            className="grid gap-5"
            noValidate
          >
            <FormField
              control={codeForm.control}
              name="code"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <Label htmlFor="code">Authentication code</Label>
                  <FormControl>
                    <Input
                      id="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="\d{6}"
                      maxLength={6}
                      placeholder="000000"
                      className="text-center text-lg tracking-[0.5em]"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code from your authenticator app.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {codeForm.formState.isSubmitting ? "Verifying…" : "Verify"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={busy}
              onClick={() => {
                setMfaTicket(null);
                setError(null);
                codeForm.reset();
              }}
            >
              <ArrowLeft className="mr-2" weight="bold" aria-hidden />
              Back
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
