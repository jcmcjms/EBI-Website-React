import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getOptionalSession } from '@/src/lib/auth/guards';
import { AdminShell } from '@/src/components/admin/admin-shell';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: {
    default: 'Admin Panel',
    template: '%s | EBI Admin',
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOptionalSession();

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <AdminShell user={session}>
          {children}
        </AdminShell>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
