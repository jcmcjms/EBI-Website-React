import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/src/components/admin/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Toaster } from "@/src/components/ui/sonner";
import { getOptionalSession } from "@/src/lib/auth/guards";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false }, // belt-and-braces; middleware already sends X-Robots-Tag
};

const PASSWORD_HELP_URL =
  process.env.NEXT_PUBLIC_PASSWORD_HELP_URL ?? "mailto:itsupport@enterprisebank.com.ph";

export default async function AdminLoginPage() {
  if (await getOptionalSession()) redirect("/admin");

  return (
    <main className="grid min-h-svh place-items-center bg-brand-surface-muted p-6">
      <Toaster />
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-lg font-bold text-brand-heading">Enterprise Bank</p>
          <p className="text-xs font-medium tracking-[0.2em] text-brand-secondary">EST. 1995</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Login to your account</CardTitle>
            <CardDescription>Enter your email below to login to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm
              ssoEnabled={Boolean(process.env.AUTH_ENTRA_ID)}
              helpUrl={PASSWORD_HELP_URL}
            />
          </CardContent>
          <div className="border-t border-brand-border px-6 py-4 text-center text-sm text-muted-foreground">
            Need access? Contact your administrator.
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          For authorized Enterprise Bank staff only. All activity is logged.
        </p>
      </div>
    </main>
  );
}
