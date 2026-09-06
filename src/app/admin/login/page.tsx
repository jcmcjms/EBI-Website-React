'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';

type Step = 'credentials' | 'mfa';

interface LoginState {
  step: Step;
  email: string;
  error: string | null;
  isLoading: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>({
    step: 'credentials',
    email: '',
    error: null,
    isLoading: false,
  });

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });

  const [mfaCode, setMfaCode] = useState('');

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });

      if (result?.error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Invalid email or password',
        }));
        return;
      }

      // MFA required - move to step 2
      setState((prev) => ({
        ...prev,
        step: 'mfa',
        email: credentials.email,
        isLoading: false,
      }));
      setMfaCode('');
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'An unexpected error occurred',
      }));
    }
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mfaCode.length !== 6) {
      setState((prev) => ({ ...prev, error: 'Please enter a 6-digit code' }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await signIn('mfa', {
        code: mfaCode,
        email: state.email,
        redirect: false,
      });

      if (result?.error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Invalid verification code',
        }));
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'An unexpected error occurred',
      }));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-surface p-4">
      <Card className="w-full max-w-md border-brand-border">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-brand-accent flex items-center justify-center">
              <span className="text-2xl font-bold text-white">E</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-brand-accent">
            EBI Admin
          </CardTitle>
          <CardDescription className="text-center text-brand-body">
            {state.step === 'credentials'
              ? 'Sign in to access the admin panel'
              : 'Enter your verification code'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
              {state.error}
            </div>
          )}

          {state.step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={credentials.email}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  disabled={state.isLoading}
                  className="border-brand-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  disabled={state.isLoading}
                  className="border-brand-border"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-brand-accent hover:bg-brand-accent/90"
                disabled={state.isLoading}
              >
                {state.isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Verification Code</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  required
                  disabled={state.isLoading}
                  className="text-center text-2xl tracking-widest border-brand-border"
                />
                <p className="text-xs text-center text-brand-body">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
              <Button
                type="submit"
                className="w-full bg-brand-accent hover:bg-brand-accent/90"
                disabled={state.isLoading || mfaCode.length !== 6}
              >
                {state.isLoading ? 'Verifying...' : 'Verify'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() =>
                  setState({
                    step: 'credentials',
                    email: '',
                    error: null,
                    isLoading: false,
                  })
                }
                disabled={state.isLoading}
              >
                Back to Sign In
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
